const mongoose = require("mongoose");

const userFollowsSchema = mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // who is following
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // who is being followed
  },
  { timestamps: true }
);

userFollowsSchema.index({ follower: 1, following: 1 }, { unique: true }); // prevent duplicates

const UserFollows = mongoose.model("UserFollows", userFollowsSchema);

module.exports = UserFollows;
