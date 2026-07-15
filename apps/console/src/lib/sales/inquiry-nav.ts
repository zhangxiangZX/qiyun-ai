/** 询盘模块页内导航（询盘中心 / 询盘分配等） */

export const INQUIRY_MODULE_TABS = [
  { id: "center", label: "询盘中心", href: "/dashboard/inquiries" },
  { id: "assign", label: "询盘分配", href: "/dashboard/inquiries/assign" },
] as const;

export type InquiryModuleTabId = (typeof INQUIRY_MODULE_TABS)[number]["id"];

export const INQUIRY_CENTER_PATH = "/dashboard/inquiries";
export const INQUIRY_ASSIGN_PATH = "/dashboard/inquiries/assign";
export const INQUIRY_NEW_PATH = "/dashboard/inquiries/new";

export function inquiryDetailPath(id: string): string {
  return `/dashboard/inquiries/${id}`;
}

/** 是否属于询盘中心 Tab（列表、详情、新建等，不含分配页） */
export function isInquiryCenterTabActive(pathname: string): boolean {
  if (pathname === INQUIRY_CENTER_PATH) return true;
  if (!pathname.startsWith(`${INQUIRY_CENTER_PATH}/`)) return false;
  if (pathname === INQUIRY_ASSIGN_PATH || pathname.startsWith(`${INQUIRY_ASSIGN_PATH}/`)) {
    return false;
  }
  return true;
}

export function isInquiryAssignTabActive(pathname: string): boolean {
  return pathname === INQUIRY_ASSIGN_PATH || pathname.startsWith(`${INQUIRY_ASSIGN_PATH}/`);
}

export function isInquiryModulePath(pathname: string): boolean {
  return pathname === INQUIRY_CENTER_PATH || pathname.startsWith(`${INQUIRY_CENTER_PATH}/`);
}

export function getInquiryBreadcrumbLabel(pathname: string): string | null {
  if (pathname === INQUIRY_NEW_PATH) return "新建询盘";
  if (isInquiryAssignTabActive(pathname)) return "询盘分配";
  if (pathname === INQUIRY_CENTER_PATH) return null;
  if (pathname.startsWith(`${INQUIRY_CENTER_PATH}/`)) return "询盘详情";
  return null;
}
