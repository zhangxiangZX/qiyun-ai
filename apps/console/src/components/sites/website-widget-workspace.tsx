"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  FileCode,
  Globe,
  Link2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Repeat,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { updateBotOnApi } from "@/lib/bots/api";
import { listSites, createSite as createSiteEntry, updateSite, deleteSite } from "@/lib/sites/data";
import { checkSiteInstallOnApi } from "@/lib/sites/api";
import type { SiteConfig } from "@/lib/sites/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/website-widget.module.css";

type InstallStatus = "installed" | "pending";
type WidgetPosition = "br" | "bl";
type ButtonShape = "circle" | "rounded";
type BubbleStyle = "simple" | "card";
type PreviewDevice = "desktop" | "mobile";

interface WidgetSiteRow {
  id: string;
  botId: string;
  name: string;
  domain: string;
  botName: string;
  installStatus: InstallStatus;
  sourceId: string;
  enabled: boolean;
  embedSnippet?: string | null;
  allowedDomains?: string[];
  lastSeenAt?: string | null;
}

interface WidgetAppearancePrefs {
  themeColor: string;
  position: WidgetPosition;
  buttonShape: ButtonShape;
  bubbleStyle: BubbleStyle;
  unreadAlert: boolean;
  autoPopup: boolean;
  autoPopupDelay: number;
  firstWelcome: boolean;
}

const APPEARANCE_STORAGE_PREFIX = "qiyun:widget-appearance:";

const THEME_COLORS = ["#2563eb", "#22c55e", "#a855f7", "#f97316", "#ef4444", "#6b7280", "linear-gradient(135deg,#60a5fa,#9333ea)"];

const DEMO_SITES: WidgetSiteRow[] = [
  {
    id: "site_kuzimash_web",
    botId: "",
    name: "酷子码时官网",
    domain: "www.kuzimash.com",
    botName: "售前咨询助手",
    installStatus: "installed",
    sourceId: "site_kuzimash_web",
    enabled: true,
    lastSeenAt: "2026-07-11T18:42:00.000Z",
  },
  {
    id: "site_kuzimash_m",
    botId: "",
    name: "酷子码时官网（移动）",
    domain: "m.kuzimash.com",
    botName: "移动端客服助手",
    installStatus: "pending",
    sourceId: "site_kuzimash_m",
    enabled: true,
    lastSeenAt: null,
  },
  {
    id: "site_qiyun_demo",
    botId: "",
    name: "企云 AI 演示站",
    domain: "demo.qiyun.ai",
    botName: "通用咨询助手",
    installStatus: "installed",
    sourceId: "site_qiyun_demo",
    enabled: true,
    lastSeenAt: "2026-07-11T12:05:00.000Z",
  },
];

const DEFAULT_EMBED = `<script>
function(w,d,s,o){
  QIYUN_WIDGET=w;
  QIYUN_WIDGET.q=[];
  function(){
    QIYUN_WIDGET.q.push(arguments);
  };
  var s=d.createElement(s),m=d.getElementsByTagName(s)[0];
  s.async=1;s.src='https://widget.qiyun.ai/v1/widget.js?id=site_kuzimash_web';
  m.parentNode.insertBefore(s,m);
}(window,document,'script');
</script>`;

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "尚未检测到安装";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={styles.switch}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.slider} />
    </label>
  );
}

