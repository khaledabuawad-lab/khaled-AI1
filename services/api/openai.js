const OPENAI_URL = "https://api.openai.com/v1/responses";

async function requestOpenAI(body) {
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
  if (!response.ok) throw new Error(data?.error?.message || "OpenAI request failed");
  return data;
}

export async function askOpenAI({
  input,
  model = process.env.OPENAI_MODEL || "gpt-5.6-luna",
  instructions = ""
}) {
  const data = await requestOpenAI({ model, instructions, input });
  return data.output_text || "";
}

export async function planAction({
  input,
  model = process.env.OPENAI_MODEL || "gpt-5.6-luna",
  context = ""
}) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      response: { type: "string" },
      action: {
        type: "string",
        enum: ["none", "reminder", "send_message", "translate"]
      },
      target: { type: ["string", "null"] },
      message: { type: ["string", "null"] },
      reminder_at: { type: ["string", "null"] },
      language: { type: ["string", "null"] }
    },
    required: [
      "response",
      "action",
      "target",
      "message",
      "reminder_at",
      "language"
    ]
  };

  const data = await requestOpenAI({
    model,
    instructions: `You are the action planner for Khaled AI.
Understand Arabic, Norwegian, English and Brazilian Portuguese.
Return exactly one safe action when the user clearly asks for one.
Use action=none for ordinary conversation.
For reminders, put the requested time in reminder_at as an ISO-8601 timestamp when it can be determined from the current context.
For send_message, target is the person/contact identifier if known and message is the exact intended message.
For translation, message is the source text and language is the requested target language.
Never claim an external action was completed; you only plan it.
Current context: ${context}`,
    input,
    text: {
      format: {
        type: "json_schema",
        name: "khaled_action",
        strict: true,
        schema
      }
    }
  });

  const raw = data.output_text || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Khaled AI returned an invalid action plan");
  }
}
