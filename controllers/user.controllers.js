const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();

const sgMail = require("@sendgrid/mail");

const User = require("../models/userModel");
const OtpVerification = require("../models/otpVerificationModel");

const getProfileInfo = async (req, res) => {
  try {
    const { user } = req;
    const { username } = req.query;

    //Get latest userdata
    const findCondition = username ? { userName } : { _id: user._id };
    const userDetails = await User.findOne(findCondition).select(
      "-password -__v -googleRefreshToken -connectGmail -email -mobileNo -status"
    );

    res.status(200).send({
      success: true,
      message: "User data fetched successfully",
      data: { ...userDetails?._doc },
    });
  } catch (err) {
    console.error("Error in Login API", err);
    return res.status(400).send({
      success: false,
      message: "Fail! Something error occurred in Login API",
      data: null,
    });
  }
};

// @Description:     Forgot Password of user
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        status: false,
        message: "Fail! Please Enter a valid Email",
        data: null,
      });
    }

    const userExists = await User.findOne({ email });
    if (!userExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! Not registered yet. Please register yourself first.",
        data: null,
      });
    }

    //Remove all old otp verification records if any
    await OtpVerification.deleteMany({ email });

    //Creat and Send the OTP
    const randomSixDigit = Math.floor(10000 + Math.random() * 90000);
    await OtpVerification.create({
      email,
      otp: randomSixDigit,
    });

    //Send Email
    const msg = {
      // replyTo: `${chat._id}@${agency}.estate-agent.io`,
      to: email,
      from: process.env.SENDGRID_EMAIL_ID,
      subject: `Edit - Reset password`,
      html: `
              <p>Hi</p> 
              <p>Please find your OTP ${randomSixDigit} </p>
              <br/>
              <br/>
              <p>Regards</p>
              <p>Edit</p>
            `,
    };
    await sgMail
      .send(msg)
      .then((resp) => {
        console.log("Email sent to: ", email, { resp });
        return res.status(200).send({
          status: true,
          message: `Success! Email sent to ${email}. Please check your email for the OTP.`,
          data: null,
        });
      })
      .catch((error) => {
        console.error(error);
        return res.status(400).send({
          status: false,
          message: `Fail! Unable to send Email ${error?.message}`,
          data: null,
        });
      });
  } catch (err) {
    console.error("Error in Forgot Password API", err);
    return res.status(400).send({
      status: false,
      message: "Fail! Something error occurred in Forgot Password API",
      data: null,
    });
  }
});

// @Description:     Verify the OTP
const otpVerification = asyncHandler(async (req, res) => {
  try {
    const { otp, email, password } = req.body;

    if (!email || !otp) {
      return res.status(400).send({
        status: false,
        message: "Fail! Email & OTP required",
        data: null,
      });
    }

    const userExists = await User.findOne({ email });
    if (!userExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! Not registered. Please register first.",
        data: null,
      });
    }

    const isOtpExists = await OtpVerification.findOne({
      email,
    });

    if (!isOtpExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! OTP not found. Please click forgot password again.",
        data: null,
      });
    }

    const { otp: storedOtp } = isOtpExists;

    if (storedOtp !== +otp) {
      return res.status(400).send({
        status: false,
        message: "Fail! OTP mismatch. Please enter correct OTP.",
        data: null,
      });
    }

    //Remove all old otp verification records
    await OtpVerification.deleteMany({ email });

    return res.status(200).send({
      status: true,
      message: `Success! OTP verified successfully.`,
      data: null,
    });
  } catch (err) {
    console.error("Error in OTP verification API", err);
    return res.status(400).send({
      status: false,
      message: "Fail! Something error occurred in OTP verification API",
      data: null,
    });
  }
});

// @Description:     Reset the Password of user
const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).send({
        status: false,
        message: "Fail! Email & password required",
        data: null,
      });
    }

    const userExists = await User.findOne({ email });
    if (!userExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! Not registered. Please register first.",
        data: null,
      });
    }

    //Update user's password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    await User.updateOne(
      { _id: userExists._id, email },
      { password: hashPassword }
    );

    return res.status(200).send({
      status: true,
      message: `Success! Password reset successfully. Please login.`,
      data: null,
    });
  } catch (err) {
    console.error("Error in Reset Password API", err);
    return res.status(400).send({
      status: false,
      message: "Fail! Something error occurred in Reset Password API",
      data: null,
    });
  }
});

