import { json, type ApiResult } from "./api-result";

/**
 * 统一响应信封，对齐《企云 AI V1 后端接口文档》第 4 章规范：
 * - 成功：{ code: 0, message: "success", data: {} }
 * - 分页：{ code: 0, message: "success", data: { list, page, pageSize, total } }
 * - 错误：{ code: 403001, message: "无权访问该企业数据", data: null }
 *
 * 注意：本助手使用 workspace_id 作为租户隔离单元（等同文档的 tenant_id）。
 */
export const ApiCode = {
  SUCCESS: 0,
  BAD_REQUEST: 400001,
  UNAUTHORIZED: 401001,
  FORBIDDEN_TENANT: 403001, // 无权访问该企业数据
  FORBIDDEN_SCOPE: 403002, // 无权访问该数据（数据范围限制）
  NOT_FOUND: 404001,
  VALIDATION: 422001,
  RATE_LIMITED: 429001,
  INTERNAL: 500001,
} as const;

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function ok<T>(data: T, message = "success"): ApiResult {
  return json(200, { code: ApiCode.SUCCESS, message, data } as ApiEnvelope<T>);
}

export function paginate<T>(input: {
  list: T[];
  page?: number;
  pageSize?: number;
  total: number;
  message?: string;
}): ApiResult {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? input.list.length;
  const data: PaginatedData<T> = {
    list: input.list,
    page,
    pageSize,
    total: input.total,
  };
  return json(200, {
    code: ApiCode.SUCCESS,
    message: input.message ?? "success",
    data,
  });
}

export function fail(
  code: number,
  message: string,
  status = 400,
  data: unknown = null,
): ApiResult {
  return json(status, { code, message, data } as ApiEnvelope<unknown>);
}
