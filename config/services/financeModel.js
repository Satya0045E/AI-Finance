const { apiKey, fetchFinancialNews, fetchQuote } = require("../models/finnhub");

const FINANCE_KEYWORDS = [
  "stock",
  "stocks",
  "equity",
  "equities",
  "portfolio",
  "invest",
  "investment",
  "trading",
  "trade",
  "market",
  "markets",
  "economy",
  "inflation",
  "interest rate",
  "fed",
  "earnings",
  "revenue",
  "valuation",
  "risk",
  "asset",
  "diversification",
  "technical analysis",
  "fundamental analysis",
  "sentiment",
  "crypto",
  "bitcoin",
  "etf",
  "bond",
  "bonds",
  "nasdaq",
  "nyse",
  "sp500",
  "s&p",
  "bullish",
  "bearish",
  "buy",
  "sell",
  "price target",
];

const POSITIVE_WORDS = [
  "beat",
  "growth",
  "surge",
  "rally",
  "strong",
  "record",
  "bullish",
  "upgrade",
  "gain",
  "gains",
  "profit",
  "expansion",
  "optimistic",
  "improving",
  "momentum",
];

const NEGATIVE_WORDS = [
  "miss",
  "decline",
  "drop",
  "selloff",
  "weak",
  "downgrade",
  "loss",
  "losses",
  "recession",
  "bearish",
  "risk",
  "uncertainty",
  "volatility",
  "slowdown",
  "inflation",
];

const INTENT_KEYWORDS = {
  portfolio_risk: ["portfolio", "risk", "allocation", "diversify", "rebalance"],
  trade_decision: ["buy", "sell", "entry", "exit", "position"],
  market_outlook: ["market", "economy", "macro", "fed", "inflation", "rate"],
  learning: ["learn", "understand", "course", "study", "explain"],
  prediction: ["predict", "forecast", "probability", "direction"],
  news_impact: ["news", "headline", "impact", "sentiment"],
};

const DEFAULT_TRAIN_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA"];

const adaptiveModelState = {
  initializedAt: new Date(),
  lastTrainedAt: null,
  trainedSamples: 0,
  learningRate: 0.08,
  globalBias: 0,
  marketSentiment: 0.5,
  symbolWeights: {},
  quoteCache: {},
};

let trainingInFlight = null;

function tokenize(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9\s&]/g, " ").split(/\s+/).filter(Boolean);
}

