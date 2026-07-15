export interface EnterpriseProfileForm {
  companyName: string;
  shortName: string;
  industry: string;
  scale: string;
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
  salesContact: string;
  afterSalesContact: string;
  wechat: string;
  exhibitionAddress: string;
  businessDirection: string;
  publicIntro: string;
  coreAdvantages: string;
  mainProducts: string;
  serviceArea: string;
  defaultMessage: string;
  companyNature: string;
  foundedAt: string;
  registeredCapital: string;
  businessTerm: string;
  officeAddress: string;
  postalCode: string;
  subIndustry: string;
  mainBusiness: string;
  invoiceType: string;
  invoiceAddress: string;
  invoicePhone: string;
  branchName: string;
  branchCode: string;
}

export const DEFAULT_PROFILE: EnterpriseProfileForm = {
  companyName: "浙江企云科技有限公司",
  shortName: "企云科技",
  industry: "信息传输、软件和信息技术服务业",
  scale: "中型企业（51~200 人）",
  website: "https://www.qiyun.com",
  hotline: "0571-8685 9999",
  supportEmail: "zhangwei@qiyun.com",
  creditCode: "91330108MAJ2TJA29Q",
  contactName: "张伟",
  mobile: "138 5712 6888",
  city: "浙江省",
  district: "杭州市",
  subDistrict: "滨江区",
  address: "长河街道江南大道 1197 号 7 楼 703 室",
  intro:
    "企云AI致力于为外贸企业提供全流程的智能营销与客户管理解决方案，助力企业数字化增长。",
  slogan: "用 AI 赋能销售增长",
  siteTitle: "企云图 AI | AI 驱动的企业智能营销与销售平台",
  siteDescription:
    "企云图 AI 为工业企业提供智能获客、客户运营、销售转化与数据分析一体化解决方案。",
  invoiceTitle: "浙江企云科技有限公司",
  taxId: "91330108MAJ2TJA29Q",
  bankName: "招商银行杭州滨江支行",
  bankAccount: "5719 1234 5678 9012",
  salesContact: "李明",
  afterSalesContact: "王芳",
  wechat: "qiyun-sales",
  exhibitionAddress: "浙江杭州市滨江区国际博览中心 A 馆",
  businessDirection:
    "专注工业设备官网 AI 接待、产品问答、高意向留资与销售跟进一体化解决方案。",
  publicIntro:
    "企云AI致力于为外贸企业提供全流程的智能营销与客户管理解决方案，助力企业数字化增长。",
  coreAdvantages: "AI 接待 · 知识库问答 · 高意向识别 · 销售跟进闭环",
  mainProducts: "官网 Widget、询盘中心、知识库、销售助手",
  serviceArea: "全国及东南亚主要工业市场",
  defaultMessage: "您好，欢迎咨询我们的产品与解决方案，我将为您详细介绍。",
  companyNature: "有限责任公司（自然人投资或控股）",
  foundedAt: "2020-05-18",
  registeredCapital: "1000 万人民币",
  businessTerm: "2020-05-18 至 2050-05-17",
  officeAddress: "浙江杭州市滨江区长河街道滨盛路 1197 号 7 楼 703 室",
  postalCode: "310052",
  subIndustry: "数控机床和系统集成产业",
  mainBusiness: "AI SaaS 产品研发与运营、外贸数字化解决方案",
  invoiceType: "增值税专用发票",
  invoiceAddress: "浙江杭州市滨江区长河街道江南大道 1197 号 7 楼 703 室",
  invoicePhone: "0571-8685 9999",
  branchName: "浙江企云科技有限公司",
  branchCode: "308331012345",
};

export const INDUSTRY_OPTIONS = [
  "机械制造 / 电子电气",
  "信息传输、软件和信息技术服务业",
  "贸易 / 进出口",
  "化工",
  "其他",
];

export const SCALE_OPTIONS = ["50人以下", "50-200人", "200-500人", "500人以上"];

export const REGION_PROVINCES = ["浙江省", "江苏省", "上海市", "广东省"];
export const REGION_CITIES: Record<string, string[]> = {
  浙江省: ["杭州市", "宁波市", "温州市"],
  江苏省: ["苏州市", "南京市", "无锡市"],
  上海市: ["上海市"],
  广东省: ["深圳市", "广州市", "东莞市"],
};
export const REGION_DISTRICTS: Record<string, string[]> = {
  杭州市: ["滨江区", "西湖区", "余杭区"],
  苏州市: ["昆山市", "工业园区", "吴中区"],
  上海市: ["浦东新区", "黄浦区", "徐汇区"],
  深圳市: ["南山区", "福田区", "宝安区"],
};

export const INDUSTRY_TAGS = ["外贸", "SaaS", "AI", "智能制造", "数字化", "跨境电商"];

export const COMPLETENESS_CHECKS = [
  { label: "基本信息", done: true },
  { label: "联系方式", done: true },
  { label: "企业认证", done: true },
  { label: "发票信息", done: true },
  { label: "对公账户", done: true },
  { label: "品牌资料", done: false },
] as const;

export function mergeProfile(
  raw: Record<string, unknown> | null | undefined,
  fallbackName?: string,
): EnterpriseProfileForm {
  const base = { ...DEFAULT_PROFILE };
  if (!raw || typeof raw !== "object") {
    if (fallbackName) {
      base.companyName = fallbackName;
      base.shortName = fallbackName;
      base.invoiceTitle = fallbackName;
    }
    return base;
  }
  const merged = { ...base, ...(raw as Partial<EnterpriseProfileForm>) };
  if (fallbackName && !raw.companyName) {
    merged.companyName = fallbackName;
    merged.shortName = fallbackName;
    merged.invoiceTitle = fallbackName;
  }
  return merged;
}

export function profileFromWorkspace(
  workspace: { name?: string; companyProfile?: Record<string, unknown> | null },
): EnterpriseProfileForm {
  return mergeProfile(workspace.companyProfile, workspace.name);
}
