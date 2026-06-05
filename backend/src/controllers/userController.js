import { ApiError, ApiResponse, asyncHandler } from 'node-utils-kit';
import User from '../models/userModel.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import Post from '../models/postModel.js';
import { usernameFilter } from '../db/redis.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Token Generator Helper
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    // we generated refresh and access Token 
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    // we will do valiadate before saving
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating access and refresh tokens");
  }
};

// Generate unique username from email using Bloom Filter to minimize database checks
const generateUniqueUsername = async (email) => {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  let username = base;
  
  // Use Bloom filter check first
  let mightExist = await usernameFilter.mightContain(username);
  let exists = mightExist ? await User.findOne({ username }) : null;
  
  let counter = 1;
  while (exists) {
    username = `${base}${counter}`;
    mightExist = await usernameFilter.mightContain(username);
    exists = mightExist ? await User.findOne({ username }) : null;
    counter++;
  }
  return username;
};

// Helper to get user data populated with posts and followers/following stats
const getUserDataWithStats = async (userId) => {
  const user = await User.findById(userId)
    .populate("followers", "username fullName avatar")
    .populate("following", "username fullName avatar");

  if (!user) return null;

  const postsCount = await Post.countDocuments({ owner: user._id });
  const followersCount = user.followers?.length || 0;
  const followingCount = user.following?.length || 0;

  const userData = user.toObject();
  userData.postsCount = postsCount;
  userData.followersCount = followersCount;
  userData.followingCount = followingCount;
  return userData;
};

// Register User (Local signup)
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  if ([fullName, email, username, password].some(field => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const cleanedUsername = username.trim().toLowerCase();
  if (/[^a-zA-Z0-9_]/.test(cleanedUsername)) {
    throw new ApiError(400, "Username can only contain letters, numbers, and underscores");
  }

  // Check if username might exist using the Bloom filter
  const usernameMightExist = await usernameFilter.mightContain(cleanedUsername);
  let existedUser = null;
  
  if (usernameMightExist) {
    // If Bloom filter returns true, do a DB check to verify (handle potential false positives)
    existedUser = await User.findOne({ username: cleanedUsername });
  }
  
  // Also check email in the DB if username didn't trigger an error
  if (!existedUser) {
    existedUser = await User.findOne({ email: email.trim().toLowerCase() });
  }

  if (existedUser) {
    throw new ApiError(409, "User with this username or email already exists");
  }

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  let avatarUrl = avatar?.url;
  if (!avatarUrl) {
    console.warn("Cloudinary avatar upload failed. Falling back to local static serving.");
    avatarUrl = `/temp/${path.basename(avatarLocalPath)}`;
  }

  const user = await User.create({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    username: cleanedUsername,
    password,
    avatar: avatarUrl,
    provider: "local"
  });

  // Add the newly registered username to the Bloom Filter
  await usernameFilter.add(cleanedUsername);

  const createdUser = await getUserDataWithStats(user._id);
  if (!createdUser) {
    throw new ApiError(500, "Internal server error occurred while registering user");
  }

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  );
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    throw new ApiError(400, "Email/username and password are required");
  }

  const searchVal = emailOrUsername.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: searchVal }, { username: searchVal }]
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (user.provider !== "local") {
    throw new ApiError(400, `This account is registered via Google. Please log in with Google.`);
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await getUserDataWithStats(user._id);
    // for cookies we will set httpOnly, secure and sameSite attributes for better security
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

// Google Login / OAuth Verify
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    throw new ApiError(400, "Google ID token is required");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Google authentication error:", error);
    throw new ApiError(401, "Invalid Google ID token");
  }

  const { email, name, picture, sub: googleId } = payload;
  if (!email) {
    throw new ApiError(400, "Email not provided by Google account");
  }

  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    if (user.provider !== "google") {
      user.googleId = googleId;
      user.provider = "google";
      // If no avatar is present, use Google's
      if (!user.avatar) user.avatar = picture;
      await user.save();
    }
  } else {
    // Create new Google Auth user
    const generatedUsername = await generateUniqueUsername(email);
    user = await User.create({
      fullName: name || "Google User",
      email: email.toLowerCase(),
      username: generatedUsername,
      avatar: picture || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
      provider: "google",
      googleId
    });
    // Add the newly created username to the Bloom Filter
    await usernameFilter.add(generatedUsername);
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await getUserDataWithStats(user._id);

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Google authentication successful"
      )
    );
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { refreshToken: "" } },
      { new: true }
    );
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  return res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Refresh Token
const refreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token has expired or already been used");
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Tokens refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized access");
  }

  const userData = await getUserDataWithStats(req.user._id);

  return res.status(200).json(
    new ApiResponse(200, userData, "Current user fetched successfully")
  );
});

// Toggle follow/unfollow user
const toggleFollowUser = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const currentUserId = req.user._id;

  if (targetUserId.toString() === currentUserId.toString()) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  const currentUser = await User.findById(currentUserId);

  const isFollowing = currentUser.following.includes(targetUserId);

  if (isFollowing) {
    // Unfollow
    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId.toString());
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId.toString());
  } else {
    // Follow
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);
  }

  await currentUser.save();
  await targetUser.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        targetUserId,
        isFollowing: !isFollowing,
        followersCount: targetUser.followers.length,
        followingCount: currentUser.following.length
      },
      isFollowing ? "Unfollowed successfully" : "Followed successfully"
    )
  );
});

// Get Suggested Users
const getSuggestedUsers = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  const suggested = await User.find({
    _id: { $ne: currentUserId, $nin: req.user.following || [] }
  })
  .select("username fullName avatar")
  .limit(10);

  return res.status(200).json(
    new ApiResponse(200, suggested, "Suggested users fetched successfully")
  );
});

export {
  registerUser,
  loginUser,
  googleLogin,
  logoutUser,
  refreshToken,
  getCurrentUser,
  toggleFollowUser,
  getSuggestedUsers
};
