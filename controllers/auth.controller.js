const mongoose = require("mongoose");
var createError = require("http-errors");
const bcrypt = require("bcryptjs");

const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/userModel");

const generateToken = require("../config/generateToken");
const { generatePassword } = require("../utils/helper");

const loginWithApple = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { email, givenName, familyName } = req.body;
    const { appleTokenPayload } = req;
    const appleId = appleTokenPayload.sub;

    // const fullName = givenName + " " + familyName;
    // const firstName = givenName;
    // const lastName = familyName;
    let updatePayload = {};
    let userExists = await User.findOne({ appleId });
    if (!userExists) {
      if (!email) {
        return next(
          createError(
            400,
            "Email is mandatory for first time login with apple",
            {}
          )
        );
      }
      userExists = await User.findOne({ email });
      if (!userExists) {
        const password = await generatePassword(8);
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        createdUser = await User.create(
          [
            {
              email,
              appleId,
              password: hashPassword,
            },
          ],
          { session }
        );
        userExists = createdUser[0];

        const createUserProfileStyle = await ProfileLifeStyle.create(
          [
            {
              user: userExists._id,
              profileImage: picture,
              firstName: givenName,
              lastName: familyName,
              // dob,
              // phone,
              // city,
              // state,
              // gender,
            },
          ],
          { session }
        );
      } else {
        updatePayload = {
          appleId,
        };
      }
    }

    const accessToken = generateToken(userExists._id);
    updatePayload["accessToken"] = accessToken;
    await User.updateOne({ email }, updatePayload, { session });

    // Commit transaction (save all changes)
    await session.commitTransaction();
    session.endSession();
    const userProfileDetails = await ProfileLifeStyle.findOne({
      user: userExists._id,
    }).select("-__v");
    const responseData = {
      _id: userExists._id,
      accessToken,
      email: userExists.email,
      connectGmail: userExists.connectGmail,
      connectGoogleCalendar: userExists.connectGoogleCalendar,
      status: userExists.status,
      lastName: userProfileDetails?.lastName,
      profileImage: userProfileDetails?.profileImage,
      firstName: userProfileDetails?.firstName,
    };
    return res.status(200).send({
      status: true,
      message: "Success! Registration successful",
      data: { ...responseData },
    });
  } catch (error) {
    // Rollback if anything fails
    await session.abortTransaction();
    session.endSession();
    return next(createError(500, error.message, { error }));
  } finally {
    session.endSession();
  }
};
const loginWithGoogle = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { sub, email, email_verified, name, picture, givenName, familyName } =
      req.user;
    const { refresh_token } = req.userGoogleTokens;

    if (!email)
      return res
        .status(401)
        .send("User info not successful. Please login again");
    let updatePayload = {};
    let userExists = await User.findOne({ email });

    //Register new
    if (!userExists) {
      const password = await generatePassword(8);
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      const createdUser = await User.create(
        [
          {
            // givenName,
            // familyName,
            email,
            password: hashPassword,
            googleId: sub,
            googleRefreshToken: refresh_token,
          },
        ],
        { session }
      );
      userExists = createdUser[0];

      const createUserProfileStyle = await ProfileLifeStyle.create(
        [
          {
            user: userExists._id,
            profileImage: picture,
            firstName: givenName,
            lastName: familyName,
            // dob,
            // phone,
            // city,
            // state,
            // gender,
          },
        ],
        { session }
      );
    }
    //OR Update refresh token
    else {
      updatePayload = {
        googleRefreshToken: refresh_token,
        googleId: sub,
      };
    }

    const accessToken = generateToken(userExists._id);
    updatePayload["accessToken"] = accessToken;
    await User.updateOne(
      { email },
      { $set: updatePayload }, // wrap in $set to update only specific fields
      { session }
    );

    // Commit transaction (save all changes)
    await session.commitTransaction();
    session.endSession();

    const userProfileDetails = await ProfileLifeStyle.findOne({
      user: userExists._id,
    }).select("-__v");

    const responseData = {
      _id: userExists._id,
      accessToken,
      email: userExists.email,
      connectGmail: userExists.connectGmail,
      connectGoogleCalendar: userExists.connectGoogleCalendar,
      status: userExists.status,
      lastName: userProfileDetails?.lastName,
      profileImage: userProfileDetails?.profileImage,
      firstName: userProfileDetails?.firstName,
    };
    return res.status(200).send({
      status: true,
      message: "Google login successful",
      data: { ...responseData },
    });
  } catch (error) {
    console.log(error);
    // Rollback if anything fails
    await session.abortTransaction();
    session.endSession();
    return next(createError(500, error.message, { error }));
  } finally {
    session.endSession();
  }
};
// @Description:     Register a new user
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, userName, mobileNo } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: "Fail! Please Enter Email & Password",
        data: null,
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).send({
        success: false,
        message: "Fail! Already registered. Try logging in.",
        data: null,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      fullName,
      userName,
      mobileNo,
      password: hashPassword,
    });

    const accessToken = generateToken(user._id, email, "1d");
    const refreshToken = generateToken(user._id, email, "30d");
    delete user?._doc?.password;

    if (user) {
      const responseData = {
        _id: user._id,
        accessToken,
        refreshToken,
      };
      return res.status(200).send({
        success: true,
        message: "Success! Registration successful",
        data: {
          ...responseData,
        },
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Fail! User not found",
        data: null,
      });
    }
  } catch (err) {
    console.error("Error in Registration API", err);
    return res.status(400).send({
      success: false,
      message: "Fail! Something error occurred in Registration API",
      data: null,
    });
  }
};

// @Description:     Authenticate the user
const authUser = async (req, res) => {
  try {
    const { email, password, isFaceIdEnable } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        status: false,
        message: "Fail! Please Enter Email & Password",
        data: null,
      });
    }

    const isUserExists = await User.findOne({ email });
    if (!isUserExists) {
      return res.status(400).send({
        status: false,
        message: "Fail! Not registered yet. Please register yourself first.",
        data: null,
      });
    }

    const accessToken = generateToken(isUserExists._id, isUserExists.email, "1d");
    const refreshToken = generateToken(isUserExists._id, isUserExists.email, "30d");
    
    if (isUserExists && (await isUserExists.matchPassword(password))) {
      const responseData = {
        accessToken,
        refreshToken,
      };
      res.status(200).send({
        success: true,
        message: "Success! Login successful",
        data: {
          ...responseData,
        },
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Fail! Invalid Email or Password",
        data: null,
      });
    }
  } catch (err) {
    console.error("Error in Login API", err);
    return res.status(400).send({
      success: false,
      message: "Fail! Something error occurred in Login API",
      data: null,
    });
  }
};
// @Description:     Get the user details
const getUserDetails = async (req, res) => {
  try {
    const { user } = req;
    const { email } = user;

    //Get latest userdata
    const userDetails = await User.findOne({ email }).select("-password -__v");

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
module.exports = {
  loginWithApple,
  loginWithGoogle,
  registerUser,
  authUser,
  getUserDetails,
};
