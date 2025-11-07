const express = require("express");
const router = express.Router();

const {
  validateApiData,
} = require("../middleware/payload.validation.middleware");

const { authGuard } = require("../middleware/auth.middleware");

const {
  getPaginatedPosts,
  getPostById,
} = require("../controllers/posts.controller");

router.get("/", authGuard, getPaginatedPosts);
router.get("/details", authGuard, getPostById);

module.exports = router;
