"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Circle,
  Cloud,
  Eye,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  PenLine,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { fetchAuthSession } from "@/lib/auth/client";
import { unwrapEnvelope } from "@/lib/api/envelope";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/company-profile.module.css";

interface CompanyProfileForm {
  companyName: string;
  shortName: string;
  industry: string;
  website: string;
  hotline: string;
  supportEmail: string;
  creditCode: string;
  contactName: string;
  mobile: string;
  city: string;
  district: string;
  subDistrict: string;
  address: string;
  intro: string;
  slogan: string;
  siteTitle: string;
  siteDescription: string;
  invoiceTitle: string;
  taxId: string;
  bankName: string;
  bankAccount: string;
}

const DEFAULT_FORM: CompanyProfileForm = {
  companyName: "企云科技有限公司",
  shortName: "企云科技",
  industry: "工业制造 / 工业设备",
  website: "https://www.qiyunai.com",
  hotline: "400-888-9527",
  supportEmail: "support@qiyunai.com",
  creditCode: "91310101MA1FPJ6X8G",
  contactName: "张先生",
  mobile: "138 0013 8000",
  city: "上海市",
  district: "浦东新区",
  subDistrict: "张江镇",
  address: "上海市浦东新区张江高科技园区科苑路88号2号楼6层",
  intro:
    "企云科技有限公司专注于 AI 驱动的智能营销与销售解决方案，致力于帮助工业企业实现数字化转型与业绩增长。我们的产品覆盖智能获客、客户运营、销售转化与数据分析等全流程，已服务上千家工业企业客户。",
  slogan: "用 AI 赋能销售增长",
  siteTitle: "企云图 AI | AI 驱动的企业智能营销与销售平台",
  siteDescription:
    "企云图 AI 为工业企业提供智能获客、客户运营、销售转化与数据分析一体化解决方案，助力企业高效增长。",
  invoiceTitle: "企云科技有限公司",
  taxId: "91310101MA1FPJ6X8G",
  bankName: "中国工商银行股份有限公司上海张江支行",
  bankAccount: "1001 2508 1930 0008 888",
};

const DEFAULT_TAGS = ["工业设备", "官网获客", "AI 智能助手", "销售转化"];

const DEFAULT_COVER = "/brand/company-cover.png";

const ATTACHMENTS = [
  { name: "营业执照.jpg", size: "1.24 MB", type: "image" as const, uploaded: true },
  { name: "ISO9001 质量管理体系认证.pdf", size: "2.18 MB", type: "pdf" as const, uploaded: true },
  { name: "企云科技公司介绍.pdf", size: "3.48 MB", type: "pdf" as const, uploaded: true },
];

const INDUSTRIES = [
  "工业制造 / 工业设备",
  "信息技术 / 软件服务",
  "贸易 / 进出口",
  "建筑 / 工程",
];

const CITIES = ["上海市", "北京市", "深圳市", "广州市"];
const DISTRICTS = ["浦东新区", "黄浦区", "徐汇区", "静安区"];
const SUB_DISTRICTS = ["张江镇", "陆家嘴", "金桥", "花木"];

type CheckStatus = "done" | "warn" | "pending";

interface CheckItem {
  label: string;
  status: CheckStatus;
}

function CompletenessRing({ value }: { value: number }) {
  return (
    <div className={styles.completenessRing}>
      <svg viewBox="0 0 36 36" aria-hidden>
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeDasharray={`${value}, 100`}
        />
      </svg>
      <div className={styles.completenessValue}>
        <div className={styles.completenessPct}>{value}%</div>
        <div className={styles.completenessLabel}>完整度</div>
      </div>
    </div>
  );
}

function CheckIcon({ status }: { status: CheckStatus }) {
  if (status === "done") return <CheckCircle2 size={14} color="#22c55e" aria-hidden />;
  if (status === "warn") return <AlertCircle size={14} color="#eab308" aria-hidden />;
  return <Circle size={14} color="#d1d5db" aria-hidden />;
}

