# Implementation Roadmap

## Completed foundation
- Repository write access
- Product requirements
- Architecture
- Provider boundaries
- Core entity schema
- Action contract
- Initial iPhone/PWA UI

## Next implementation gates
1. Backend hosting/runtime and secure environment variables.
2. AI provider API credential.
3. Authentication for the iPhone client.
4. WhatsApp Business account/API credentials and webhook URL.
5. Apple-side bridge strategy for the required iMessage workflow.
6. Native iOS build/signing path.

The application must stop and request a credential only at the point where that external service is actually needed.