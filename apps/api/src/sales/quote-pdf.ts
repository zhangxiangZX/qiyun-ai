import PDFDocument from "pdfkit";

import type { QuoteDocumentPayload } from "./sales.types";

function resolveChineseFont(): string {
  return require.resolve(
    "@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff",
  );
}

export async function renderQuotePdf(payload: QuoteDocumentPayload): Promise<Uint8Array> {
  const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: `报价单 ${payload.sample.quoteNo}` } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Uint8Array>((resolve, reject) => {
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.on("error", reject);
  });

  document.registerFont("NotoSansSC", resolveChineseFont());
  document.font("NotoSansSC");
  const sample = payload.sample;
  document.fontSize(20).fillColor("#0f172a").text(payload.template.companyName || sample.company.name || "企云 AI");
  document.moveDown(0.4).fontSize(18).fillColor("#2563eb").text("报价单", { align: "center" });
  document.moveDown().fontSize(10).fillColor("#334155");
  document.text(`报价编号：${sample.quoteNo}`);
  document.text(`报价日期：${sample.date}    有效期至：${sample.validUntil}`);
  document.text(`客户：${sample.customer.name}    联系人：${sample.customer.contact}`);
  document.moveDown();

  const widths = [28, 160, 80, 55, 90, 90];
  const headers = ["序号", "产品", "型号", "数量", "单价", "金额"];
  let y = document.y;
  const drawRow = (cells: string[], header = false) => {
    let x = document.page.margins.left;
    const height = 28;
    if (header) document.rect(x, y, widths.reduce((sum, width) => sum + width, 0), height).fill("#eaf2ff");
    cells.forEach((cell, index) => {
      document.fillColor("#0f172a").fontSize(9).text(cell, x + 4, y + 8, { width: widths[index] - 8, lineBreak: false });
      x += widths[index];
    });
    document.moveTo(document.page.margins.left, y + height).lineTo(x, y + height).strokeColor("#cbd5e1").stroke();
    y += height;
  };
  drawRow(headers, true);
  sample.products.forEach((item, index) => drawRow([
    String(index + 1), item.name, item.model, `${item.qty} ${item.unit}`,
    `${sample.currency} ${item.price.toFixed(2)}`, `${sample.currency} ${item.amount.toFixed(2)}`,
  ]));
  document.y = y + 14;
  const total = sample.products.reduce((sum, item) => sum + item.amount, 0);
  document.fontSize(12).fillColor("#0f172a").text(`合计：${sample.currency} ${total.toFixed(2)}`, { align: "right" });
  if (sample.remark) document.moveDown().fontSize(9).fillColor("#475569").text(`备注：${sample.remark}`);
  document.moveDown(2).fontSize(8).fillColor("#64748b").text("本报价单由企云 AI 企业智能服务平台生成。", { align: "center" });
  document.end();
  return completed;
}
