import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    // neither field is mandatory but at least one is enough, we will validate this in controller
  },
  image: {
    type: String, // Cloudinary URL
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  comments: [commentSchema],
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);
export default Post;
