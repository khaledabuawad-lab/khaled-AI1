import express from "express";
import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { askOpenAI, planAction } from "./openai.js";
import { analyzeInvestment } from "./investments.js";
import { initDb, isDatabaseConfigured, isDatabaseReady, listMemories, addMemory, listReminders, addReminder, listPeople, addPerson } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = new Set((process.env.CORS_ORIGIN || "https://khaled-ai-7bqm.onrender.com,https://khaled-ai.lovable.app").split(",").map((value) => value.trim()).filter(Boolean));

const LOVABLE_JWKS_URL = process.env.LOVABLE_JWKS_URL || "https://c--b3459bc7-4e47-43b4-bf3c-7a4443ddebd6-prod.lovable.cloud/auth/v1/.well-known/jwks.json";
const LOVABLE_JWT_AUDIENCE = process.env.LOVABLE_JWT_AUDIENCE || "authenticated";
const lovableJwks = createRemoteJWKSet(new URL(LOVABLE_JWKS_URL));

async function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required" });
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const { payload } = await jwtVerify(token, lovableJwks, {
      algorithms: ["ES256"],
      audience: LOVABLE_JWT_AUDIENCE
    });
    if (!payload.sub || typeof payload.sub !== "string") return res.status(401).json({ error: "Invalid authentication subject" });
    req.user = { id: payload.sub };
    next();
  } catch (error) {
    console.warn("Authentication failed:", error?.code || error?.message || error);
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

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
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "WhatsApp send failed");
  return data;
}

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && !allowedOrigins.has(origin)) return res.sendStatus(403);
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); }
}));

function verifyWhatsAppSignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  const signature = req.get("x-hub-signature-256") || "";
  if (!signature.startsWith("sha256=") || !req.rawBody) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "khaled-ai-api",
    version: "0.5.0",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    dbConfigured: isDatabaseConfigured(),
    dbReady: isDatabaseReady()
  });
});

app.get("/ready", (_req, res) => {
  if (!isDatabaseConfigured() || !isDatabaseReady()) return res.status(503).json({ ok: false });
  res.json({ ok: true });
});

app.get("/v1/me", authenticate, (req, res) => {
  res.json({ authenticated: true, userId: req.user.id });
});

app.use("/v1", (req, res, next) => {
  if (req.path === "/webhooks/whatsapp" && req.method === "POST") return next();
  if (req.path === "/webhooks/whatsapp" && req.method === "GET") return next();
  return authenticate(req, res, next);
});

app.post("/v1/chat", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text || text.length > 20000) return res.status(400).json({ error: "text is required and must be under 20,000 characters" });
  try {
    const memories = await listMemories(req.user.id, 50);
    const memoryContext = memories.map((m) => `- ${m.content}`).join("\n") || "none";
    const reply = await askOpenAI({
      input: text,
      instructions: "You are Khaled AI, a private personal assistant. Detect and respond naturally in Arabic, Norwegian, English or Brazilian Portuguese. Be concise, helpful and context-aware. Never claim to have accessed a service unless the integration supplied the data.\nRelevant persistent memory:\n" + memoryContext
    });
    res.json({ reply });
  } catch (error) {
    const message = String(error?.message || error);
    res.status(message.includes("OPENAI_API_KEY") ? 503 : 502).json({ error: message });
  }
});

app.post("/v1/agent/plan", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const context = String(req.body?.context || "").trim();
  if (!text || text.length > 20000) return res.status(400).json({ error: "text is required and must be under 20,000 characters" });
  try {
    const memories = await listMemories(req.user.id, 50);
    const memoryContext = memories.map((m) => `- ${m.content}`).join("\n") || "none";
    const plan = await planAction({ input: text, context: `${context}\nPersistent memory:\n${memoryContext}` });
    res.json({ plan });
  } catch (error) {
    const message = String(error?.message || error);
    res.status(message.includes("OPENAI_API_KEY") ? 503 : 502).json({ error: message });
  }
});

