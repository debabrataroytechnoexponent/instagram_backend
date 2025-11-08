const PostCommentUserLikes = require("../models/postCommentUserLikes.model");
const Post = require("../models/posts.model");
const PostsComments = require("../models/postsComments.model");
const PostsUserLikes = require("../models/postsUserLikes.model");
const UserFollows = require("../models/user.follows.model");
const User = require("../models/userModel");

const getPaginatedPosts = async (req, res) => {
  try {
    // Default pagination setup
    const user = req.user;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const userName = req.query.username;
    const skip = (page - 1) * limit;

    // Build the filter object
    let filter = {
      user: user._id
    };
    if (userName) {
      // Populate user and filter by username
      const userDetails = await User.findOne({ userName: userName }).select("_id");
      if (userDetails) filter.user = userDetails._id;
      // else filter.user = null; // will return empty array if username not found
    }

    // Fetch posts with user info populated (only needed fields)
    console.log(filter);
    const posts = await Post.find(filter)
      .populate("user", "fullName userName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Total count for pagination metadata
    const totalPosts = await Post.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Posts fetched successfully",
      data: {
        posts,
        totalPosts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error in getPaginatedPosts:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching posts",
    });
  }
};

const getPaginatedFeeds = async (req, res) => {
  try {
    const user = req.user;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Step 1: Get users current user follows
    const followedUsers = await UserFollows.find({ follower: user._id }).select("following");
    const followedUserIds = followedUsers.map(f => f.following);
    followedUserIds.push(user._id);

    // Step 2: Get posts
    const filter = { user: { $in: followedUserIds } };

    const posts = await Post.find(filter)
      .populate("user", "fullName userName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Step 3: For each post, attach like info
    const postIds = posts.map(p => p._id);

    // Fetch likes for these posts
    const likes = await PostsUserLikes.find({ post: { $in: postIds } })
      .populate("user", "fullName userName profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    // Group likes by postId
    const likesMap = {};
    for (const like of likes) {
      if (!likesMap[like.post]) likesMap[like.post] = [];
      likesMap[like.post].push(like.user);
    }

    // Step 4: Enhance each post
    const enhancedPosts = posts.map((post, index) => {
      const allLikes = likesMap[post._id] || [];

      // Determine if current user liked
      const isLikedByMe = allLikes.some(u => u._id.toString() === user._id.toString());

      // Prepare recentLikedUsers
      let recentLikedUsers = allLikes.slice(0, 3);

      // If user liked, make sure user's like comes first
      if (isLikedByMe) {
        const myLike = allLikes.find(u => u._id.toString() === user._id.toString());
        const filtered = allLikes.filter(u => u._id.toString() !== user._id.toString());
        recentLikedUsers = [myLike, ...filtered].slice(0, 3);
      }

      return {
        ...post,
        key: index + 1, // or post._id if you prefer
        isLikedByMe,
        recentLikedUsers,
      };
    });

    // Step 5: Count for pagination
    const totalPosts = await Post.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Feed posts fetched successfully",
      data: {
        posts: enhancedPosts,
        totalPosts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error in getPaginatedPosts:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching posts",
    });
  }
};

const getPostById = async (req, res) => {
  try {
    const { postId } = req.query;
    const user = req.user;

    const postData = await getPostResponse(postId, user._id);
    if (!postData) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Post fetched successfully",
      data: postData,
    });
  } catch (error) {
    console.error("Error in getPostById:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching post details",
    });
  }
};

const likeUnlikePost = async (req, res) => {
  try {
    const { postId } = req.query;
    const user = req.user;

    if (!postId) {
      return res
        .status(400)
        .json({ success: false, message: "postId is required" });
    }

    // check if user already liked
    const existingLike = await PostsUserLikes.findOne({
      post: postId,
      user: user._id,
    });

    if (existingLike) {
      // UNLIKE: remove like record and decrement post.likeCount
      await PostsUserLikes.deleteOne({ _id: existingLike._id });

      // decrement likeCount, then ensure it doesn't go below 0
      await Post.updateOne({ _id: postId }, { $inc: { likeCount: -1 } });
      // fix negative likeCount if any (safe-guard)
      await Post.updateOne(
        { _id: postId, likeCount: { $lt: 0 } },
        { $set: { likeCount: 0 } }
      );
    } else {
      // LIKE: insert like record and increment post.likeCount
      try {
        await PostsUserLikes.create({ post: postId, user: user._id });
        await Post.updateOne({ _id: postId }, { $inc: { likeCount: 1 } });
      } catch (err) {
        // handle rare race where another request inserted the same like concurrently
        if (err && err.code === 11000) {
          // duplicate key error -> another request already inserted the like
          // ensure post likeCount is correct by recounting (optional)
          const count = await PostsUserLikes.countDocuments({ post: postId });
          await Post.updateOne({ _id: postId }, { $set: { likeCount: count } });
        } else {
          throw err;
        }
      }
    }

    // Return same structure as getPostById (fresh data)
    const postData = await getPostResponse(postId, user._id);
    if (!postData) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    return res.status(200).json({
      success: true,
      message: existingLike
        ? "Post unliked successfully"
        : "Post liked successfully",
      data: postData,
    });
  } catch (error) {
    console.error("Error in likeUnlikePost:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while liking/unliking the post",
    });
  }
};

