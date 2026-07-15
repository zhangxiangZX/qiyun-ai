import type { RequestContext } from "../workspace";
import { SalesLinksService } from "./sales-links.service";
import type { SalesLinkChannel, SalesLinkStatus, ScanLogSource } from "./sales-links.types";

export class SalesLinksApi {
  constructor(private readonly service: SalesLinksService) {}

  list(context: RequestContext) {
    return this.service.list(context.workspaceId);
  }

  getById(context: RequestContext, id: string) {
    return this.service.getById(context.workspaceId, id);
  }

  getBySlug(slug: string) {
    return this.service.getBySlug(slug);
  }

  create(
    context: RequestContext,
    body: { name: string; channel?: SalesLinkChannel; targetUrl?: string; slug?: string },
  ) {
    return this.service.create(context.workspaceId, body);
  }

  update(
    context: RequestContext,
    id: string,
    body: {
      name?: string;
      channel?: SalesLinkChannel;
      targetUrl?: string | null;
      status?: SalesLinkStatus;
      slug?: string;
    },
  ) {
    return this.service.update(context.workspaceId, id, body);
  }

  delete(context: RequestContext, id: string) {
    return this.service.delete(context.workspaceId, id);
  }

  trackVisit(slug: string) {
    return this.service.trackVisit(slug);
  }

  recordScan(
    slug: string,
    meta: { source?: ScanLogSource; referer?: string | null; userAgent?: string | null },
  ) {
    return this.service.recordScan(slug, meta);
  }

  listScanLogs(context: RequestContext, id: string, limit = 100) {
    return this.service.listScanLogs(context.workspaceId, id, limit);
  }

  trackInquiry(slug: string) {
    return this.service.trackInquiry(slug);
  }
}