app.post("/v1/actions/execute", async (req, res) => {
  const action = String(req.body?.action || "");
  if (action === "send_message") {
    const to = String(req.body?.to || "").trim();
    const message = String(req.body?.message || "").trim();
    if (!to || !message || message.length > 10000) return res.status(400).json({ error: "to and message are required" });
    try {
      const result = await sendWhatsAppText(to, message);
      return res.json({ ok: true, channel: "whatsapp", result });
    } catch (error) {
      return res.status(502).json({ error: String(error?.message || error) });
    }
  }
  return res.status(400).json({ error: "Unsupported action" });
});

app.post("/v1/investments/analyze", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  const portfolio = String(req.body?.portfolio || "").trim();
  const watchlist = String(req.body?.watchlist || "").trim();
  if (!question || question.length > 20000) return res.status(400).json({ error: "question is required and must be under 20,000 characters" });
  try {
    const answer = await analyzeInvestment({ question, portfolio, watchlist });
    res.json({ answer, currentData: true });
  } catch (error) {
    const message = String(error?.message || error);
    res.status(message.includes("OPENAI_API_KEY") ? 503 : 502).json({ error: message });
  }
});

app.get("/v1/people", async (req, res) => {
  try { res.json({ people: await listPeople(req.user.id) }); }
  catch (error) { res.status(503).json({ error: String(error?.message || error) }); }
});

app.post("/v1/people", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name || name.length > 200) return res.status(400).json({ error: "name is required" });
  try {
    res.status(201).json({ person: await addPerson({
      userId: req.user.id,
      name,
      phone: req.body?.phone || null,
      whatsappId: req.body?.whatsapp_id || null,
      notes: req.body?.notes || null
    })});
  } catch (error) { res.status(503).json({ error: String(error?.message || error) }); }
});

app.get("/v1/memories", async (req, res) => {
  try { res.json({ memories: await listMemories(req.user.id) }); }
  catch (error) { res.status(503).json({ error: String(error?.message || error) }); }
});

app.post("/v1/memories", async (req, res) => {
  const content = String(req.body?.content || "").trim();
  const category = String(req.body?.category || "general").trim() || "general";
  if (!content || content.length > 10000) return res.status(400).json({ error: "content is required and must be under 10,000 characters" });
  try { res.status(201).json({ memory: await addMemory({ userId: req.user.id, content, category }) }); }
  catch (error) { res.status(503).json({ error: String(error?.message || error) }); }
});

app.get("/v1/reminders", async (req, res) => {
  try { res.json({ reminders: await listReminders(req.user.id) }); }
  catch (error) { res.status(503).json({ error: String(error?.message || error) }); }
});

app.post("/v1/reminders", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const remindAt = req.body?.remind_at ? String(req.body.remind_at) : null;
  if (!title || title.length > 500) return res.status(400).json({ error: "title is required and must be under 500 characters" });
  if (remindAt && Number.isNaN(Date.parse(remindAt))) return res.status(400).json({ error: "remind_at must be a valid date" });
  try { res.status(201).json({ reminder: await addReminder({ userId: req.user.id, title, remindAt }) }); }
  catch (error) { res.status(503).json({ error: String(error?.message || error) }); }
});

app.get("/v1/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post("/v1/webhooks/whatsapp", async (req, res) => {
  if (!verifyWhatsAppSignature(req)) return res.sendStatus(401);
  res.sendStatus(200);
  try {
    for (const entry of Array.isArray(req.body?.entry) ? req.body.entry : []) {
      for (const change of entry.changes || []) {
        for (const message of change.value?.messages || []) {
          if (message.type !== "text") continue;
          const from = message.from;
          const text = message.text?.body?.trim();
          if (!from || !text) continue;
          const reply = await askOpenAI({
            input: text,
            instructions: "You are Khaled AI responding to a WhatsApp message on the user's behalf. Detect Arabic, Norwegian, English and Brazilian Portuguese automatically. Reply naturally and concisely. Do not claim to have taken an action unless it was actually performed."
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

app.listen(port, "0.0.0.0", () => console.log("Khaled AI API listening on " + port));
