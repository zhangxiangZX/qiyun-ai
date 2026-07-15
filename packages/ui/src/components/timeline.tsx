import { Badge } from "./badge";
import { Button } from "./button";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  meta?: string;
  tone?: "default" | "success" | "warning" | "muted" | "info";
  badge?: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  loading?: boolean;
  errorMessage?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function Timeline({
  items,
  loading = false,
  errorMessage = null,
  emptyTitle = "暂无记录",
  emptyDescription = "后续跟进记录会显示在这里。",
  onRetry,
  retryLabel = "重试",
}: TimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-control bg-muted/60" />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-3">
        <div className="rounded-control border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-control border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
        <p className="text-sm font-medium text-card-foreground">{emptyTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-border/80 pl-4">
      {items.map((item, index) => (
        <li key={item.id} className="relative pb-5 last:pb-0">
          <span
            className={`absolute -left-[calc(0.5rem+1px)] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card ${
              item.tone === "success"
                ? "bg-emerald-500"
                : item.tone === "warning"
                  ? "bg-amber-500"
                  : item.tone === "info"
                    ? "bg-sky-500"
                    : item.tone === "muted"
                      ? "bg-muted-foreground/40"
                      : "bg-primary"
            }`}
            aria-hidden
          />
          <div className={index === 0 ? "rounded-control bg-muted/30 p-3" : "pt-0.5"}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-card-foreground">{item.title}</p>
              {item.badge ? (
                <Badge
                  variant={
                    item.tone === "warning"
                      ? "warning"
                      : item.tone === "success"
                        ? "success"
                        : item.tone === "info"
                          ? "outline"
                          : "secondary"
                  }
                  className="text-[10px]"
                >
                  {item.badge}
                </Badge>
              ) : null}
              {item.meta ? (
                <time className="ml-auto text-xs text-muted-foreground">{item.meta}</time>
              ) : null}
            </div>
            {item.description ? (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
