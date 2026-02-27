const express = require("express");
const { fetchQuote } = require("../models/finnhub");

const router = express.Router();

function fallbackOverview() {
  return [
    {
      key: "sp500",
      title: "S&P 500",
      value: "5,234.80",
      changeText: "+1.45%",
      trend: "up",
      actionLabel: "Track Index ETF",
      actionUrl: "prediction.html?symbol=SPY",
    },
    {
      key: "nasdaq",
      title: "NASDAQ",
      value: "16,852.30",
      changeText: "+2.10%",
      trend: "up",
      actionLabel: "Analyze QQQ",
      actionUrl: "prediction.html?symbol=QQQ",
    },
    {
      key: "btc",
      title: "BTC/USDT",
      value: "$52,834",
      changeText: "+3.82%",
      trend: "up",
      actionLabel: "Crypto News",
      actionUrl: "dashboard.html#news",
    },
  ];
}

function formatCardValue(prefix, value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${prefix}${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function toOverviewCard({ key, title, quote, prefix, actionLabel, actionUrl }) {
  const change = Number(quote?.dp || 0);
  return {
    key,
    title,
    value: formatCardValue(prefix, Number(quote?.c)),
    changeText: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
    trend: change >= 0 ? "up" : "down",
    actionLabel,
    actionUrl,
  };
}

router.get("/overview", async (req, res) => {
  try {
    const [spy, qqq, btc] = await Promise.all([
      fetchQuote("SPY"),
      fetchQuote("QQQ"),
      fetchQuote("BINANCE:BTCUSDT"),
    ]);

    const cards = [
      toOverviewCard({
        key: "sp500",
        title: "S&P 500",
        quote: spy,
        prefix: "",
        actionLabel: "Track Index ETF",
        actionUrl: "prediction.html?symbol=SPY",
      }),
      toOverviewCard({
        key: "nasdaq",
        title: "NASDAQ",
        quote: qqq,
        prefix: "",
        actionLabel: "Analyze QQQ",
        actionUrl: "prediction.html?symbol=QQQ",
      }),
      toOverviewCard({
        key: "btc",
        title: "BTC/USDT",
        quote: btc,
        prefix: "$",
        actionLabel: "Crypto News",
        actionUrl: "dashboard.html#news",
      }),
    ];

    res.json(cards);
  } catch (error) {
    console.warn("Market overview live fetch failed, serving fallback:", error.message);
    res.json(fallbackOverview());
  }
});

module.exports = router;
