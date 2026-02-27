const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
    },
    impact: {
      type: String,
      enum: ["Positive", "Negative", "Mixed"],
      default: "Mixed",
    },
    affectedStocks: [String],
    sentiment: {
      type: Number,
      min: 0,
      max: 1,
    },
    source: String,
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("News", newsSchema);
