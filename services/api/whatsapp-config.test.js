import test from "node:test";
import assert from "node:assert/strict";

import { getWhatsAppConfig } from "./whatsapp-config.js";

test("uses the existing Render WHATSAPP_PHONE_NUMBER setting", () => {
  assert.equal(getWhatsAppConfig({ WHATSAPP_PHONE_NUMBER: "1291251750743033" }).phoneNumberId, "1291251750743033");
});

test("supports the legacy WHATSAPP_PHONE_NUMBER_ID setting", () => {
  assert.equal(getWhatsAppConfig({ WHATSAPP_PHONE_NUMBER_ID: "old-id" }).phoneNumberId, "old-id");
});

test("prefers WHATSAPP_PHONE_NUMBER if both settings exist", () => {
  assert.equal(getWhatsAppConfig({ WHATSAPP_PHONE_NUMBER: "current", WHATSAPP_PHONE_NUMBER_ID: "legacy" }).phoneNumberId, "current");
});

test("uses the default Graph API version when not configured", () => {
  assert.equal(getWhatsAppConfig({}).graphVersion, "v23.0");
});
