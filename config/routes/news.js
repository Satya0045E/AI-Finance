const express = require("express");
const mongoose = require("mongoose");
const News = require("../models/news");
const { analyzeFinanceSentiment, inferTickersFromText } = require("../services/financeModel");
const { apiKey, fetchFinancialNews } = require("../models/finnhub");

const router = express.Router();

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function getDefaultNews() {
  return [
    {
      id: 1,
      title: "Fed Signals Rate Cut in Q2 2026",
      content:
        "The Federal Reserve indicated potential interest rate cuts in the second quarter, boosting market optimism.",
      impact: "Positive",
      affectedStocks: ["SPY", "QQQ", "DIA"],
      sentiment: 0.78,
      source: "Reuters",
      date: new Date(),
    },
    {
      id: 2,
      title: "Tech Giants Report Strong Earnings",
      content:
        "Major tech companies beat earnings expectations by 15%, driving market rally.",
      impact: "Positive",
      affectedStocks: ["AAPL", "MSFT", "NVDA", "GOOGL"],
      sentiment: 0.82,
      source: "Bloomberg",
      date: new Date(Date.now() - 3600000),
    },
    {
      id: 3,
      title: "Oil Prices Rise Amid Supply Concerns",
      content:
        "Geopolitical tensions push oil prices up 3% as supply disruption fears mount.",
      impact: "Mixed",
      affectedStocks: ["XLE", "CVX", "COP"],
      sentiment: 0.45,
      source: "CNBC",
      date: new Date(Date.now() - 7200000),
    },
    {
      id: 4,
      title: "Crypto Market Gains Momentum",
      content:
        "Bitcoin surges past $50,000 as institutional adoption accelerates.",
      impact: "Positive",
      affectedStocks: ["MSTR", "CoinBase", "RIOT"],
      sentiment: 0.75,
      source: "CoinDesk",
      date: new Date(Date.now() - 10800000),
    },
    {
      id: 5,
      title: "Manufacturing Slows in Major Economies",
      content:
        "Global manufacturing indices show signs of slowdown, raising recession concerns.",
      impact: "Negative",
      affectedStocks: ["CAT", "DE", "BA"],
      sentiment: 0.25,
      source: "WSJ",
      date: new Date(Date.now() - 86400000),
    },
  ];
}

async function getLiveFinancialNews(limit = 20) {
  if (!apiKey) return [];

  const rawNews = await fetchFinancialNews("general");
  if (!Array.isArray(rawNews)) return [];

  return rawNews
    .filter((item) => item && item.headline)
    .slice(0, limit)
    .map((item, index) => {
      const title = item.headline || "Market Update";
      const content = item.summary || title;
      const combined = `${title} ${content}`;
      const sentimentInfo = analyzeFinanceSentiment(combined);
      const related = typeof item.related === "string"
        ? item.related.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const affectedStocks = related.length > 0 ? related : inferTickersFromText(combined);

      return {
        id: item.id || `live_${index}_${Date.now()}`,
        title,
        content,
        impact: sentimentInfo.impact,
        affectedStocks,
        sentiment: sentimentInfo.sentiment,
        source: item.source || "Finnhub",
        date: item.datetime ? new Date(item.datetime * 1000) : new Date(),
        url: item.url || "",
      };
    });
}

// Get all news
router.get("/", async (req, res) => {
  try {
    // Prefer live API news when FINNHUB_API_KEY is available.
    try {
      const liveNews = await getLiveFinancialNews(20);
      if (liveNews.length > 0) {
        return res.json(liveNews);
      }
    } catch (liveError) {
      console.warn("Live Finnhub news fetch failed:", liveError.message);
    }

    if (!isDbConnected()) {
      return res.json(getDefaultNews());
    }

    const news = await News.find().sort({ date: -1 }).limit(20);

    if (news.length === 0) {
      return res.json(getDefaultNews());
    }

    res.json(news);
  } catch (error) {
    console.error("News fetch failed, serving defaults:", error.message);
    res.json(getDefaultNews());
  }
});

// Create news (admin only in production)
router.post("/", async (req, res) => {
  try {
    const { title, content, impact, affectedStocks, sentiment, source } =
      req.body;
    const combinedText = `${title || ""} ${content || ""}`.trim();
    const mlSentiment = analyzeFinanceSentiment(combinedText);

    const news = new News({
      title,
      content,
      impact: impact || mlSentiment.impact,
      affectedStocks:
        Array.isArray(affectedStocks) && affectedStocks.length > 0
          ? affectedStocks
          : inferTickersFromText(combinedText),
      sentiment: typeof sentiment === "number" ? sentiment : mlSentiment.sentiment,
      source,
    });

    await news.save();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
