const express = require("express");
const Learning = require("../models/learning");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get learning courses
router.get("/", authMiddleware, async (req, res) => {
  try {
    const courses = [
      {
        id: 1,
        title: "Stock Market Basics",
        description: "Learn the fundamentals of stock trading",
        progress: 100,
        modules: 5,
        completed: 5,
        lessons: [
          "What is a Stock?",
          "Stock Exchanges",
          "Reading Stock Charts",
          "Buy and Sell Orders",
          "Portfolio Basics",
        ],
      },
      {
        id: 2,
        title: "Technical Analysis",
        description: "Master chart patterns and trading signals",
        progress: 60,
        modules: 8,
        completed: 5,
        lessons: [
          "Moving Averages",
          "Support & Resistance",
          "Candlestick Patterns",
          "Volume Analysis",
          "Indicators",
        ],
      },
      {
        id: 3,
        title: "Portfolio Management",
        description: "Build and manage your investment portfolio",
        progress: 30,
        modules: 6,
        completed: 2,
        lessons: [
          "Asset Allocation",
          "Diversification",
          "Risk Assessment",
          "Rebalancing",
          "Tax Planning",
        ],
      },
      {
        id: 4,
        title: "Fundamental Analysis",
        description: "Analyze companies using financial statements",
        progress: 0,
        modules: 7,
        completed: 0,
        lessons: [
          "Reading Financial Statements",
          "P/E Ratios",
          "Cash Flow Analysis",
          "Valuation Methods",
        ],
      },
      {
        id: 5,
        title: "Risk Management for Beginners",
        description: "Learn stop-loss, position sizing, and drawdown control",
        progress: 15,
        modules: 6,
        completed: 1,
        lessons: [
          "What Is Risk in Trading?",
          "Position Size Basics",
          "Stop-Loss Placement",
          "Risk/Reward Ratio",
          "Managing Drawdowns",
          "Trading Journal Setup",
        ],
      },
      {
        id: 6,
        title: "Options Trading Essentials",
        description: "Understand calls, puts, and simple option strategies",
        progress: 0,
        modules: 7,
        completed: 0,
        lessons: [
          "Options Terminology",
          "Calls vs Puts",
          "Strike and Expiry",
          "Intrinsic vs Time Value",
          "Covered Call Basics",
          "Protective Put Basics",
          "Common Risks in Options",
        ],
      },
      {
        id: 7,
        title: "Macro Economics for Investors",
        description: "Use inflation, rates, and GDP trends in market decisions",
        progress: 40,
        modules: 5,
        completed: 2,
        lessons: [
          "Inflation and Markets",
          "Interest Rates and Stocks",
          "GDP Growth Signals",
          "Jobs Data and Volatility",
          "Sector Rotation Basics",
        ],
      },
    ];

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI learning practice (simulated)
router.get("/ai-practice", authMiddleware, async (req, res) => {
  try {
    const topic = (req.query.topic || "technical-analysis").toLowerCase();

    const practiceByTopic = {
      "technical-analysis": {
        topic: "Technical Analysis",
        summary:
          "Technical analysis studies price action and volume to identify probable trends, support/resistance, and momentum shifts.",
        questions: [
          {
            question: "Which indicator is commonly used to smooth short-term price noise?",
            options: ["Moving Average", "P/E Ratio", "Dividend Yield", "Book Value"],
            answer: "Moving Average",
          },
          {
            question: "A breakout above resistance with strong volume often suggests:",
            options: [
              "Potential bullish continuation",
              "Guaranteed reversal",
              "No market signal",
              "Accounting manipulation",
            ],
            answer: "Potential bullish continuation",
          },
        ],
      },
      "stock-basics": {
        topic: "Stock Market Basics",
        summary:
          "Stocks represent ownership in companies. Prices move with earnings expectations, macro signals, sentiment, and liquidity.",
        questions: [
          {
            question: "What does owning a stock represent?",
            options: [
              "Partial ownership in a company",
              "A fixed loan to a bank",
              "A government bond",
              "An options contract",
            ],
            answer: "Partial ownership in a company",
          },
          {
            question: "Which exchange is a major U.S. stock market?",
            options: ["NASDAQ", "OPEC", "IMF", "FIFA"],
            answer: "NASDAQ",
          },
        ],
      },
      "portfolio-management": {
        topic: "Portfolio Management",
        summary:
          "Portfolio management focuses on risk-adjusted returns using diversification, position sizing, and periodic rebalancing.",
        questions: [
          {
            question: "Diversification primarily helps to:",
            options: [
              "Reduce unsystematic risk",
              "Guarantee profits",
              "Eliminate all market risk",
              "Increase transaction taxes",
            ],
            answer: "Reduce unsystematic risk",
          },
          {
            question: "Rebalancing a portfolio means:",
            options: [
              "Restoring target asset weights",
              "Selling all holdings daily",
              "Only buying winners",
              "Avoiding bonds permanently",
            ],
            answer: "Restoring target asset weights",
          },
        ],
      },
    };

    const payload = practiceByTopic[topic] || practiceByTopic["technical-analysis"];
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get course details
router.get("/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseDetails = {
      id: courseId,
      title: "Stock Market Basics",
      description: "Learn the fundamentals of stock trading",
      modules: [
        {
          moduleId: 1,
          title: "What is a Stock?",
          content:
            "A stock represents ownership in a company. When you buy a stock, you become a partial owner.",
          duration: 10,
          assessment: {
            questions: 5,
            passingScore: 70,
          },
        },
        {
          moduleId: 2,
          title: "Stock Exchanges",
          content:
            "Stock exchanges like NYSE and NASDAQ are marketplaces where stocks are traded.",
          duration: 8,
          assessment: {
            questions: 4,
            passingScore: 70,
          },
        },
      ],
      progress: 100,
      userProgress: {
        modulesCompleted: 5,
        totalModules: 5,
        assessmentsCompleted: 5,
        averageScore: 85,
      },
    };

    res.json(courseDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update course progress
router.post("/:courseId/progress", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleCompleted, score } = req.body;

    // In production, save to database
    res.json({
      message: "Progress updated",
      courseId,
      moduleCompleted,
      score,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
