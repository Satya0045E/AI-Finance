const express = require("express");

const router = express.Router();

// Realistic stock data for major companies
const stocksData = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    currentPrice: 182.52,
    dayChange: 2.45,
    dayChangePercent: 1.36,
    yearHigh: 199.62,
    yearLow: 124.17,
    marketCap: "2.8T",
    peRatio: 28.5,
    dividendYield: 0.42,
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    sector: "Technology",
    currentPrice: 378.91,
    dayChange: 5.23,
    dayChangePercent: 1.40,
    yearHigh: 415.79,
    yearLow: 213.43,
    marketCap: "2.82T",
    peRatio: 32.8,
    dividendYield: 0.74,
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    sector: "Technology",
    currentPrice: 139.63,
    dayChange: 1.82,
    dayChangePercent: 1.31,
    yearHigh: 150.39,
    yearLow: 102.21,
    marketCap: "1.83T",
    peRatio: 25.3,
    dividendYield: 0.0,
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    sector: "Automotive",
    currentPrice: 238.45,
    dayChange: -3.21,
    dayChangePercent: -1.33,
    yearHigh: 278.98,
    yearLow: 152.37,
    marketCap: "740B",
    peRatio: 58.2,
    dividendYield: 0.0,
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    sector: "Consumer",
    currentPrice: 172.39,
    dayChange: 2.15,
    dayChangePercent: 1.26,
    yearHigh: 188.65,
    yearLow: 101.26,
    marketCap: "1.78T",
    peRatio: 42.1,
    dividendYield: 0.0,
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Technology",
    currentPrice: 875.43,
    dayChange: 18.52,
    dayChangePercent: 2.16,
    yearHigh: 915.79,
    yearLow: 408.84,
    marketCap: "2.16T",
    peRatio: 68.5,
    dividendYield: 0.02,
  },
};

function formatTimestamp(date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateIntradayTimestamps(days = 30) {
  const timestamps = [];

  // Market-hour points: 9:30 AM through 3:30 PM (hourly)
  for (let i = days; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);

    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let hour = 9; hour <= 15; hour++) {
      const point = new Date(day);
      point.setHours(hour, 30, 0, 0);
      timestamps.push(point);
    }
  }

  return timestamps;
}

// Generate chart data for a stock
function generateChartData(symbol, days = 30) {
  const stock = stocksData[symbol] || stocksData.AAPL;
  const timestamps = generateIntradayTimestamps(days);
  const labels = timestamps.map((timestamp) => formatTimestamp(timestamp));
  const data = [];
  const ohlc = [];
  
  let closePrice = stock.currentPrice;
  
  // Generate synthetic intraday movement
  for (let i = 0; i < labels.length; i++) {
    const open = closePrice;
    const drift = (Math.random() - 0.5) * 1.5;
    closePrice = Math.max(open + drift, stock.currentPrice * 0.85);
    const spread = Math.max(0.2, Math.abs(closePrice - open) * 0.6 + Math.random() * 0.5);
    const high = Math.max(open, closePrice) + spread;
    const low = Math.min(open, closePrice) - spread;

    ohlc.push({
      t: timestamps[i].toISOString(),
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(closePrice.toFixed(2)),
    });
    data.push(parseFloat(closePrice.toFixed(2)));
  }
  
  return { labels, data, ohlc };
}

// Get all stocks
router.get("/", (req, res) => {
  try {
    const stocks = Object.values(stocksData);
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chart data for multiple stocks
router.get("/chart/compare", (req, res) => {
  try {
    const symbols = req.query.symbols?.split(",") || ["AAPL", "MSFT", "GOOGL"];
    const days = parseInt(req.query.days) || 30;
    
    const timestamps = generateIntradayTimestamps(days);
    const labels = timestamps.map((timestamp) => formatTimestamp(timestamp));
    const datasets = [];
    
    const colors = [
      { border: "rgb(75, 192, 192)", bg: "rgba(75, 192, 192, 0.1)" },
      { border: "rgb(153, 102, 255)", bg: "rgba(153, 102, 255, 0.1)" },
      { border: "rgb(255, 159, 64)", bg: "rgba(255, 159, 64, 0.1)" },
      { border: "rgb(54, 162, 235)", bg: "rgba(54, 162, 235, 0.1)" },
      { border: "rgb(201, 203, 207)", bg: "rgba(201, 203, 207, 0.1)" },
    ];
    
    symbols.forEach((symbol, idx) => {
      const stock = stocksData[symbol.toUpperCase()];
      if (stock) {
        let price = 100; // Normalized starting price
        const data = [];
        
        for (let i = 0; i < labels.length; i++) {
          const change = (Math.random() - 0.5) * 1.1;
          price = Math.max(price + change, 80);
          data.push(parseFloat(price.toFixed(2)));
        }

        const color = colors[idx % colors.length];
        
        datasets.push({
          label: symbol.toUpperCase(),
          data,
          borderColor: color.border,
          backgroundColor: color.bg,
          tension: 0.4,
          fill: false,
          borderWidth: 2,
        });
      }
    });
    
    res.json({
      labels,
      datasets,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific stock with chart data
router.get("/:symbol", (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = stocksData[symbol.toUpperCase()];

    if (!stock) {
      return res.status(404).json({ error: "Stock not found" });
    }

    const chartData = generateChartData(symbol.toUpperCase());

    res.json({
      ...stock,
      chart: chartData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
