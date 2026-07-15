"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Key,
  Lock,
  Mail,
  Monitor,
  Phone,
  Save,
  Shield,
  Smartphone,
  User,
  Users,
} from "lucide-react";
import {
  Alert,
  ConfirmDialog,
  Skeleton,
  SuccessDialogToast,
} from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { useApiResource, apiMutate, isPreviewModeError } from "@/lib/api/use-api-resource";
import {
  mockAccount,
  type AccountSettings,
  type NotificationPreferences,
} from "@/lib/settings/account-mock-data";
import styles from "@/styles/account-settings.module.css";

type TabKey = "profile" | "notifications" | "security";

const NOTIF_ITEMS: Array<{
  key: keyof NotificationPreferences;
  label: string;
  desc: string;
  iconClass: string;
  icon: React.ReactNode;
}> = [
  {
    key: "system",
    label: "系统消息",
    desc: "接收系统更新、维护公告与重要通知",
    iconClass: styles.notifIconBlue,
    icon: <Bell size={16} />,
  },
  {
    key: "leads",
    label: "新询盘提醒",
    desc: "有新询盘或高意向客户时即时通知",
    iconClass: styles.notifIconGreen,
    icon: <Users size={16} />,
  },
  {
    key: "quoteStatus",
    label: "报价状态提醒",
    desc: "报价单状态变更、客户确认时提醒",
    iconClass: styles.notifIconOrange,
    icon: <Clock size={16} />,
  },
  {
    key: "marketing",
    label: "成员邀请提醒",
    desc: "团队成员邀请、角色变更相关通知",
    iconClass: styles.notifIconPurple,
    icon: <Mail size={16} />,
  },
];

