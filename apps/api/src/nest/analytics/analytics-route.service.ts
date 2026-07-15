import { Inject, Injectable } from "@nestjs/common";

import { parseAnalyticsQuery } from "../../analytics/analytics-query";
import type { ApiRuntime } from "../../runtime";
import { type ApiResult } from "../../http/api-result";
import { ok } from "../../http/api-envelope";
import { readJsonBody } from "../../http/request-body";
import { matchPath } from "../../http/api-result";
import { query as pgQuery } from "../../db/pg";
import { randomUUID } from "node:crypto";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

@Injectable()
export class AnalyticsRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/dashboard" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const query = parseAnalyticsQuery(new URL(request.url).searchParams);
      return ok(await this.runtime.publicChatApi.getDashboardSnapshot(context, query));
    }

    if (pathname === "/reports" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const query = parseAnalyticsQuery(new URL(request.url).searchParams);
      return ok(await this.runtime.publicChatApi.getReportSnapshot(context, query));
    }

    if (pathname === "/reports/export" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ type?: "inquiries" | "channels" | "sales" }>(request);
      const type = body.type ?? "inquiries";
      let rows: Array<Array<string | number | null>>;
      if (type === "channels") {
        const items = await this.runtime.salesApi.getSourceAnalytics(context, {});
        rows = [["渠道", "询盘数", "报价数", "成交数", "成交金额"], ...items.map((item) => [item.sourceLabel, item.inquiryCount, item.quoteCount, item.wonCount, item.wonAmountTotal])];
      } else if (type === "sales") {
        const item = await this.runtime.salesApi.getSalesOverview(context, {});
        rows = [["有效询盘", "高意向", "待报价", "已报价", "成交数", "成交金额"], [item.effectiveInquiries, item.highIntentCount, item.pendingQuoteCount, item.quotedCount, item.wonCount, item.wonAmountTotal]];
      } else {
        const items = await this.runtime.salesApi.listInquiries(context, { status: "all" });
        rows = [["询盘ID", "客户", "来源", "意向", "状态", "负责人", "创建时间"], ...items.map((item) => [item.id, item.customerName, item.sourceType, item.intentLevel, item.status, item.ownerId, item.createdAt])];
      }
      const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const bytes = new TextEncoder().encode(`\uFEFF${csv}`);
      return { status: 200, headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="qiyun-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "content-length": String(bytes.byteLength),
      }, bytes };
    }

    if (pathname === "/analytics/lost-reasons" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      const quotes = await this.runtime.salesApi.listQuoteOpportunities(context, {});
      const counts = new Map<string, number>();
      quotes.filter((item) => item.stage === "lost").forEach((item) => counts.set(item.lostReason ?? "other", (counts.get(item.lostReason ?? "other") ?? 0) + 1));
      return ok([...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count));
    }

    if (pathname === "/reports/exports" && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      if (this.runtime.driver !== "postgres") return ok([]);
      return ok(await pgQuery(`select * from report_exports where workspace_id = $1 order by created_at desc limit 100`, [context.workspaceId]));
    }
    if (pathname === "/reports/exports" && method === "POST") {
      const context = await this.authContext.resolve(request.headers);
      const body = await readJsonBody<{ type?: "inquiries" | "channels" | "sales" }>(request);
      const type = body.type ?? "inquiries";
      const id = `re_${randomUUID()}`;
      let exportRows: Array<Array<string | number | null>>;
      if (type === "channels") {
        const items = await this.runtime.salesApi.getSourceAnalytics(context, {});
        exportRows = [["渠道", "询盘数", "报价数", "成交数", "成交金额"], ...items.map((item) => [item.sourceLabel, item.inquiryCount, item.quoteCount, item.wonCount, item.wonAmountTotal])];
      } else if (type === "sales") {
        const item = await this.runtime.salesApi.getSalesOverview(context, {});
        exportRows = [["有效询盘", "高意向", "待报价", "已报价", "成交数", "成交金额"], [item.effectiveInquiries, item.highIntentCount, item.pendingQuoteCount, item.quotedCount, item.wonCount, item.wonAmountTotal]];
      } else {
        const items = await this.runtime.salesApi.listInquiries(context, { status: "all" });
        exportRows = [["询盘ID", "客户", "来源", "意向", "状态"], ...items.map((item) => [item.id, item.customerName, item.sourceType, item.intentLevel, item.status])];
      }
      const csv = `\uFEFF${exportRows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
      const bytes = new TextEncoder().encode(csv);
      const stored = await this.runtime.documentStorage.save({ workspaceId: context.workspaceId, knowledgeBaseId: "report-exports", fileName: `${id}.csv`, contentBytes: bytes });
      const fileName = `qiyun-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      if (this.runtime.driver === "postgres") await pgQuery(`insert into report_exports (id, workspace_id, report_type, status, storage_key, file_name, size_bytes, created_by, completed_at, expires_at)
        values ($1,$2,$3,'completed',$4,$5,$6,$7,now(),now() + interval '7 days')`, [id, context.workspaceId, type, stored.storageKey, fileName, bytes.byteLength, context.userId]);
      return ok({ id, type, status: "completed", fileName, sizeBytes: bytes.byteLength });
    }
    const exportDownloadMatch = matchPath("/reports/exports/:id/download", pathname);
    if (exportDownloadMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      if (this.runtime.driver !== "postgres") return { status: 404, body: { code: "NOT_FOUND" } };
      const rows = await pgQuery(`select * from report_exports where id = $1 and workspace_id = $2 and status = 'completed' and expires_at > now()`, [exportDownloadMatch.params.id, context.workspaceId]);
      if (!rows[0]) return { status: 404, body: { code: "NOT_FOUND", message: "Export not found or expired." } };
      const bytes = await this.runtime.documentStorage.read(String(rows[0].storage_key), context.workspaceId);
      return { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${String(rows[0].file_name)}"` }, bytes };
    }
    const exportDetailMatch = matchPath("/reports/exports/:id", pathname);
    if (exportDetailMatch && method === "GET") {
      const context = await this.authContext.resolve(request.headers);
      if (this.runtime.driver !== "postgres") return { status: 404, body: { code: "NOT_FOUND" } };
      const rows = await pgQuery(`select id, report_type, format, filters, status, file_name, size_bytes, error_message, created_by, created_at, completed_at, expires_at
        from report_exports where id = $1 and workspace_id = $2`, [exportDetailMatch.params.id, context.workspaceId]);
      return rows[0] ? ok(rows[0]) : { status: 404, body: { code: "NOT_FOUND", message: "Export not found." } };
    }

    return null;
  }
}
