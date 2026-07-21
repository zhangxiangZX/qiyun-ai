import { NextResponse, type NextRequest } from "next/server";

import { resolveDashboardRedirect } from "@/server/auth-navigation";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // 预览模式（未配置上游 API）跳过鉴权，便于本地走查。
  if (!process.env.API_BASE_URL) {
    return NextResponse.next();
  }

  const user = parseAuthUserCookieValue(request.cookies.get(AUTH_USER_COOKIE)?.value);
  const target = resolveDashboardRedirect(Boolean(user), user?.platformRole ?? null, {
    pathname,
    activeWorkspaceId: user?.activeWorkspaceId ?? null,
  });

  if (target && target !== pathname) {
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
