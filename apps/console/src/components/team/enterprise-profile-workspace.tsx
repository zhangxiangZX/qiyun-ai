"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Award,
  BadgeCheck,
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  PenLine,
  Phone,
  Plus,
  Upload,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { fetchAuthSession } from "@/lib/auth/client";
import { unwrapEnvelope } from "@/lib/api/envelope";
import {
  COMPLETENESS_CHECKS,
  INDUSTRY_TAGS,
  mergeProfile,
  type EnterpriseProfileForm,
} from "@/lib/team/enterprise-profile-data";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/enterprise-profile.module.css";

function CompletenessGauge({ value }: { value: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  return (
    <div className={styles.completenessRing}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.completenessValue}>
        <span className={styles.completenessPct}>{value}%</span>
        <span className={styles.completenessLabel}>资料完整</span>
      </div>
    </div>
  );
}

function ReadonlyField({
  label,
  value,
  icon,
  wide,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldGridWide : ""}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.fieldInputWrap}>
        {icon ? <span className={styles.fieldIcon}>{icon}</span> : null}
        <input
          readOnly
          value={value}
          className={`${styles.fieldInput} ${icon ? styles.fieldInputWithIcon : ""}`}
        />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.infoCard}>
      <div className={styles.infoCardHeader}>
        <h2 className={styles.infoCardTitle}>{title}</h2>
        <Link href="/dashboard/team/profile/edit" className={styles.editLink}>
          <PenLine size={14} /> 编辑
        </Link>
      </div>
      {children}
    </section>
  );
}

