// Shared contract for messaging integrations.
// Adapters normalize provider events so the AI core never depends on provider-specific fields.
export class MessagingAdapter {
  constructor(provider) { this.provider = provider; }
  async verifyWebhook() { throw new Error("Not implemented"); }
  async normalizeInbound() { throw new Error("Not implemented"); }
  async sendMessage() { throw new Error("Not implemented"); }
  async getDeliveryStatus() { throw new Error("Not implemented"); }
}