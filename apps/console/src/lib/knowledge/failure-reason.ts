import type { DocumentErrorCode } from "./types";

export type DocumentFailureCategory =
  | "format_unsupported"
  | "no_extractable_text"
  | "processing_failed"
  | "parser_unstable"
  | "unknown";

export interface DocumentFailureInsight {
  category: DocumentFailureCategory;
  title: string;
  description: string;
  retryable: boolean;
  actionHint: string;
  /** 后端结构化 errorCode，若有则用于展示 */
  errorCode?: DocumentErrorCode | null;
  /** errorMessage 作为技术补充，不替代主描述 */
  technicalDetail?: string | null;
}

export interface DocumentFailureInput {
  errorCode?: DocumentErrorCode | null;
  errorMessage?: string | null;
  fileType?: string;
}

export const DOCUMENT_ERROR_CODE_COPY: Record<
  DocumentErrorCode,
  Pick<DocumentFailureInsight, "title" | "description" | "retryable" | "actionHint" | "category">
> = {
  parser_unstable_sections: {
    category: "parser_unstable",
    title: "解析结构不稳定",
    description:
      "文件内容结构不稳定，系统暂时无法可靠切分章节，可稍后重试或更换格式更规整的文件。",
    retryable: true,
    actionHint: "可稍后重试索引，或更换格式更规整的文件后重新上传。",
  },
  unsupported_file_type: {
    category: "format_unsupported",
    title: "文件格式暂不支持",
    description: "当前版本仅支持 PDF、DOCX、TXT、MD，请转换后重新上传。",
    retryable: false,
    actionHint: "请转换为 PDF、DOCX、TXT 或 MD 后重新上传。",
  },
  no_extractable_text: {
    category: "no_extractable_text",
    title: "未提取到可用文本",
    description:
      "文件可能是扫描件、空白文件或图片型 PDF，建议转成可复制文本后再上传。",
    retryable: true,
    actionHint: "建议使用可复制文本的 PDF/DOCX，或重试索引。",
  },
  processing_failed: {
    category: "processing_failed",
    title: "处理过程失败",
    description: "系统处理该文件时发生异常，可稍后重试。",
    retryable: true,
    actionHint: "可点击「重试索引」重新排队处理。",
  },
};

const FORMAT_PATTERNS = [
  /unsupported/i,
  /not supported/i,
  /invalid.*format/i,
  /mime/i,
  /extension/i,
  /仅支持/i,
  /格式不支持/i,
  /VALIDATION_ERROR/i,
  /allowed extensions/i,
  /file type/i,
];

const EXTRACT_PATTERNS = [
  /extract/i,
  /no text/i,
  /empty file/i,
  /无可提取/i,
  /无法提取/i,
  /could not extract/i,
  /no readable/i,
  /blank/i,
  /ocr/i,
  /扫描/i,
  /stable sections/i,
];

const PROCESSING_PATTERNS = [
  /index/i,
  /chunk/i,
  /queue/i,
  /worker/i,
  /timeout/i,
  /provider/i,
  /processing/i,
  /处理失败/i,
  /索引/i,
  /qdrant/i,
  /vector/i,
  /embed/i,
];

const UNKNOWN_FALLBACK: Omit<DocumentFailureInsight, "description" | "technicalDetail"> = {
  category: "unknown",
  title: "未知错误",
  retryable: true,
  actionHint: "可尝试重新索引；若仍失败，请更换文件或联系管理员排查。",
};

function fromErrorCode(
  errorCode: DocumentErrorCode,
  errorMessage: string | null | undefined,
): DocumentFailureInsight {
  const copy = DOCUMENT_ERROR_CODE_COPY[errorCode];
  return {
    ...copy,
    errorCode,
    technicalDetail: errorMessage?.trim() || null,
  };
}

function classifyFromMessage(
  errorMessage: string | null | undefined,
  fileType?: string,
): DocumentFailureInsight {
  const message = (errorMessage ?? "").trim();
  const normalized = message.toLowerCase();

  if (!message) {
    return {
      ...UNKNOWN_FALLBACK,
      description:
        "后端未返回 errorCode 与 errorMessage。前端按保底策略展示为未知错误，避免页面出现无说明的失败态。",
      actionHint: "可尝试重新索引；若多次失败，请检查文件内容或联系管理员。",
      technicalDetail: null,
    };
  }

  if (FORMAT_PATTERNS.some((pattern) => pattern.test(message) || pattern.test(normalized))) {
    return {
      category: "format_unsupported",
      title: "文件格式暂不支持",
      description: "当前版本仅支持 PDF、DOCX、TXT、MD，请转换后重新上传。",
      retryable: false,
      actionHint: `请转换为 PDF、DOCX、TXT 或 MD 后重新上传${fileType ? `（当前：${fileType}）` : ""}。`,
      technicalDetail: message,
    };
  }

  if (EXTRACT_PATTERNS.some((pattern) => pattern.test(normalized) || pattern.test(message))) {
    return {
      category: "no_extractable_text",
      title: "未提取到可用文本",
      description:
        "文件可能是扫描件、空白文件或图片型 PDF，建议转成可复制文本后再上传。",
      retryable: true,
      actionHint: "建议使用可复制文本的 PDF/DOCX，或重试索引。",
      technicalDetail: message,
    };
  }

  if (PROCESSING_PATTERNS.some((pattern) => pattern.test(normalized) || pattern.test(message))) {
    return {
      category: "processing_failed",
      title: "处理过程失败",
      description: "系统处理该文件时发生异常，可稍后重试。",
      retryable: true,
      actionHint: "可点击「重试索引」重新排队处理。",
      technicalDetail: message,
    };
  }

  return {
    ...UNKNOWN_FALLBACK,
    description: message,
    technicalDetail: message,
  };
}

/** 优先使用 errorCode；缺失时回退 errorMessage 启发式分类 */
export function classifyDocumentFailure(
  input: DocumentFailureInput | string | null | undefined,
  fileType?: string,
): DocumentFailureInsight {
  if (typeof input === "string" || input === null || input === undefined) {
    return classifyFromMessage(input, fileType);
  }

  const { errorCode, errorMessage } = input;
  const resolvedFileType = input.fileType ?? fileType;

  if (errorCode && errorCode in DOCUMENT_ERROR_CODE_COPY) {
    return fromErrorCode(errorCode, errorMessage);
  }

  return classifyFromMessage(errorMessage, resolvedFileType);
}

export const FAILURE_CATEGORY_LABELS: Record<DocumentFailureCategory, string> = {
  format_unsupported: "格式不支持",
  no_extractable_text: "无可提取文本",
  processing_failed: "处理失败",
  parser_unstable: "解析不稳定",
  unknown: "未知错误",
};

export function getFailureDisplayTitle(insight: DocumentFailureInsight): string {
  return insight.title;
}

export function getErrorCodeLabel(errorCode: DocumentErrorCode): string {
  return DOCUMENT_ERROR_CODE_COPY[errorCode].title;
}
