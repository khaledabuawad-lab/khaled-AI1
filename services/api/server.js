import express from "express";
import crypto from "node:crypto";
import { askOpenAI, planAction } from "./openai.js";
import { analyzeInvestment } from "./investments.js";
import { initDb, isDatabaseConfigured, isDatabaseReady, listMemories, addMemory, listReminders, addReminder } from "./db.js";

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

app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  }
}));

function verifyWhatsAppSignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  const signature = req.get("x-hub-signature-256") || "";
  if (!signature.startsWith("sha256=") || !req.rawBody) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "khaled-ai-api",
    version: "0.3.2",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    dbConfigured: isDatabaseConfigured(),\n    dbReady: isDatabaseReady(),
    whatsappConfigured: Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_VERIFY_TOKEN &&
      process.env.WHATSAPP_APP_SECRET
    )
  });
});

app.post("/v1/chat", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  try {
    const memories = await listMemories(50);
    const memoryContext = memories.map((m) => `- ${m.content}`).join("\n") || "none";
    const reply = await askOpenAI({
      input: text,
      instructions:
        "You are Khaled AI, a personal assistant. Detect and respond naturally in the user's language. Supported languages include Arabic, Norwegian, English and Brazilian Portuguese. Be concise, helpful and context-aware. Never claim to have accessed a service unless the integration actually supplied the data.\nRelevant persistent memory:\n${memoryContext}"
    });
    res.json({ reply });
  } catch (error) {
    const message = String(error?.message || error);
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    res.status(status).json({ error: message });
  }
});


app.post("/v1/agent/plan", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const context = String(req.body?.context || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  try {
    const memories = await listMemories(50);\n    const memoryContext = memories.map((m) => `- ${m.content}`).join("\n") || "none";\n    const plan = await planAction({ input: text, context: `${context}\nPersistent memory:\n${memoryContext}` });
    res.json({ plan });
  } catch (error) {
    const message = String(error?.message || error);
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    res.status(status).json({ error: message });
  }
});

app.post("/v1/investments/analyze", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  const portfolio = String(req.body?.portfolio || "").trim();
  const watchlist = String(req.body?.watchlist || "").trim();
  if (!question) return res.status(400).json({ error: "question is required" });

  try {
    const answer = await analyzeInvestment({ question, portfolio, watchlist });
    res.json({ answer, currentData: true });
  } catch (error) {
    const message = String(error?.message || error);
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    res.status(status).json({ error: message });
  }
});

app.get("/v1/memories", async (_req, res) => {
  try {
    res.json({ memories: await listMemories() });
  } catch (error) {
    res.status(503).json({ error: String(error?.message || error) });
  }
});

app.post("/v1/memories", async (req, res) => {
  const content = String(req.body?.content || "").trim();
  const category = String(req.body?.category || "general").trim() || "general";
  if (!content) return res.status(400).json({ error: "content is required" });
  try {
    res.status(201).json({ memory: await addMemory({ content, category }) });
  } catch (error) {
    res.status(503).json({ error: String(error?.message || error) });
  }
});

app.get("/v1/reminders", async (_req, res) => {
  try {
    res.json({ reminders: await listReminders() });
  } catch (error) {
    res.status(503).json({ error: String(error?.message || error) });
  }
});

app.post("/v1/reminders", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const remindAt = req.body?.remind_at ? String(req.body.remind_at) : null;
  if (!title) return res.status(400).json({ error: "title is required" });
  try {
    res.status(201).json({ reminder: await addReminder({ title, remindAt }) });
  } catch (error) {
    res.status(503).json({ error: String(error?.message || error) });
  }
});

app.get("/v1/webhooks/whatsapp", (req, res) => {
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
  if (!verifyWhatsAppSignature(req)) {
    return res.sendStatus(401);
  }

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

initDb().then(() => console.log("Khaled AI database ready")).catch((error) => console.error("Khaled AI database init failed:", error));

app.listen(port, "0.0.0.0", () => {
  console.log("Khaled AI API listening on " + port);
});
