import express from "express";
import { askOpenAI, planAction } from "./openai.js";

const app = express();
const port = Number(process.env.PORT || 3000);

function getWhatsAppConfig() {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION || "v23.0"
  };
}

async function sendWhatsAppText(to, body) {
  const { token, phoneNumberId, graphVersion } = getWhatsAppConfig();
  if (!token || !phoneNumberId) throw new Error("WhatsApp is not configured");
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body }
      })
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "WhatsApp send failed");
  return data;
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "khaled-ai-api",
    version: "0.3.1",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    whatsappConfigured: Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_VERIFY_TOKEN
    )
  });
});

app.post("/v1/chat", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  try {
    const reply = await askOpenAI({
      input: text,
      instructions:
        "You are Khaled AI, a personal assistant. Detect and respond naturally in the user's language. Supported languages include Arabic, Norwegian, English and Brazilian Portuguese. Be concise, helpful and context-aware. Never claim to have accessed a service unless the integration actually supplied the data."
    });
    res.json({ reply });
  } catch (error) {
    const message = String(error?.message || error);
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    res.status(status).json({ error: message });
  }
});

\napp.post("/v1/agent/plan", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const context = String(req.body?.context || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  try {
    const plan = await planAction({ input: text, context });
    res.json({ plan });
  } catch (error) {
    const message = String(error?.message || error);
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    res.status(status).json({ error: message });
  }
});
\napp.get("/v1/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/v1/webhooks/whatsapp", async (req, res) => {
  // Acknowledge Meta quickly, then process inbound text messages.
  res.sendStatus(200);

  try {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        for (const message of value.messages || []) {
          if (message.type !== "text") continue;
          const from = message.from;
          const text = message.text?.body?.trim();
          if (!from || !text) continue;

          const reply = await askOpenAI({
            input: text,
            instructions:
              "You are Khaled AI responding to a WhatsApp message on the user's behalf. Detect Arabic, Norwegian, English and Brazilian Portuguese automatically. Reply naturally and concisely. Do not claim to have taken an action unless it was actually performed."
          });

          await sendWhatsAppText(from, reply);
        }
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook processing failed:", error);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log("Khaled AI API listening on " + port);
});