export function AccountSettingsWorkspace() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);

  const {
    data: account,
    loading,
    error,
    isPreview,
    refetch,
  } = useApiResource<AccountSettings>("/settings/account", mockAccount);

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [formReady, setFormReady] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    system: true,
    leads: true,
    quoteStatus: true,
    marketing: false,
  });

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  if (!formReady && !loading && account) {
    setNickname(account.nickname);
    setPhone(account.phone);
    setEmail(account.email ?? "");
    setJobTitle(account.jobTitle ?? "");
    setBio(account.bio ?? "");
    setNotifPrefs({
      system: account.notificationPrefs.system ?? true,
      leads: account.notificationPrefs.leads ?? true,
      quoteStatus: account.notificationPrefs.quoteStatus ?? true,
      marketing: account.notificationPrefs.marketing ?? false,
    });
    setAvatarUrl(account.avatarUrl);
    setFormReady(true);
  }

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);

  const handleAvatarFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const validateConfirmPassword = useCallback(
    (value: string) => {
      setConfirmPassword(value);
      setPasswordMismatch(newPassword !== "" && value !== "" && newPassword !== value);
    },
    [newPassword],
  );

  const handleSaveProfile = useCallback(async () => {
    setSavingProfile(true);
    setSaveError(null);
    try {
      await apiMutate("/settings/account", "PATCH", {
        nickname,
        phone,
        email,
        jobTitle,
        bio,
        notificationPrefs: notifPrefs,
      });
      setSuccessMessage("个人资料已成功更新。");
      setSuccessOpen(true);
      refetch();
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        setSuccessMessage("个人资料已成功更新。（预览模式）");
        setSuccessOpen(true);
      } else {
        setSaveError(err instanceof Error ? err.message : "保存失败，请稍后重试。");
      }
    } finally {
      setSavingProfile(false);
    }
  }, [nickname, phone, email, jobTitle, bio, notifPrefs, refetch]);

  const handleChangePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await apiMutate("/auth/change-password", "POST", { newPassword });
      setSuccessMessage("密码已成功修改。");
      setSuccessOpen(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordPanel(false);
    } catch (err: unknown) {
      if (isPreviewModeError(err)) {
        setSuccessMessage("密码已成功修改。（预览模式）");
        setSuccessOpen(true);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordPanel(false);
      } else {
        setPasswordError(err instanceof Error ? err.message : "密码修改失败，请稍后重试。");
      }
    } finally {
      setSavingPassword(false);
      setConfirmPasswordOpen(false);
    }
  }, [newPassword, confirmPassword]);

  const handleTriggerPasswordChange = useCallback(() => {
    if (newPassword !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    if (!oldPassword || !newPassword) {
      setPasswordError("请填写所有密码字段。");
      return;
    }
    setPasswordMismatch(false);
    setPasswordError(null);
    setConfirmPasswordOpen(true);
  }, [oldPassword, newPassword, confirmPassword]);

  const toggleNotification = useCallback((key: keyof NotificationPreferences) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const displayAvatar = avatarPreview || avatarUrl;
  const profile = account ?? mockAccount;

  const tabs: Array<{ id: TabKey; label: string }> = [
    { id: "profile", label: "个人资料" },
    { id: "notifications", label: "通知偏好" },
    { id: "security", label: "安全设置" },
  ];

  return (
    <ConsolePage>
      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="个人设置" />
        {error ? (
          <Alert variant="warning" title="数据加载异常">
            账户信息加载失败，当前显示本地缓存数据。{String(error)}
          </Alert>
        ) : null}
        {saveError ? (
          <Alert variant="warning" title="保存失败">
            {saveError}
          </Alert>
        ) : null}
        {passwordError ? (
          <Alert variant="warning" title="密码修改失败">
            {passwordError}
          </Alert>
        ) : null}
      </ConsolePageAlerts>

      <div className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/dashboard/settings" className={styles.breadcrumbLink}>
            账号中心
          </Link>
          <ChevronRight size={14} />
          <span>个人设置</span>
        </nav>

        <h1 className={styles.pageTitle}>个人设置</h1>

        <div className={styles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "security") setShowPasswordPanel(true);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <>
            <Skeleton className="mb-4 h-48 w-full rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </>
        ) : (
          <>
            {activeTab === "profile" ? (
              <section className={styles.profileCard}>
                <div className={styles.avatarCol}>
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="头像" className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>{profile.nickname.slice(0, 1)}</div>
                  )}
                  <label className={styles.avatarBtn}>
                    <Camera size={14} />
                    更换头像
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleAvatarFile}
                      className="hidden"
                      aria-label="上传头像"
                    />
                  </label>
                </div>

                <div className={styles.infoCol}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon}>
                      <User size={14} />
                    </span>
                    <div>
                      <div className={styles.infoLabel}>姓名</div>
                      <div className={styles.infoValue}>
                        {profile.nickname}
                        <span className={styles.roleBadge}>{profile.role}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon}>
                      <Phone size={14} />
                    </span>
                    <div>
                      <div className={styles.infoLabel}>手机号</div>
                      <div className={styles.infoValue}>{profile.phone}</div>
                    </div>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon}>
                      <Mail size={14} />
                    </span>
                    <div>
                      <div className={styles.infoLabel}>邮箱</div>
                      <div className={styles.infoValue}>{profile.email}</div>
                    </div>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon}>
                      <Users size={14} />
                    </span>
                    <div>
                      <div className={styles.infoLabel}>部门</div>
                      <div className={styles.infoValue}>{profile.department}</div>
                    </div>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon}>
                      <Clock size={14} />
                    </span>
                    <div>
                      <div className={styles.infoLabel}>最后登录</div>
                      <div className={styles.infoValue}>{profile.lastLogin}</div>
                    </div>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon}>
                      <Monitor size={14} />
                    </span>
                    <div>
                      <div className={styles.infoLabel}>登录 IP</div>
                      <div className={styles.infoValue}>{profile.loginIp}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.formCol}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="nickname">
                      姓名
                    </label>
                    <input
                      id="nickname"
                      className={styles.fieldInput}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="phone">
                      手机号
                    </label>
                    <input
                      id="phone"
                      className={styles.fieldInput}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="请输入手机号"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="email">
                      邮箱
                    </label>
                    <input
                      id="email"
                      type="email"
                      className={styles.fieldInput}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入邮箱"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="jobTitle">
                      职位
                    </label>
                    <input
                      id="jobTitle"
                      className={styles.fieldInput}
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="请输入职位"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="bio">
                      个性签名
                    </label>
                    <textarea
                      id="bio"
                      className={styles.fieldTextarea}
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 200))}
                      placeholder="一句话介绍自己"
                    />
                  </div>
                  <div className={styles.saveRow}>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      disabled={savingProfile}
                      onClick={() => void handleSaveProfile()}
                    >
                      <Save size={14} />
                      {savingProfile ? "保存中…" : "保存修改"}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <div className={activeTab === "profile" ? styles.bottomGrid : styles.bottomSingle}>
              {(activeTab === "profile" || activeTab === "notifications") && (
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>通知偏好</h2>
                  <p className={styles.cardSubtitle}>管理您希望接收的通知类型</p>
                  <div className={styles.notifList}>
                    {NOTIF_ITEMS.map((item) => (
                      <div key={item.key} className={styles.notifItem}>
                        <div className={styles.notifLeft}>
                          <span className={`${styles.notifIcon} ${item.iconClass}`}>{item.icon}</span>
                          <div>
                            <p className={styles.notifName}>{item.label}</p>
                            <p className={styles.notifDesc}>{item.desc}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={notifPrefs[item.key]}
                          onChange={() => toggleNotification(item.key)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className={styles.cardFooter}>
                    <span>部分通知可能通过邮件或站内信发送</span>
                    <button type="button" className={styles.linkBtn}>
                      通知规则说明
                    </button>
                  </div>
                  {activeTab === "notifications" ? (
                    <div className={styles.saveRow} style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        className={styles.saveBtn}
                        disabled={savingProfile}
                        onClick={() => void handleSaveProfile()}
                      >
                        <Save size={14} />
                        {savingProfile ? "保存中…" : "保存修改"}
                      </button>
                    </div>
                  ) : null}
                </section>
              )}

              {(activeTab === "profile" || activeTab === "security") && (
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>安全设置</h2>
                  <p className={styles.cardSubtitle}>保护您的账户安全</p>
                  <div className={styles.securityList}>
                    <div className={styles.securityItem}>
                      <div className={styles.securityLeft}>
                        <span className={`${styles.securityIcon} ${styles.notifIconBlue}`}>
                          <Lock size={16} />
                        </span>
                        <div>
                          <p className={styles.securityName}>登录密码</p>
                          <p className={styles.securityDesc}>定期更换密码可提升账户安全性</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.securityAction}
                        onClick={() => {
                          setActiveTab("security");
                          setShowPasswordPanel(true);
                        }}
                      >
                        修改密码 <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className={styles.securityItem}>
                      <div className={styles.securityLeft}>
                        <span className={`${styles.securityIcon} ${styles.notifIconGreen}`}>
                          <Shield size={16} />
                        </span>
                        <div>
                          <p className={styles.securityName}>二次验证</p>
                          <p className={styles.securityDesc}>未开启</p>
                        </div>
                      </div>
                      <button type="button" className={styles.securityAction}>
                        绑定手机 <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className={styles.securityItem}>
                      <div className={styles.securityLeft}>
                        <span className={`${styles.securityIcon} ${styles.notifIconOrange}`}>
                          <Smartphone size={16} />
                        </span>
                        <div>
                          <p className={styles.securityName}>登录设备</p>
                          <p className={styles.securityDesc}>3 台设备</p>
                        </div>
                      </div>
                      <button type="button" className={styles.securityAction}>
                        查看登录记录 <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className={styles.securityItem}>
                      <div className={styles.securityLeft}>
                        <span className={`${styles.securityIcon} ${styles.notifIconPurple}`}>
                          <Key size={16} />
                        </span>
                        <div>
                          <p className={styles.securityName}>账号安全设置</p>
                          <p className={styles.securityDesc}>查看安全评分与建议</p>
                        </div>
                      </div>
                      <button type="button" className={styles.securityAction}>
                        安全设置 <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.securityFooter}>
                    <span className={styles.securityGood}>
                      <CheckCircle2 size={14} />
                      您的账户安全状态良好，请继续保持
                    </span>
                    <button type="button" className={styles.linkBtn}>
                      安全中心
                    </button>
                  </div>
                </section>
              )}
            </div>

            {activeTab === "security" && showPasswordPanel ? (
              <section className={styles.passwordPanel}>
                <h3 className={styles.cardTitle}>修改密码</h3>
                <p className={styles.cardSubtitle}>为确保账户安全，请定期更换密码</p>
                <div className={styles.passwordGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="old-password">
                      旧密码
                    </label>
                    <input
                      id="old-password"
                      type="password"
                      className={styles.fieldInput}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="new-password">
                      新密码
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      className={styles.fieldInput}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordMismatch(confirmPassword !== "" && e.target.value !== confirmPassword);
                      }}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="confirm-password">
                      确认密码
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      className={styles.fieldInput}
                      value={confirmPassword}
                      onChange={(e) => validateConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    {passwordMismatch ? (
                      <span style={{ fontSize: 12, color: "#ef4444" }}>两次密码输入不一致</span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.saveRow}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    disabled={!oldPassword || !newPassword || !confirmPassword || passwordMismatch || savingPassword}
                    onClick={handleTriggerPasswordChange}
                  >
                    <Key size={14} />
                    {savingPassword ? "提交中…" : "修改密码"}
                  </button>
                </div>
              </section>
            ) : null}

            {isPreview ? (
              <p className="mt-4 text-xs text-amber-600">预览模式：保存操作将模拟成功，不会写入后端。</p>
            ) : null}
          </>
        )}
      </div>

      <SuccessDialogToast
        open={successOpen}
        title="操作成功"
        message={successMessage}
        confirmLabel="我知道了"
        onClose={() => setSuccessOpen(false)}
      />

      <ConfirmDialog
        open={confirmPasswordOpen}
        icon="warning"
        title="确认修改密码"
        description="修改密码后，您可能需要重新登录。确定要继续吗？"
        confirmLabel="确认修改"
        cancelLabel="取消"
        confirmLoading={savingPassword}
        onCancel={() => setConfirmPasswordOpen(false)}
        onConfirm={() => void handleChangePassword()}
      />
    </ConsolePage>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={checked ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}
