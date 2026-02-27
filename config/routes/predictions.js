const express = require("express");
const mongoose = require("mongoose");
const Prediction = require("../models/prediction");
const authMiddleware = require("../middleware/authMiddleware");
const {
  predictDirection,
  forecastStock,
  trainWithRealtimeData,
  getModelState,
} = require("../services/financeModel");

const router = express.Router();
const demoPredictions = [];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// Get ML forecast for a symbol (without saving user prediction)
router.get("/model/:symbol", authMiddleware, async (req, res) => {
  try {
    const symbol = (req.params.symbol || "").toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }

    const training = await trainWithRealtimeData([symbol], { minIntervalMs: 45000 });
    const forecast = forecastStock(symbol, `${symbol} stock prediction`);
    res.json({
      ...forecast,
      training,
      modelState: getModelState(),
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force retrain model from realtime feed
router.post("/model/train", authMiddleware, async (req, res) => {
  try {
    const symbols = Array.isArray(req.body?.symbols) && req.body.symbols.length
      ? req.body.symbols
      : ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA"];
    const training = await trainWithRealtimeData(symbols, { force: true });
    res.json({
      message: "Realtime training completed",
      training,
      modelState: getModelState(),
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create prediction
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { symbol, userPrediction } = req.body;
    const normalizedSymbol = (symbol || "").toUpperCase();

    if (!normalizedSymbol || !["UP", "DOWN"].includes(userPrediction)) {
      return res.status(400).json({ error: "symbol and valid userPrediction (UP/DOWN) are required" });
    }

    const training = await trainWithRealtimeData([normalizedSymbol], { minIntervalMs: 45000 });
    const modelOutput = predictDirection({
      symbol: normalizedSymbol,
      userPrediction,
      contextText: `${normalizedSymbol} ${userPrediction}`,
    });

    const predictionPayload = {
      userId: req.userId,
      symbol: normalizedSymbol,
      userPrediction,
      aiPrediction: modelOutput.aiPrediction,
      aiConfidence: modelOutput.aiConfidence,
      actualResult: modelOutput.actualResult,
      priceChange: modelOutput.priceChange,
      isCorrect: modelOutput.isCorrect,
      explanation: modelOutput.explanation,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isDbConnected()) {
      try {
        const prediction = new Prediction(predictionPayload);
        await prediction.save();
        return res.json({
          ...prediction.toObject(),
          analysis: modelOutput.analysis,
          training,
          modelState: getModelState(),
        });
      } catch (dbError) {
        console.warn("Prediction DB write failed, using demo memory store:", dbError.message);
      }
    }

    const demoPrediction = {
      _id: `demo_pred_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...predictionPayload,
      analysis: modelOutput.analysis,
      training,
      modelState: getModelState(),
    };
    demoPredictions.unshift(demoPrediction);
    res.json(demoPrediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user predictions
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (isDbConnected()) {
      try {
        const predictions = await Prediction.find({ userId: req.userId }).sort({
          createdAt: -1,
        });
        return res.json(predictions);
      } catch (dbError) {
        console.warn("Prediction DB read failed, using demo memory store:", dbError.message);
      }
    }

    const predictions = demoPredictions.filter((p) => p.userId === req.userId);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prediction stats
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    let predictions = [];
    if (isDbConnected()) {
      try {
        predictions = await Prediction.find({ userId: req.userId });
      } catch (dbError) {
        console.warn("Prediction stats DB read failed, using demo memory store:", dbError.message);
      }
    }
    if (!predictions.length) {
      predictions = demoPredictions.filter((p) => p.userId === req.userId);
    }

    const correct = predictions.filter((p) => p.isCorrect).length;
    const accuracy =
      predictions.length > 0
        ? ((correct / predictions.length) * 100).toFixed(2)
        : 0;

    res.json({
      totalPredictions: predictions.length,
      correctPredictions: correct,
      accuracy: accuracy,
      recentPredictions: predictions.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
