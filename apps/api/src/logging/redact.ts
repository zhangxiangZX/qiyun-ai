/**
 * Redact likely-sensitive data from an arbitrary log string so that customer
 * data never lands in plaintext logs.
 *
 * It is deliberately conservative: only well-recognised patterns are masked,
 * and non-sensitive text is left untouched as much as possible.
 *
 * Covered patterns:
 *  - phone numbers: 1[3-9]\d{9}            -> 138****8000
 *  - email addresses: user@example.com     -> u****@example.com
 *  - sensitive key=value pairs: code=, token:, password=, ...
 *  - standalone long digit runs (6-18 digits, e.g. verification codes / ids)
 *
 * Masking replaces the middle with `****`, keeping a few leading/trailing
 * characters so the shape of the data remains debuggable.
 */

function maskDigitRun(run: string): string {
  if (run.length <= 5) return run;
  const head = run.slice(0, 2);
  const tail = run.slice(-2);
  return `${head}****${tail}`;
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "****";
  const local = email.slice(0, at);
  const domain = email.slice(at); // includes the "@"
  if (local.length <= 1) return `****${domain}`;
  return `${local.slice(0, 1)}****${domain}`;
}

// Sensitive keys whose value should be masked wherever they appear, e.g.
// `code=123456`, `token: abcdef`, `password="secret"`.
const SENSITIVE_KEY_RE =
  /(password|passwd|pwd|token|secret|secretkey|accesstoken|refreshtoken|authorization|code|verificationcode|验证码)(["']?\s*[:=]\s*"?)([^\s,"'}]+)/gi;

const PHONE_RE = /1[3-9]\d{9}/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LONG_DIGIT_RE = /(?<!\d)\d{6,18}(?!\d)/g;

export function redactSensitive(text: string): string {
  if (!text) return text;
  if (typeof text !== "string") return text;

  let out = text;

  // 1. Sensitive key=value / key: value pairs.
  out = out.replace(
    SENSITIVE_KEY_RE,
    (_match, key: string, sep: string) => `${key}${sep}****`,
  );

  // 2. Phone numbers (11 digits, China mobile pattern).
  out = out.replace(PHONE_RE, (m) => maskDigitRun(m));

  // 3. Email addresses.
  out = out.replace(EMAIL_RE, (m) => maskEmail(m));

  // 4. Standalone long digit runs (verification codes, numeric ids, ...).
  out = out.replace(LONG_DIGIT_RE, (m) => maskDigitRun(m));

  return out;
}
