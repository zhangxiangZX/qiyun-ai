/* -------------------------------------------------------------------------- */
/*  Enterprise Profile Edit — Mock Data                                       */
/*  供 useApiResource("/sites", mockProfile) 在 PREVIEW_MODE 时回退           */
/* -------------------------------------------------------------------------- */

export interface EnterpriseProfile {
  id: string;
  companyName: string;
  industry: string;
  scale: string;
  location: string;
  website: string;
  description: string;
  logoUrl: string;
}

export const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "mechanical", label: "机械制造" },
  { value: "auto_parts", label: "汽车零部件" },
  { value: "electronics", label: "电子电气" },
  { value: "chemical", label: "化工" },
  { value: "other", label: "其他" },
];

export const SCALE_OPTIONS: { value: string; label: string }[] = [
  { value: "lt50", label: "50人以下" },
  { value: "50-200", label: "50-200人" },
  { value: "200-500", label: "200-500人" },
  { value: "gt500", label: "500人以上" },
];

export const mockProfile: EnterpriseProfile = {
  id: "profile-001",
  companyName: "浙江企云科技有限公司",
  industry: "mechanical",
  scale: "50-200",
  location: "浙江杭州市滨江区长河街道江南大道1197号",
  website: "https://www.qiyun.com",
  description: "企云AI致力于为外贸企业提供全流程的智能营销与客户管理解决方案，助力企业数字化增长。",
  logoUrl: "https://placehold.co/200x200/2563eb/ffffff?text=Q",
};
