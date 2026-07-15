"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Globe,
  ImageIcon,
  Layout,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Save,
  Send,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserCog,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { SelectionSubmissionsWorkspace } from "@/components/bots/selection-submissions-workspace";
import { listBots } from "@/lib/bots/data";
import {
  createSelectionPage,
  getSelectionPageById,
  updateSelectionPage,
} from "@/lib/bots/selection-pages-api";
import type { BotListItem } from "@/lib/bots/types";
import {
  AI_STANDALONE_SECTIONS,
  buildAiStandaloneEditHref,
  getPagePublicSlug,
  getSelectionPage,
  NEW_PAGE_ID,
  parseAiStandaloneSection,
  resolveSelectionPagePublicUrl,
  type AiStandaloneSection,
} from "@/lib/channels/ai-standalone-shared";
import { buildSelectionPageConfigFromEdit } from "@/lib/channels/build-selection-page-config";
import { getSelectionPageStorageKey } from "@/lib/channels/ai-selection-page-config";
import {
  mapSelectionPageViewToItem,
  slugifySelectionPageName,
} from "@/lib/channels/selection-page-mapper";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/ai-standalone-edit.module.css";

const CHANNEL_OPTIONS = ["抖音", "小红书", "微信", "展会二维码", "官网", "其他"];
const LANGUAGE_OPTIONS = ["简体中文", "English", "繁体中文"];
const STATUS_OPTIONS = [
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "deactivated", label: "已停用" },
];
const PRODUCT_OPTIONS = [
  "户外机柜（IP65 防护型）",
  "不锈钢机柜",
  "控制柜",
  "机柜空调",
  "按图定制",
];

interface ContentBlock {
  id: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  summary: Array<{ label: string; value: string }>;
  body?: string;
  bullets?: string[];
  hasThumb?: boolean;
}

interface FormFieldRow {
  id: string;
  name: string;
  type: string;
  required: boolean;
  display: boolean;
  sortOrder: number;
  system?: boolean;
  placeholder?: string;
  options?: string;
}

interface RecommendedQuestion {
  id: string;
  text: string;
}

function Toggle({
  checked,
  onChange,
  small,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  small?: boolean;
}) {
  return (
    <label className={small ? `${styles.switch} ${styles.switchSm}` : styles.switch}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.slider} />
    </label>
  );
}

