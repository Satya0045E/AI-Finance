const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGroqApiKey() {
  return (
    process.env.GROQ_API_KEY ||
    process.env.GROQ_APIKEY ||
    process.env.FINANCIAL_MODEL_API_KEY ||
    ""
  );
}

function getGroqModel() {
  return process.env.GROQ_MODEL || "llama-3.1-8b-instant";
}

async function generateGroqFinanceReply({ userMessage, context }) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const systemPrompt =
    "You are a finance-only assistant for an investment learning platform. " +
    "Answer ONLY finance questions. If user asks non-finance question, refuse briefly and ask a finance question. " +
    "Use provided platform context (portfolio, predictions, quotes, news, model outputs) when relevant. " +
    "Be practical, concise, and avoid guarantees. Always include risk-awareness.";

  const userPrompt =
    `User question:\n${userMessage}\n\n` +
    `Platform context JSON:\n${JSON.stringify(context, null, 2)}\n\n` +
    "Return a direct answer using the context where relevant.";

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getGroqModel(),
      temperature: 0.2,
      max_tokens: 450,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content?.trim() ||
    "Unable to generate a finance response right now."
  );
}

module.exports = {
  getGroqApiKey,
  getGroqModel,
  generateGroqFinanceReply,
};
