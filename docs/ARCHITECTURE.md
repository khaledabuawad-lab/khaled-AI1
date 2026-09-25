# Khaled AI Architecture

iPhone UI / Voice -> Khaled API -> AI orchestration + Memory + People + Reminders + Actions -> provider adapters.

Adapters:
- WhatsApp
- Apple messaging / bridge
- Phone
- Future integrations

Principles:
- Credentials stay server-side.
- External provider models stay inside adapters.
- Incoming events are normalized into one internal conversation model.
- Actions are auditable and idempotent.
- Unsupported platform capabilities are never emulated with scraping or private APIs.

Core entities:
User, Person, Conversation, Message, Reminder, Memory, IntegrationAccount, Action.

Message flow:
provider webhook -> verify -> normalize -> identify person -> load relevant context -> AI decision -> optional response/action -> record result.

Reminder flow:
natural-language request -> parse -> validate timezone -> persist -> scheduler -> notification -> completion.
