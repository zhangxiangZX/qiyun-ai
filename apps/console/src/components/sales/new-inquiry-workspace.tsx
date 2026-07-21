"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckSquare,
  ChevronRight,
  FileText,
  Globe,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Save,
  Search,
  Share2,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";

import { Badge, Button } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { InquiryModuleNav } from "@/components/sales/inquiry-module-nav";
import { isPreviewModeError } from "@/lib/api/use-api-resource";
import { createInquiryOnApi } from "@/lib/sales/api";
import {
  buildCreateInquirySummary,
  newInquiryChannelToSourceType,
} from "@/lib/sales/quick-entry-helpers";

const CHANNELS = [
  { key: "site", label: "独立站", icon: <Globe size={16} />, active: true },
  { key: "ads", label: "Google Ads", icon: <Search size={16} />, active: false },
  { key: "social", label: "社媒平台", icon: <Share2 size={16} />, active: false },
  { key: "expo", label: "展会活动", icon: <Calendar size={16} />, active: false },
  { key: "ref", label: "老客户推荐", icon: <Users size={16} />, active: false },
  { key: "email", label: "邮件营销", icon: <Mail size={16} />, active: false },
  { key: "other", label: "其他渠道", icon: <MoreHorizontal size={16} />, active: false },
];

const EXISTING_FILES = [
  { name: "产品手册.pdf", size: "2.4 MB" },
  { name: "需求规格说明书.docx", size: "1.1 MB" },
  { name: "参考图片.jpg", size: "860 KB" },
];

const AI_SUMMARY = [
  { icon: <Building2 size={14} />, label: "公司名称", value: "GlobalTech Solutions Inc. - SaaS，用于食品加工行业" },
  { icon: <Users size={14} />, label: "联系人", value: "Michael Johnson - 采购，电话 138****6800，材质不锈钢" },
  { icon: <Search size={14} />, label: "预算范围", value: "$50,000 - $100,000 USD，材质不锈钢，交期 7-15 个月" },
  { icon: <Calendar size={14} />, label: "需求来源", value: "2024-07-15" },
  { icon: <CheckSquare size={14} />, label: "需求完整度/等级", value: "需完整安装号" },
];

const MISSING_INFO = [
  "公司地址 建议补充完整的地址信息",
  "行业/应用场景 建议明确应用场景方式",
  "特征/认可要求 建议明确是否要求认证",
  "物流要求 建议补充港口/地址信息",
];

