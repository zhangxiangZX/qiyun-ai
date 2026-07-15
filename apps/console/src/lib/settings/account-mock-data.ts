/* -------------------------------------------------------------------------- */
/*  Account Settings — Mock Data                                              */
/* -------------------------------------------------------------------------- */

export interface AccountSettings {
  id: string;
  nickname: string;
  phone: string;
  email: string;
  jobTitle: string;
  bio: string;
  department: string;
  role: string;
  lastLogin: string;
  loginIp: string;
  avatarUrl: string;
  notificationPrefs: NotificationPreferences;
  language: "zh" | "en";
}

export interface NotificationPreferences {
  system: boolean;
  leads: boolean;
  quoteStatus: boolean;
  marketing: boolean;
}

export interface PasswordChangePayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const LANGUAGE_OPTIONS: { value: "zh" | "en"; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

export const mockAccount: AccountSettings = {
  id: "user-001",
  nickname: "张伟",
  phone: "138****5678",
  email: "zhangwei@example.com",
  jobTitle: "销售总监",
  bio: "专注工业设备出海获客与销售转化。",
  department: "销售管理部",
  role: "超级管理员",
  lastLogin: "2024-06-30 10:31:21",
  loginIp: "120.198.23.45（浙江省杭州市）",
  avatarUrl: "https://placehold.co/200x200/2563eb/ffffff?text=张",
  notificationPrefs: {
    system: true,
    leads: true,
    quoteStatus: true,
    marketing: false,
  },
  language: "zh",
};
