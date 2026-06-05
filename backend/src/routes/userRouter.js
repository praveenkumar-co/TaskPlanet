import { Router } from 'express';
import {
  registerUser,
  loginUser,
  googleLogin,
  logoutUser,
  refreshToken,
  getCurrentUser,
  toggleFollowUser,
  getSuggestedUsers
} from '../controllers/userController.js';
import { upload } from '../middlewares/multer.js';
import { verifyJWT } from '../middlewares/auth.js';

const router = Router();

// Auth routes
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);
router.route("/google-login").post(googleLogin);
router.route("/refresh-token").post(refreshToken);

// Secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/follow/:targetUserId").post(verifyJWT, toggleFollowUser);
router.route("/suggested").get(verifyJWT, getSuggestedUsers);

export default router;
