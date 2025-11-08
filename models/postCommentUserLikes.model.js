const mongoose = require("mongoose");

const postCommentUserLikesSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostComment",
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

// ✅ Prevent duplicate likes by same user on same comment
postCommentUserLikesSchema.index({ comment: 1, user: 1 }, { unique: true });

const PostCommentUserLikes = mongoose.model("PostCommentUserLikes", postCommentUserLikesSchema);

module.exports = PostCommentUserLikes;
