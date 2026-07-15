"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Globe,
  Link2,
  MessageSquare,
} from "lucide-react";
import styles from "@/styles/channel-access.module.css";
import {
  apiMutate,
  isPreviewModeError,
  useApiResource,
} from "@/lib/api/use-api-resource";

type ChannelAccessStatus = "requested" | "approved" | "rejected" | null;

type ChannelWithAccess = {
  id: string;
  name: string;
  iconBg: string;
  iconKind: string;
  available: boolean;
  description: string;
  accessStatus: ChannelAccessStatus;
};

/** 预览模式（未配置 API 后端）下的占位目录。 */
const MOCK_CHANNELS: ChannelWithAccess[] = [
  {
    id: "website",
    name: "官网 Widget",
    iconBg: "#2563eb",
    iconKind: "website",
    available: true,
    description: "将 AI 选型助手嵌入企业官网，访客直接在线咨询、获取报价。",
    accessStatus: null,
  },
  {
    id: "wechat",
    name: "企业微信",
    iconBg: "#07c160",
    iconKind: "wechat",
    available: false,
    description: "接入企业微信客服通道，在企微对话中嵌入 AI 助手。",
    accessStatus: null,
  },
  {
    id: "douyin",
    name: "抖音",
    iconBg: "#fe2c55",
    iconKind: "douyin",
    available: false,
    description: "通过抖音企业号落地页、私信自动回复接入 AI 选型。",
    accessStatus: null,
  },
  {
    id: "xhs",
    name: "小红书",
    iconBg: "#ff2442",
    iconKind: "xhs",
    available: false,
    description: "在小红书品牌主页或笔记评论中引导至 AI 选型页。",
    accessStatus: null,
  },
];

function ChannelIcon({ kind, bg }: { kind: string; bg: string }) {
  const iconProps = { size: 18, color: "#fff" as const };
  if (kind === "douyin") return <span className={styles.channelIcon} style={{ background: bg }}>抖</span>;
  return (
    <span className={styles.channelIcon} style={{ background: bg }}>
      {kind === "xhs" ? <BookOpen {...iconProps} /> : null}
      {kind === "wechat" ? <MessageSquare {...iconProps} /> : null}
      {kind === "website" ? <Globe {...iconProps} /> : null}
    </span>
  );
}

