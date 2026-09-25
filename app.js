const $ = (id) => document.getElementById(id);

let reminders = JSON.parse(localStorage.getItem("khaledReminders") || "[]");
const memoryStore = JSON.parse(localStorage.getItem("khaledMemoryV1") || "[]");

function saveReminders() {
  localStorage.setItem("khaledReminders", JSON.stringify(reminders));
  renderReminders();
}

function renderReminders() {
  const el = $("reminders");
  if (!el) return;
  el.innerHTML = reminders
    .map(
      (r) =>
        `<div class="reminder">⏰ ${escapeHtml(r.text)}<br><small>${new Date(r.time).toLocaleString()}</small></div>`
    )
    .join("");
}

function renderMemory() {
  const el = $("memoryList");
  if (!el) return;
  el.innerHTML = memoryStore
    .map((m) => `<div class="reminder">${escapeHtml(m.content)}</div>`)
    .join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function addMessage(text, who = "ai") {
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.textContent = text;
  $("messages")?.appendChild(d);
  if ($("messages")) $("messages").scrollTop = $("messages").scrollHeight;
}

function detectLanguage(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[ãõçáéíóúâêô]/i.test(text)) return "pt";
  if (/\b(og|jeg|du|ikke|hva|det|skal|har)\b/i.test(text)) return "no";
  return "en";
}

function localAssistantReply(text) {
  const lang = detectLanguage(text);
  return {
    ar: "فهمت. أنا Khaled AI وسأتعامل تلقائياً مع اللغة والسياق.",
    pt: "Entendi. Eu sou o Khaled AI e vou lidar automaticamente com o idioma e o contexto.",
    no: "Jeg forstår. Jeg er Khaled AI og håndterer språk og kontekst automatisk.",
    en: "I understand. I’m Khaled AI, and I’ll handle the language and context automatically."
  }[lang];
}

async function tryLiveChat(text) {
  try {
    const base = localStorage.getItem("khaledApiUrl");
    if (!base) return null;
    const response = await fetch(base.replace(/\/$/, "") + "/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.reply || null;
  } catch {
    return null;
  }
}

async function tryAgentPlan(text) {
  try {
    const base = localStorage.getItem("khaledApiUrl");
    if (!base) return null;
    const response = await fetch(base.replace(/\/$/, "") + "/v1/agent/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, context: "Current local time: " + new Date().toISOString() })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.plan || null;
  } catch {
    return null;
  }
}

async function sendMessage() {
  const input = $("userInput");
  const text = input?.value.trim();
  if (!text) return;
  addMessage(text, "user");
  input.value = "";
  addMessage("…", "ai");
  const messages = $("messages");
  const pending = messages?.lastElementChild;
  const plan = await tryAgentPlan(text);

  if (plan?.action === "investment") {
    const base = localStorage.getItem("khaledApiUrl");
    let reply = plan.response || "I’m researching the current market data now.";
    try {
      const response = await fetch(base.replace(/\/$/, "") + "/v1/investments/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text })
      });
      if (response.ok) {
        const data = await response.json();
        reply = data.answer || reply;
      }
    } catch {}
    if (pending) pending.textContent = reply;
    else addMessage(reply, "ai");
    return;
  }

  if (plan?.action === "reminder" && plan.reminder_at && plan.message) {
    reminders.push({ text: plan.message, time: plan.reminder_at, done: false });
    saveReminders();
    if (pending) pending.textContent = plan.response || "Reminder saved.";
    else addMessage(plan.response || "Reminder saved.", "ai");
    if (Notification?.permission === "default") Notification.requestPermission();
    return;
  }

  if (plan?.action === "translate" && plan.message) {
    if (pending) pending.textContent = plan.message;
    else addMessage(plan.message, "ai");
    return;
  }

  if (plan?.action === "send_message") {
    if (pending) pending.textContent = "I prepared the message, but I will ask for confirmation before sending it.";
    else addMessage("I prepared the message, but I will ask for confirmation before sending it.", "ai");
    return;
  }

  const reply = plan?.response || (await tryLiveChat(text)) || localAssistantReply(text);
  if (pending) pending.textContent = reply;
  else addMessage(reply, "ai");
}

$("sendBtn")?.addEventListener("click", sendMessage);
$("userInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

$("addReminder")?.addEventListener("click", () => {
  const text = $("reminderText")?.value.trim();
  const time = $("reminderTime")?.value;
  if (!text || !time) {
    alert("اكتب التذكير واختر الوقت");
    return;
  }
  reminders.push({ text, time, done: false });
  saveReminders();
  $("reminderText").value = "";
  $("reminderTime").value = "";
  if (Notification?.permission === "default") Notification.requestPermission();
});

setInterval(() => {
  const now = Date.now();
  let changed = false;
  reminders.forEach((r) => {
    if (!r.done && new Date(r.time).getTime() <= now) {
      r.done = true;
      changed = true;
      if (Notification?.permission === "granted") {
        new Notification("Khaled AI", { body: r.text });
      }
      if ("speechSynthesis" in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(r.text));
      }
    }
  });
  if (changed) saveReminders();
}, 15000);

$("saveMemory")?.addEventListener("click", () => {
  const text = $("memoryInput")?.value.trim();
  if (!text) return;
  memoryStore.push({
    id: crypto.randomUUID(),
    content: text,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("khaledMemoryV1", JSON.stringify(memoryStore));
  $("memoryInput").value = "";
  renderMemory();
});

$("translateBtn")?.addEventListener("click", async () => {
  const input = $("translateInput");
  const result = $("translationResult");
  const text = input?.value.trim();
  if (!text || !result) return;
  const translated = await tryLiveChat(
    "Translate the following text naturally to the most appropriate target language. Return only the translation:\n\n" + text
  );
  result.textContent = translated || "The AI translation service is not connected yet.";
});

$("saveApiUrl")?.addEventListener("click", () => {
  const value = $("apiUrl")?.value.trim().replace(/\/$/, "");
  if (value) localStorage.setItem("khaledApiUrl", value);
  else localStorage.removeItem("khaledApiUrl");
  if ($("apiStatus")) $("apiStatus").textContent = value ? "Saved." : "Local API connection removed.";
});

if ($("apiUrl")) {
  $("apiUrl").value = localStorage.getItem("khaledApiUrl") || "https://khaled-ai-api.onrender.com";
  if ($("apiStatus")) $("apiStatus").textContent = "Ready.";
}

const tabs = [...document.querySelectorAll(".tab")];
tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.section;
    document.querySelectorAll("main > .card").forEach((section) => {
      section.hidden = section.id !== target && !(target === "chat" && section.id === "chat");
    });
  })
);

renderReminders();
renderMemory();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
