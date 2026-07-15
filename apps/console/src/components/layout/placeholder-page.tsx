import type { ReactNode } from "react";

import { EmptyState, PageHeader } from "@qiyun/ui";

export interface PlaceholderPageProps {
  title?: string;
  description?: string;
  segment?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

const fallbackContent: Record<string, { title: string; description: string }> = {
  bots: {
    title: "机器人",
    description: "管理助手配置、提示词和已连接的知识库。",
  },
  conversations: {
    title: "对话",
    description: "在同一位置查看实时和历史客户聊天。",
  },
  knowledge: {
    title: "知识库",
    description: "管理源文档并跟踪导入进度。",
  },
  leads: {
    title: "线索",
    description: "捕获合格线索并跟进上下文。",
  },
  sites: {
    title: "站点",
    description: "配置挂件、域名和嵌入设置。",
  },
};

export function PlaceholderPage({ title, description, segment, icon, action }: PlaceholderPageProps) {
  const fallback = segment ? fallbackContent[segment] : undefined;
  const resolvedTitle = title ?? fallback?.title ?? "敬请期待";
  const resolvedDescription =
    description ?? fallback?.description ?? "该模块正在建设中，敬请期待。";

  return (
    <div className="space-y-6">
      <PageHeader variant="compact" title={resolvedTitle} description={resolvedDescription} />
      <div>
        <EmptyState title={resolvedTitle} description={resolvedDescription} icon={icon} action={action} />
      </div>
    </div>
  );
}

export default PlaceholderPage;
