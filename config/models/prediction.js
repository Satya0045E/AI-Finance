const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    userPrediction: {
      type: String,
      enum: ["UP", "DOWN"],
      required: true,
    },
    aiPrediction: {
      type: String,
      enum: ["UP", "DOWN"],
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    actualResult: {
      type: String,
      enum: ["UP", "DOWN"],
    },
    priceChange: {
      type: Number,
    },
    isCorrect: {
      type: Boolean,
    },
    explanation: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prediction", predictionSchema);
