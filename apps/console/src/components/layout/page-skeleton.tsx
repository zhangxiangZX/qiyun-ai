import { Skeleton } from "@qiyun/ui";

/**
 * 页面级骨架屏 —— 在 Suspense fallback / loading.tsx 中使用。
 * 结构模拟典型 dashboard 页面：页头 + KPI 卡片行 + 内容区。
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6" data-skeleton="true" aria-busy="true">
      {/* 页头骨架 */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* KPI 卡片行骨架 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* 内容区骨架 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageSkeleton;
