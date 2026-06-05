import { ApiError, ApiResponse, asyncHandler } from 'node-utils-kit';
import Post from '../models/postModel.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import path from 'path';
import mongoose from 'mongoose';

// Create Post (Text, Image, or both)
const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const imageLocalPath = req.file?.path;

  if (!content?.trim() && !imageLocalPath) {
    throw new ApiError(400, "A post must have either text content or an image");
  }

  let imageUrl = "";
  if (imageLocalPath) {
    const cloudinaryResponse = await uploadOnCloudinary(imageLocalPath);
    if (cloudinaryResponse?.url) {
      imageUrl = cloudinaryResponse.url;
    } else {
      console.warn("Cloudinary post image upload failed. Falling back to local static serving.");
      imageUrl = `/temp/${path.basename(imageLocalPath)}`;
    }
  }

  const post = await Post.create({
    content: content?.trim() || "",
    image: imageUrl,
    owner: req.user._id,
    likes: [],
    comments: []
  });

  const populatedPost = await Post.findById(post._id)
    .populate("owner", "username fullName avatar")
    .populate("likes", "username fullName avatar");

  return res.status(201).json(
    new ApiResponse(201, populatedPost, "Post created successfully")
  );
});

// Get Public Feed (with Pagination & Filters)
const getFeed = asyncHandler(async (req, res) => {
  const { filter = "all", search = "", ownerId } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};
  if (ownerId) {
    query.owner = new mongoose.Types.ObjectId(ownerId);
  }
  if (search.trim()) {
    query.$or = [
      { content: { $regex: search, $options: "i" } }
    ];
  }
  let sortStage = { createdAt: -1 };

  if (filter === "most-liked") {
    sortStage = { likesCount: -1, createdAt: -1 };
  } else if (filter === "most-commented") {
    sortStage = { commentsCount: -1, createdAt: -1 };
  }
  const pipeline = [
    { $match: query },
    {
      $addFields: {
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        commentsCount: { $size: { $ifNull: ["$comments", []] } }
      }
    },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner"
      }
    },
    { $unwind: "$owner" },
    {
      $project: {
        "owner.password": 0,
        "owner.refreshToken": 0,
        "owner.email": 0,
        "owner.createdAt": 0,
        "owner.updatedAt": 0,
        "owner.__v": 0
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "likes",
        foreignField: "_id",
        as: "likes"
      }
    },
    {
      $addFields: {
        likes: {
          $map: {
            input: "$likes",
            as: "likeUser",
            in: {
              _id: "$$likeUser._id",
              username: "$$likeUser.username",
              fullName: "$$likeUser.fullName",
              avatar: "$$likeUser.avatar"
            }
          }
        }
      }
    }
  ];

  const posts = await Post.aggregate(pipeline);
  const totalPosts = await Post.countDocuments(query);
  const totalPages = Math.ceil(totalPosts / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts,
        pagination: {
          currentPage: page,
          totalPages,
          totalPosts,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Feed fetched successfully"
    )
  );
});

// Toggle Like Post
const toggleLikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const isLiked = post.likes.includes(userId);
  if (isLiked) {
    post.likes = post.likes.filter(id => id.toString() !== userId.toString());
  } else {
    // Add like
    post.likes.push(userId);
  }

  await post.save();

  const updatedPost = await Post.findById(postId)
    .populate("owner", "username fullName avatar")
    .populate("likes", "username fullName avatar");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        postId: updatedPost._id,
        likes: updatedPost.likes,
        likesCount: updatedPost.likes.length,
        isLiked: !isLiked
      },
      isLiked ? "Post unliked successfully" : "Post liked successfully"
    )
  );
});

// Add Comment to Post
const addCommentToPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment text content is required");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const newComment = {
    content: content.trim(),
    owner: req.user._id,
    username: req.user.username,
    avatar: req.user.avatar,
    createdAt: new Date()
  };

  post.comments.push(newComment);
  await post.save();

  const updatedPost = await Post.findById(postId)
    .populate("owner", "username fullName avatar")
    .populate("likes", "username fullName avatar");

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        postId: updatedPost._id,
        comments: updatedPost.comments,
        commentsCount: updatedPost.comments.length
      },
      "Comment added successfully"
    )
  );
});

export {
  createPost,
  getFeed,
  toggleLikePost,
  addCommentToPost
};
