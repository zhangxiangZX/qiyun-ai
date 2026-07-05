import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpenText,
  Bot,
  FileText,
  Globe2,
  MailPlus,
  MessageSquareText,
  Users,
} from "lucide-react";

import { EmptyState, type EmptyStateProps } from "@qiyun/ui";

type CatalogPreset = Pick<EmptyStateProps, "title" | "description" | "icon">;

export const consoleEmptyCatalog = {
  noBots: {
    title: "还没有机器人",
    description: "创建第一个机器人后，即可配置知识库、部署 Widget 并开始收集会话。",
    icon: <Bot className="h-8 w-8" aria-hidden />,
  },
  noKnowledgeBases: {
    title: "还没有知识库",
    description: "创建知识库并上传文档后，机器人才能检索并引用你的业务内容。",
    icon: <BookOpenText className="h-8 w-8" aria-hidden />,
  },
  noDocuments: {
    title: "还没有上传文档",
    description: "上传 PDF、DOCX、TXT 或 Markdown 文件，开始构建可检索上下文。",
    icon: <FileText className="h-8 w-8" aria-hidden />,
  },
  noConversations: {
    title: "还没有会话",
    description: "部署 Widget 或开启预览后，访客对话会显示在这里。",
    icon: <MessageSquareText className="h-8 w-8" aria-hidden />,
  },
  noLeads: {
    title: "还没有线索",
    description: "访客提交留资后，线索会集中显示在这里，便于销售跟进。",
    icon: <Users className="h-8 w-8" aria-hidden />,
  },
  noReports: {
    title: "暂无报表数据",
    description: "有真实会话后，趋势、机器人表现与问题分析会显示在这里。",
    icon: <BarChart3 className="h-8 w-8" aria-hidden />,
  },
  noMatches: {
    title: "没有匹配结果",
    description: "调整筛选条件或清空搜索后再试。",
    icon: undefined,
  },
  noSites: {
    title: "还没有可管理的站点",
    description: "创建机器人后，可在这里配置域名白名单、嵌入代码与 Site Key。",
    icon: <Globe2 className="h-8 w-8" aria-hidden />,
  },
  noDomains: {
    title: "还没有配置域名",
    description: "添加允许加载 Widget 的域名，保存后才会对访客站点生效。",
    icon: <Globe2 className="h-6 w-6" aria-hidden />,
  },
  noTeamMembers: {
    title: "还没有团队成员",
    description: "从右侧发出第一条邀请，成员接受后即可加入当前工作区。",
    icon: <Users className="h-8 w-8" aria-hidden />,
  },
  noInvitations: {
    title: "还没有邀请记录",
    description: "当你邀请成员加入工作区后，这里会显示投递状态、失败原因和审计轨迹。",
    icon: <MailPlus className="h-8 w-8" aria-hidden />,
  },
  noFrequentQuestions: {
    title: "暂无高频问题",
    description: "有会话数据后，系统会按相似问题聚合展示。",
    icon: undefined,
  },
  noUnresolvedQuestions: {
    title: "暂无未解决问题",
    description: "机器人回答稳定时，这里会保持为空。",
    icon: undefined,
  },
  noRecentLeads: {
    title: "还没有线索",
    description: "部署 Widget 并开启留资后，最新线索会显示在这里。",
    icon: <Users className="h-8 w-8" aria-hidden />,
  },
  noBotMetrics: {
    title: "暂无机器人数据",
    description: "创建并启用机器人后，这里会展示各机器人的会话与转化表现。",
    icon: <Bot className="h-8 w-8" aria-hidden />,
  },
  noCitations: {
    title: "暂无知识引用",
    description: "当机器人命中知识库内容时，会在这里展示引用来源。",
    icon: <BookOpenText className="h-6 w-6" aria-hidden />,
  },
} satisfies Record<string, CatalogPreset>;

export function ConsoleEmptyState({
  preset,
  title,
  description,
  action,
  secondaryAction,
  actionLabel,
  onAction,
}: {
  preset: keyof typeof consoleEmptyCatalog;
  title?: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const config = consoleEmptyCatalog[preset];
  return (
    <EmptyState
      title={title ?? config.title}
      description={description ?? config.description}
      icon={config.icon}
      action={action}
      secondaryAction={secondaryAction}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