function computeChecks(form: CompanyProfileForm, introLen: number): CheckItem[] {
  return [
    { label: "企业名称", status: form.companyName.trim() ? "done" : "pending" },
    { label: "联系方式", status: form.hotline.trim() && form.mobile.trim() ? "done" : "pending" },
    { label: "联系地址", status: form.address.trim() ? "done" : "pending" },
    {
      label: "企业介绍（建议 200 字以上）",
      status: introLen >= 200 ? "done" : introLen >= 100 ? "warn" : "warn",
    },
    { label: "上传营业执照", status: "warn" },
    {
      label: "品牌展示信息 - 网站描述",
      status: form.siteDescription.trim().length >= 30 ? "done" : "pending",
    },
  ];
}

function computeCompleteness(checks: CheckItem[]): number {
  const weights = { done: 1, warn: 0.5, pending: 0 };
  const total = checks.reduce((sum, item) => sum + weights[item.status], 0);
  return Math.round((total / checks.length) * 100);
}

export function CompanyProfileWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [form, setForm] = useState<CompanyProfileForm>(DEFAULT_FORM);
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [published, setPublished] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string>(DEFAULT_COVER);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await fetchAuthSession();
      if (!session) return;
      const active = session.workspaces.find((w) => w.isActive);
      if (!active) return;

      const fallbackName = active.name;
      let profile: Record<string, unknown> = {};
      try {
        const res = await fetch(`/api/auth/workspaces/${active.id}`, { cache: "no-store" });
        if (res.ok) {
          const body = await res.json().catch(() => null);
          const workspace = unwrapEnvelope<{ companyProfile?: Record<string, unknown> }>(body);
          if (workspace && workspace.companyProfile && typeof workspace.companyProfile === "object") {
            profile = workspace.companyProfile as Record<string, unknown>;
          }
        }
      } catch {
        // 网络失败时回落到默认示例数据
      }

      setForm((current) => ({
        ...current,
        ...(profile as Partial<CompanyProfileForm>),
        companyName: (profile.companyName as string) || fallbackName || current.companyName,
        shortName: (profile.shortName as string) || fallbackName || current.shortName,
        invoiceTitle: (profile.invoiceTitle as string) || fallbackName || current.invoiceTitle,
      }));
      if (Array.isArray(profile.tags)) {
        setTags(profile.tags as string[]);
      }
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

  const checks = useMemo(() => computeChecks(form, form.intro.length), [form]);
  const completeness = useMemo(() => computeCompleteness(checks), [checks]);
  const pendingCount = checks.filter((c) => c.status !== "done").length;

  function updateField<K extends keyof CompanyProfileForm>(key: K, value: CompanyProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((t) => t !== tag));
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleSave(publish: boolean) {
    setPublished(publish);
    setNotice(null);
    const session = await fetchAuthSession();
    const active = session?.workspaces.find((w) => w.isActive);
    if (!active) {
      setNotice("未找到当前工作空间，无法保存。");
      return;
    }

    const patch = { ...form, tags };
    try {
      const res = await fetch(`/api/auth/workspaces/${active.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const presentation = resolveRequestErrorPresentation(body, "企业资料保存失败，请重试。");
        setNotice(presentation.message);
        return;
      }
      setNotice(publish ? "企业资料已保存并发布。" : "企业资料已保存为草稿。");
    } catch (nextError) {
      const presentation = resolveRequestErrorPresentation(nextError, "企业资料保存失败，请重试。");
      setNotice(presentation.message);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载企业资料…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分信息加载失败，已展示示例数据。")} />
      ) : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.pageHeader}>
            <div className={styles.headerActions}>
              <button type="button" className={styles.btnOutline} onClick={() => handleSave(false)}>
                保存草稿
              </button>
              <button type="button" className={styles.btnPrimary} onClick={() => handleSave(true)}>
                保存并发布
              </button>
              <button type="button" className={styles.btnPreview}>
                <Eye size={14} aria-hidden /> 预览展示页
              </button>
            </div>
          </div>

          <div className={`${styles.topGrid} ui-stagger-fade-in ui-hover-lift-children`}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>企业基本信息</h2>
              <div className={styles.basicLayout}>
                <div className={styles.logoCol}>
                  <div className={styles.logoBox}>
                    <Cloud size={40} aria-hidden />
                  </div>
                  <button type="button" className={styles.logoLink}>
                    更换企业 Logo
                  </button>
                  <div className={styles.logoHint}>建议尺寸 400×400px</div>
                  <div className={styles.logoHint}>支持 JPG、PNG，2MB 以内</div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>
                      企业名称 <span className={styles.required}>*</span>
                    </label>
                    <input
                      value={form.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>
                      公司简称 <span className={styles.required}>*</span>
                    </label>
                    <input value={form.shortName} onChange={(e) => updateField("shortName", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>
                      所属行业 <span className={styles.required}>*</span>
                    </label>
                    <select value={form.industry} onChange={(e) => updateField("industry", e.target.value)}>
                      {INDUSTRIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>官方网站</label>
                    <input value={form.website} onChange={(e) => updateField("website", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>
                      服务热线 <span className={styles.required}>*</span>
                    </label>
                    <input value={form.hotline} onChange={(e) => updateField("hotline", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>支持邮箱</label>
                    <input
                      value={form.supportEmail}
                      onChange={(e) => updateField("supportEmail", e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.formGridWide}`}>
                    <label>
                      统一社会信用代码 <span className={styles.required}>*</span>
                    </label>
                    <input value={form.creditCode} onChange={(e) => updateField("creditCode", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>
                  资料完整度
                </h2>
                <HelpCircle size={14} color="#9ca3af" aria-hidden />
              </div>
              <CompletenessRing value={completeness} />
              <div className={styles.completenessDesc}>完善资料有助于提升品牌可信度与获客转化率</div>
              <div className={styles.completenessSub}>待完善项（{pendingCount} 项）</div>
              <div className={styles.checkList}>
                {checks.map((item) => (
                  <div
                    key={item.label}
                    className={item.status === "pending" ? `${styles.checkItem} ${styles.checkItemPending}` : styles.checkItem}
                  >
                    <CheckIcon status={item.status} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className={styles.publishBlock}>
                <div className={styles.publishRow}>
                  <span>对外展示状态</span>
                  <span className={styles.statusPublished}>{published ? "已发布" : "草稿"}</span>
                </div>
                <div className={styles.publishDesc}>
                  企业资料已对外展示，可被客户在官网、名片等场景查看。
                </div>
                <button type="button" className={styles.btnPreviewFull}>
                  预览展示页
                </button>
              </div>
            </div>
          </div>

          <div className={`${styles.twoColGrid} ui-stagger-fade-in ui-hover-lift-children`}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>联系与地址信息</h2>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>
                    联系人 <span className={styles.required}>*</span>
                  </label>
                  <input value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>
                    手机号码 <span className={styles.required}>*</span>
                  </label>
                  <input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>
                    所在地区 <span className={styles.required}>*</span>
                  </label>
                  <select value={form.city} onChange={(e) => updateField("city", e.target.value)}>
                    {CITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.districtRow}>
                  <div className={styles.field}>
                    <select value={form.district} onChange={(e) => updateField("district", e.target.value)}>
                      {DISTRICTS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <select value={form.subDistrict} onChange={(e) => updateField("subDistrict", e.target.value)}>
                      {SUB_DISTRICTS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={`${styles.field} ${styles.formGridWide}`}>
                  <label>
                    详细地址 <span className={styles.required}>*</span>
                  </label>
                  <input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                </div>
              </div>
              <div className={styles.mapPlaceholder}>
                <div className={styles.mapDots} aria-hidden />
                <div className={styles.mapLabel}>
                  <MapPin size={20} color="#2563eb" aria-hidden />
                  地图定位
                </div>
                <button type="button" className={styles.mapRelocate}>
                  重新定位
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>
                  资质与附件
                </h2>
                <span className={styles.cardHint}>支持 JPG、PNG、PDF 格式，单个文件不超过 10MB</span>
              </div>
              {ATTACHMENTS.map((file) => (
                <div key={file.name} className={styles.fileRow}>
                  <div className={styles.fileLeft}>
                    <FileText size={18} color={file.type === "pdf" ? "#ef4444" : "#3b82f6"} aria-hidden />
                    <div>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{file.size}</div>
                    </div>
                  </div>
                  <span className={styles.fileStatus}>{file.uploaded ? "已上传" : "待上传"}</span>
                </div>
              ))}
              <div className={styles.uploadZone}>
                <Upload size={24} color="#3b82f6" aria-hidden />
                <div className={styles.uploadTitle}>点击或拖拽文件到此处上传</div>
                <div className={styles.uploadHint}>支持多文件上传</div>
              </div>
            </div>
          </div>

          <div className={styles.twoColGrid}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>企业介绍</h2>
              <div className={styles.field}>
                <label>企业简介</label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={form.intro}
                  onChange={(e) => updateField("intro", e.target.value)}
                />
              </div>
              <div className={styles.charCount}>已输入 {form.intro.length}/1000</div>
              <div className={styles.field}>
                <label>标签（最多选择 6 个）</label>
                <div className={styles.tagList}>
                  {tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                      <button type="button" className={styles.tagRemove} onClick={() => removeTag(tag)} aria-label={`移除 ${tag}`}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {tags.length < 6 ? (
                    <button type="button" className={styles.tagAdd}>
                      + 添加标签
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>品牌展示信息</h2>
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.formGridWide}`}>
                  <label>企业口号</label>
                  <input value={form.slogan} onChange={(e) => updateField("slogan", e.target.value)} />
                </div>
                <div className={`${styles.field} ${styles.formGridWide}`}>
                  <label>网站标题（Title）</label>
                  <input value={form.siteTitle} onChange={(e) => updateField("siteTitle", e.target.value)} />
                </div>
                <div className={`${styles.field} ${styles.formGridWide}`}>
                  <label>网站描述（Description）</label>
                  <textarea
                    rows={3}
                    value={form.siteDescription}
                    onChange={(e) => updateField("siteDescription", e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.field} style={{ marginTop: 16 }}>
                <label>官网封面图（建议尺寸 1200×628px）</label>
                <div className={styles.coverImage}>
                  <img src={coverImage} alt="官网封面预览" width={1200} height={628} />
                  <button
                    type="button"
                    className={styles.coverChange}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    更换图片
                  </button>
                  <button
                    type="button"
                    className={styles.coverDelete}
                    aria-label="删除封面"
                    onClick={() => setCoverImage(DEFAULT_COVER)}
                  >
                    <Trash2 size={12} />
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.coverFileInput}
                    style={{ display: "none" }}
                    onChange={handleCoverChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>开票与结算信息</h2>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>
                  开票抬头 <span className={styles.required}>*</span>
                </label>
                <input value={form.invoiceTitle} onChange={(e) => updateField("invoiceTitle", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>
                  纳税人识别号 <span className={styles.required}>*</span>
                </label>
                <input value={form.taxId} onChange={(e) => updateField("taxId", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>开户银行</label>
                <input value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>银行账号</label>
                <input value={form.bankAccount} onChange={(e) => updateField("bankAccount", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.tipCard}>
            <h3>提升资料完整度小贴士</h3>
            <div className={styles.tipItem}>
              <div className={styles.tipIcon}>
                <PenLine size={14} aria-hidden />
              </div>
              <div>
                <div className={styles.tipTitle}>补充企业介绍</div>
                <div className={styles.tipSub}>展示核心优势</div>
              </div>
            </div>
            <div className={styles.tipItem}>
              <div className={styles.tipIcon}>
                <Award size={14} aria-hidden />
              </div>
              <div>
                <div className={styles.tipTitle}>上传资质证书</div>
                <div className={styles.tipSub}>增强客户信任</div>
              </div>
            </div>
            <div className={styles.tipItem}>
              <div className={styles.tipIcon}>
                <ImageIcon size={14} aria-hidden />
              </div>
              <div>
                <div className={styles.tipTitle}>完善品牌信息</div>
                <div className={styles.tipSub}>提升搜索曝光</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