export function EnterpriseProfileWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [profile, setProfile] = useState<EnterpriseProfileForm>(mergeProfile(null));
  const [memberCount, setMemberCount] = useState(28);
  const [workspaceId, setWorkspaceId] = useState("ENT-20240601-0001");
  const [createdAt] = useState("2024-06-01");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await fetchAuthSession();
      if (!session) return;
      const active = session.workspaces.find((w) => w.isActive);
      if (!active) return;

      setWorkspaceId(active.id.slice(0, 18).toUpperCase());

      const res = await fetch(`/api/auth/workspaces/${active.id}`, { cache: "no-store" });
      if (res.ok) {
        const body = await res.json().catch(() => null);
        const workspace = unwrapEnvelope<{
          name?: string;
          companyProfile?: Record<string, unknown>;
          createdAt?: string;
        }>(body);
        if (workspace) {
          setProfile(mergeProfile(workspace.companyProfile, workspace.name));
        }
      }

      const membersRes = await fetch("/api/auth/workspace-members", { cache: "no-store" });
      if (membersRes.ok) {
        const membersBody = await membersRes.json().catch(() => null);
        const members = unwrapEnvelope<unknown[]>(membersBody);
        if (Array.isArray(members)) {
          setMemberCount(members.length);
        }
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

  const completeness = useMemo(
    () => Math.round((COMPLETENESS_CHECKS.filter((c) => c.done).length / COMPLETENESS_CHECKS.length) * 100),
    [],
  );

  const companyInitial = profile.companyName.trim().charAt(0) || "企";

  if (loading) {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="企业资料" />
        </ConsolePageAlerts>
        <p className={styles.loadingText}>正在加载企业资料…</p>
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="mt-4 h-96 w-full rounded-card" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="企业资料" />
        {error ? (
          <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分信息加载失败，已展示示例数据。")} />
        ) : null}
      </ConsolePageAlerts>

      <section className={styles.summaryCard}>
        <div className={styles.summaryLeft}>
          <div className={styles.logoBox}>{companyInitial}</div>
          <div className={styles.summaryInfo}>
            <div className={styles.companyNameRow}>
              <h2 className={styles.companyName}>{profile.companyName}</h2>
              <span className={styles.badgeVerified}>
                <BadgeCheck size={12} /> 已认证
              </span>
              <span className={styles.tag}>企业版</span>
              <span className={styles.tagOutline}>标准版</span>
            </div>
            <div className={styles.metaRow}>
              <span>有效期限 2025-12-31</span>
              <span className={styles.metaVerified}>
                <CheckCircle2 size={14} /> 已实名
              </span>
            </div>
            <p className={styles.introText}>{profile.intro}</p>
            <div className={styles.metaPanel}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>企业 ID</span>
                <span className={styles.metaValue}>
                  {workspaceId}
                  <button
                    type="button"
                    className={styles.metaLink}
                    aria-label="复制企业 ID"
                    title="复制企业 ID"
                    onClick={() => {
                      void navigator.clipboard?.writeText(workspaceId).catch(() => undefined);
                    }}
                  >
                    <Copy size={12} />
                  </button>
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>创建时间</span>
                <span className={styles.metaValue}>{createdAt}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>当前成员</span>
                <span className={styles.metaValue}>{memberCount} 人</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>订购状态</span>
                <span className={styles.metaValue}>
                  按年订阅
                  <button type="button" className={styles.metaLink} disabled title="订购详情即将上线">
                    查看详情
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.summaryRight}>
          <CompletenessGauge value={completeness} />
          <div className={styles.checkList}>
            {COMPLETENESS_CHECKS.map((item) =>
              item.done ? (
                <div key={item.label} className={styles.checkItem}>
                  <CheckCircle2 size={14} color="#22c55e" /> {item.label} 已完成
                </div>
              ) : (
                <div key={`${item.label}-pending`} className={`${styles.checkItem} ${styles.checkItemPending}`}>
                  <Circle size={14} /> {item.label} 待完善
                </div>
              ),
            )}
            <button type="button" className={styles.metaLink}>
              <Plus size={14} /> 继续完善
            </button>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.leftCol}>
          <SectionCard title="基本信息">
            <div className={styles.fieldGrid}>
              <ReadonlyField label="企业名称" value={profile.companyName} />
              <ReadonlyField label="统一社会信用代码" value={profile.creditCode} />
              <ReadonlyField label="企业性质" value={profile.companyNature} />
              <ReadonlyField label="成立时间" value={profile.foundedAt} />
              <ReadonlyField label="注册资本" value={profile.registeredCapital} />
              <ReadonlyField label="营业期限" value={profile.businessTerm} />
            </div>
          </SectionCard>

          <SectionCard title="联系方式">
            <div className={styles.fieldGrid}>
              <ReadonlyField label="联系人" value={profile.contactName} />
              <ReadonlyField label="联系电话" value={profile.mobile} icon={<Phone size={14} />} />
              <ReadonlyField label="联系邮箱" value={profile.supportEmail} />
              <ReadonlyField label="公司网站" value={profile.website} />
              <ReadonlyField label="联系电话(座机)" value={profile.hotline} />
              <ReadonlyField label="传真号码" value="0571-8688 8888" />
            </div>
          </SectionCard>

          <SectionCard title="公司地址">
            <div className={styles.fieldGrid}>
              <ReadonlyField label="注册地址" value={`${profile.city}${profile.district}${profile.address}`} wide />
              <ReadonlyField label="办公地址" value={profile.officeAddress} wide />
              <ReadonlyField label="邮政编码" value={profile.postalCode} />
            </div>
          </SectionCard>

          <SectionCard title="所属行业">
            <div className={styles.fieldGrid}>
              <ReadonlyField label="所在行业" value={profile.industry} />
              <ReadonlyField label="细分行业" value={profile.subIndustry} />
              <ReadonlyField label="主营业务" value={profile.mainBusiness} />
              <ReadonlyField label="企业规模" value={profile.scale} />
            </div>
            <div className={styles.field} style={{ marginTop: 16 }}>
              <span className={styles.fieldLabel}>行业标签</span>
              <div className={styles.tagList}>
                {INDUSTRY_TAGS.map((tag) => (
                  <span key={tag} className={styles.industryTag}>
                    {tag}
                  </span>
                ))}
                <button type="button" className={styles.tagAdd}>
                  <Plus size={12} /> 添加
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="企业简介">
            <div className={styles.field}>
              <span className={styles.fieldLabel}>企业简介（最多 500 字）</span>
              <textarea readOnly className={styles.textarea} value={profile.intro} rows={4} />
              <span className={styles.charCount}>{profile.intro.length}/500</span>
            </div>
          </SectionCard>

          <SectionCard title="发票信息">
            <div className={styles.fieldGrid}>
              <ReadonlyField label="发票抬头" value={profile.invoiceTitle} />
              <ReadonlyField label="纳税人识别号" value={profile.taxId} />
              <ReadonlyField label="开票类型" value={profile.invoiceType} />
              <ReadonlyField label="注册地址" value={profile.invoiceAddress} />
              <ReadonlyField label="开户电话" value={profile.invoicePhone} />
            </div>
          </SectionCard>

          <SectionCard title="对公账户">
            <div className={styles.fieldGrid}>
              <ReadonlyField label="开户行" value={profile.bankName} />
              <ReadonlyField label="银行账号" value={profile.bankAccount} />
              <ReadonlyField label="支行名称" value={profile.branchName} />
              <ReadonlyField label="开户行账号" value={profile.branchCode} />
            </div>
            <p className={styles.warningTip}>
              <AlertCircle size={14} /> 此账户仅用于接收平台款项，请确保信息准确无误。
            </p>
          </SectionCard>
        </div>

        <div className={styles.rightCol}>
          <section className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <h2 className={styles.infoCardTitle}>品牌素材</h2>
            </div>
            <div className={styles.brandLogo}>
              <div className={styles.brandLogoPreview}>{companyInitial}</div>
              <div className={styles.brandLogoInfo}>
                <p>Logo 预览 120×120px</p>
                <button type="button" className={styles.btnOutlineSm}>
                  <Upload size={14} /> 更换 Logo
                </button>
              </div>
            </div>
            <div className={styles.brandBanner}>
              <span className={styles.brandBannerText}>品牌横幅预览 792 × 400px</span>
              <button type="button" className={`${styles.btnOutlineSm} ${styles.bannerBtn}`}>
                <Upload size={14} /> 更换
              </button>
            </div>
            <div className={styles.uploadZone}>
              <Upload size={22} color="#94a3b8" />
              <p className={styles.uploadTitle}>上传附件</p>
              <p className={styles.uploadHint}>支持 img, png, pdf，不超过 10MB</p>
            </div>
          </section>

          <section className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <h2 className={styles.infoCardTitle}>企业认证</h2>
            </div>
            <div className={styles.authRow}>
              <span className={styles.authLabel}>认证类型</span>
              <span className={styles.authValue}>企业认证</span>
            </div>
            <div className={styles.authRow}>
              <span className={styles.authLabel}>认证状态</span>
              <span className={styles.badgeVerified}>
                <BadgeCheck size={12} /> 已认证
              </span>
            </div>
            <div className={styles.authRow}>
              <span className={styles.authLabel}>认证时间</span>
              <span className={styles.authValue}>2024-01-16</span>
            </div>
            <div className={styles.authRow}>
              <span className={styles.authLabel}>证书有效期</span>
              <span className={styles.authValue}>2026-01-15</span>
            </div>
            <button type="button" className={styles.authLink}>
              <Eye size={14} /> 查看认证证书
            </button>
          </section>
        </div>
      </div>

      <div className={styles.footerBar}>
        <p className={styles.footerHint}>提示：资料提交入库审核，预计 1-3 个工作日完成审核</p>
        <div className={styles.footerActions}>
          <Link href="/dashboard/team/profile/edit" className={styles.btnOutline}>
            保存修改
          </Link>
          <Link href="/dashboard/team/profile/edit" className={styles.btnPrimary}>
            <Award size={14} /> 提交认证
          </Link>
        </div>
      </div>
    </ConsolePage>
  );
}
