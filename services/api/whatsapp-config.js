export function getWhatsAppConfig(env = process.env) {
  return {
    token: env.WHATSAPP_ACCESS_TOKEN,
    // Render currently stores the production Phone Number ID under WHATSAPP_PHONE_NUMBER.
    // Keep the older variable as a backward-compatible fallback.
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER || env.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: env.WHATSAPP_GRAPH_VERSION || "v23.0"
  };
}
