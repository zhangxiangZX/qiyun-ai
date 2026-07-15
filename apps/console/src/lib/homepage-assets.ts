/** 首页概览切图素材（public/homepage-assets） */
const base = "/homepage-assets";

export const homepageAssets = {
  shell: {
    help: `${base}/svg/04_top_help.svg`,
    notification: `${base}/svg/05_top_notification.svg`,
    enterpriseLogo: `${base}/svg/06_top_enterprise_logo.svg`,
    companyAvatar: `${base}/svg/03_top_company_avatar.svg`,
    collapse: `${base}/svg/14_nav_collapse.svg`,
  },
  nav: {
    workspace: `${base}/svg/07_nav_home.svg`,
    assistant: `${base}/svg/08_nav_ai_assistant.svg`,
    inquiryQuote: `${base}/svg/09_nav_inquiry_quote.svg`,
    customerOps: `${base}/svg/10_nav_customer_ops.svg`,
    channels: `${base}/svg/11_nav_channels_sites.svg`,
    dataCenter: `${base}/svg/12_nav_data_center.svg`,
    settings: `${base}/svg/13_nav_system_settings.svg`,
  },
  kpi: {
    validInquiry: `${base}/svg/15_kpi_valid_inquiry.svg`,
    highIntent: `${base}/svg/16_kpi_high_intent.svg`,
    pendingQuote: `${base}/svg/17_kpi_pending_quote.svg`,
    revenue: `${base}/svg/18_kpi_revenue.svg`,
    responseTime: `${base}/svg/19_kpi_response_time.svg`,
  },
  task: {
    followCustomer: `${base}/svg/20_task_follow_customer.svg`,
    pendingQuote: `${base}/svg/21_task_pending_quote.svg`,
    pendingMessage: `${base}/svg/22_task_pending_message.svg`,
    pendingReview: `${base}/svg/23_task_pending_review.svg`,
    callback: `${base}/svg/24_task_callback.svg`,
  },
  quick: {
    createAssistant: `${base}/svg/25_quick_create_assistant.svg`,
    uploadMaterial: `${base}/svg/26_quick_upload_material.svg`,
    createQuote: `${base}/svg/27_quick_create_quote.svg`,
    generateLink: `${base}/svg/28_quick_generate_link.svg`,
    inviteMember: `${base}/svg/29_quick_invite_member.svg`,
    viewReport: `${base}/svg/30_quick_view_report.svg`,
  },
  badge: {
    growth: `${base}/svg/43_growth_tag.svg`,
    decline: `${base}/svg/44_decline_tag.svg`,
    newInquiry: `${base}/svg/31_badge_new_inquiry.svg`,
    following: `${base}/svg/32_badge_following.svg`,
    followed: `${base}/svg/33_badge_followed.svg`,
    quoting: `${base}/svg/34_badge_quoting.svg`,
    starRating: `${base}/svg/42_star_rating.svg`,
  },
  pagination: {
    prev: `${base}/svg/35_pagination_prev.svg`,
    page2: `${base}/svg/37_pagination_2.svg`,
    page3: `${base}/svg/38_pagination_3.svg`,
    next: `${base}/svg/40_pagination_next.svg`,
  },
} as const;

const navIconByGroupId: Record<string, string> = {
  workspace: homepageAssets.nav.workspace,
  "inquiry-quote": homepageAssets.nav.inquiryQuote,
  assistant: homepageAssets.nav.assistant,
  "customer-ops": homepageAssets.nav.customerOps,
  channels: homepageAssets.nav.channels,
  "data-center": homepageAssets.nav.dataCenter,
  settings: homepageAssets.nav.settings,
  platform: homepageAssets.nav.settings,
  "platform-settings": homepageAssets.nav.settings,
};

export function getNavigationIconSrc(groupId: string): string | undefined {
  return navIconByGroupId[groupId];
}