function PhonePreviewShell({
  title,
  tall,
  chat,
  children,
}: {
  title: string;
  tall?: boolean;
  chat?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.panel} ${styles.previewCard}`}>
      <div className={styles.previewHead}>
        <h3 className={styles.previewTitle}>{title}</h3>
        <button type="button" className={styles.btnLink}>
          刷新
        </button>
      </div>
      <div className={styles.phoneShell}>
        <div className={styles.phoneBar}>
          <span>9:41</span>
          <span>AI 选型页</span>
          <span>100%</span>
        </div>
        <div
          className={
            chat
              ? `${styles.phoneBody} ${styles.phoneBodyChat}`
              : tall
                ? `${styles.phoneBody} ${styles.phoneBodyTall}`
                : styles.phoneBody
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function BasicTabPanel({
  pageName,
  setPageName,
  pageUrl,
  channels,
  toggleChannel,
  language,
  setLanguage,
  pageStatus,
  setPageStatus,
  defaultProduct,
  setDefaultProduct,
  description,
  setDescription,
  onCopyUrl,
}: {
  pageName: string;
  setPageName: (v: string) => void;
  pageUrl: string;
  channels: string[];
  toggleChannel: (c: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  pageStatus: "published" | "draft" | "deactivated";
  setPageStatus: (v: "published" | "draft" | "deactivated") => void;
  defaultProduct: string;
  setDefaultProduct: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  onCopyUrl: () => void;
}) {
  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={`${styles.panel} ${styles.fieldStack}`}>
          <h3 className={styles.sectionCardTitle}>基础信息</h3>

          <div className={styles.field}>
            <label>
              页面名称 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrap}>
              <input value={pageName} maxLength={30} onChange={(e) => setPageName(e.target.value)} />
              <span className={styles.inputHint}>{pageName.length}/30</span>
            </div>
          </div>

          <div className={styles.field}>
            <label>
              页面地址 <span className={styles.required}>*</span>
            </label>
            <div className={styles.urlRow}>
              <input value={pageUrl} readOnly />
              <button type="button" className={styles.copyBtn} onClick={onCopyUrl}>
                复制
              </button>
            </div>
            <div className={styles.domainHint}>
              <Globe size={14} />
              自定义域名：{pageUrl.replace(/^https?:\/\//, "")}
              <button type="button" className={styles.btnLink} style={{ marginLeft: 8 }}>
                修改域名
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label>适用渠道</label>
            <div className={styles.checkboxGroup}>
              {CHANNEL_OPTIONS.map((ch) => (
                <label key={ch} className={styles.checkboxLabel}>
                  <input type="checkbox" checked={channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>页面语言</label>
            <div className={styles.radioGroup}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <label key={lang} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="language"
                    checked={language === lang}
                    onChange={() => setLanguage(lang)}
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>页面状态</label>
            <div className={styles.radioGroup}>
              {STATUS_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="status"
                    checked={pageStatus === opt.value}
                    onChange={() => setPageStatus(opt.value as "published" | "draft" | "deactivated")}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>默认产品类型</label>
            <select value={defaultProduct} onChange={(e) => setDefaultProduct(e.target.value)}>
              {PRODUCT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>页面描述</label>
            <div className={styles.inputWrap}>
              <textarea rows={3} maxLength={100} value={description} onChange={(e) => setDescription(e.target.value)} />
              <span className={styles.textareaHint}>{description.length}/100</span>
            </div>
          </div>

          <div className={styles.metaGrid}>
            <div>
              <span className={styles.metaLabel}>创建时间</span>
              <div className={styles.metaValue}>2026-07-06 15:30</div>
            </div>
            <div>
              <span className={styles.metaLabel}>更新时间</span>
              <div className={styles.metaValue}>2026-07-06 15:30</div>
            </div>
          </div>
        </div>
      </div>

      <aside className={styles.sidebar}>
        <PhonePreviewShell title="手机端预览">
          <div style={{ fontSize: 12, fontWeight: 600, textAlign: "center", marginBottom: 4 }}>库滋玛 AI 选型助手</div>
          <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginBottom: 10 }}>智能选型，快速报价</div>
          <div className={styles.mobileHero}>
            <div className={styles.mobileHeroOverlay} />
            <Package size={40} color="#93c5fd" style={{ position: "absolute", top: 24, right: 24, opacity: 0.6 }} />
            <div className={styles.mobileHeroTitle}>{pageName}</div>
          </div>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 8 }}>
            <div>✓ 精准匹配需求</div>
            <div>✓ 上传图纸识别</div>
            <div>✓ 在线咨询报价</div>
          </div>
          <div className={styles.mobileChipRow}>
            {["户外机柜", "不锈钢机柜", "控制柜"].map((p, i) => (
              <span key={p} className={`${styles.mobileChip} ${i === 0 ? styles.mobileChipActive : ""}`}>
                {p}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
            <span>需求完整度 60%</span>
            <button type="button" className={styles.btnLink} style={{ fontSize: 10 }}>
              查看详情
            </button>
          </div>
          <div className={styles.mobileProgress}>
            <div className={styles.mobileProgressFill} />
          </div>
          <div className={styles.mobileBottomBar}>
            <span className={styles.mobileBottomBtn}>上传图纸</span>
            <span className={styles.mobileBottomBtn}>联系客服</span>
            <span className={styles.mobileSubmitBtn}>提交报价需求</span>
          </div>
        </PhonePreviewShell>
      </aside>
    </div>
  );
}

function ContentTabPanel({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <p className={styles.sectionHint}>
          配置独立页各内容区块的展示文案与交互，访客将按顺序浏览以下模块。
        </p>
        <div className={styles.mainStack}>
          {blocks.map((block) => (
            <div key={block.id} className={styles.panel}>
              <div className={styles.blockCard}>
                <div className={styles.blockLeft}>
                  <div className={styles.blockIcon} style={{ background: block.iconBg }}>
                    {block.icon}
                  </div>
                  <div>
                    <div className={styles.blockTitle}>{block.title}</div>
                    <div className={styles.blockSub}>{block.sub}</div>
                    <div className={styles.blockSummary}>
                      {block.summary.map((item) => (
                        <span key={item.label} className={styles.blockSummaryItem}>
                          <b>{item.label}：</b>
                          {item.value}
                        </span>
                      ))}
                    </div>
                    {block.hasThumb ? (
                      <div className={styles.visualRow}>
                        <div className={styles.visualThumb}>
                          <ImageIcon size={24} color="#9ca3af" />
                        </div>
                        <div className={styles.bulletList}>
                          <div className={styles.bulletItem}>
                            <CheckCircle2 size={12} color="#22c55e" />
                            IP65 户外防护
                          </div>
                          <div className={styles.bulletItem}>
                            <CheckCircle2 size={12} color="#22c55e" />
                            不锈钢材质可选
                          </div>
                          <div className={styles.bulletItem}>
                            <CheckCircle2 size={12} color="#22c55e" />
                            支持按图定制
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <button type="button" className={styles.btnOutline}>
                  <FileText size={14} />
                  编辑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className={styles.sidebar}>
        <PhonePreviewShell title="手机端预览" tall>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>库滋玛 · 户外机柜选型</div>
          <div className={styles.mobileHero} style={{ height: 90 }}>
            <div className={styles.mobileHeroOverlay} />
            <div className={styles.mobileHeroTitle}>户外机柜专业制造商</div>
          </div>
          <div className={styles.mobileChipRow}>
            {["户外机柜", "不锈钢", "控制柜"].map((p, i) => (
              <span key={p} className={`${styles.mobileChip} ${i === 0 ? styles.mobileChipActive : ""}`}>
                {p}
              </span>
            ))}
          </div>
          <div style={{ padding: 8, background: "#f0fdf4", borderRadius: 8, fontSize: 11, color: "#16a34a", marginBottom: 8 }}>
            <MessageSquare size={12} style={{ display: "inline", marginRight: 4 }} />
            与 AI 助手对话，获取选型建议
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>需求完整度 60%</div>
          <div className={styles.mobileProgress}>
            <div className={styles.mobileProgressFill} />
          </div>
        </PhonePreviewShell>
      </aside>
    </div>
  );
}

function FieldsTabPanel({
  fields,
  selectedFieldId,
  setSelectedFieldId,
}: {
  fields: FormFieldRow[];
  selectedFieldId: string;
  setSelectedFieldId: (id: string) => void;
}) {
  const selected = fields.find((f) => f.id === selectedFieldId) ?? fields[0];

  return (
    <div className={styles.fieldsLayout}>
      <div className={styles.fieldsMain}>
        <div className={styles.panel} style={{ padding: 0 }}>
          <p className={styles.sectionHint} style={{ padding: "16px 16px 0", margin: 0 }}>
            设置用户需填写的表单信息，支持自定义字段、属性设置与校验规则。
          </p>
          <div className={styles.toolbar}>
            <button type="button" className={styles.btnPrimary}>
              <Plus size={14} />
              添加字段
            </button>
            <button type="button" className={styles.btnOutline}>
              批量编辑
            </button>
            <button type="button" className={styles.btnOutline}>
              字段分组
            </button>
            <button type="button" className={styles.btnOutline}>
              排序
            </button>
            <button type="button" className={`${styles.btnOutline} ${styles.toolbarDanger}`}>
              <Trash2 size={14} />
              删除
            </button>
          </div>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" aria-label="全选" />
                </th>
                <th>字段名称</th>
                <th>字段类型</th>
                <th>必填</th>
                <th>显示状态</th>
                <th>排序</th>
                <th className={styles.tableActions}>操作</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr
                  key={field.id}
                  className={field.id === selectedFieldId ? styles.rowSelected : undefined}
                  onClick={() => setSelectedFieldId(field.id)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`选择 ${field.name}`} />
                  </td>
                  <td>
                    <div className={styles.fieldNameCell}>
                      {field.name}
                      {field.system ? <span className={styles.systemTag}>系统字段</span> : null}
                    </div>
                  </td>
                  <td>{field.type}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Toggle checked={field.required} onChange={() => {}} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Toggle checked={field.display} onChange={() => {}} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input className={styles.sortInput} defaultValue={field.sortOrder} aria-label="排序" />
                  </td>
                  <td className={styles.tableActions}>
                    <button type="button">编辑</button>
                    {field.system ? (
                      <button type="button" className="muted" disabled>
                        删除
                      </button>
                    ) : (
                      <button type="button" className="danger">
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.tableFootNote}>系统字段（姓名、手机号）不可删除，其余可自定义</div>
        </div>
      </div>

      <aside className={styles.fieldsSide}>
        <div className={`${styles.panel} ${styles.propsPanel}`}>
          <div className={styles.propsHead}>
            <h3 className={styles.panelTitle}>字段属性设置</h3>
          </div>
          <p className={styles.propsSelected}>
            当前选中：{selected?.name}
            {selected?.system ? "（系统字段）" : ""}
          </p>
          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label>字段类型</label>
              <input value={selected?.type ?? ""} readOnly />
            </div>
            <div className={styles.toggleRow}>
              <span>是否必填</span>
              <Toggle checked={selected?.required ?? false} onChange={() => {}} />
            </div>
            <div className={styles.toggleRow}>
              <span>显示状态</span>
              <Toggle checked={selected?.display ?? true} onChange={() => {}} />
            </div>
            <div className={styles.field}>
              <label>占位提示</label>
              <input value={selected?.placeholder ?? ""} readOnly />
              <span className={styles.textareaHint} style={{ position: "static", textAlign: "right", display: "block" }}>
                {(selected?.placeholder ?? "").length}/20
              </span>
            </div>
            <div className={styles.field}>
              <label>默认值</label>
              <input placeholder="未设置" readOnly />
            </div>
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" defaultChecked={selected?.required} />
                不允许为空
              </label>
            </div>
          </div>
        </div>

        <PhonePreviewShell title="表单预览（移动端）">
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>提交报价需求</div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 12 }}>请填写以下信息，我们将尽快与您联系</div>
          {fields.filter((f) => f.display).slice(0, 5).map((f) => (
            <div key={f.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>
                {f.name}
                {f.required ? <span style={{ color: "#ef4444" }}> *</span> : null}
              </div>
              <div
                style={{
                  height: 28,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "#f9fafb",
                  fontSize: 10,
                  padding: "6px 8px",
                  color: "#9ca3af",
                }}
              >
                {f.placeholder ?? `请输入${f.name}`}
              </div>
            </div>
          ))}
        </PhonePreviewShell>
      </aside>
    </div>
  );
}

function RobotTabPanel({
  bots,
  boundBot,
  setBoundBot,
  knowledgeBase,
  setKnowledgeBase,
  rolePrompt,
  setRolePrompt,
  openingMessage,
  setOpeningMessage,
  questions,
  removeQuestion,
  updateQuestion,
  autoLeadCapture,
  setAutoLeadCapture,
  showSources,
  setShowSources,
  maxTurns,
  setMaxTurns,
}: {
  bots: BotListItem[];
  boundBot: string;
  setBoundBot: (v: string) => void;
  knowledgeBase: string;
  setKnowledgeBase: (v: string) => void;
  rolePrompt: string;
  setRolePrompt: (v: string) => void;
  openingMessage: string;
  setOpeningMessage: (v: string) => void;
  questions: RecommendedQuestion[];
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, text: string) => void;
  autoLeadCapture: boolean;
  setAutoLeadCapture: (v: boolean) => void;
  showSources: boolean;
  setShowSources: (v: boolean) => void;
  maxTurns: string;
  setMaxTurns: (v: string) => void;
}) {
  return (
    <div className={styles.robotGrid}>
      <div className={`${styles.panel} ${styles.fieldStack}`}>
        <h3 className={styles.panelTitle}>机器人基础设置</h3>
        <div className={styles.field}>
          <label>
            选择 AI 助手 <span className={styles.required}>*</span>
          </label>
          <select value={boundBot} onChange={(e) => setBoundBot(e.target.value)}>
            {bots.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
            {!bots.some((b) => b.name === boundBot) ? <option value={boundBot}>{boundBot}</option> : null}
          </select>
          <button type="button" className={styles.btnLink} style={{ marginTop: 6 }}>
            管理助手
          </button>
        </div>
        <div className={styles.field}>
          <label>
            关联知识库 <span className={styles.required}>*</span>
          </label>
          <select value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)}>
            <option value="户外机柜产品知识库">户外机柜产品知识库</option>
            <option value="不锈钢机柜知识库">不锈钢机柜知识库</option>
          </select>
          <div className={styles.domainHint}>已关联 1 个知识库，328 个知识点</div>
        </div>
        <div className={styles.field}>
          <label>助手角色设定</label>
          <textarea rows={3} maxLength={200} value={rolePrompt} onChange={(e) => setRolePrompt(e.target.value)} />
          <span className={styles.textareaHint} style={{ position: "static", textAlign: "right", display: "block" }}>
            {rolePrompt.length}/200
          </span>
        </div>
        <div className={styles.field}>
          <label>对话开场白</label>
          <textarea rows={2} maxLength={100} value={openingMessage} onChange={(e) => setOpeningMessage(e.target.value)} />
          <span className={styles.textareaHint} style={{ position: "static", textAlign: "right", display: "block" }}>
            {openingMessage.length}/100
          </span>
        </div>
        <div className={styles.field}>
          <label>推荐问题</label>
          {questions.map((q) => (
            <div key={q.id} className={styles.questionRow} style={{ marginBottom: 8 }}>
              <input value={q.text} onChange={(e) => updateQuestion(q.id, e.target.value)} />
              <button type="button" className={styles.btnOutline} onClick={() => removeQuestion(q.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" className={styles.btnOutline}>
            <Plus size={14} />
            添加问题
          </button>
        </div>
      </div>

      <div className={`${styles.panel} ${styles.fieldStack}`}>
        <h3 className={styles.panelTitle}>对话逻辑设置</h3>
        <div className={styles.logicCard}>
          <div>
            <div className={styles.logicTitle}>自动追问</div>
            <div className={styles.logicSub}>根据对话上下文主动追问参数</div>
          </div>
          <Toggle checked={autoLeadCapture} onChange={setAutoLeadCapture} />
        </div>
        <div className={styles.field}>
          <label>参数完整度提醒</label>
          <select defaultValue="on">
            <option value="on">开启</option>
            <option value="off">关闭</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>追问频率</label>
          <select defaultValue="medium">
            <option value="low">较低（每 4-5 轮）</option>
            <option value="medium">适中（每 2-3 轮）</option>
            <option value="high">较高（每 1-2 轮）</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>无响应处理</label>
          <select defaultValue="guide">
            <option value="guide">智能引导</option>
            <option value="wait">等待用户输入</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>敏感问题处理</label>
          <select defaultValue="human">
            <option value="human">转人工客服</option>
            <option value="decline">礼貌拒绝</option>
          </select>
        </div>
        <div className={styles.logicCard}>
          <div>
            <div className={styles.logicTitle}>记住上下文</div>
          </div>
          <Toggle checked onChange={() => {}} />
        </div>
        <div className={styles.logicCard}>
          <div>
            <div className={styles.logicTitle}>实体识别增强</div>
          </div>
          <Toggle checked onChange={() => {}} />
        </div>
        <div className={styles.logicCard}>
          <div>
            <div className={styles.logicTitle}>意图识别增强</div>
          </div>
          <Toggle checked={showSources} onChange={setShowSources} />
        </div>
      </div>

      <PhonePreviewShell title="对话预览" chat>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={14} color="#2563eb" />
          </div>
          <div style={{ flex: 1, padding: "8px 10px", background: "#fff", borderRadius: "8px 8px 8px 0", fontSize: 11, color: "#374151", border: "1px solid #e5e7eb" }}>
            {openingMessage}
          </div>
        </div>
        {questions.map((q) => (
          <div key={q.id} style={{ fontSize: 10, padding: "6px 10px", border: "1px solid #bfdbfe", borderRadius: 999, color: "#2563eb", marginBottom: 6, display: "inline-block", marginRight: 4 }}>
            {q.text}
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 10, color: "#9ca3af" }}>正在输入…</div>
      </PhonePreviewShell>

      <div className={styles.panel} style={{ gridColumn: "1 / -1" }}>
        <h3 className={styles.panelTitle}>高级设置</h3>
        <div className={styles.grid4}>
          {[
            { title: "知识检索设置", sub: "检索范围与优先级", icon: <BookOpen size={18} color="#2563eb" />, bg: "#eff6ff" },
            { title: "回答生成设置", sub: "风格、长度与格式", icon: <MessageSquare size={18} color="#16a34a" />, bg: "#f0fdf4" },
            { title: "关键词拦截", sub: "屏蔽关键词或话题", icon: <Shield size={18} color="#f97316" />, bg: "#fff7ed" },
            { title: "转人工规则", sub: "触发人工介入条件", icon: <UserCog size={18} color="#a855f7" />, bg: "#f5f3ff" },
          ].map((card) => (
            <div key={card.title} className={styles.advancedCard}>
              <div className={styles.advancedIcon} style={{ background: card.bg }}>
                {card.icon}
              </div>
              <div className={styles.advancedTitle}>{card.title}</div>
              <div className={styles.advancedSub}>{card.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PostSubmitTabPanel({
  postActions,
  togglePostAction,
  assignMode,
  setAssignMode,
  assignee,
  setAssignee,
  successTitle,
  setSuccessTitle,
  successMessage,
  setSuccessMessage,
  notifications,
  toggleNotification,
}: {
  postActions: { id: string; title: string; sub: string; enabled: boolean; icon: React.ReactNode; bg: string }[];
  togglePostAction: (id: string) => void;
  assignMode: string;
  setAssignMode: (v: string) => void;
  assignee: string;
  setAssignee: (v: string) => void;
  successTitle: string;
  setSuccessTitle: (v: string) => void;
  successMessage: string;
  setSuccessMessage: (v: string) => void;
  notifications: { id: string; title: string; sub: string; enabled: boolean; icon: React.ReactNode }[];
  toggleNotification: (id: string) => void;
}) {
  const flowSteps = [
    { label: "客户提交需求", sub: "表单提交", icon: <Send size={16} color="#2563eb" /> },
    { label: "创建询盘", sub: "自动入库", icon: <ClipboardList size={16} color="#2563eb" /> },
    { label: "分配张先生", sub: "按规则", icon: <Users size={16} color="#2563eb" /> },
    { label: "生成跟进任务", sub: "待办提醒", icon: <FileText size={16} color="#2563eb" /> },
    { label: "发送通知", sub: "多渠道", icon: <Bell size={16} color="#2563eb" /> },
  ];

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.mainStack}>
          <div className={`${styles.panel} ${styles.fieldStack}`}>
            <h3 className={styles.panelTitle}>
              <span className={styles.cardNumber}>1</span>
              提交后动作
            </h3>
            {postActions.map((action) => (
              <div key={action.id} className={styles.actionCard}>
                <div className={styles.actionLeft}>
                  <div className={styles.actionIcon} style={{ background: action.bg }}>
                    {action.icon}
                  </div>
                  <div>
                    <div className={styles.logicTitle}>{action.title}</div>
                    <div className={styles.logicSub}>{action.sub}</div>
                  </div>
                </div>
                <Toggle checked={action.enabled} onChange={() => togglePostAction(action.id)} />
              </div>
            ))}
          </div>

          <div className={`${styles.panel} ${styles.fieldStack}`}>
            <h3 className={styles.panelTitle}>
              <span className={styles.cardNumber}>2</span>
              线索归属与分配
            </h3>
            <div className={styles.field}>
              <label>渠道来源标识</label>
              <input defaultValue="douyin-video-001" />
            </div>
            <div className={styles.field}>
              <label>默认负责人</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="张先生">张先生</option>
                <option value="张经理">张经理（户外机柜）</option>
                <option value="李主管">李主管（不锈钢）</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>分配规则</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="assign" checked={assignMode === "auto"} onChange={() => setAssignMode("auto")} />
                  按产品类型
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="assign" checked={assignMode === "channel"} onChange={() => setAssignMode("channel")} />
                  按渠道
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="assign" checked={assignMode === "manual"} onChange={() => setAssignMode("manual")} />
                  手动指定
                </label>
              </div>
            </div>
            <div className={styles.field}>
              <label>线索优先级</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="priority" defaultChecked />
                  普通
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="priority" />
                  高意向
                </label>
              </div>
            </div>
            <div className={styles.field}>
              <label>归属部门</label>
              <select defaultValue="户外机柜事业部">
                <option>户外机柜事业部</option>
                <option>销售一部</option>
              </select>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.fieldStack}`}>
            <h3 className={styles.panelTitle}>
              <span className={styles.cardNumber}>3</span>
              提交成功反馈
            </h3>
            <div className={styles.field}>
              <label>成功标题</label>
              <input value={successTitle} onChange={(e) => setSuccessTitle(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>成功描述</label>
              <textarea rows={2} value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>跳转行为</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="redirect" defaultChecked />
                  停留成功页
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="redirect" />
                  定时跳转
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="redirect" />
                  自定义地址
                </label>
              </div>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.fieldStack}`}>
            <h3 className={styles.panelTitle}>
              <span className={styles.cardNumber}>4</span>
              通知提醒设置
            </h3>
            <table className={styles.notifyTable}>
              <thead>
                <tr>
                  <th>通知渠道</th>
                  <th>销售负责人</th>
                  <th>工程师</th>
                  <th>管理员</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Toggle checked={n.enabled} onChange={() => toggleNotification(n.id)} small />
                        {n.title}
                      </div>
                    </td>
                    <td>
                      <input type="checkbox" defaultChecked={n.enabled} />
                    </td>
                    <td>
                      <input type="checkbox" />
                    </td>
                    <td>
                      <input type="checkbox" defaultChecked={n.id === "site"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <span className={styles.cardNumber}>5</span>
              自动流转预览
            </h3>
            <div className={styles.flowPreview}>
              {flowSteps.map((step, i) => (
                <span key={step.label} style={{ display: "contents" }}>
                  <div className={styles.flowStep}>
                    <div className={styles.flowIcon}>{step.icon}</div>
                    <div>{step.label}</div>
                    <div className={styles.flowSub}>{step.sub}</div>
                  </div>
                  {i < flowSteps.length - 1 ? <ArrowRight size={16} className={styles.flowArrow} /> : null}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className={`${styles.sidebar} ${styles.postSubmitSide}`}>
        <PhonePreviewShell title="提交后预览（移动端）">
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <CheckCircle2 size={24} color="#16a34a" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 8 }}>{successTitle}</div>
            <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>{successMessage}</div>
            <div style={{ marginTop: 12, fontSize: 10, color: "#9ca3af", textAlign: "left" }}>
              <div>产品：户外机柜</div>
              <div>数量：10 台</div>
              <div>联系：张先生 138****8888</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <span className={styles.mobileBottomBtn}>继续咨询</span>
              <span className={styles.mobileSubmitBtn} style={{ flex: 1 }}>查看需求详情</span>
            </div>
          </div>
        </PhonePreviewShell>

        <div className={`${styles.panel} ${styles.propsPanel}`}>
          <h3 className={styles.panelTitle}>流转结果（示例）</h3>
          <ul className={styles.flowResultList}>
            <li className={styles.flowResultItem}>
              <CheckCircle2 size={14} color="#16a34a" />
              <span>询盘已创建 · 10:23</span>
            </li>
            <li className={styles.flowResultItem}>
              <CheckCircle2 size={14} color="#16a34a" />
              <span>已分配给张先生 · 10:23</span>
            </li>
            <li className={styles.flowResultItem}>
              <CheckCircle2 size={14} color="#16a34a" />
              <span>跟进任务已生成 · 10:24</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

const CONTENT_BLOCKS: ContentBlock[] = [
  {
    id: "hero",
    title: "首屏品牌与标题",
    sub: "页面顶部品牌展示与主标题",
    icon: <Layout size={18} color="#2563eb" />,
    iconBg: "#eff6ff",
    summary: [
      { label: "页面标题", value: "户外机柜 AI 选型助手" },
      { label: "副标题", value: "智能推荐方案 / 快速获取报价" },
      { label: "Logo", value: "已上传" },
    ],
  },
  {
    id: "visual",
    title: "主视觉与卖点",
    sub: "产品图片与核心卖点展示",
    icon: <ImageIcon size={18} color="#f97316" />,
    iconBg: "#fff7ed",
    summary: [
      { label: "主视觉", value: "已配置" },
      { label: "核心卖点", value: "3 条" },
    ],
    hasThumb: true,
  },
  {
    id: "products",
    title: "产品快捷选择",
    sub: "访客可快速选择感兴趣的产品类型",
    icon: <Package size={18} color="#16a34a" />,
    iconBg: "#f0fdf4",
    summary: [
      { label: "默认选中", value: "户外机柜" },
      { label: "产品分类", value: "4 个" },
      { label: "展示样式", value: "卡片式" },
    ],
  },
  {
    id: "ai-chat",
    title: "AI 对话引导区域",
    sub: "引导访客与 AI 助手对话获取选型建议",
    icon: <MessageSquare size={18} color="#2563eb" />,
    iconBg: "#eff6ff",
    summary: [
      { label: "AI 欢迎语", value: "已配置" },
      { label: "推荐问题", value: "3 条" },
      { label: "自动追问", value: "开启" },
    ],
  },
  {
    id: "completeness",
    title: "需求完整度提示",
    sub: "展示访客需求填写进度",
    icon: <Sparkles size={18} color="#a855f7" />,
    iconBg: "#f5f3ff",
    summary: [
      { label: "参数项", value: "8 项" },
      { label: "完整度文案", value: "已配置" },
      { label: "完整度阈值", value: "60%" },
    ],
  },
  {
    id: "drawing",
    title: "图纸上传区域",
    sub: "支持访客上传图纸或现场照片",
    icon: <Upload size={18} color="#06b6d4" />,
    iconBg: "#ecfeff",
    summary: [
      { label: "状态", value: "开启" },
      { label: "支持格式", value: "JPG/PNG/PDF" },
      { label: "文案提示", value: "已配置" },
    ],
  },
  {
    id: "contact",
    title: "联系方式区域",
    sub: "展示企业联系信息与客服入口",
    icon: <Phone size={18} color="#22c55e" />,
    iconBg: "#f0fdf4",
    summary: [
      { label: "默认显示", value: "电话 + 微信" },
      { label: "收集时机", value: "提交前" },
      { label: "隐私说明", value: "已配置" },
    ],
  },
  {
    id: "submit",
    title: "底部提交区域",
    sub: "需求表单提交按钮与隐私声明",
    icon: <Send size={18} color="#ef4444" />,
    iconBg: "#fef2f2",
    summary: [
      { label: "提交按钮", value: "提交报价需求" },
      { label: "提交前提示", value: "已配置" },
      { label: "成功文案", value: "已配置" },
    ],
  },
];

const DEMO_FIELDS: FormFieldRow[] = [
  { id: "name", name: "姓名", type: "单行文本", required: true, display: true, sortOrder: 1, system: true, placeholder: "请输入您的姓名" },
  { id: "phone", name: "手机号", type: "手机号", required: true, display: true, sortOrder: 2, system: true, placeholder: "请输入手机号" },
  { id: "company", name: "公司名称", type: "单行文本", required: false, display: true, sortOrder: 3, placeholder: "请输入公司名称" },
  { id: "product", name: "产品类型", type: "下拉选择", required: true, display: true, sortOrder: 4, options: "户外机柜,不锈钢机柜,控制柜", placeholder: "请选择产品类型" },
  { id: "size", name: "尺寸规格", type: "单行文本", required: false, display: true, sortOrder: 5, placeholder: "如：600×800×2000mm" },
  { id: "qty", name: "采购数量", type: "数字", required: false, display: true, sortOrder: 6, placeholder: "请输入数量" },
  { id: "env", name: "使用环境", type: "多选", required: false, display: true, sortOrder: 7, options: "室内,户外,沿海,高温" },
  { id: "ip", name: "防护等级", type: "下拉选择", required: false, display: true, sortOrder: 8, options: "IP54,IP55,IP65" },
  { id: "remark", name: "特殊需求", type: "多行文本", required: false, display: true, sortOrder: 9, placeholder: "其他补充说明" },
  { id: "drawing", name: "图纸上传", type: "文件上传", required: false, display: true, sortOrder: 10 },
];

export function AiStandaloneEditWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get("page") ?? searchParams.get("id");
  const rawSection = searchParams.get("section") ?? searchParams.get("tab");
  const section = parseAiStandaloneSection(rawSection);
  const initialPage = getSelectionPage(pageId);
  const isNewMode = initialPage.id === NEW_PAGE_ID;

  const [page, setPage] = useState(initialPage);
  const [persistedPageId, setPersistedPageId] = useState<string | null>(
    isNewMode ? null : initialPage.id,
  );
  const [apiPreview, setApiPreview] = useState(isNewMode);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pageName, setPageName] = useState(page.editName);
  const [channels, setChannels] = useState<string[]>(isNewMode ? ["官网"] : ["抖音", "微信", "官网"]);
  const [language, setLanguage] = useState("简体中文");
  const [pageStatus, setPageStatus] = useState<"published" | "draft" | "deactivated">(
    page.published ? "published" : "draft",
  );
  const [defaultProduct, setDefaultProduct] = useState(PRODUCT_OPTIONS[0]);
  const [description, setDescription] = useState(
    "专为抖音渠道打造的户外机柜 AI 选型落地页，支持智能对话与一键留资。",
  );

  const [selectedFieldId, setSelectedFieldId] = useState(DEMO_FIELDS[0].id);

  const [boundBot, setBoundBot] = useState(page.botName);
  const [knowledgeBase, setKnowledgeBase] = useState("户外机柜知识库（IP65 防护 + 机柜选型）");
  const [rolePrompt, setRolePrompt] = useState(
    "你是库滋玛工业设备的 AI 选型顾问，专注于户外机柜、不锈钢机柜等产品推荐。回答需基于知识库，不确定时引导留资。",
  );
  const [openingMessage, setOpeningMessage] = useState(
    "您好！我是库滋玛 AI 选型助手，您可以告诉我使用场景和需求，我为您推荐最合适的机柜方案。",
  );
  const [questions, setQuestions] = useState<RecommendedQuestion[]>([
    { id: "q1", text: "户外机柜有哪些防护等级？" },
    { id: "q2", text: "不锈钢机柜适合什么场景？" },
    { id: "q3", text: "支持按图纸定制吗？" },
  ]);
  const [autoLeadCapture, setAutoLeadCapture] = useState(true);
  const [showSources, setShowSources] = useState(true);
  const [maxTurns, setMaxTurns] = useState("20");

  const [postActions, setPostActions] = useState([
    { id: "inquiry", title: "创建询盘", sub: "提交后自动创建询盘记录", enabled: true, icon: <ClipboardList size={14} color="#2563eb" />, bg: "#eff6ff" },
    { id: "task", title: "自动创建跟进任务", sub: "为负责人生成跟进待办", enabled: true, icon: <FileText size={14} color="#16a34a" />, bg: "#f0fdf4" },
    { id: "intent", title: "自动标记高意向", sub: "预算/交期填写时标记", enabled: true, icon: <Zap size={14} color="#f97316" />, bg: "#fff7ed" },
    { id: "quote", title: "同步到报价池", sub: "高意向线索进入报价流程", enabled: false, icon: <Wallet size={14} color="#a855f7" />, bg: "#f5f3ff" },
  ]);
  const [assignMode, setAssignMode] = useState("auto");
  const [assignee, setAssignee] = useState("张经理");
  const [successTitle, setSuccessTitle] = useState("提交成功！");
  const [successMessage, setSuccessMessage] = useState(
    "感谢您的咨询，我们的销售顾问将在 1 个工作日内与您联系。",
  );
  const [notifications, setNotifications] = useState([
    { id: "site", title: "站内通知", sub: "控制台消息中心提醒", enabled: true, icon: <Bell size={14} color="#2563eb" /> },
    { id: "wecom", title: "企微通知", sub: "企业微信应用消息推送", enabled: true, icon: <Building2 size={14} color="#16a34a" /> },
    { id: "email", title: "邮件通知", sub: "发送邮件至负责人邮箱", enabled: false, icon: <Mail size={14} color="#f97316" /> },
    { id: "sms", title: "短信通知", sub: "高意向线索短信提醒", enabled: false, icon: <Smartphone size={14} color="#a855f7" /> },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextBots = await listBots();
      setBots(nextBots);

      if (pageId && pageId !== NEW_PAGE_ID) {
        try {
          const apiPage = await getSelectionPageById(pageId);
          const mapped = mapSelectionPageViewToItem(apiPage);
          setPage(mapped);
          setPersistedPageId(apiPage.id);
          setPageName(apiPage.name);
          setDescription(apiPage.description ?? "");
          setPageStatus(
            apiPage.status === "published"
              ? "published"
              : apiPage.status === "disabled"
                ? "deactivated"
                : "draft",
          );
          setApiPreview(false);
        } catch {
          setApiPreview(true);
        }
      }
    } catch (nextError) {
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  useEffect(() => {
    setPageName(page.editName);
    setPageStatus(page.published ? "published" : "draft");
    setBoundBot(page.botName);
  }, [page.editName, page.published, page.botName]);

  function toggleChannel(channel: string) {
    setChannels((current) =>
      current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel],
    );
  }

  function switchSection(next: AiStandaloneSection) {
    router.push(buildAiStandaloneEditHref(page.id, next));
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setNotice("链接已复制到剪贴板");
      window.setTimeout(() => setNotice(null), 2400);
    });
  }

  const publicPageUrl = resolveSelectionPagePublicUrl(getPagePublicSlug(page));
  const previewUrl = `${publicPageUrl}?preview=1`;

  async function handleSave() {
    const published = pageStatus === "published";
    const apiStatus = published ? "published" : pageStatus === "deactivated" ? "disabled" : "draft";
    const config = buildSelectionPageConfigFromEdit({
      page,
      pageName,
      published,
      defaultProduct,
      description,
      boundBot,
      openingMessage,
      questions: questions.map((q) => q.text),
      successTitle,
      successMessage,
    });

    window.localStorage.setItem(getSelectionPageStorageKey(config.slug), JSON.stringify(config));

    setSaving(true);
    try {
      const questionPayload = questions.map((q) => ({
        id: q.id,
        label: q.text,
        type: "text" as const,
        required: false,
      }));

      let savedId = persistedPageId;
      if (isNewMode && !persistedPageId) {
        const created = await createSelectionPage({
          name: pageName.trim() || page.editName,
          slug: config.slug || slugifySelectionPageName(pageName),
          description: description.trim() || undefined,
          status: apiStatus as "draft" | "published" | "disabled",
          questions: questionPayload,
        });
        savedId = created.id;
        setPersistedPageId(created.id);
        setPage(mapSelectionPageViewToItem(created));
        setApiPreview(false);
        router.replace(buildAiStandaloneEditHref(created.id, section));
      } else if (persistedPageId) {
        await updateSelectionPage(persistedPageId, {
          name: pageName.trim() || page.editName,
          slug: config.slug || slugifySelectionPageName(pageName),
          description: description.trim() || null,
          status: apiStatus as "draft" | "published" | "disabled",
          questions: questionPayload,
        });
        setApiPreview(false);
      }

      await fetch(`/api/selection-pages/public/${config.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setNotice(
        isNewMode && !savedId
          ? "选型页已创建（本地预览）。"
          : isNewMode
            ? "选型页已创建并保存。"
            : apiPreview
              ? "配置已保存到本地，公开页将读取最新内容。"
              : "配置已保存，公开页将同步更新。",
      );
    } catch {
      setNotice(isNewMode ? "选型页已创建（本地预览）。" : "配置已保存到本地，公开页将读取最新内容。");
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(null), 2400);
    }
  }

  function openPreview() {
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  function removeQuestion(id: string) {
    setQuestions((current) => current.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, text: string) {
    setQuestions((current) => current.map((q) => (q.id === id ? { ...q, text } : q)));
  }

  function togglePostAction(id: string) {
    setPostActions((current) =>
      current.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    );
  }

  function toggleNotification(id: string) {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)),
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载页面配置…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分数据加载失败，请稍后重试。")} />
      ) : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <button type="button" className={styles.backLink} onClick={() => router.push("/dashboard/bots/landing")}>
            <ArrowLeft size={14} />
            返回列表
          </button>
          <h1 className={styles.pageTitle}>{pageName}</h1>
          <span
            className={`${styles.statusBadge} ${
              pageStatus === "published"
                ? styles.statusPublished
                : pageStatus === "draft"
                  ? styles.statusDraft
                  : styles.statusDeactivated
            }`}
          >
            {pageStatus === "published" ? "已发布" : pageStatus === "draft" ? "草稿" : "已停用"}
          </span>
        </div>
        <div className={styles.topActions}>
          <button type="button" className={styles.btnOutline} onClick={openPreview}>
            <Eye size={14} />
            预览页面
          </button>
          <button type="button" className={styles.btnOutline} onClick={() => copyText(publicPageUrl)}>
            <Copy size={14} />
            复制链接
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      <div className={styles.tabBar} role="tablist">
        {AI_STANDALONE_SECTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            className={section === tab.id ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => switchSection(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === "basic" ? (
        <BasicTabPanel
          pageName={pageName}
          setPageName={setPageName}
          pageUrl={publicPageUrl}
          channels={channels}
          toggleChannel={toggleChannel}
          language={language}
          setLanguage={setLanguage}
          pageStatus={pageStatus}
          setPageStatus={setPageStatus}
          defaultProduct={defaultProduct}
          setDefaultProduct={setDefaultProduct}
          description={description}
          setDescription={setDescription}
          onCopyUrl={() => copyText(publicPageUrl)}
        />
      ) : null}

      {section === "content" ? <ContentTabPanel blocks={CONTENT_BLOCKS} /> : null}

      {section === "fields" ? (
        <FieldsTabPanel
          fields={DEMO_FIELDS}
          selectedFieldId={selectedFieldId}
          setSelectedFieldId={setSelectedFieldId}
        />
      ) : null}

      {section === "robot" ? (
        <RobotTabPanel
          bots={bots}
          boundBot={boundBot}
          setBoundBot={setBoundBot}
          knowledgeBase={knowledgeBase}
          setKnowledgeBase={setKnowledgeBase}
          rolePrompt={rolePrompt}
          setRolePrompt={setRolePrompt}
          openingMessage={openingMessage}
          setOpeningMessage={setOpeningMessage}
          questions={questions}
          removeQuestion={removeQuestion}
          updateQuestion={updateQuestion}
          autoLeadCapture={autoLeadCapture}
          setAutoLeadCapture={setAutoLeadCapture}
          showSources={showSources}
          setShowSources={setShowSources}
          maxTurns={maxTurns}
          setMaxTurns={setMaxTurns}
        />
      ) : null}

      {section === "postsubmit" ? (
        <PostSubmitTabPanel
          postActions={postActions}
          togglePostAction={togglePostAction}
          assignMode={assignMode}
          setAssignMode={setAssignMode}
          assignee={assignee}
          setAssignee={setAssignee}
          successTitle={successTitle}
          setSuccessTitle={setSuccessTitle}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
          notifications={notifications}
          toggleNotification={toggleNotification}
        />
      ) : null}

      {section === "submissions" ? (
        <div className={styles.layout}>
          <div className={styles.main}>
            <SelectionSubmissionsWorkspace pageId={pageId ?? persistedPageId ?? page.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
