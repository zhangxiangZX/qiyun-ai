-- Quote opportunity commercial details (line items, fees, attachment refs)
ALTER TABLE quote_opportunities
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN quote_opportunities.details IS
  'Commercial payload: lineItems, freight/install/other, taxRate, attachmentIds, remark';
