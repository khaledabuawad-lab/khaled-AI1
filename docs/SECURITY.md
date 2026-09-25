# Security rules
- Never commit API keys, OAuth secrets, webhook secrets or access tokens.
- External credentials belong in server-side environment variables/secret storage.
- The client must never contain WhatsApp or AI-provider private credentials.
- Provider webhooks must be authenticated and idempotent.
- Memory must be user-controlled and deletable.
- Message actions must be auditable.
