# Khaled AI API

This is the server boundary for AI, reminders, memory and messaging integrations.

## Required secrets before live operation
- AI_API_KEY
- WhatsApp Business credentials when the WhatsApp connector is enabled

Never put these values in the iPhone app or commit them to GitHub.

## Endpoints
- GET /health
- POST /v1/chat
- POST /v1/webhooks/whatsapp
