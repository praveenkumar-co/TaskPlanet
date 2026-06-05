import { Router } from 'express';
import {
  createPost,
  getFeed,
  toggleLikePost,
  addCommentToPost
} from '../controllers/postController.js';
import { verifyJWT } from '../middlewares/auth.js';
import { upload } from '../middlewares/multer.js';

const router = Router();

// Apply verifyJWT middleware to all routes in this router
router.use(verifyJWT);

router.route("/")
  .post(upload.single("image"), createPost)
  .get(getFeed);

router.route("/like/:postId").post(toggleLikePost);
router.route("/comment/:postId").post(addCommentToPost);

export default router;
