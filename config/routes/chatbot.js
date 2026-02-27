const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const Portfolio = require("../models/portfolio");
const Prediction = require("../models/prediction");
const {
  generateFinanceReply,
  inferTickersFromText,
  isFinanceQuery,
  forecastStock,
  trainWithRealtimeData,
  getModelState,
} = require("../services/financeModel");
const { fetchQuote, fetchFinancialNews } = require("../models/finnhub");
const { generateGroqFinanceReply } = require("../services/groqChat");

const router = express.Router();

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function buildFinanceContext(userId, message) {
  const tickers = inferTickersFromText(message);
  const primarySymbol = tickers[0] || "AAPL";

  const context = {
    requestedTickers: tickers,
    primarySymbol,
    forecast: null,
    latestQuote: null,
    portfolio: null,
    recentPredictions: [],
    marketNews: [],
    modelState: getModelState(),
  };

  try {
    await trainWithRealtimeData([primarySymbol], { minIntervalMs: 45000 });
    context.forecast = forecastStock(primarySymbol, message);
    context.modelState = getModelState();
  } catch (error) {
    // keep context without trained forecast enrichment
  }

  try {
    context.latestQuote = await fetchQuote(primarySymbol);
  } catch (error) {
    context.latestQuote = null;
  }

  try {
    const headlines = await fetchFinancialNews("general");
    context.marketNews = Array.isArray(headlines)
      ? headlines.slice(0, 5).map((item) => ({
          headline: item.headline,
          summary: item.summary,
          source: item.source,
          related: item.related,
          datetime: item.datetime,
        }))
      : [];
  } catch (error) {
    context.marketNews = [];
  }

  if (isDbConnected()) {
    try {
      const portfolio = await Portfolio.findOne({ userId }).lean();
      if (portfolio) {
        context.portfolio = {
          totalValue: portfolio.totalValue,
          allocation: portfolio.allocation,
          topHoldings: (portfolio.holdings || []).slice(0, 5),
        };
      }
    } catch (error) {
      context.portfolio = null;
    }

    try {
      const predictions = await Prediction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      context.recentPredictions = predictions;
    } catch (error) {
      context.recentPredictions = [];
    }
  }

  return context;
}

// Finance-only Groq chatbot with platform data context
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const text = (message || "").trim();

    if (!text) {
      return res.status(400).json({ error: "message is required" });
    }

    const financeCheck = isFinanceQuery(text);
    if (!financeCheck.isFinance) {
      return res.json({
        reply:
          "I can only handle finance questions. Ask about stocks, portfolio risk, market outlook, predictions, or financial news.",
        intent: "non_finance",
        modelConfidence: Number((financeCheck.probability * 100).toFixed(2)),
        timestamp: new Date(),
      });
    }

    const context = await buildFinanceContext(req.userId, text);
    let reply = "";
    let provider = "local-fallback";

    try {
      reply = await generateGroqFinanceReply({
        userMessage: text,
        context,
      });
      provider = "groq";
    } catch (groqError) {
      // Fallback to local finance model reply
      const output = generateFinanceReply(text);
      reply = output.reply;
    }

    res.json({
      reply,
      intent: "finance_assistant",
      provider,
      groqUsed: provider === "groq",
      modelConfidence: Number((financeCheck.probability * 100).toFixed(2)),
      contextSummary: {
        primarySymbol: context.primarySymbol,
        hasForecast: Boolean(context.forecast),
        hasQuote: Boolean(context.latestQuote),
        hasPortfolio: Boolean(context.portfolio),
        predictionsCount: context.recentPredictions.length,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
