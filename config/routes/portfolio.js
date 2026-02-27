const express = require("express");
const Portfolio = require("../models/portfolio");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get user portfolio
router.get("/", authMiddleware, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ userId: req.userId });

    if (!portfolio) {
      portfolio = new Portfolio({
        userId: req.userId,
        totalValue: 150000,
        holdings: [
          {
            symbol: "AAPL",
            quantity: 50,
            buyPrice: 150,
            currentPrice: 180,
            sector: "Technology",
          },
          {
            symbol: "MSFT",
            quantity: 30,
            buyPrice: 300,
            currentPrice: 340,
            sector: "Technology",
          },
          {
            symbol: "JNJ",
            quantity: 25,
            buyPrice: 160,
            currentPrice: 165,
            sector: "Healthcare",
          },
        ],
      });
      await portfolio.save();
    }

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update portfolio
router.post("/update", authMiddleware, async (req, res) => {
  try {
    const { holdings, allocation, totalValue } = req.body;
    let portfolio = await Portfolio.findOne({ userId: req.userId });

    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.userId });
    }

    if (holdings) portfolio.holdings = holdings;
    if (allocation) portfolio.allocation = allocation;
    if (totalValue) portfolio.totalValue = totalValue;

    await portfolio.save();
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze portfolio
router.post("/analyze", authMiddleware, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.userId });

    const analysis = {
      totalValue: portfolio?.totalValue || 150000,
      allocation: portfolio?.allocation || {
        stocks: 60,
        bonds: 25,
        cash: 15,
      },
      performance: portfolio?.performance || {
        dayChange: 2.5,
        monthChange: 12.8,
        yearChange: 35.2,
      },
      riskExposure: portfolio?.riskExposure || {
        high: 30,
        medium: 50,
        low: 20,
      },
      recommendations: [
        "Consider increasing bond allocation for better stability",
        "Diversify tech holdings to reduce concentration risk",
        "Review sector concentration in healthcare",
        "Consider adding emerging market exposure",
      ],
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
