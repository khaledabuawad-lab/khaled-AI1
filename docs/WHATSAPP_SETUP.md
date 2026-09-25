# WhatsApp connection

The server now has the Meta webhook verification endpoint and the provider adapter boundary.

To activate real messaging, the project needs:
- Meta/WhatsApp Business Platform credentials
- WhatsApp phone number ID
- webhook URL for the deployed API
- webhook verify token
- access token stored as a server secret

The credentials must be added to the deployment environment, not GitHub source files.

The adapter will then be extended for verified inbound normalization and outbound messages.
