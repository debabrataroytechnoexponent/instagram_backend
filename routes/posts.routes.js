const express = require("express");
const router = express.Router();

const {
  validateApiData,
} = require("../middleware/payload.validation.middleware");

const { authGuard } = require("../middleware/auth.middleware");

const {
  getPaginatedPosts,
  getPostById,
  likeUnlikePost,
  getCommentsByPost,
  likeUnlikeComment,
  addCommentToPost,
  getPaginatedFeeds,
} = require("../controllers/posts.controller");

router.get("/", authGuard, getPaginatedPosts);
router.get("/feeds", authGuard, getPaginatedFeeds);
router.get("/details", authGuard, getPostById);
router.post("/like", authGuard, likeUnlikePost);
router.get("/comments", authGuard, getCommentsByPost);
router.post("/comments/like", authGuard, likeUnlikeComment);
router.post("/comments/add", authGuard, addCommentToPost);

module.exports = router;
