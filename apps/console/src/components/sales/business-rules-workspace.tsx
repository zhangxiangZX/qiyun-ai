"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit,
  FileUp,
  Headphones,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Star,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { getBusinessRules, updateBusinessRules } from "@/lib/sales/api";
import type { BusinessRules } from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/business-rules.module.css";

type RuleCategory = "all" | "lead" | "chat" | "handoff" | "task";
type RuleScene = "对话规则" | "线索规则" | "转人工规则" | "任务规则";
type Priority = "高" | "中" | "低";

interface RuleItem {
  id: string;
  name: string;
  sub: string;
  category: Exclude<RuleCategory, "all">;
  scene: RuleScene;
  trigger: string;
  action: string;
  enabled: boolean;
  priority: Priority;
  icon: typeof Bot;
  sceneLabel: string;
  description: string;
  triggers: string[];
  actions: string[];
  exceptions: string[];
  createdAt: string;
  updatedAt: string;
  creator: string;
}

const PAGE_SIZE = 10;

const PRESET_RULES: RuleItem[] = [
  {
    id: "quote-collect",
    name: "询价信息收集规则",
    sub: "收集产品询价的关键信息",
    category: "chat",
    scene: "对话规则",
    trigger: "客户询问价格、报价、多少钱\n或包含询价意图的表达",
    action: "收集信息 → 生成线索",
    enabled: true,
    priority: "高",
    icon: Bot,
    sceneLabel: "客户询价场景",
    description: "当客户询问价格或报价时，自动收集关键信息，生成线索。",
    triggers: [
      "客户消息包含关键词：价格、报价、多少钱、费用、价钱、报个价、什么价",
      "客户消息包含询价意图（意图识别：询价意图）",
      "对话轮次 ≥ 2 轮且未获取完整询价信息",
    ],
    actions: [
      "收集信息：产品名称、规格型号、数量、使用场景、预算范围、期望交期、联系方式",
      "信息验证：检查信息完整性，缺失项则继续提问",
      "生成线索：创建询价线索，分配给相关销售",
      "确认反馈：向客户发送信息确认和感谢",
      "内部通知：通知销售和相关人员",
    ],
    exceptions: [
      "客户明确表示不需要报价 → 不触发规则",
      "客户已有完整询价信息 → 直接生成线索",
      "客户要求转人工 → 直接转人工处理",
    ],
    createdAt: "2025-04-15 14:30",
    updatedAt: "2025-04-28 10:20",
    creator: "系统预置",
  },
  {
    id: "drawing-upload",
    name: "图纸上传处理规则",
    sub: "客户上传图纸时的处理流程",
    category: "lead",
    scene: "线索规则",
    trigger: "客户上传图纸、CAD、PDF等文件",
    action: "标记高意向 → 通知销售\n创建跟进任务",
    enabled: true,
    priority: "高",
    icon: FileUp,
    sceneLabel: "文件上传场景",
    description: "客户上传技术图纸时，自动识别为高意向并创建跟进任务。",
    triggers: ["客户上传图纸、CAD、PDF 等文件", "文件类型为工程图纸或规格文档"],
    actions: ["标记高意向客户", "通知负责销售", "创建跟进任务"],
    exceptions: ["非业务相关文件 → 提示重新上传"],
    createdAt: "2025-04-10 09:00",
    updatedAt: "2025-04-25 16:40",
    creator: "系统预置",
  },
  {
    id: "delivery-reply",
    name: "交期询问回复规则",
    sub: "客户询问交期时的标准回复",
    category: "chat",
    scene: "对话规则",
    trigger: "客户询问交期、发货时间、\n多久能到货",
    action: "标准回复 → 引导提供需求信息",
    enabled: true,
    priority: "中",
    icon: Clock,
    sceneLabel: "交期咨询场景",
    description: "客户询问交期时，提供标准回复并引导补充需求信息。",
    triggers: ["客户询问交期、发货时间、多久能到货"],
    actions: ["检索交期知识库", "标准回复常规交期", "引导补充定制需求"],
    exceptions: ["已有完整订单信息 → 直接确认交期"],
    createdAt: "2025-04-08 11:20",
    updatedAt: "2025-04-22 09:15",
    creator: "系统预置",
  },
  {
    id: "ip-rating",
    name: "防护等级咨询规则",
    sub: "客户咨询防护等级相关问题",
    category: "chat",
    scene: "对话规则",
    trigger: "客户询问IP等级、防护等级、\n防水防尘等",
    action: "知识库检索 → 回答\n无匹配则转人工",
    enabled: true,
    priority: "中",
    icon: Shield,
    sceneLabel: "技术参数咨询",
    description: "针对 IP 防护等级等技术参数问题，优先知识库检索回答。",
    triggers: ["客户询问 IP 等级、防护等级、防水防尘等"],
    actions: ["知识库检索", "生成标准回答", "无匹配则转人工"],
    exceptions: ["非标定制需求 → 转人工"],
    createdAt: "2025-04-05 15:00",
    updatedAt: "2025-04-20 14:30",
    creator: "系统预置",
  },
  {
    id: "cert-inquiry",
    name: "认证咨询规则",
    sub: "客户询问认证信息处理",
    category: "chat",
    scene: "对话规则",
    trigger: "客户询问CE、RoHS、UL等认证",
    action: "知识库检索 → 回答\n无匹配则转人工",
    enabled: true,
    priority: "中",
    icon: Award,
    sceneLabel: "认证咨询场景",
    description: "客户询问产品认证信息时的标准处理流程。",
    triggers: ["客户询问 CE、RoHS、UL 等认证"],
    actions: ["知识库检索认证资料", "提供认证说明", "无匹配则转人工"],
    exceptions: ["特殊市场认证 → 转人工确认"],
    createdAt: "2025-04-03 10:45",
    updatedAt: "2025-04-18 11:00",
    creator: "系统预置",
  },
  {
    id: "high-intent",
    name: "高意向客户识别规则",
    sub: "识别高意向客户特征",
    category: "lead",
    scene: "线索规则",
    trigger: "满足评分≥80分 或 明确项目需求\n或 提供联系方式",
    action: "标记高意向 → 分配销售\n发送感谢邮件",
    enabled: true,
    priority: "高",
    icon: Star,
    sceneLabel: "高意向识别",
    description: "根据对话特征识别高意向客户并自动分配销售。",
    triggers: ["满足评分 ≥ 80 分", "明确项目需求", "提供联系方式"],
    actions: ["标记高意向", "分配销售", "发送感谢邮件"],
    exceptions: ["低意向闲聊 → 不触发"],
    createdAt: "2025-04-01 08:30",
    updatedAt: "2025-04-26 17:20",
    creator: "系统预置",
  },
  {
    id: "no-reply-reminder",
    name: "长时间未回复提醒规则",
    sub: "客户长时间未回复时提醒",
    category: "task",
    scene: "任务规则",
    trigger: "客户24小时未回复",
    action: "创建跟进任务 → 通知销售",
    enabled: true,
    priority: "低",
    icon: Bell,
    sceneLabel: "跟进提醒",
    description: "客户长时间未回复时，自动创建跟进任务并通知销售。",
    triggers: ["客户 24 小时未回复"],
    actions: ["创建跟进任务", "通知负责销售"],
    exceptions: ["客户已成交 → 不触发"],
    createdAt: "2025-03-28 13:00",
    updatedAt: "2025-04-15 09:30",
    creator: "系统预置",
  },
  {
    id: "sensitive-handoff",
    name: "敏感问题转人工规则",
    sub: "敏感或复杂问题转人工处理",
    category: "handoff",
    scene: "转人工规则",
    trigger: "涉及价格优惠、特殊定制、\n技术复杂问题等",
    action: "转人工 → 通知相关人员",
    enabled: true,
    priority: "高",
    icon: Headphones,
    sceneLabel: "转人工场景",
    description: "涉及敏感或复杂问题时，自动转接人工客服。",
    triggers: ["涉及价格优惠、特殊定制、技术复杂问题等"],
    actions: ["转人工", "通知相关人员"],
    exceptions: ["FAQ 可回答的简单问题 → 不转人工"],
    createdAt: "2025-03-25 16:00",
    updatedAt: "2025-04-10 10:00",
    creator: "系统预置",
  },
];

