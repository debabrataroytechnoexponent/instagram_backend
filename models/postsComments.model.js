const mongoose = require("mongoose");

const postsCommentsSchema = new mongoose.Schema(
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
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostsComments", // ✅ self-reference
      default: null,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ✅ Indexes for performance
postsCommentsSchema.index({ post: 1 });
postsCommentsSchema.index({ parentComment: 1 });
postsCommentsSchema.index({ user: 1 });

const PostsComments = mongoose.model("PostsComments", postsCommentsSchema);

module.exports = PostsComments;
