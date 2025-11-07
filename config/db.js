const mongoose = require("mongoose");
// mongoose.set("debug", true); //Uncomment it to check Mongoose query logs
const colors = require("colors");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Errors: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;