const getPostResponse = async (postId, userId) => {
  const post = await Post.findById(postId)
    .populate("user", "fullName userName profilePicture")
    .lean();

  if (!post) return null;

  // Fetch last 3 liked users
  const likedUsers = await PostsUserLikes.find({ post: postId })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate("user", "fullName userName profilePicture")
    .lean();

  let recentLikedUsers = likedUsers.map((like) => like.user);

  // Check if current user liked the post
  const isLikedByMe = await PostsUserLikes.exists({
    post: postId,
    user: userId,
  });

  if (isLikedByMe) {
    // If current user is not already in recentLikedUsers, add them at the start
    const alreadyIncluded = recentLikedUsers.some(
      (u) => u._id.toString() === userId.toString()
    );

    if (!alreadyIncluded) {
      const currentUser = await User.findById(
        userId,
        "fullName userName profilePicture"
      ).lean();
      if (currentUser) {
        recentLikedUsers.unshift(currentUser); // put first
      }
      // Keep only first 3 users
      recentLikedUsers = recentLikedUsers.slice(0, 3);
    }
  }

  return {
    ...post,
    recentLikedUsers,
    isLikedByMe: !!isLikedByMe,
  };
};

const getCommentsByPost = async (req, res) => {
  try {
    const { postId, commentId } = req.query;
    const userId = req.user?._id; // assuming you have auth middleware
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "postId is required",
      });
    }

    const skip = (page - 1) * limit;

    // Build filter based on postId and optional commentId
    const filter = { post: postId };
    if (commentId) {
      filter.parentComment = commentId; // fetch replies
    } else {
      filter.parentComment = null; // fetch only top-level comments
    }

    const comments = await PostsComments.find(filter)
      .populate("user", "fullName userName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich comments with likeCount, replyCount, and isLikedByMe
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const likeCount = await PostCommentUserLikes.countDocuments({
          comment: comment._id,
        });
        const replyCount = await PostsComments.countDocuments({
          parentComment: comment._id,
        });

        let isLikedByMe = false;
        if (userId) {
          const liked = await PostCommentUserLikes.findOne({
            comment: comment._id,
            user: userId,
          });
          isLikedByMe = !!liked;
        }

        return {
          ...comment,
          likeCount,
          replyCount,
          isLikedByMe,
        };
      })
    );

    const totalComments = await PostsComments.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      data: {
        comments: enrichedComments,
        totalComments,
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error in getCommentsByPost:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching comments",
    });
  }
};

const likeUnlikeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.query;
    const user = req.user;

    if (!postId || !commentId) {
      return res.status(400).json({
        success: false,
        message: "postId and commentId are required",
      });
    }

    // Check if user already liked this comment
    const existingLike = await PostCommentUserLikes.findOne({
      comment: commentId,
      user: user._id,
    });

    if (existingLike) {
      // UNLIKE
      await PostCommentUserLikes.deleteOne({ _id: existingLike._id });
      await PostsComments.updateOne(
        { _id: commentId },
        { $inc: { likeCount: -1 } }
      );
      // prevent negative likeCount
      await PostsComments.updateOne(
        { _id: commentId, likeCount: { $lt: 0 } },
        { $set: { likeCount: 0 } }
      );
    } else {
      // LIKE
      try {
        await PostCommentUserLikes.create({
          comment: commentId,
          user: user._id,
        });
        await PostsComments.updateOne(
          { _id: commentId },
          { $inc: { likeCount: 1 } }
        );
      } catch (err) {
        // Handle race condition / duplicate key
        if (err && err.code === 11000) {
          const count = await PostCommentUserLikes.countDocuments({
            comment: commentId,
          });
          await PostsComments.updateOne(
            { _id: commentId },
            { $set: { likeCount: count } }
          );
        } else {
          throw err;
        }
      }
    }

    // Fetch enriched comment data (same as getCommentsByPost)
    const comment = await PostsComments.findById(commentId)
      .populate("user", "fullName userName profilePicture")
      .lean();

    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    const likeCount = await PostCommentUserLikes.countDocuments({
      comment: commentId,
    });
    const replyCount = await PostsComments.countDocuments({
      parentComment: commentId,
    });
    const isLikedByMe = !!(await PostCommentUserLikes.findOne({
      comment: commentId,
      user: user._id,
    }));

    const enrichedComment = {
      ...comment,
      likeCount,
      replyCount,
      isLikedByMe,
    };

    return res.status(200).json({
      success: true,
      message: existingLike
        ? "Comment unliked successfully"
        : "Comment liked successfully",
      data: enrichedComment,
    });
  } catch (error) {
    console.error("Error in likeUnlikeComment:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while liking/unliking the comment",
    });
  }
};

const addCommentToPost = async (req, res) => {
  try {
    const { postId, parentCommentId, content } = req.body; // content of comment
    const user = req.user;

    if (!postId || !content) {
      return res.status(400).json({
        success: false,
        message: "postId and content are required",
      });
    }

    // Create the comment
    const newComment = await PostsComments.create({
      post: postId,
      user: user._id,
      parentComment: parentCommentId || null,
      content,
    });

    // Increment post's commentCount
    await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });

    // Enrich the comment with likeCount, replyCount, isLikedByMe
    const likeCount = 0; // new comment has 0 likes
    const replyCount = 0; // new comment has 0 replies
    const isLikedByMe = false;

    const populatedComment = await PostsComments.findById(newComment._id)
      .populate("user", "fullName userName profilePicture")
      .lean();

    const enrichedComment = {
      ...populatedComment,
      likeCount,
      replyCount,
      isLikedByMe,
    };

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: enrichedComment,
    });
  } catch (error) {
    console.error("Error in addCommentToPost:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding comment",
    });
  }
};

module.exports = {
  getPaginatedPosts,
  getPaginatedFeeds,
  getPostById,
  likeUnlikePost,
  getCommentsByPost,
  likeUnlikeComment,
  addCommentToPost,
};
