const express = require("express");
const multer = require("multer");
const upload = multer();

const {
  uploadImage,
  getProfileInfo
} = require("../controllers/user.controllers");
const { authGuard } = require("../middleware/auth.middleware");

const router = express.Router();

/** Authentication routes */
// router.route("/").get(authGuard, allUsers);
// router.route("/registration").post(registerUser);
// router.route("/login").post(authUser);
// router.route("/forgot-password").post(forgotPassword);
// router.route("/otp-verification").post(otpVerification);
// router.route("/reset-password").post(resetPassword);
// router.route("/me-api").get(authGuard, getUserDetails);
// router.route("/logout").get(authGuard, getUserLogout);

//Auth0 routes
// router.route("/get-google-login-auth0").get(getGoogleLoginAuth0);
// router.route("/auth0-email-webhook").get(authGoogleUserAuth0);

//Google OAuth login/registration routes

router
  .route("/upload-profile-picture")
  .post(authGuard, upload.single("profile_picture"), uploadImage);
router.get("/profile", authGuard, getProfileInfo);


module.exports = router;