function scoreKeywordHits(text, keywords) {
  const normalized = (text || "").toLowerCase();
  return keywords.reduce((score, keyword) => (normalized.includes(keyword) ? score + 1 : score), 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function isFinanceQuery(message) {
  const text = message || "";
  const hits = scoreKeywordHits(text, FINANCE_KEYWORDS);
  const probability = clamp(sigmoid((hits - 1.5) / 1.2), 0, 1);
  return {
    isFinance: probability >= 0.35,
    probability,
    hits,
  };
}

function detectIntent(message) {
  const text = message || "";
  let bestIntent = "general_finance";
  let bestScore = 0;

  Object.entries(INTENT_KEYWORDS).forEach(([intent, words]) => {
    const score = scoreKeywordHits(text, words);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  });

  return bestIntent;
}

function analyzeFinanceSentiment(text) {
  const tokens = tokenize(text);
  let pos = 0;
  let neg = 0;

  for (const token of tokens) {
    if (POSITIVE_WORDS.includes(token)) pos += 1;
    if (NEGATIVE_WORDS.includes(token)) neg += 1;
  }

  const raw = (pos - neg) / Math.max(1, tokens.length / 4);
  const normalized = clamp((raw + 1) / 2, 0, 1);

  let impact = "Mixed";
  if (normalized >= 0.62) impact = "Positive";
  if (normalized <= 0.38) impact = "Negative";

  return {
    sentiment: Number(normalized.toFixed(2)),
    impact,
    features: { positiveCount: pos, negativeCount: neg, tokenCount: tokens.length },
  };
}

function symbolSeed(symbol = "AAPL") {
  return (symbol || "AAPL")
    .toUpperCase()
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function daySignal() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return Math.sin(dayOfYear / 12);
}

function computeDirectionalScore(symbol, contextText = "") {
  const sentimentAnalysis = analyzeFinanceSentiment(contextText);
  const sentiment = sentimentAnalysis.sentiment;
  const seed = symbolSeed(symbol);
  const cyclical = daySignal();
  const staticSymbolBias = ((seed % 13) - 6) / 20;
  const learnedSymbolBias = adaptiveModelState.symbolWeights[symbol] || 0;
  const marketBias = (adaptiveModelState.marketSentiment - 0.5) * 0.9;
  const globalBias = adaptiveModelState.globalBias || 0;
  const symbolBias = staticSymbolBias + learnedSymbolBias;
  return {
    score: (sentiment - 0.5) * 1.4 + symbolBias + cyclical * 0.4 + marketBias + globalBias,
    sentiment,
    sentimentImpact: sentimentAnalysis.impact,
    seed,
    cyclical,
    symbolBias,
    staticSymbolBias,
    learnedSymbolBias,
    marketBias,
    globalBias,
  };
}

function buildModelAnalysis({
  symbol,
  aiPrediction,
  confidence,
  expectedMove,
  score,
  sentiment,
  sentimentImpact,
  symbolBias,
  cyclical,
  learnedSymbolBias,
  marketBias,
  globalBias,
}) {
  const trendStrength = clamp(Math.abs(score) * 100, 8, 95);
  const volatilityRisk = clamp(100 - confidence + 12, 10, 90);
  const supportText = aiPrediction === "UP" ? "momentum support" : "downside pressure";
  const summary =
    aiPrediction === "UP"
      ? `Model indicates an upward bias for ${symbol} with ${confidence.toFixed(2)}% confidence and expected move near +${expectedMove.toFixed(2)}%.`
      : `Model indicates a downward bias for ${symbol} with ${confidence.toFixed(2)}% confidence and expected move near -${expectedMove.toFixed(2)}%.`;
  const rationale = `Signal factors: trend strength ${trendStrength.toFixed(1)}/100, sentiment ${sentiment.toFixed(2)} (${sentimentImpact}), cycle ${(cyclical * 100).toFixed(1)}bp, symbol bias ${(symbolBias * 100).toFixed(1)}bp (learned ${(learnedSymbolBias * 100).toFixed(1)}bp), market bias ${(marketBias * 100).toFixed(1)}bp, and global bias ${(globalBias * 100).toFixed(1)}bp suggest ${supportText}.`;

  return {
    summary,
    rationale,
    trendStrength: Number(trendStrength.toFixed(2)),
    sentimentScore: Number(sentiment.toFixed(2)),
    sentimentImpact,
    volatilityRisk: Number(volatilityRisk.toFixed(2)),
    expectedMove: Number(expectedMove.toFixed(2)),
    horizon: "Next session",
    modelState: {
      trainedSamples: adaptiveModelState.trainedSamples,
      lastTrainedAt: adaptiveModelState.lastTrainedAt,
    },
  };
}

function forecastStock(symbol, contextText = "") {
  const normalized = (symbol || "AAPL").toUpperCase();
  const {
    score,
    sentiment,
    sentimentImpact,
    symbolBias,
    cyclical,
    learnedSymbolBias,
    marketBias,
    globalBias,
  } = computeDirectionalScore(normalized, contextText);
  const aiPrediction = score >= 0 ? "UP" : "DOWN";
  const confidence = clamp(58 + Math.abs(score) * 32, 52, 94);
  const expectedMove = clamp(Math.abs(score) * 2.1 + 0.35, 0.25, 4.8);
  const analysis = buildModelAnalysis({
    symbol: normalized,
    aiPrediction,
    confidence,
    expectedMove,
    score,
    sentiment,
    sentimentImpact,
    symbolBias,
    cyclical,
    learnedSymbolBias,
    marketBias,
    globalBias,
  });
  const rationale =
    analysis.rationale;

  return {
    symbol: normalized,
    aiPrediction,
    aiConfidence: Number(confidence.toFixed(2)),
    expectedMove: Number(expectedMove.toFixed(2)),
    rationale,
    analysis,
  };
}

function predictDirection({ symbol, userPrediction, contextText = "" }) {
  const normalized = (symbol || "AAPL").toUpperCase();
  const {
    score,
    seed,
    sentiment,
    sentimentImpact,
    symbolBias,
    cyclical,
    learnedSymbolBias,
    marketBias,
    globalBias,
  } = computeDirectionalScore(normalized, contextText);

  const aiPrediction = score >= 0 ? "UP" : "DOWN";
  const confidence = clamp(58 + Math.abs(score) * 32, 52, 94);
  const expectedMove = clamp(Math.abs(score) * 2.1 + 0.35, 0.25, 4.8);

  // Simulated realized outcome with noise around model direction.
  const realizedFlipThreshold = 0.17 + (100 - confidence) / 180;
  const hashNoise = ((seed * 17 + new Date().getDate() * 31) % 100) / 100;
  const actualResult = hashNoise < realizedFlipThreshold ? (aiPrediction === "UP" ? "DOWN" : "UP") : aiPrediction;
  const signedMove = actualResult === "UP" ? expectedMove : -expectedMove;
  const isCorrect = userPrediction === actualResult;
  const analysis = buildModelAnalysis({
    symbol: normalized,
    aiPrediction,
    confidence,
    expectedMove,
    score,
    sentiment,
    sentimentImpact,
    symbolBias,
    cyclical,
    learnedSymbolBias,
    marketBias,
    globalBias,
  });

  const explanation = isCorrect
    ? `Your call matched the modeled direction for ${normalized}. Momentum and sentiment aligned with a ${actualResult} move of about ${Math.abs(signedMove).toFixed(2)}%.`
    : `Modeled factors for ${normalized} favored ${actualResult} instead. Short-term sentiment and trend pressure can override an initial thesis.`;

  return {
    aiPrediction,
    aiConfidence: Number(confidence.toFixed(2)),
    actualResult,
    priceChange: Number(signedMove.toFixed(2)),
    isCorrect,
    explanation,
    analysis,
  };
}

async function trainWithRealtimeData(symbols = DEFAULT_TRAIN_SYMBOLS, options = {}) {
  const { force = false, minIntervalMs = 60000 } = options;
  const nowMs = Date.now();
  const lastMs = adaptiveModelState.lastTrainedAt
    ? new Date(adaptiveModelState.lastTrainedAt).getTime()
    : 0;

  if (!force && lastMs && nowMs - lastMs < minIntervalMs) {
    return {
      skipped: true,
      reason: "cooldown",
      lastTrainedAt: adaptiveModelState.lastTrainedAt,
      trainedSamples: adaptiveModelState.trainedSamples,
    };
  }

  if (trainingInFlight) {
    return trainingInFlight;
  }

  trainingInFlight = (async () => {
    if (!apiKey) {
      return {
        skipped: true,
        reason: "missing_api_key",
        lastTrainedAt: adaptiveModelState.lastTrainedAt,
        trainedSamples: adaptiveModelState.trainedSamples,
      };
    }

    let marketSentiment = adaptiveModelState.marketSentiment;

    try {
      const news = await fetchFinancialNews("general");
      if (Array.isArray(news) && news.length > 0) {
        const sample = news.slice(0, 25);
        const avgSentiment =
          sample.reduce((acc, item) => {
            const text = `${item.headline || ""} ${item.summary || ""}`.trim();
            return acc + analyzeFinanceSentiment(text).sentiment;
          }, 0) / sample.length;
        marketSentiment = Number(avgSentiment.toFixed(4));
      }
    } catch (error) {
      // Keep previous sentiment when API read fails.
    }

    adaptiveModelState.marketSentiment = marketSentiment;

    let trainedNow = 0;
    for (const symbolRaw of symbols) {
      const symbol = (symbolRaw || "").toUpperCase();
      if (!symbol) continue;

      try {
        const quote = await fetchQuote(symbol);
        if (!quote || typeof quote.dp !== "number") continue;

        const target = quote.dp >= 0 ? 1 : 0;
        const learned = adaptiveModelState.symbolWeights[symbol] || 0;
        const featureScore =
          (quote.dp / 5) * 0.7 +
          (adaptiveModelState.marketSentiment - 0.5) * 1.1 +
          adaptiveModelState.globalBias +
          learned;
        const probUp = sigmoid(featureScore * 2.2);
        const error = target - probUp;
        const volScale = clamp(Math.abs(quote.dp) / 4, 0.2, 1.6);
        const step = adaptiveModelState.learningRate * volScale;

        adaptiveModelState.symbolWeights[symbol] = clamp(learned + step * error, -1.75, 1.75);
        adaptiveModelState.globalBias = clamp(adaptiveModelState.globalBias + step * error * 0.15, -0.8, 0.8);
        adaptiveModelState.quoteCache[symbol] = {
          current: quote.c,
          previousClose: quote.pc,
          change: quote.d,
          changePercent: quote.dp,
          timestamp: new Date().toISOString(),
        };

        trainedNow += 1;
      } catch (error) {
        // Skip symbol if quote fetch fails.
      }
    }

    adaptiveModelState.trainedSamples += trainedNow;
    adaptiveModelState.lastTrainedAt = new Date().toISOString();

    return {
      skipped: false,
      trainedNow,
      trainedSamples: adaptiveModelState.trainedSamples,
      lastTrainedAt: adaptiveModelState.lastTrainedAt,
      marketSentiment: adaptiveModelState.marketSentiment,
    };
  })();

  try {
    return await trainingInFlight;
  } finally {
    trainingInFlight = null;
  }
}

function getModelState() {
  return {
    initializedAt: adaptiveModelState.initializedAt,
    lastTrainedAt: adaptiveModelState.lastTrainedAt,
    trainedSamples: adaptiveModelState.trainedSamples,
    marketSentiment: adaptiveModelState.marketSentiment,
    globalBias: Number((adaptiveModelState.globalBias || 0).toFixed(4)),
    symbolWeights: adaptiveModelState.symbolWeights,
  };
}

function inferTickersFromText(text = "") {
  const upperText = (text || "").toUpperCase();
  const aliasMap = {
    APPLE: "AAPL",
    MICROSOFT: "MSFT",
    GOOGLE: "GOOGL",
    ALPHABET: "GOOGL",
    TESLA: "TSLA",
    AMAZON: "AMZN",
    NVIDIA: "NVDA",
    META: "META",
    FACEBOOK: "META",
    COINBASE: "COIN",
  };
  const blocked = new Set([
    "THE",
    "WITH",
    "FROM",
    "THIS",
    "THAT",
    "WILL",
    "MARKET",
    "NEWS",
    "TODAY",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "FED",
    "USA",
    "US",
    "CEO",
    "CFO",
    "GDP",
    "CPI",
    "PPI",
    "ETF",
  ]);

  const aliases = Object.entries(aliasMap)
    .filter(([name]) => upperText.includes(name))
    .map(([, symbol]) => symbol);
  const explicit = (upperText.match(/\b[A-Z]{1,5}\b/g) || []).filter(
    (token) => token && /[A-Z]/.test(token) && !blocked.has(token)
  );

  return [...new Set([...aliases, ...explicit])].slice(0, 5);
}

function generateFinanceReply(message) {
  const financeCheck = isFinanceQuery(message);
  if (!financeCheck.isFinance) {
    return {
      reply:
        "I am configured for finance topics only. Ask about markets, stocks, portfolio risk, trading setups, or financial news impact.",
      intent: "non_finance",
      confidence: Number((financeCheck.probability * 100).toFixed(2)),
    };
  }

  const intent = detectIntent(message);
  const sentiment = analyzeFinanceSentiment(message).sentiment;

  const templates = {
    portfolio_risk:
      "Your question points to portfolio risk management. Start by checking concentration, sector exposure, and max drawdown tolerance, then rebalance toward target weights.",
    trade_decision:
      "For buy/sell decisions, validate trend, support/resistance, and risk-reward before execution. Use a stop-loss level tied to volatility, not emotion.",
    market_outlook:
      "Market outlook is mixed: watch inflation trend, policy-rate expectations, and earnings revisions. Position size should reflect volatility regime.",
    learning:
      "For learning, focus first on market basics, then technical/fundamental analysis, then portfolio construction. Practice with small, repeatable hypotheses.",
    prediction:
      "Prediction quality improves when you combine trend, valuation, and sentiment signals. Treat every forecast as probabilistic and track hit-rate over time.",
    news_impact:
      "News impact depends on surprise and positioning. Strong positive surprises usually lift risk assets, while policy or growth shocks can increase downside volatility.",
    general_finance:
      "Share the ticker, timeframe, and risk tolerance so I can provide a tighter finance-focused analysis.",
  };

  const tone = sentiment >= 0.6 ? " Current sentiment reads constructive." : sentiment <= 0.4 ? " Current sentiment reads cautious." : " Current sentiment reads balanced.";
  return {
    reply: `${templates[intent]}${tone}`,
    intent,
    confidence: Number((financeCheck.probability * 100).toFixed(2)),
  };
}

module.exports = {
  isFinanceQuery,
  analyzeFinanceSentiment,
  trainWithRealtimeData,
  getModelState,
  forecastStock,
  predictDirection,
  inferTickersFromText,
  generateFinanceReply,
};
