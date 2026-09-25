# Apple Messages / iMessage Integration Boundary

Khaled AI will use public Apple capabilities only.

Supported app-side capabilities include Messages-related app/extension capabilities, user-driven composition, and App Intents for supported assistant actions.

An ordinary third-party iOS app does not receive unrestricted background access to the user's existing iMessage inbox or a public API for autonomous replies to arbitrary existing conversations.

Therefore this integration has two modes:
1. ios_supported — capabilities available directly through supported iOS APIs.
2. apple_bridge — an Apple-side component for workflows that require capabilities unavailable to a normal iPhone app.

Never use private APIs, database extraction, message scraping, or stolen credentials/session data.
