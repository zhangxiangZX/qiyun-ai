const REFERENCE_SECTION_PATTERN =
  /\n*(?:参考来源|引用来源|资料来源|知识库来源|来源索引)[：:][\s\S]*$/i;

const IMPORTANT_NOTICE_PATTERN =
  /\n*(?:\*{0,2}重要提示\*{0,2}|重要提示)[：:][\s\S]*$/i;

const INTERNAL_HTML_PATTERN = /\b(?:About|Contact|Product|default)[\da-f]*\.html\b/gi;

const INTERNAL_TERMS: Array<[RegExp, string]> = [
  [/旧站镜像/g, "官网资料"],
  [/旧站下载页/g, "官网资料"],
  [/旧站下载/g, "官网资料"],
  [/旧站资料/g, "官网资料"],
  [/旧站信息/g, "官网信息"],
  [/旧站列示/g, "产品资料列示"],
  [/旧站列有/g, "产品资料包含"],
  [/旧站提到/g, "资料中提到"],
  [/旧站/g, "官网"],
  [/离线包/g, "资料库"],
  [/资料下载与来源索引/g, "产品资料"],
  [/资料下载页/g, "官网资料"],
  [/来源索引/g, "资料"],
  [/未在离线包中成功抓取/g, "暂未收录完整版本"],
  [/\.pdf\.txt/gi, ".pdf"],
];

export function sanitizeContextBlock(block: string): string {
  let result = block.replace(INTERNAL_HTML_PATTERN, "").trim();

  for (const [pattern, replacement] of INTERNAL_TERMS) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

const STIFF_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/暂未在资料中找到足够依据[。！]?/g, "这块我手头资料写得不够细。"],
  [/暂未找到对应资料[。！]?/g, "这个我这边暂时查不太准。"],
  [/根据(?:官网|产品|知识库)资料[，,]\s*/g, ""],
  [/如下所示[：:]/g, ""],
  [/综上所述[，,]/g, ""],
];

export function sanitizeVisitorFacingReply(text: string): string {
  let result = text.trim();
  if (!result) {
    return result;
  }

  result = result.replace(REFERENCE_SECTION_PATTERN, "");
  result = result.replace(IMPORTANT_NOTICE_PATTERN, "");
  result = result.replace(/^根据(?:官网|产品|知识库)资料[，,]\s*/m, "");
  result = result.replace(/以上联系方式[^。！？\n]*[。！？]?/g, "");
  result = result.replace(/建议您在联系前确认其仍有效[。！？]?/g, "");
  result = result.replace(/联系方式[^。！？\n]*(?:来自|源于)(?:官网|产品)资料[^。！？\n]*[。！？]?/g, "");
  result = result.replace(/^[\-*•]\s*《[^》]+》.*$/gm, "");
  result = result.replace(/根据《[^》]+》[:：]?\s*/g, "");
  result = result.replace(INTERNAL_HTML_PATTERN, "");
  result = result.replace(/\[[^\]]+\.html[^\]]*\]/gi, "");

  for (const [pattern, replacement] of INTERNAL_TERMS) {
    result = result.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of STIFF_PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return result;
}
