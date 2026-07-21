"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/* -------------------------------------------------------------------------- */
/*  useApiResource — 所有页面后端对接的统一入口                                */
/*                                                                            */
/*  行为：                                                                     */
/*   - 调用 BFF 路由 /api{path}                                               */
/*   - 成功(200) → 真实数据，isPreview=false                                  */
/*   - 503 / PREVIEW_MODE（未配置 API_BASE_URL）→ 回退 mockData，isPreview=true */
/*   - 其他错误 → error 置位，isPreview=false（不把失败伪装成预览 mock）        */
/*                                                                            */
/*  设计来源：apps/console/src/lib/api/{client,errors,mode}.ts 已实现的        */
/*  双数据模式（upstream / preview）。本 hook 是其 React 封装。               */
/* -------------------------------------------------------------------------- */

export interface ApiResourceState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** true = 当前展示的是本地 mock（上游未配置或请求失败） */
  isPreview: boolean;
  refetch: () => void;
}

export interface UseApiResourceOptions {
  /** 为 false 时不发起请求，直接使用 mockData（如依赖未就绪） */
  enabled?: boolean;
  /** 控制重新请求的依赖项（分页 / 筛选变化时传入） */
  deps?: ReadonlyArray<unknown>;
}

export function useApiResource<T>(
  path: string,
  mockData: T,
  options: UseApiResourceOptions = {},
): ApiResourceState<T> {
  const { enabled = true, deps = [] } = options;
  const [data, setData] = useState<T>(mockData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const requestId = useRef(0);
  const mockDataRef = useRef(mockData);
  mockDataRef.current = mockData;

  const load = useCallback(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    apiRequest<T>(path)
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setIsPreview(false);
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        const fallback = mockDataRef.current;
        if (err instanceof ApiError && err.code === "PREVIEW_MODE") {
          // 上游未配置 → 预览模式，使用本地 mock
          setData(fallback);
          setIsPreview(true);
        } else {
          // 真实上游错误：展示错误，不把失败伪装成预览 mock
          setError(err instanceof Error ? err.message : "请求失败");
          setIsPreview(false);
        }
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [path, enabled]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  const refetch = useCallback(() => load(), [load]);

  return { data, loading, error, isPreview, refetch };
}

/* -------------------------------------------------------------------------- */
/*  变更操作封装（创建 / 更新 / 删除）                                          */
/*  预览模式下会抛出 PREVIEW_MODE，调用方应捕获并提示「操作未同步到后端」。    */
/* -------------------------------------------------------------------------- */

export type MutationMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export async function apiMutate<T = unknown>(
  path: string,
  method: MutationMethod,
  body?: unknown,
): Promise<T> {
  return apiRequest<T>(path, { method, body });
}

/** 判断错误是否为预览模式（可用于决定提示文案） */
export function isPreviewModeError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "PREVIEW_MODE";
}
