const express = require("express");
const router = express.Router();

const {
  validateApiData,
} = require("../middleware/payload.validation.middleware");
const {
  appleLoginValidator,
  googleLoginValidator,
} = require("../middleware/auth.validator");
const {
  appleAuthGuard,
  googleAuthGuard,
  authGuard,
} = require("../middleware/auth.middleware");
const {
  loginWithApple,
  loginWithGoogle,
  registerUser,
  authUser,
  getUserDetails,
} = require("../controllers/auth.controller");

router.post(
  "/login-with-apple",
  appleLoginValidator,
  validateApiData,
  appleAuthGuard,
  loginWithApple
);
router.post(
  "/login-with-google",
  googleLoginValidator,
  validateApiData,
  googleAuthGuard,
  loginWithGoogle
);

router.post("/signup", registerUser);
router.post("/login", authUser);
router.get("/me", authGuard, getUserDetails);
// router.post("/forgot-password").post(forgotPassword);
// router.post("/otp-verification").post(otpVerification);
// router.post("/reset-password").post(resetPassword);
// router.post("/logout").get(authGuard, getUserLogout);
module.exports = router;
