const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is not set. Running in DEMO MODE");
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
    return true;
  } catch (error) {
    console.warn("MongoDB connection failed. Running in DEMO MODE");
    console.warn("Error:", error.message);
    return false;
  }
};

module.exports = connectDB;