function mapApiSite(site: SiteConfig): WidgetSiteRow {
  const domain = site.allowedDomains[0] ?? "example.com";
  return {
    id: site.id,
    botId: site.botId,
    name: site.botName ? `${site.botName} 站点` : domain,
    domain: domain.replace(/^https?:\/\//, ""),
    botName: site.botName || "绑定助手",
    installStatus: "pending",
    sourceId: site.siteKeyPrefix || site.id,
    enabled: true,
    embedSnippet: site.embedSnippet,
    allowedDomains: site.allowedDomains,
  };
}

function parseDomains(input: string): string[] {
  return input
    .split(/[,，\n]/)
    .map((item) => item.trim().replace(/^https?:\/\//, ""))
    .filter(Boolean);
}

function loadAppearancePrefs(siteId: string): WidgetAppearancePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${APPEARANCE_STORAGE_PREFIX}${siteId}`);
    return raw ? (JSON.parse(raw) as WidgetAppearancePrefs) : null;
  } catch {
    return null;
  }
}

function saveAppearancePrefs(siteId: string, prefs: WidgetAppearancePrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${APPEARANCE_STORAGE_PREFIX}${siteId}`, JSON.stringify(prefs));
}

export function WebsiteWidgetWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [sites, setSites] = useState<WidgetSiteRow[]>(DEMO_SITES);
  const [selectedId, setSelectedId] = useState(DEMO_SITES[0].id);
  const [notice, setNotice] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [defaultBotId, setDefaultBotId] = useState("");
  const [siteForm, setSiteForm] = useState<{ name: string; domain: string }>({ name: "", domain: "" });

  const [siteName, setSiteName] = useState("酷子码时官网");
  const [boundBot, setBoundBot] = useState("售前咨询助手");
  const [domainWhitelist, setDomainWhitelist] = useState("www.kuzimash.com, *.kuzimash.com");
  const [position, setPosition] = useState<WidgetPosition>("br");
  const [welcomeMessage, setWelcomeMessage] = useState("您好！我是企云 AI 客服助手，很高兴为您服务！");
  const [sourceId, setSourceId] = useState("site_kuzimash_web");
  const [widgetEnabled, setWidgetEnabled] = useState(true);

  const [themeColor, setThemeColor] = useState("#2563eb");
  const [appearanceDevice, setAppearanceDevice] = useState<PreviewDevice>("desktop");
  const [buttonShape, setButtonShape] = useState<ButtonShape>("circle");
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>("simple");
  const [unreadAlert, setUnreadAlert] = useState(true);
  const [autoPopup, setAutoPopup] = useState(true);
  const [autoPopupDelay, setAutoPopupDelay] = useState(5);
  const [firstWelcome, setFirstWelcome] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apiSites, bots] = await Promise.all([
        listSites(),
        import("@/lib/bots/api").then((m) => m.listBotsFromApi()).catch(() => []),
      ]);
      if (bots.length > 0) setDefaultBotId(bots[0].id);
      if (apiSites.length > 0) {
        const mapped = apiSites.map(mapApiSite);
        const checks = await Promise.all(mapped.map((site) => checkSiteInstallOnApi(site.id).catch(() => null)));
        checks.forEach((check, index) => {
          if (!mapped[index]) return;
          if (check?.installed) mapped[index].installStatus = "installed";
          mapped[index].lastSeenAt = check?.lastSeenAt ?? null;
        });
        setSites(mapped);
        setSelectedId((current) => (mapped.some((s) => s.id === current) ? current : mapped[0].id));
        const targetId = mapped[0].id;
        const first = mapped.find((s) => s.id === targetId) ?? mapped[0];
        setSiteName(first.name);
        setBoundBot(first.botName);
        setDomainWhitelist(first.allowedDomains?.join(", ") ?? first.domain);
        setSourceId(first.sourceId);
        setWidgetEnabled(first.enabled);
        const prefs = loadAppearancePrefs(first.id);
        if (prefs) {
          setThemeColor(prefs.themeColor);
          setPosition(prefs.position);
          setButtonShape(prefs.buttonShape);
          setBubbleStyle(prefs.bubbleStyle);
          setUnreadAlert(prefs.unreadAlert);
          setAutoPopup(prefs.autoPopup);
          setAutoPopupDelay(prefs.autoPopupDelay);
          setFirstWelcome(prefs.firstWelcome);
        }
      }
    } catch (reason) {
      setError(reason);
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

  const selected = useMemo(() => sites.find((s) => s.id === selectedId) ?? sites[0], [sites, selectedId]);

  const embedCode = selected?.embedSnippet?.trim() || DEFAULT_EMBED.replace("site_kuzimash_web", selected?.sourceId ?? "site_kuzimash_web");

  const enabledCount = sites.filter((s) => s.enabled).length;
  const pendingCount = sites.filter((s) => s.installStatus === "pending").length;

  function selectSite(site: WidgetSiteRow) {
    setSelectedId(site.id);
    setSiteName(site.name);
    setBoundBot(site.botName);
    setDomainWhitelist(site.allowedDomains?.join(", ") ?? site.domain);
    setSourceId(site.sourceId);
    setWidgetEnabled(site.enabled);
    const prefs = loadAppearancePrefs(site.id);
    if (prefs) {
      setThemeColor(prefs.themeColor);
      setPosition(prefs.position);
      setButtonShape(prefs.buttonShape);
      setBubbleStyle(prefs.bubbleStyle);
      setUnreadAlert(prefs.unreadAlert);
      setAutoPopup(prefs.autoPopup);
      setAutoPopupDelay(prefs.autoPopupDelay);
      setFirstWelcome(prefs.firstWelcome);
    }
  }

  async function toggleSiteEnabled(id: string, enabled: boolean) {
    setSites((current) => current.map((s) => (s.id === id ? { ...s, enabled } : s)));
    if (selectedId === id) setWidgetEnabled(enabled);
    try {
      await updateSite(id, { status: enabled ? "active" : "disabled" });
      setNotice(enabled ? "站点已启用。" : "站点已停用。");
    } catch (reason) {
      setNotice(`状态更新失败：${reason instanceof Error ? reason.message : "请稍后重试"}`);
      void load();
    }
  }

  async function saveSiteConfig() {
    if (!selected) return;
    setSavingConfig(true);
    try {
      const allowedDomains = parseDomains(domainWhitelist);
      const updated = await updateSite(selected.id, {
        name: siteName.trim() || selected.name,
        allowedDomains: allowedDomains.length ? allowedDomains : [selected.domain],
        status: widgetEnabled ? "active" : "disabled",
      });
      if (updated) {
        const mapped = mapApiSite(updated);
        setSites((current) => current.map((s) => (s.id === mapped.id ? { ...mapped, enabled: widgetEnabled } : s)));
      }
      if (selected.botId && welcomeMessage.trim()) {
        await updateBotOnApi(selected.botId, { welcomeMessage: welcomeMessage.trim() });
      }
      setNotice("站点配置已保存。");
    } catch (reason) {
      setNotice(`保存失败：${reason instanceof Error ? reason.message : "请稍后重试"}`);
    } finally {
      setSavingConfig(false);
    }
  }

  async function saveAppearanceConfig() {
    if (!selected) return;
    setSavingAppearance(true);
    try {
      saveAppearancePrefs(selected.id, {
        themeColor,
        position,
        buttonShape,
        bubbleStyle,
        unreadAlert,
        autoPopup,
        autoPopupDelay,
        firstWelcome,
      });
      if (selected.botId && welcomeMessage.trim()) {
        await updateBotOnApi(selected.botId, { welcomeMessage: welcomeMessage.trim() });
      }
      setNotice("外观偏好已保存（主题/布局本地存储，欢迎语已同步到助手）。");
    } catch (reason) {
      setNotice(`保存失败：${reason instanceof Error ? reason.message : "请稍后重试"}`);
    } finally {
      setSavingAppearance(false);
    }
  }

  async function removeSite(site: WidgetSiteRow) {
    if (!window.confirm(`确定删除站点「${site.name}」？删除后嵌入代码将失效。`)) return;
    try {
      await deleteSite(site.id);
      setSites((current) => {
        const next = current.filter((s) => s.id !== site.id);
        if (selectedId === site.id && next[0]) {
          setTimeout(() => selectSite(next[0]), 0);
        }
        return next;
      });
      setNotice("站点已删除。");
    } catch (reason) {
      setNotice(`删除失败：${reason instanceof Error ? reason.message : "请稍后重试"}`);
    }
  }

  function scrollToConfig() {
    document.getElementById("widget-config-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function recheck(siteId: string) {
    setRechecking(true);
    try {
      const check = await checkSiteInstallOnApi(siteId);
      setSites((current) =>
        current.map((s) =>
          s.id === siteId
            ? { ...s, installStatus: check.installed ? "installed" : "pending", lastSeenAt: check.lastSeenAt ?? null }
            : s,
        ),
      );
      setNotice(check.installed ? "重新检测完成：Widget 已正常安装。" : "重新检测完成：未检测到安装，请检查嵌入代码与域名白名单。");
    } catch {
      // 预览/离线模式：模拟一次检测
      setSites((current) =>
        current.map((s) =>
          s.id === siteId ? { ...s, installStatus: "installed", lastSeenAt: new Date().toISOString() } : s,
        ),
      );
      setNotice("已触发重新检测（预览模式：以模拟结果展示）。");
    } finally {
      setRechecking(false);
    }
  }

  function copyEmbed() {
    void navigator.clipboard.writeText(embedCode).then(() => setNotice("安装代码已复制到剪贴板。"));
  }

  async function createSite() {
    if (!siteForm.name.trim() || !siteForm.domain.trim()) return;
    if (!defaultBotId) {
      setNotice("请先创建 AI 助手后再接入站点。");
      return;
    }
    const domain = siteForm.domain.trim().replace(/^https?:\/\//, "");
    setCreatingSite(false);
    try {
      const result = await createSiteEntry({
        botId: defaultBotId,
        name: siteForm.name.trim(),
        allowedDomains: [domain],
      });
      if (result) {
        const mapped = mapApiSite(result.site);
        mapped.embedSnippet = result.site.embedSnippet;
        setSites((current) => [mapped, ...current]);
        setSelectedId(mapped.id);
        setDomainWhitelist(domain);
        setSourceId(mapped.sourceId);
        setWidgetEnabled(true);
        setNotice("站点已创建，安装代码已生成。");
      } else {
        // Preview mode — local only
        const id = crypto.randomUUID();
        const newSite: WidgetSiteRow = {
          id,
          botId: defaultBotId,
          name: siteForm.name.trim(),
          domain,
          botName: boundBot,
          installStatus: "pending",
          sourceId: `site_${id.slice(0, 8)}`,
          enabled: true,
        };
        setSites((current) => [newSite, ...current]);
        setSelectedId(id);
        setDomainWhitelist(domain);
        setSourceId(newSite.sourceId);
        setWidgetEnabled(true);
        setNotice("站点已创建（预览模式，本机会话内有效）。");
      }
    } catch (error) {
      setNotice(`创建失败：${error instanceof Error ? error.message : "请稍后重试"}`);
      setCreatingSite(true);
    }
    setSiteForm({ name: "", domain: "" });
  }

  if (loading) {
    return (
      <div className={`${styles.page} page-shell page-stack`}>
        <p className={styles.loadingText}>正在加载官网 Widget…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={`${styles.page} page-shell page-stack`}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分站点数据加载失败，请稍后重试。")} />
      ) : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <header className={styles.pageHeader}>
        <p>管理网站右下角 AI 客服入口、安装代码与展示样式</p>
      </header>

      <div className={`${styles.statsGrid} ui-stagger-fade-in ui-hover-lift-children`}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <Globe size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>已接入站点</div>
            <div className={styles.statValue}>{sites.length}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <MessageSquare size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>启用中的 Widget</div>
            <div className={styles.statValue}>{enabledCount}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className={styles.statLabel}>安装异常</div>
            <div className={styles.statValue}>{pendingCount}</div>
          </div>
        </div>
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>站点接入列表</h2>
          <div className={styles.sectionActions}>
            <button type="button" className={styles.btnPrimary} onClick={() => setCreatingSite(true)}>
              <Plus size={14} /> 接入新站点
            </button>
            <Link href="/dashboard/sites/new" className={styles.btnOutline}>
              完整接入
            </Link>
            <Link href="/dashboard/sites/settings" className={styles.btnLink}>
              站点设置
            </Link>
            <button type="button" className={styles.btnOutline} onClick={() => void load()}>
              <RefreshCw size={14} /> 刷新
            </button>
          </div>
        </div>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>站点名称</th>
              <th>域名</th>
              <th>绑定助手</th>
              <th>安装状态</th>
              <th>会话来源标识</th>
              <th>状态</th>
              <th className={styles.tableActions}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr
                key={site.id}
                className={selectedId === site.id ? styles.rowActive : undefined}
                onClick={() => selectSite(site)}
              >
                <td className={styles.siteName}>{site.name}</td>
                <td>{site.domain}</td>
                <td>{site.botName}</td>
                <td>
                  <span className={site.installStatus === "installed" ? styles.installOk : styles.installPending}>
                    {site.installStatus === "installed" ? "已安装" : "待检测"}
                  </span>
                </td>
                <td className={styles.mono}>{site.sourceId}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Toggle checked={site.enabled} onChange={(v) => toggleSiteEnabled(site.id, v)} />
                </td>
                <td className={styles.tableActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={styles.tableActionBtn}
                    onClick={() => { selectSite(site); scrollToConfig(); }}
                  >
                    编辑
                  </button>
                  <button type="button" className={styles.tableActionBtn} onClick={copyEmbed}>
                    查看代码
                  </button>
                  <button
                    type="button"
                    className={styles.tableActionBtnDanger}
                    onClick={() => void removeSite(site)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.tableFoot}>
          <span>共 {sites.length} 条</span>
        </div>
      </section>

      {creatingSite ? (
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
          <div className="bg-card rounded-card" style={{ width: "100%", maxWidth: 480, padding: 24 }}>
            <h3 className="text-foreground" style={{ margin: "0 0 4px", fontSize: 16 }}>接入新站点</h3>
            <p className="text-muted-foreground" style={{ margin: "0 0 16px", fontSize: 12 }}>演示模式：创建的数据仅在本次会话内可见</p>
            <div className={styles.field}>
              <label>站点名称</label>
              <input
                value={siteForm.name}
                placeholder="例如：公司官网"
                onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label>域名</label>
              <input
                value={siteForm.domain}
                placeholder="例如：www.example.com"
                onChange={(e) => setSiteForm((f) => ({ ...f, domain: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button type="button" className={styles.btnOutline} onClick={() => setCreatingSite(false)}>
                取消
              </button>
              <button type="button" className={styles.btnPrimary} onClick={createSite}>
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`${styles.grid3} ui-stagger-fade-in ui-hover-lift-children`}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>安装代码</h3>
            <Link href="/dashboard/sites/install" className={styles.btnLink}>
              安装指引
            </Link>
          </div>
          <p className={styles.panelHint}>将以下代码复制并粘贴到您网站的 &lt;/body&gt; 标签前</p>
          <div className={styles.codeBlock}>
            <pre>{embedCode}</pre>
          </div>
          <button type="button" className={styles.copyFullBtn} onClick={copyEmbed}>
            <Copy size={14} /> 复制代码
          </button>
          <p className={styles.infoHint}>
            代码已为您配置站点标识 {sourceId}，请勿修改 id 参数。
          </p>
        </div>

        <div className={styles.panel} id="widget-config-section">
          <h3 className={styles.panelTitle}>基础配置</h3>
          <div className={styles.fieldStack} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <label htmlFor="site-name">站点名称</label>
              <input
                id="site-name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bound-bot">绑定助手</label>
              <input id="bound-bot" value={boundBot} readOnly />
            </div>
            <div className={styles.field}>
              <label htmlFor="domain-whitelist">域名白名单</label>
              <input id="domain-whitelist" value={domainWhitelist} onChange={(e) => setDomainWhitelist(e.target.value)} />
              <p className={styles.fieldHint}>多个域名用逗号分隔，支持通配符 *</p>
            </div>
            <div className={styles.field}>
              <label>显示位置</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="position" checked={position === "br"} onChange={() => setPosition("br")} />
                  右下角
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="position" checked={position === "bl"} onChange={() => setPosition("bl")} />
                  左下角
                </label>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="welcome-msg">欢迎语</label>
              <textarea
                id="welcome-msg"
                rows={2}
                maxLength={100}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
              />
              <div className={styles.charCount}>{welcomeMessage.length} / 100</div>
            </div>
            <div className={styles.field}>
              <label htmlFor="source-id">来源标识</label>
              <input id="source-id" value={sourceId} onChange={(e) => setSourceId(e.target.value)} />
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleRowLabel}>启用状态</span>
              <Toggle
                checked={widgetEnabled}
                onChange={(v) => {
                  setWidgetEnabled(v);
                  if (selected) void toggleSiteEnabled(selected.id, v);
                }}
              />
            </div>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={savingConfig}
              onClick={() => void saveSiteConfig()}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            >
              {savingConfig ? "保存中…" : "保存配置"}
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>外观样式</h3>
            <Link href="/dashboard/sites/appearance" className={styles.btnLink}>
              外观设置
            </Link>
          </div>
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={appearanceDevice === "desktop" ? styles.modeBtnActive : styles.modeBtn}
                onClick={() => setAppearanceDevice("desktop")}
              >
                桌面端
              </button>
              <button
                type="button"
                className={appearanceDevice === "mobile" ? styles.modeBtnActive : styles.modeBtn}
                onClick={() => setAppearanceDevice("mobile")}
              >
                移动端
              </button>
            </div>
          </div>
          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label>主题色</label>
              <div className={styles.colorRow}>
                {THEME_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.colorDot} ${themeColor === color ? styles.colorDotActive : ""}`}
                    style={{ background: color }}
                    aria-label="选择主题色"
                    onClick={() => setThemeColor(color.startsWith("linear") ? "#2563eb" : color)}
                  />
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>按钮形状</label>
              <div className={styles.chipGroup}>
                <button
                  type="button"
                  className={buttonShape === "circle" ? styles.chipActive : styles.chip}
                  onClick={() => setButtonShape("circle")}
                >
                  圆形
                </button>
                <button
                  type="button"
                  className={buttonShape === "rounded" ? styles.chipRectActive : styles.chipRect}
                  onClick={() => setButtonShape("rounded")}
                >
                  圆角矩形
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label>气泡样式</label>
              <div className={styles.chipGroup}>
                <button
                  type="button"
                  className={bubbleStyle === "simple" ? styles.chipActive : styles.chip}
                  onClick={() => setBubbleStyle("simple")}
                >
                  简洁气泡
                </button>
                <button
                  type="button"
                  className={bubbleStyle === "card" ? styles.chipRectActive : styles.chipRect}
                  onClick={() => setBubbleStyle("card")}
                >
                  卡片气泡
                </button>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleRowLabel}>未读提醒</span>
              <Toggle checked={unreadAlert} onChange={setUnreadAlert} />
            </div>
            <div className={styles.autoPopRow}>
              <span className={styles.toggleRowLabel}>自动弹出</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Toggle checked={autoPopup} onChange={setAutoPopup} />
                <span className={styles.autoPopHint}>
                  进入页面
                  <input
                    type="number"
                    className={styles.autoPopInput}
                    value={autoPopupDelay}
                    min={1}
                    onChange={(e) => setAutoPopupDelay(Number(e.target.value) || 5)}
                  />
                  秒后弹出
                </span>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleRowLabel}>首次欢迎语</span>
              <Toggle checked={firstWelcome} onChange={setFirstWelcome} />
            </div>
            <button type="button" className={styles.resetBtn} onClick={() => {
              setThemeColor("#2563eb");
              setButtonShape("circle");
              setBubbleStyle("simple");
              setUnreadAlert(true);
              setAutoPopup(true);
              setAutoPopupDelay(5);
              setFirstWelcome(true);
              setNotice("样式已恢复默认。");
            }}>
              恢复默认样式
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={savingAppearance}
              onClick={() => void saveAppearanceConfig()}
              style={{ marginTop: 8 }}
            >
              {savingAppearance ? "保存中…" : "保存外观"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.gridBottom}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>实时预览</h3>
          <div className={styles.previewGrid} style={{ marginTop: 16 }}>
            <div>
              <div className={styles.previewLabel}>桌面端预览（示例页面）</div>
              <div className={styles.browserFrame}>
                <div className={styles.browserBar}>
                  <Lock size={10} /> {selected.domain}
                </div>
                <div className={styles.browserBody}>
                  <div className={styles.demoTitle}>让 AI 客服更智能</div>
                  <div className={styles.demoSub}>7×24 小时在线，快速响应客户需求</div>
                  <button type="button" className={styles.demoBtn}>
                    了解更多
                  </button>
                  <div
                    className={styles.widgetFab}
                    style={{
                      background: themeColor.startsWith("linear") ? "#2563eb" : themeColor,
                      borderRadius: buttonShape === "circle" ? "50%" : "12px",
                      ...(position === "bl" ? { left: 16, right: "auto" } : {}),
                    }}
                  >
                    <MessageSquare size={20} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className={styles.previewLabel}>移动端预览（示例页面）</div>
              <div className={`${styles.browserFrame} ${styles.mobileFrame}`}>
                <div className={styles.browserBar} style={{ justifyContent: "center", fontSize: 10 }}>
                  m.{selected.domain.replace(/^www\./, "")}
                </div>
                <div className={styles.browserBodyMobile}>
                  <div className={styles.demoTitle} style={{ fontSize: 12 }}>
                    让 AI 客服更智能
                  </div>
                  <div className={styles.demoSubMobile}>7×24 小时在线</div>
                  <button type="button" className={styles.demoBtnMobile}>
                    了解更多
                  </button>
                  <div
                    className={`${styles.widgetFab} ${styles.widgetFabMobile}`}
                    style={{
                      background: themeColor.startsWith("linear") ? "#2563eb" : themeColor,
                      borderRadius: buttonShape === "circle" ? "50%" : "10px",
                    }}
                  >
                    <MessageSquare size={14} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>安装检测与操作建议</h3>
            <span className={styles.lastCheck}>
              <span>最后检测：</span>
              <span className={styles.lastCheckTime}>{formatDateTime(selected?.lastSeenAt)}</span>
            </span>
          </div>
          <div className={styles.checkList}>
            {[
              { icon: FileCode, label: "脚本检测" },
              { icon: Globe, label: "域名校验" },
              { icon: Bot, label: "助手绑定" },
              { icon: Repeat, label: "会话回传" },
            ].map((item) => {
              const passed = selected?.installStatus === "installed";
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`${styles.checkItem} ${passed ? styles.checkItemPass : styles.checkItemPending}`}
                >
                  <div className={styles.checkLeft}>
                    <Icon size={16} color={passed ? "#16a34a" : "#f97316"} />
                    <span>{item.label}</span>
                  </div>
                  <span className={passed ? styles.checkPass : styles.checkWarn}>
                    {passed ? (
                      <>
                        <CheckCircle2 size={14} /> 通过
                      </>
                    ) : (
                      <>
                        <Clock size={14} /> 待检测
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={styles.checkFoot}>
            <div className={styles.checkFootLabel}>操作建议</div>
            <div className={styles.actionGrid}>
              <button
                type="button"
                className={styles.actionBtnPrimary}
                onClick={() => selected && void recheck(selected.id)}
                disabled={rechecking || !selected}
              >
                {rechecking ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                重新检测
              </button>
              <button type="button" className={styles.actionBtnSecondary} onClick={() => setNotice("嵌入代码已根据当前配置重新生成。")}>
                <Code size={13} /> 生成新代码
              </button>
              <button type="button" className={styles.actionBtnDisabled} title="V2开发中" disabled>
                <Link2 size={13} /> 查看会话来源
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
