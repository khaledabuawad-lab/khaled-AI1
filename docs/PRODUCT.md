# Khaled AI Product Requirements

## Non-negotiable goals
- One assistant for Arabic, Norwegian, English and Brazilian Portuguese.
- Reminders and proactive notifications.
- People/contact context and conversation memory.
- Direct WhatsApp integration through an official supported API path.
- iMessage integration through Apple's supported capabilities and an Apple-side bridge where autonomous access requires it.
- No copy/paste workflow in the final product.
- Provider adapters so messaging providers can change without rewriting the AI core.

## First usable milestone
- Secure authenticated API
- AI chat endpoint
- Persistent reminders
- People/contact model
- Conversation model
- Integration adapter interfaces
- iPhone client foundation
- WhatsApp adapter boundary
- Apple messaging bridge boundary

## Important boundary
Khaled AI must never claim to access messages that the connected platform does not expose. Unsupported iMessage inbox automation must not be implemented with private APIs or scraping.