const RULE_TRIGGER_OPTIONS: {
  label: string;
  category: Exclude<RuleCategory, "all">;
  scene: RuleScene;
  sceneLabel: string;
  trigger: string;
}[] = [
  { label: "收到询盘", category: "lead", scene: "线索规则", sceneLabel: "线索获取场景", trigger: "客户提交询盘表单或发起咨询" },
  { label: "报价超时", category: "chat", scene: "对话规则", sceneLabel: "报价跟进场景", trigger: "报价发出后超过约定时间仍未确认" },
  { label: "无跟进", category: "task", scene: "任务规则", sceneLabel: "跟进提醒场景", trigger: "客户长时间无跟进动作" },
];

const RULE_ACTION_OPTIONS = ["分配销售", "发送提醒", "创建任务"];

function enrichRulesFromApi(rules: BusinessRules | null): RuleItem[] {
  if (!rules) return PRESET_RULES;
  return PRESET_RULES.map((item) => {
    if (item.id === "quote-collect") {
      const fields = rules.requiredQuoteFields.join("、") || "产品名称、规格型号、数量";
      return {
        ...item,
        triggers: [
          `客户消息包含关键词：${rules.highIntentKeywords.slice(0, 6).join("、") || "价格、报价、多少钱"}`,
          "客户消息包含询价意图（意图识别：询价意图）",
          "对话轮次 ≥ 2 轮且未获取完整询价信息",
        ],
        actions: [
          `收集信息：${fields}、使用场景、预算范围、期望交期、联系方式`,
          ...item.actions.slice(1),
        ],
      };
    }
    if (item.id === "high-intent") {
      const keywords = rules.highIntentKeywords.slice(0, 6).join("、") || "价格、报价、多少钱";
      return {
        ...item,
        triggers: ["满足评分 ≥ 80 分 或 明确项目需求", "提供联系方式", `消息包含高意向关键词：${keywords}`],
      };
    }
    if (item.id === "sensitive-handoff") {
      const keywords = rules.transferToHumanKeywords.slice(0, 6).join("、") || "价格优惠、特殊定制";
      return {
        ...item,
        triggers: [`涉及关键词：${keywords}`, "技术复杂问题等"],
      };
    }
    return item;
  });
}

