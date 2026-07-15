export interface PreviewDemoStep {
  id: string;
  label: string;
  href: string;
  note?: string;
}

/** Preview 模式演示 walkthrough — 仅用于 UI 引导，不触发真实后端。 */
export const previewDemoScriptSteps: PreviewDemoStep[] = [
  {
    id: "overview",
    label: "概览：查看 KPI 与趋势",
    href: "/dashboard",
    note: "演示数据，不代表真实业务指标",
  },
  {
    id: "knowledge",
    label: "知识库：创建库并上传文档",
    href: "/dashboard/knowledge-bases",
    note: "Preview 下为内存 BFF 模拟流程",
  },
  {
    id: "bots",
    label: "机器人：配置基础与行为",
    href: "/dashboard/bots",
    note: "可在浏览器内创建与编辑，刷新可能丢失",
  },
  {
    id: "conversations",
    label: "会话：浏览对话与元数据",
    href: "/dashboard/conversations",
    note: "元数据修改不会持久化",
  },
  {
    id: "leads",
    label: "线索：筛选与详情演示",
    href: "/dashboard/leads",
  },
  {
    id: "sites",
    label: "站点：域名白名单与嵌入代码",
    href: "/dashboard/sites",
    note: "测试消息为本地模拟",
  },
  {
    id: "reports",
    label: "报表：周期汇总与问题分析",
    href: "/dashboard/reports",
  },
];
