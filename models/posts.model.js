const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // ✅ reference to User collection
      required: true,
    },
    media: {
      type: [String],
      validate: [
        (arr) => arr.length > 0, // ✅ must have at least 1 media URL
        "A post must contain at least one media file.",
      ],
      required: true,
    },
    caption: {
      type: String,
      default: "",
      trim: true,
    },
    postType: {
      type: String,
      default: null,
      trim: true,
    },
    preview: {
      type: String,
      default: null,
      trim: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
