const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("../db");

// Routes
const authRoutes = require("./auth");
const predictionRoutes = require("./predictions");
const portfolioRoutes = require("./portfolio");
const newsRoutes = require("./news");
const chatbotRoutes = require("./chatbot");
const learningRoutes = require("./learning");
const stocksRoutes = require("./stocks");
const marketRoutes = require("./market");
const authMiddleware = require("../middleware/authMiddleware");

const app = express();

// Connect to MongoDB (but do not block demo mode if unavailable)
connectDB().catch(() => {
  console.log("Running without database connection");
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + "/../../"));

app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/chat", chatbotRoutes);
app.use("/api/stocks", stocksRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/learning", learningRoutes);

app.get("/api/dashboard", authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        name: "User",
        level: "Intermediate",
        progress: 65,
      },
      stats: {
        predictionsAccuracy: 62,
        portfolioValue: 150000,
        learningProgress: 75,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
