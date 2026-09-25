# Khaled AI Investment Intelligence

Khaled AI is designed to provide current, source-grounded investment information and analysis across:

- Gold and silver
- Bitcoin and major cryptocurrencies
- Stocks and ETFs
- Commodities
- FX
- Interest rates, inflation and macroeconomic indicators
- Portfolio holdings and watchlists
- Historical performance and scenario analysis
- Price/news alerts

The investment layer must use fresh market information when the question depends on current conditions. It must distinguish factual market data from interpretation and uncertainty, never invent live prices, and never promise returns.

Initial implementation uses the OpenAI Responses API with web search for current research. A dedicated market-data provider can later be added behind an adapter for lower-latency structured prices, historical OHLC data and alerts.
