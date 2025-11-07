const jwt = require("jsonwebtoken");
var createError = require("http-errors");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/userModel.js");
const asyncHandler = require("express-async-handler");

const authGuard = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).send({
          status: false,
          message: "Fail! Not authorized, no token found.",
          data: null,
        });
      }

      //decodes token id
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.id) {
        return res.status(401).send({
          status: false,
          message: "Fail! Not authorized, Token verifitaion error.",
          data: null,
        });
      }

      const getUser = await User.findById(decoded.id).select("-password");

      if (!getUser) {
        return res.status(401).send({
          status: false,
          message:
            "Fail! Not authorized, User not found as the requested token mismatched.",
          data: null,
        });
      }

      req.user = getUser;

      next();
    } catch (error) {
      console.error("Error in auth Guard =>", error);

      if (error.name === "TokenExpiredError") {
        console.error("JWT expired");
        return res.status(401).send({
          status: false,
          message: `Fail! Not authorized, JWT expired. Please login again`,
          data: null,
        });
      } else {
        console.error("JWT invalid:", error.message);
        return res.status(401).send({
          status: false,
          message: `Fail! Not authorized, something error occurred in token verification process.${error.message}`,
          data: null,
        });
      }
    }
  } else {
    return res.status(401).send({
      status: false,
      message: "Fail! Not authorized, no Bearer Token found.",
      data: null,
    });
  }
});
const appleAuthGuard = async (req, res, next) => {
  try {
    const token = req.body.token;
    const response = await axios.get("https://appleid.apple.com/auth/keys");
    const publicKeys = response.data;
    const decodedToken = await jwt.decode(token, { complete: true });
    if (!decodedToken || !decodedToken.header || !decodedToken.payload) {
      throw new Error("Unathourized");
    }
    // Verify the algorithm
    if (decodedToken.header.alg !== "RS256") {
      throw new Error("Unathourized");
    }

    const allowedAud = [process.env.APPLE_AUDIENCE];
    if (allowedAud.indexOf(decodedToken.payload["aud"]) < 0) {
      throw new UnauthorizedException();
    }
    // Verify the key ID (kid)
    // const publicKey = publicKeys[decodedToken.header.kid];
    const publicKey = publicKeys.keys.find(
      (key) => key.kid === decodedToken.header.kid
    ).n;
    // console.log(publicKey);
    if (!publicKey) {
      throw new Error("Unathourized");
    }

    req.appleTokenPayload = decodedToken.payload;
    next();
  } catch (error) {
    return next(createError(401, error.message, {}));
  }
};
const googleAuthGuard = async (req, res, next) => {
  try {
    const authorizationCode = req.body.authorizationCode;
    const codeVerifier = req.body.codeVerifier;
    const tokenUrl = "https://oauth2.googleapis.com/token";
    
    const payload = {
      code: authorizationCode,
      client_id: process.env.GOOGLE_CLIENT_ID_IOS,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI_IOS,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    };
    const tokenResponse = await axios.post(tokenUrl, payload);
    req.userGoogleTokens = tokenResponse.data;

    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${req.userGoogleTokens.id_token}`;
    const response = await axios.get(url);
    req.user = response.data;

    next();
  } catch (error) {
    return next(createError(401, error.message, {}));
  }
};
module.exports = { authGuard, appleAuthGuard, googleAuthGuard };
