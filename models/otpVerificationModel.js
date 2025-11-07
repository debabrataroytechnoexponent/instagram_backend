const mongoose = require("mongoose");

const OtpVerificationSchema = mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: Number, required: true },
  },
  { timestamps: true }
);

const OtpVerification = mongoose.model(
  "OtpVerification",
  OtpVerificationSchema
);

module.exports = OtpVerification;
