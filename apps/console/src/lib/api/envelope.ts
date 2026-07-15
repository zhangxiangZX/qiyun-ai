// 统一信封解包工具。
//
// 后端经 P3 改造后，所有成功响应统一为 { code, message, data } 信封
// （code 固定为 ApiCode.SUCCESS = 0，见 apps/api/src/http/api-envelope.ts）。
// 前端 / BFF 只需 data 字段，这里在解析层统一解包，使上层调用方看到的数据
// 结构与信封改造前（直接返回 body）完全一致 —— 不破坏任何既有对接。
//
// 仅在响应体是「标准成功信封」时才解包 data：
//   - 必须是非数组对象
//   - 必须带数值 code === 0（ENVELOPE_SUCCESS_CODE）
//   - 必须含 data 字段
// 其余情况（裸数组、裸对象、BFF 自有字符串码错误体 {code:"NOT_AVAILABLE"}、
// {mode,...} 模式信息、{authenticated,...} 会话信息等）一律原样返回，避免误伤。

/** 与后端 ApiCode.SUCCESS 严格对齐：成功信封固定 code === 0。 */
export const ENVELOPE_SUCCESS_CODE = 0;

export function unwrapEnvelope<T>(body: unknown): T {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const candidate = body as Record<string, unknown>;
    if (candidate.code === ENVELOPE_SUCCESS_CODE && "data" in candidate) {
      return candidate.data as T;
    }
  }
  return body as T;
}
