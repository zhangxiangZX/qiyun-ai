export type ConsoleDataMode = "preview" | "upstream";

export const DATA_MODE_TITLES: Record<ConsoleDataMode, string> = {
  preview: "Preview / 演示模式",
  upstream: "正式 API 模式",
};

export const DATA_MODE_SHORT: Record<ConsoleDataMode, string> = {
  preview: "当前为演示环境数据，刷新或服务重启后可能丢失，未写入正式后端。",
  upstream: "已连接正式 API，展示当前工作区真实业务数据。",
};

export const PREVIEW_LIMITATION_HINTS: Record<string, string> = {
  知识库:
    "删除文档、失败码分布等与生产环境不同；multipart 上传为 BFF 内存模拟，不涉及 MinIO/磁盘。",
  概览: "KPI、趋势、渠道分布与最近线索为 Console 内置演示数据，不代表真实业务指标。",
  报表: "周期汇总、趋势与机器人表现为 Console 内置演示数据；未配置上游时本页可能不可用。",
  站点: "域名保存与密钥轮换写入演示数据；测试消息不会调用真实 Widget 公共接口。",
  通知: "通知列表为 Console 内置演示事件，已读状态仅存于浏览器；配置 API_BASE_URL 后将展示真实业务事件。",
  系统状态:
    "未配置 API_BASE_URL 时基础设施状态均为演示占位，不代表真实探针结果。",
  会话: "状态与标签修改不会持久化；列表一次加载全部演示数据。",
  线索: "线索列表与详情来自演示数据；保存写入演示数据，不会同步至 apps/api。",
  机器人: "演示模式下机器人列表与配置仅供浏览；新建、编辑与保存已禁用，不会写入 apps/api。",
  机器人编辑: "演示模式下配置表单仅供浏览，保存已禁用；右侧对话预览走 Console 模拟，不会写入真实后端。",
  团队: "成员与邀请操作经 Console BFF 处理；未连接 apps/api 时数据可能仅存于内存。",
  邀请: "邀请状态与投递记录来自 Console BFF；未连接 apps/api 时为演示环境。",
};

export const UPSTREAM_CAPABILITY_HINTS: Record<string, string> = {
  询盘中心: "列表与统计来自当前工作区真实询盘数据。",
  知识库:
    "multipart 经 BFF 代理至 apps/api；文件存储与向量索引由后端环境配置决定。",
  概览: "数据来自 apps/api 聚合分析接口，反映当前工作区真实会话与线索统计。",
  报表: "数据来自 apps/api 报表聚合接口，反映当前工作区真实分析结果。",
  站点: "站点列表、域名白名单 PATCH 与密钥轮换来自 apps/api；测试消息走上游公共聊天接口。",
  通知: "通知来自 apps/api 事件流；未读数与跳转链接与生产环境一致。",
  系统状态:
    "通过 BFF 探测 apps/api /health；部分依赖项为诚实占位说明，非实时探针。",
  会话: "会话列表支持 cursor 分页；元数据 PATCH 经 BFF 保存至 apps/api。",
  线索: "BFF 已代理 GET/PATCH /leads；列表、详情与保存均走 apps/api。",
  机器人: "机器人列表与配置经 BFF 连接 apps/api；扩展字段保存会写入真实后端。",
  机器人编辑: "各分区保存经 BFF 写入 apps/api；右侧预览走真实流式聊天与知识检索。",
  团队: "成员与邀请操作经 BFF 代理至 apps/api，变更会写入真实后端。",
  邀请: "邀请状态与投递记录来自 apps/api，操作会同步至真实后端。",
};

export function getFeatureDataModeHint(
  feature: string | undefined,
  mode: ConsoleDataMode,
): string {
  if (!feature) return "";
  const map = mode === "upstream" ? UPSTREAM_CAPABILITY_HINTS : PREVIEW_LIMITATION_HINTS;
  return map[feature] ?? "";
}

export function formatPreviewLimitation(scope: string, limitation: string): string {
  return `${scope}：${limitation} ${DATA_MODE_SHORT.preview}`;
}

export function getPreviewNoticeTitle(): string {
  return "演示模式说明";
}

export function getNotificationPreviewHint(): string {
  return PREVIEW_LIMITATION_HINTS.通知;
}
