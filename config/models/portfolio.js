const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    holdings: [
      {
        symbol: String,
        quantity: Number,
        buyPrice: Number,
        currentPrice: Number,
        sector: String,
      },
    ],
    totalValue: {
      type: Number,
      default: 0,
    },
    allocation: {
      stocks: { type: Number, default: 60 },
      bonds: { type: Number, default: 25 },
      cash: { type: Number, default: 15 },
    },
    performance: {
      dayChange: { type: Number, default: 0 },
      monthChange: { type: Number, default: 0 },
      yearChange: { type: Number, default: 0 },
    },
    riskExposure: {
      high: { type: Number, default: 30 },
      medium: { type: Number, default: 50 },
      low: { type: Number, default: 20 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
