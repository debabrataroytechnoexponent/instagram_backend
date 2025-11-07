const { body } = require("express-validator");

const appleLoginValidator = [
  body("token")
    .exists({ checkFalsy: true })
    .withMessage("Token is required")
    .trim()
    .escape(),
  body("givenName")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Given name must be a string")
    .trim()
    .escape(),

  body("familyName")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Family name must be a string")
    .trim()
    .escape(),

  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Email must be a valid email address"),
  // .normalizeEmail(),
];

const googleLoginValidator = [
  body("codeVerifier")
    .exists({ checkFalsy: true })
    .withMessage("Code Verifier is required")
    .trim(),
    // .escape(),
  body("authorizationCode")
    .exists({ checkFalsy: true })
    .withMessage("Autorization code is required")
    .trim(),
    // .escape(),
];

module.exports = {
  appleLoginValidator,
  googleLoginValidator
};