function priorityClass(priority: Priority) {
  if (priority === "高") return styles.badgeRed;
  if (priority === "中") return styles.badgeYellow;
  return styles.badgeGreen;
}

export function BusinessRulesWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [apiRules, setApiRules] = useState<BusinessRules | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RuleCategory>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("quote-collect");
  const [page, setPage] = useState(1);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [createdRules, setCreatedRules] = useState<RuleItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; trigger: string; action: string }>({
    name: "",
    trigger: "收到询盘",
    action: "分配销售",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getBusinessRules();
      setApiRules(next);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const allRules = useMemo(
    () => [...createdRules, ...enrichRulesFromApi(apiRules)],
    [apiRules, createdRules],
  );

  const tabCounts = useMemo<Record<RuleCategory, number>>(() => {
    const counts: Record<RuleCategory, number> = {
      all: allRules.length,
      lead: 0,
      chat: 0,
      handoff: 0,
      task: 0,
    };
    for (const rule of allRules) {
      counts[rule.category] += 1;
    }
    return counts;
  }, [allRules]);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRules.filter((rule) => {
      if (activeTab !== "all" && rule.category !== activeTab) return false;
      if (statusFilter === "enabled" && !(enabledMap[rule.id] ?? rule.enabled)) return false;
      if (statusFilter === "disabled" && (enabledMap[rule.id] ?? rule.enabled)) return false;
      if (priorityFilter !== "all" && rule.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        rule.name.toLowerCase().includes(q) ||
        rule.trigger.toLowerCase().includes(q) ||
        rule.action.toLowerCase().includes(q)
      );
    });
  }, [allRules, activeTab, statusFilter, priorityFilter, search, enabledMap]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / PAGE_SIZE));
  const pageRules = filteredRules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRule = allRules.find((r) => r.id === selectedId) ?? allRules[0];
  const selectedEnabled = enabledMap[selectedRule.id] ?? selectedRule.enabled;

  async function handleToggleEnabled(checked: boolean) {
    setEnabledMap((current) => ({ ...current, [selectedRule.id]: checked }));
    setNotice(checked ? "规则已启用，正在同步…" : "规则已停用，正在同步…");
    try {
      if (apiRules) {
        await updateBusinessRules(apiRules);
        setNotice(checked ? "规则已启用。" : "规则已停用。");
      } else {
        setNotice(checked ? "规则已启用（预览模式）。" : "规则已停用（预览模式）。");
      }
    } catch {
      setNotice("同步失败，规则状态仅在本会话生效。");
    }
  }

  function resetFilters() {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearch("");
    setPage(1);
  }

  function createRule() {
    if (!form.name.trim()) return;
    const trig = RULE_TRIGGER_OPTIONS.find((t) => t.label === form.trigger) ?? RULE_TRIGGER_OPTIONS[0];
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newRule: RuleItem = {
      id,
      name: form.name.trim(),
      sub: `自定义规则 · ${trig.label}`,
      category: trig.category,
      scene: trig.scene,
      trigger: trig.trigger,
      action: form.action,
      enabled: true,
      priority: "中",
      icon: Bot,
      sceneLabel: trig.sceneLabel,
      description: `当${trig.trigger}时，自动执行「${form.action}」操作。`,
      triggers: [trig.trigger],
      actions: [form.action],
      exceptions: ["手动停用规则 → 不触发"],
      createdAt: now,
      updatedAt: now,
      creator: "当前会话",
    };
    setCreatedRules((current) => [newRule, ...current]);
    setSelectedId(id);
    setPage(1);
    setForm({ name: "", trigger: "收到询盘", action: "分配销售" });
    setCreating(false);
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载业务规则…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分规则配置加载失败，当前展示系统预置规则。")} />
      ) : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      {creating ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, padding: 24 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#111827" }}>新建规则</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#9ca3af" }}>演示模式：创建的数据仅在本次会话内可见</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>规则名称</label>
              <input
                value={form.name}
                placeholder="例如：高意向客户自动分配"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>触发条件</label>
              <select
                value={form.trigger}
                onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
                style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff" }}
              >
                {RULE_TRIGGER_OPTIONS.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>执行动作</label>
              <select
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff" }}
              >
                {RULE_ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className={styles.btnOutline} onClick={() => setCreating(false)}>
                取消
              </button>
              <button type="button" className={styles.btnPrimary} onClick={createRule}>
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.pageHeader}>
            <div>
              <p>配置助手的业务规则和执行逻辑，让 AI 更好地理解和处理客户需求</p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.btnOutline} title="V2开发中" disabled style={{ opacity: 0.5 }}>
                <BookOpen size={14} aria-hidden /> 规则模板
              </button>
              <button type="button" className={styles.btnOutline} title="V2开发中" disabled style={{ opacity: 0.5 }}>
                <Download size={14} aria-hidden /> 导入规则
              </button>
              <button type="button" className={styles.btnPrimary} onClick={() => setCreating(true)}>
                <Plus size={14} aria-hidden /> 新建规则
              </button>
            </div>
          </div>

          <div className={styles.filterCard}>
            <div className={styles.tabRow}>
              {(
                [
                  ["all", "全部规则"],
                  ["lead", "线索规则"],
                  ["chat", "对话规则"],
                  ["handoff", "转人工规则"],
                  ["task", "任务规则"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={activeTab === id ? styles.tabActive : styles.tab}
                  onClick={() => {
                    setActiveTab(id);
                    setPage(1);
                  }}
                >
                  {label}
                  <span className={styles.tabCount}>{tabCounts[id]}</span>
                </button>
              ))}
            </div>
            <div className={styles.filterRow}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="状态筛选"
              >
                <option value="all">全部状态</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
              <select
                className={styles.filterSelect}
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="优先级筛选"
              >
                <option value="all">全部优先级</option>
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
              <select className={styles.filterSelect} defaultValue="all" aria-label="场景筛选">
                <option value="all">全部场景</option>
              </select>
              <label className={styles.searchInput}>
                <Search size={14} className={styles.searchIcon} aria-hidden />
                <input
                  type="search"
                  placeholder="搜索规则名称或关键词"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <button type="button" className={styles.btnReset} onClick={resetFilters}>
                重置
              </button>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>规则名称</th>
                    <th>适用场景</th>
                    <th>触发条件</th>
                    <th>执行动作</th>
                    <th>状态</th>
                    <th>优先级</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRules.map((rule) => {
                    const Icon = rule.icon;
                    const enabled = enabledMap[rule.id] ?? rule.enabled;
                    return (
                      <tr
                        key={rule.id}
                        className={selectedId === rule.id ? styles.rowSelected : undefined}
                        onClick={() => setSelectedId(rule.id)}
                      >
                        <td>
                          <div className={styles.ruleCell}>
                            <Icon size={16} className={styles.ruleIcon} aria-hidden />
                            <div>
                              <div className={styles.ruleName}>{rule.name}</div>
                              <div className={styles.ruleSub}>{rule.sub}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.badgeBlue}>{rule.scene}</span>
                        </td>
                        <td style={{ whiteSpace: "pre-line" }}>{rule.trigger}</td>
                        <td style={{ whiteSpace: "pre-line" }}>{rule.action}</td>
                        <td>
                          <span className={styles.badgeGreen}>{enabled ? "启用" : "停用"}</span>
                        </td>
                        <td>
                          <span className={priorityClass(rule.priority)}>{rule.priority}</span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <div className={styles.actionBtns}>
                            <button type="button" className={styles.actionBtn} aria-label="编辑" title="V2开发中" disabled style={{ opacity: 0.4 }}>
                              <Edit size={14} />
                            </button>
                            <button type="button" className={styles.actionBtn} aria-label="复制" title="V2开发中" disabled style={{ opacity: 0.4 }}>
                              <Copy size={14} />
                            </button>
                            <button type="button" className={styles.actionBtn} aria-label="更多" title="V2开发中" disabled style={{ opacity: 0.4 }}>
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>共 {tabCounts.all} 条</span>
              <div className={styles.paginationRight}>
                <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={page === num ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
                <span>{PAGE_SIZE}条/页</span>
              </div>
            </div>
          </div>
        </div>

        <aside className={styles.sidebar}>
          {selectedRule ? (
            <div className={styles.detailCard}>
              <div className={styles.detailHead}>
                <h3>规则详情</h3>
                <button type="button" className={styles.linkBtn} title="V2开发中" disabled style={{ opacity: 0.5 }}>
                  编辑
                </button>
              </div>

              <div className={styles.detailTop}>
                <div>
                  <div className={styles.detailTitle}>{selectedRule.name}</div>
                  <div className={styles.detailSub}>{selectedRule.scene}</div>
                </div>
                <span className={styles.badgeGreen}>{selectedEnabled ? "启用" : "停用"}</span>
              </div>

              <div className={styles.metaGrid}>
                <div>
                  <div className={styles.metaLabel}>优先级</div>
                  <div className={styles.metaValue}>{selectedRule.priority}</div>
                </div>
                <div>
                  <div className={styles.metaLabel}>适用场景</div>
                  <div className={styles.metaValue}>{selectedRule.sceneLabel}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.metaLabel}>规则来源</div>
                  <div className={styles.metaValue}>{selectedRule.creator}</div>
                </div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionLabel}>规则描述</div>
                <div className={styles.detailSectionBody}>{selectedRule.description}</div>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionLabel}>触发条件</div>
                <div className={styles.detailSectionBody}>满足以下任一条件时触发：</div>
                <ul className={styles.detailList}>
                  {selectedRule.triggers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionLabel}>执行动作</div>
                <ol className={styles.detailList}>
                  {selectedRule.actions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionLabel}>例外处理</div>
                <ul className={styles.detailList}>
                  {selectedRule.exceptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailSectionLabel}>规则状态</div>
                <div className={styles.switchRow}>
                  <span style={{ fontSize: 13 }}>{selectedEnabled ? "启用" : "停用"}</span>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={selectedEnabled}
                      onChange={(e) => handleToggleEnabled(e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
