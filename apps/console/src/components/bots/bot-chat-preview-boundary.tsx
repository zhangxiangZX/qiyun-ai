"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@qiyun/ui";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Isolate chat preview crashes so the bot edit page remains usable. */
export class BotChatPreviewBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || "聊天预览加载失败",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[BotChatPreview]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <aside className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-card border border-border bg-card p-6 text-center shadow-card">
          <AlertTriangle className="h-8 w-8 text-warning" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">聊天预览暂不可用</p>
            <p className="mt-1 text-xs text-muted-foreground">{this.state.message}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            重试预览
          </Button>
        </aside>
      );
    }

    return this.props.children;
  }
}