export function ChannelAccessWorkspace() {
  const { data: channels, loading, isPreview, refetch } =
    useApiResource<ChannelWithAccess[]>("/channels", MOCK_CHANNELS);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const requestAccess = async (id: string) => {
    setActionError(null);
    setPendingId(id);
    try {
      await apiMutate(`/channels/${id}/request-access`, "POST");
      await refetch();
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        // 预览模式：操作未同步到后端，刷新以展示最新目录即可
        await refetch();
      } else {
        setActionError(err instanceof Error ? err.message : "申请失败，请稍后重试。");
      }
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageToolbar}>
        <p>接入各流量渠道，配置跳转规则与参数，实现线索来源追踪与效果分析</p>
        {isPreview && (
          <span className={styles.previewHint}>预览模式：渠道数据来自本地示例，申请操作不会同步到后端。</span>
        )}
      </div>

      <div className={styles.layout}>
        <aside className={styles.leftCol}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>已接入渠道</h2>
            <div className={styles.channelList}>
              {loading ? (
                <div className={styles.loadingHint}>加载中…</div>
              ) : (
                channels.map((item) => {
                  if (item.available) {
                    return (
                      <article key={item.id} className={styles.channelCard}>
                        <div className={styles.channelCardTop}>
                          <div className={styles.channelIdentity}>
                            <ChannelIcon kind={item.iconKind} bg={item.iconBg} />
                            <div>
                              <div className={styles.channelNameRow}>
                                <span className={styles.channelName}>{item.name}</span>
                                <span className={`${styles.statusBadge} ${styles.statusEnabled}`}>
                                  已启用
                                </span>
                              </div>
                              <div className={styles.channelAccessLabel}>{item.description}</div>
                            </div>
                          </div>
                        </div>
                        <div className={styles.channelStats}>
                          <Link href="/dashboard/sites" className={styles.btnLink}>
                            管理站点与嵌入代码 <ArrowRight size={10} style={{ display: "inline", verticalAlign: -1 }} />
                          </Link>
                        </div>
                      </article>
                    );
                  }

                  const isApplied = item.accessStatus === "requested" || item.accessStatus === "approved";
                  const isRejected = item.accessStatus === "rejected";

                  return (
                    <article key={item.id} className={`${styles.channelCard} ${styles.channelCardDisabled}`}>
                      <div className={styles.channelCardTop}>
                        <div className={styles.channelIdentity}>
                          <ChannelIcon kind={item.iconKind} bg={item.iconBg} />
                          <div>
                            <div className={styles.channelNameRow}>
                              <span className={styles.channelName}>{item.name}</span>
                              {item.accessStatus === "approved" ? (
                                <span className={`${styles.statusBadge} ${styles.statusEnabled}`}>已开通</span>
                              ) : isRejected ? (
                                <span className={`${styles.statusBadge} ${styles.statusRejected}`}>申请未通过</span>
                              ) : isApplied ? (
                                <span className={`${styles.statusBadge} ${styles.statusPending}`}>申请中</span>
                              ) : (
                                <span className={`${styles.statusBadge} ${styles.statusDisabled}`}>规划中</span>
                              )}
                            </div>
                            <div className={styles.channelAccessLabel}>{item.description}</div>
                          </div>
                        </div>
                      </div>
                      <div className={styles.channelStats}>
                        <button
                          type="button"
                          className={styles.btnOutline}
                          disabled={isApplied || pendingId === item.id}
                          onClick={() => requestAccess(item.id)}
                        >
                          {pendingId === item.id ? (
                            "提交中…"
                          ) : isApplied ? (
                            <>
                              <Check size={14} aria-hidden /> 已提交接入申请
                            </>
                          ) : isRejected ? (
                            "重新申请"
                          ) : (
                            "申请接入"
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
              {!loading ? (
                <article className={styles.channelCard}>
                  <div className={styles.channelCardTop}>
                    <div className={styles.channelIdentity}>
                      <span className={styles.channelIcon} style={{ background: "#0f766e" }}>
                        <Link2 size={18} color="#fff" />
                      </span>
                      <div>
                        <div className={styles.channelNameRow}>
                          <span className={styles.channelName}>销售链接 / 二维码</span>
                          <span className={`${styles.statusBadge} ${styles.statusEnabled}`}>已启用</span>
                        </div>
                        <div className={styles.channelAccessLabel}>
                          创建渠道短链与二维码，追踪访问、留资与转化效果。
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.channelStats}>
                    <Link href="/dashboard/channels/links" className={styles.btnLink}>
                      管理销售链接 <ArrowRight size={10} style={{ display: "inline", verticalAlign: -1 }} />
                    </Link>
                  </div>
                </article>
              ) : null}
            </div>
            {actionError && <div className={styles.actionError}>{actionError}</div>}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>渠道追踪与分析</h2>
            <div className={styles.trackingList}>
              <div className={styles.trackingItem}>
                <div>
                  <div className={styles.trackingTitle}>UTM 参数自动添加</div>
                  <div className={styles.trackingDesc}>系统自动为链接添加渠道追踪参数</div>
                </div>
                <div className={styles.trackingRight}>
                  <span className={styles.trackingStatus}>规划中</span>
                </div>
              </div>
              <div className={styles.trackingItem}>
                <div>
                  <div className={styles.trackingTitle}>来源识别规则</div>
                  <div className={styles.trackingDesc}>识别用户来源渠道和来源媒介</div>
                </div>
                <div className={styles.trackingRight}>
                  <span className={styles.trackingStatus}>规划中</span>
                </div>
              </div>
              <div className={styles.trackingItem}>
                <div>
                  <div className={styles.trackingTitle}>渠道效果统计</div>
                  <div className={styles.trackingDesc}>统计各渠道的访问量和转化效果</div>
                </div>
                <div className={styles.trackingRight}>
                  <Link href="/dashboard/reports" className={styles.btnLink}>
                    前往数据中心 <ArrowRight size={10} style={{ display: "inline", verticalAlign: -1 }} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <section className={styles.centerCol}>
          <div className={styles.configCard}>
            <div className={styles.configHead}>
              <div className={styles.configHeadIdentity}>
                <ChannelIcon kind="website" bg="#2563eb" />
                <div>
                  <div className={styles.configHeadLabel}>当前可用渠道</div>
                  <div className={styles.configHeadName}>官网 Widget</div>
                </div>
              </div>
            </div>

            <div className={styles.placeholderPanel}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 24px" }}>
                <Globe size={40} color="#2563eb" />
                <div style={{ fontSize: 18, fontWeight: 700 }}>官网 Widget 已就绪</div>
                <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", maxWidth: 320 }}>
                  在「站点管理」页面创建站点、配置域名白名单、获取嵌入代码，即可将 AI 助手嵌入企业官网。
                </div>
                <Link href="/dashboard/sites" className={styles.btnPrimary} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  前往站点管理 <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.rightCol}>
          <div className={`${styles.card} ${styles.previewCard}`}>
            <div className={styles.previewHead}>
              <h2 className={styles.cardTitle} style={{ margin: 0 }}>快速接入流程</h2>
            </div>
            <div className={styles.guideSection}>
              <div className={styles.guideTitle}>官网 Widget 接入步骤</div>
              <div className={styles.guideList}>
                {[
                  "创建站点，填写官网域名",
                  "配置域名白名单（支持主域和子域）",
                  "获取 Site Key 和嵌入代码",
                  "将代码粘贴到官网 HTML",
                  "验证 Widget 正常加载",
                ].map((step, index) => (
                  <div key={step} className={styles.guideStep}>
                    <span className={styles.guideStepNum}>{index + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/channels/links" className={styles.btnLink} style={{ marginTop: 8, display: "block" }}>
                管理销售链接 <ArrowRight size={10} style={{ display: "inline", verticalAlign: -1 }} />
              </Link>
              <Link href="/dashboard/sites" className={styles.btnLink} style={{ marginTop: 8, display: "block" }}>
                开始接入官网 Widget <ArrowRight size={10} style={{ display: "inline", verticalAlign: -1 }} />
              </Link>
            </div>
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #eef2f7", borderRadius: 8, background: "#fafbfc" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>其他渠道</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                企业微信、抖音、小红书等渠道正在规划中。点击「申请接入」提交需求，上线后我们将优先为你开通。
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
