const Post = require("../models/posts.model");

const getPaginatedPosts = async (req, res) => {
  try {
    // Default pagination setup
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // Fetch posts with user info populated (only needed fields)
    const posts = await Post.find({})
      .populate("user", "fullName userName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Total count for pagination metadata
    const totalPosts = await Post.countDocuments();

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


const getPostById = async (req, res) => {
  try {
    const { postId } = req.query;

    const post = await Post.findById(postId)
      .populate("user", "fullName userName profilePicture")
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post fetched successfully",
      data: post,
    });
  } catch (error) {
    console.error("Error in getPostById:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching post details",
    });
  }
};

module.exports = {
  getPaginatedPosts,
  getPostById,
};