const AI_SUGGESTIONS = [
  "24 小时内发送产品方案推荐报价单",
  "安排产品报价的初版框架或免费",
  "明确具体安装环境/测试会议",
  "建议安排产品展示视频或会议",
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-control border border-input bg-background px-3 text-sm outline-none focus:border-primary/40";

export function NewInquiryWorkspace() {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState("site");
  const [customerName, setCustomerName] = useState("GlobalTech Solutions Inc.");
  const [contactName, setContactName] = useState("Michael Johnson");
  const [email, setEmail] = useState("michael.johnson@globaltech.com");
  const [phone, setPhone] = useState("+1 (555) 123-4567");
  const [productName, setProductName] = useState("输送系统 GT-2000");
  const [quantity, setQuantity] = useState("5");
  const [budget, setBudget] = useState("$50,000 - $100,000");
  const [deliveryDate, setDeliveryDate] = useState("2024-07-15");
  const [internalRemark, setInternalRemark] = useState(
    "客户对传输系统有浓厚兴趣。偏好好用的 Medneary/TaipH Systems 优选项。建议安排：3-5 个工作日内产出方案和报告。",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const channelLabel = CHANNELS.find((ch) => ch.key === activeChannel)?.label ?? "其他渠道";

  const handleCreate = async () => {
    if (!customerName.trim() || !contactName.trim() || !email.trim() || !productName.trim()) {
      setSaveError("请填写客户、联系人、邮箱与产品类别。");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const summary = buildCreateInquirySummary({
        customerName: customerName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        productName: productName.trim(),
        quantity: quantity.trim(),
        budget: budget.trim(),
        deliveryDate: deliveryDate.trim(),
        channelLabel,
        internalRemark,
      });
      const created = await createInquiryOnApi({
        customerName: customerName.trim(),
        sourceType: newInquiryChannelToSourceType(activeChannel),
        summary,
        customerContact: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        productNeed: productName.trim(),
        budget: budget.trim(),
        internalRemark,
        channelLabel,
      });
      router.push(`/dashboard/inquiries/${created.id}`);
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        setSaveError("预览模式下无法创建询盘，请配置 API_BASE_URL。");
      } else {
        setSaveError(err instanceof Error ? err.message : "创建失败，请稍后重试。");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleModeBadge />
        <ConsoleDataModeBanner feature="表单新建询盘" />
      </ConsolePageAlerts>

      <div>
        <InquiryModuleNav pageTitle="表单新建询盘" showNewAction={false} />
        <p className="mt-2 text-sm text-muted-foreground">
          请完善客户需求信息，AI 将自动提炼关键信息，助力快速响应
        </p>
        {saveError ? (
          <p className="mt-2 text-sm text-destructive">{saveError}</p>
        ) : null}
      </div>

      <div className="grid gap-4 pb-6 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0 space-y-4">
          <SectionCard title="客户基本信息">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="客户" required>
                <input
                  className={inputCls}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </Field>
              <Field label="国家/地区" required>
                <select className={inputCls}>
                  <option>🇺🇸 美国</option>
                  <option>🇨🇳 中国</option>
                  <option>🇩🇪 德国</option>
                  <option>🇯🇵 日本</option>
                </select>
              </Field>
              <Field label="客户类型" required>
                <select className={inputCls}>
                  <option>潜在客户</option>
                  <option>意向客户</option>
                  <option>成交客户</option>
                </select>
              </Field>
              <Field label="公网网站">
                <input className={inputCls} defaultValue="https://www.globaltech.com" />
              </Field>
              <Field label="公司规模">
                <select className={inputCls}>
                  <option>501~1000人</option>
                  <option>200~600人</option>
                  <option>1000人以上</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="来源渠道">
            <div className="mb-4 flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => setActiveChannel(ch.key)}
                  className={`inline-flex items-center gap-1.5 rounded-control border px-3 py-2 text-sm transition-colors ${
                    activeChannel === ch.key
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {ch.icon}
                  {ch.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="子渠道">
                <select className={inputCls}>
                  <option>独立站 - 联系表单</option>
                  <option>独立站 - 在线客服</option>
                </select>
              </Field>
              <Field label="自定义来源">
                <input className={inputCls} placeholder="可填写自定义来源说明" />
              </Field>
              <Field label="来源详情">
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input className={`${inputCls} pl-9`} defaultValue="2024-06-01 10:23" />
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="联系人信息">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="姓名" required>
                <input
                  className={inputCls}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </Field>
              <Field label="角色" required>
                <select className={inputCls}>
                  <option>采购经理</option>
                  <option>技术总监</option>
                  <option>CEO/总经理</option>
                </select>
              </Field>
              <Field label="邮箱" required>
                <input
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="电话">
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="WhatsApp（选填）">
                <input className={inputCls} placeholder="WhatsApp 号码" />
              </Field>
              <Field label="直连方式选择">
                <select className={inputCls}>
                  <option>微信</option>
                  <option>WhatsApp</option>
                  <option>电话</option>
                  <option>邮件</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="产品/需求信息">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="产品类别" required>
                <select className={inputCls}>
                  <option>工业设备 &gt; 自动化设备 &gt; 传送系统</option>
                  <option>工业设备 &gt; 自动化设备 &gt; 机器人</option>
                </select>
              </Field>
              <Field label="具体产品名称/型号">
                <input
                  className={inputCls}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </Field>
              <Field label="数量" required>
                <input className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
              <Field label="单位">
                <select className={inputCls}>
                  <option>套</option>
                  <option>台</option>
                  <option>件</option>
                </select>
              </Field>
              <Field label="重量">
                <input className={inputCls} defaultValue="800kg/min" />
              </Field>
              <Field label="材质">
                <input className={inputCls} defaultValue="不锈钢" />
              </Field>
              <Field label="预算 (USD)" required>
                <input className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)} />
              </Field>
              <Field label="预期交期">
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    className={`${inputCls} pl-9`}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              </Field>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="自助应用场景描述">
                <textarea
                  rows={3}
                  placeholder="请描述产品应用的场景与工况…"
                  className="w-full resize-none rounded-control border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
              </Field>
              <div className="space-y-4">
                <Field label="需要安装/运维服务">
                  <select className={inputCls}>
                    <option>不需要</option>
                    <option>需要安装</option>
                    <option>需要运维</option>
                    <option>安装 + 运维</option>
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-input" />
                  预算包含安装/服务费用
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="附件上传">
            <div className="flex flex-col items-center justify-center gap-2 rounded-control border border-dashed border-input bg-muted/20 py-6 text-center">
              <Paperclip size={26} className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">点击或拖拽文件到此处上传</p>
              <p className="text-xs text-muted-foreground">
                支持格式：PDF、DOC、PPTX、JPG、PNG 等。单个文件不超过 10MB
              </p>
            </div>
            <ul className="mt-3 space-y-1.5">
              {EXISTING_FILES.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center gap-2 rounded-control border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <FileText size={14} className="shrink-0 text-primary" />
                  <span className="flex-1 truncate text-foreground/80">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.size}</span>
                </li>
              ))}
              <li>
                <button className="flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-input py-2 text-xs text-muted-foreground hover:bg-accent">
                  <Plus size={13} />
                  继续添加附件
                </button>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">备注最多 100 字</p>
          </SectionCard>

          <SectionCard title="内部备注">
            <textarea
              rows={4}
              value={internalRemark}
              onChange={(e) => setInternalRemark(e.target.value)}
              placeholder="如客户偏好、竞争情况、内部协作说明等…"
              className="w-full resize-none rounded-control border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
          </SectionCard>

          <div className="flex items-center justify-end gap-2">
            <Link href="/dashboard/inquiries">
              <Button variant="outline">取消</Button>
            </Link>
            <Button variant="outline" leftIcon={<Save size={15} />} disabled>
              保存草稿
            </Button>
            <Button
              leftIcon={<Plus size={15} />}
              disabled={saving}
              onClick={() => void handleCreate()}
            >
              {saving ? "创建中…" : "创建保存"}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-card border border-purple-200 bg-card shadow-card">
            <div className="flex items-center gap-2 border-b border-purple-200 bg-purple-50 px-4 py-3">
              <Sparkles size={15} className="text-purple-500" />
              <h3 className="text-sm font-semibold text-foreground">AI 智能提炼</h3>
              <Badge variant="info" className="ml-auto">实时</Badge>
            </div>
            <div className="p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">需求摘要</h4>
              <ul className="space-y-2.5">
                {AI_SUMMARY.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                      {s.icon}
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="font-medium text-foreground/90">{s.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-card border border-warning/40 bg-card shadow-card">
            <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-3">
              <AlertTriangle size={15} className="text-warning" />
              <h3 className="text-sm font-semibold text-foreground">缺信息提醒</h3>
            </div>
            <ul className="space-y-2 p-4">
              {MISSING_INFO.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 fill-warning text-warning" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 size={15} className="text-purple-500" />
              <h3 className="text-sm font-semibold text-foreground">AI 跟进建议</h3>
            </div>
            <ol className="space-y-2.5">
              {AI_SUGGESTIONS.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/80">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-600">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <button className="mt-3 flex items-center gap-0.5 text-xs font-medium text-purple-600 hover:underline">
              查看完整跟进建议
              <ChevronRight size={12} />
            </button>
          </div>
        </aside>
      </div>
    </ConsolePage>
  );
}
