import { Inject, Injectable } from "@nestjs/common";

import type { ApiResult } from "../../http/api-result";
import { PlatformRouteService } from "../auth/platform-route.service";
import { AuthRouteService } from "../auth/auth-route.service";
import { WorkspaceRouteService } from "../auth/workspace-route.service";
import { AnalyticsRouteService } from "../analytics/analytics-route.service";
import { ChatRouteService } from "../chat/chat-route.service";
import { DocumentsRouteService } from "../documents/documents-route.service";
import { RagRouteService } from "../rag/rag-route.service";
import { SalesRouteService } from "../sales/sales-route.service";
import { CalendarRouteService } from "../calendar/calendar-route.service";
import { FileVaultRouteService } from "../file-vault/file-vault-route.service";
import { AuditRouteService } from "../audit/audit-route.service";
import { SalesLinksRouteService } from "../sales-links/sales-links-route.service";
import { SelectionPagesRouteService } from "../selection-pages/selection-pages-route.service";
import { ChannelsRouteService } from "../channels/channels-route.service";
import { QuickEntryRouteService } from "../quick-entry/quick-entry-route.service";
import { PublicRouteService } from "../public/public-route.service";
import { GeoRouteService } from "../geo/geo-route.service";

@Injectable()
export class NestRouteDispatcher {
  constructor(
    @Inject(PlatformRouteService) private readonly platform: PlatformRouteService,
    @Inject(AuthRouteService) private readonly auth: AuthRouteService,
    @Inject(WorkspaceRouteService) private readonly workspace: WorkspaceRouteService,
    @Inject(DocumentsRouteService) private readonly documents: DocumentsRouteService,
    @Inject(RagRouteService) private readonly rag: RagRouteService,
    @Inject(ChatRouteService) private readonly chat: ChatRouteService,
    @Inject(AnalyticsRouteService) private readonly analytics: AnalyticsRouteService,
    @Inject(SalesRouteService) private readonly sales: SalesRouteService,
    @Inject(CalendarRouteService) private readonly calendar: CalendarRouteService,
    @Inject(FileVaultRouteService) private readonly fileVault: FileVaultRouteService,
    @Inject(AuditRouteService) private readonly audit: AuditRouteService,
    @Inject(SalesLinksRouteService) private readonly salesLinks: SalesLinksRouteService,
    @Inject(SelectionPagesRouteService) private readonly selectionPages: SelectionPagesRouteService,
    @Inject(ChannelsRouteService) private readonly channels: ChannelsRouteService,
    @Inject(QuickEntryRouteService) private readonly quickEntry: QuickEntryRouteService,
    @Inject(PublicRouteService) private readonly publicRoutes: PublicRouteService,
    @Inject(GeoRouteService) private readonly geo: GeoRouteService,
  ) {}

  async dispatch(
    request: Request,
    pathname: string,
    requestId?: string,
  ): Promise<ApiResult | null> {
    return (
      (await this.platform.handle(request, pathname, requestId)) ??
      (await this.auth.handle(request, pathname, requestId)) ??
      (await this.workspace.handle(request, pathname)) ??
      (await this.documents.handle(request, pathname)) ??
      (await this.rag.handle(request, pathname)) ??
      (await this.chat.handle(request, pathname)) ??
      (await this.analytics.handle(request, pathname)) ??
      (await this.sales.handle(request, pathname)) ??
      (await this.calendar.handle(request, pathname)) ??
      (await this.fileVault.handle(request, pathname)) ??
      (await this.audit.handle(request, pathname)) ??
      (await this.salesLinks.handle(request, pathname)) ??
      (await this.selectionPages.handle(request, pathname)) ??
      (await this.channels.handle(request, pathname)) ??
      (await this.quickEntry.handle(request, pathname)) ??
      (await this.publicRoutes.handle(request, pathname)) ??
      (await this.geo.handle(request, pathname))
    );
  }
}
