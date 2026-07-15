import assert from "node:assert/strict";
import test from "node:test";
import { renderQuotePdf } from "./quote-pdf";

test("renderQuotePdf returns a valid PDF document", async () => {
  const bytes = await renderQuotePdf({
    template: { id: "tpl", templateName: "Default", companyName: "Qiyun AI", description: "", themeColor: "#2563eb", logoPosition: "left", showCompanyInfo: true, showCustomerInfo: true, fields: [], terms: { payment: "", delivery: "", validity: "" }, isDefault: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    sample: { quoteNo: "Q-001", date: "2026-01-01", validUntil: "2026-01-31", currency: "CNY", company: { name: "Qiyun", enName: "Qiyun", address: "Hangzhou", phone: "" }, customer: { name: "Factory", contact: "Buyer", phone: "", email: "" }, products: [{ name: "Machine", model: "A1", qty: 2, unit: "set", price: 100, amount: 200 }] },
    html: "",
  });
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.match(text, /Q-001/);
  assert.ok(text.endsWith("%%EOF"));
});