// @Description:     Get the users list
const getUsersList = asyncHandler(async (req, res) => {
  try {
    const { user } = req;
    console.log("getUsersList =>", user);
    // const { email } = user;

    //Get latest userdata
    const userList = await User.find({}).select("-password -__v ");

    res.status(200).send({
      status: true,
      message: "Users list fetched successfully",
      data: userList,
    });
  } catch (err) {
    console.error("Error in Login API", err);
    return res.status(400).send({
      status: false,
      message: "Fail! Something error occurred in getUsersList API",
      data: null,
    });
  }
});

// @Description:     Upload the user profile image into S3
const uploadImage = asyncHandler(async (req, res) => {
  try {
    const { user } = req;
    const { email } = user;

    //Validate file
    if (!req.file) {
      return res.status(400).send({
        status: false,
        message: "Fail! Image file missing.",
        data: null,
      });
    }

    //Validate image file type
    if (
      req.file.mimetype !== "image/png" &&
      req.file.mimetype !== "image/jpeg"
    ) {
      return res.status(400).send({
        status: false,
        message: "Fail! Invalid file type. Only .jpg & .png files are allowed.",
        data: null,
      });
    }

    //Validate user
    const isUserExists = await User.findOne({ email }).select(
      "-password -__v "
    );
    if (!isUserExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! Not registered yet. Please register yourself first.",
        data: null,
      });
    }

    //Upload to S3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `profile-image/userId-${isUserExists._id}/${Date.now()}_${
        req.file.originalname
      }`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    };

    try {
      const uplodaData = await s3.upload(params).promise();
      console.log("Profile image uploaded successfully", uplodaData);

      return res.status(200).send({
        status: true,
        message: "Profile image uploaded successfully",
        data: { profileImageUrl: uplodaData.Location },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({
        status: false,
        message: "Error uploading Profile image",
        error: err,
      });
    }
  } catch (err) {
    console.error("Error in uploadImage API", err);
    return res.status(400).send({
      status: false,
      message: "Fail! Something error occurred in uploadImage API",
      data: null,
    });
  }
});

// @Description: Change user Password or EmailID
const updateUserEmailPassword = asyncHandler(async (req, res) => {
  try {
    const { user } = req;

    const { id: userID, email } = user;
    let changeType = "";

    //Get userdata
    const isUserExists = await User.findOne({ email }).select(
      "-password -__v "
    );
    if (!isUserExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! Not registered yet. Please register yourself first.",
        data: null,
      });
    }

    //Update user's password
    if (req.body?.password) {
      const { password } = req.body;
      changeType = "Password";
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      await User.updateOne({ email }, { password: hashPassword });
    }
    //Update user's email
    else if (req.body?.email) {
      changeType = "Email";
      const { email } = req.body;
      const isUserExists = await User.findOne({ email }).select(
        "-password -__v "
      );

      if (isUserExists) {
        return res.status(400).send({
          status: false,
          message:
            "Fail! Can't be updated as same email already exists. Please try with another email.",
          data: null,
        });
      } else {
        await User.updateOne(
          { _id: new mongoose.Types.ObjectId(userID) },
          { email, accessToken: "" }
        );
      }
    }

    return res.status(200).send({
      status: true,
      message: `Success! ${changeType} Updated successfully`,
      data: {},
    });
  } catch (err) {
    console.error("updateUserEmailPassword API error", err);
    return res.status(400).send({
      status: false,
      message: `Fail! Something error occurred in updateUserEmailPassword API. ${err?.message}`,
      data: null,
    });
  }
});

// @Description: Logout user
const getUserLogout = asyncHandler(async (req, res) => {
  try {
    const { user } = req;
    const { id: userID, email } = user;

    //Get userdata
    const isUserExists = await User.findOne({ email }).select(
      "-password -__v "
    );
    if (!isUserExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! Not registered yet. Please register yourself first.",
        data: null,
      });
    } else {
      await User.updateOne(
        { _id: new mongoose.Types.ObjectId(userID) },
        { accessToken: "" }
      );
    }

    return res.status(200).send({
      status: true,
      message: `Success! Log out successfully`,
      data: {},
    });
  } catch (err) {
    console.error("getUserLogout API error", err);
    return res.status(400).send({
      status: false,
      message: `Fail! Something error occurred in getUserLogout API. ${err?.message}`,
      data: null,
    });
  }
});

module.exports = {
  forgotPassword,
  otpVerification,
  resetPassword,
  getUsersList,
  uploadImage,
  updateUserEmailPassword,
  getUserLogout,
  getProfileInfo,
};
