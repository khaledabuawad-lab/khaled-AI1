# OpenAI brain

Khaled AI uses the OpenAI Responses API from the server. The API key must stay server-side as OPENAI_API_KEY and must never be placed in the iPhone/PWA code or committed to GitHub.

The default model is GPT-5.6 Luna for cost-sensitive workloads. It can be changed with OPENAI_MODEL.

Once a real OPENAI_API_KEY is present in the server environment, POST /v1/chat becomes live.
