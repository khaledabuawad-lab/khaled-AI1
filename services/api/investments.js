const OPENAI_URL = "https://api.openai.com/v1/responses";

async function request(body) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Investment analysis failed");
  return data;
}

export async function analyzeInvestment({ question, portfolio = "", watchlist = "" }) {
  const data = await request({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    tools: [{ type: "web_search" }],
    instructions: `You are Khaled AI Investment Intelligence.
Analyze gold, silver, Bitcoin, cryptocurrencies, stocks, ETFs, commodities, FX, rates, inflation and macroeconomics.
For current prices, current events, news, regulations or market conditions, use web search and distinguish verified facts from analysis.
Never invent a price, date, return or source.
Give the relevant timestamp/date and currency when discussing market data.
Separate: (1) current facts/data, (2) what those facts may imply, (3) risks/uncertainties, and (4) possible scenarios.
Do not promise profits or present an investment decision as certain. Do not claim to be a licensed financial adviser.
If the user asks "should I buy/sell", provide a neutral scenario/risk analysis and the information needed to make the decision.
Portfolio context: ${portfolio || "none supplied"}.
Watchlist: ${watchlist || "none supplied"}.`,
    input: question
  });
  return data.output_text || "";
}
