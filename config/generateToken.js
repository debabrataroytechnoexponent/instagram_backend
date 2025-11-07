const jwt = require("jsonwebtoken");

const generateToken = (id, email, expiresIn) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET, {
    expiresIn: expiresIn || "1d",
  });
};

module.exports = generateToken;
