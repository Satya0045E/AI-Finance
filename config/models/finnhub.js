const apiKey = process.env.FINNHUB_API_KEY || "";
const baseUrl = "https://finnhub.io/api/v1";

async function fetchStockSymbols(exchange = "US") {
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const url = `${baseUrl}/stock/symbol?exchange=${encodeURIComponent(exchange)}&token=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch stock symbols: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchFinancialNews(category = "general", minId = 0) {
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const url = `${baseUrl}/news?category=${encodeURIComponent(category)}&minId=${encodeURIComponent(minId)}&token=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch financial news: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchQuote(symbol) {
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const url = `${baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch quote for ${symbol}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

module.exports = {
  apiKey,
  fetchStockSymbols,
  fetchFinancialNews,
  fetchQuote,
};
