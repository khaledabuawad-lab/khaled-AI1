# WhatsApp Integration

Use an official WhatsApp Business Platform/API integration. Do not use WhatsApp Web scraping or unofficial session automation as the product foundation.

The adapter will handle:
- verified inbound webhooks
- message normalization
- outbound messages
- delivery/read status where available
- retries and idempotency
- secure server-side credentials

Important account boundary:
the official business API is not a generic API for silently controlling an ordinary personal WhatsApp account. Khaled AI must use an account/API path actually supported by Meta.
