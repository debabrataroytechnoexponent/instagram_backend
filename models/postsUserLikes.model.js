const mongoose = require("mongoose");

const postsUserLikesSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate likes by same user on same post
postsUserLikesSchema.index({ post: 1, user: 1 }, { unique: true });

const PostsUserLikes = mongoose.model("PostsUserLikes", postsUserLikesSchema);

module.exports = PostsUserLikes;
