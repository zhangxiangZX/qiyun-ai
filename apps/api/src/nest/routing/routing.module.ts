import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { ChatModule } from "../chat/chat.module";
import { DocumentsModule } from "../documents/documents.module";
import { RagModule } from "../rag/rag.module";
import { SalesModule } from "../sales/sales.module";
import { CalendarModule } from "../calendar/calendar.module";
import { FileVaultModule } from "../file-vault/file-vault.module";
import { AuditModule } from "../audit/audit.module";
import { SalesLinksModule } from "../sales-links/sales-links.module";
import { SelectionPagesModule } from "../selection-pages/selection-pages.module";
import { ChannelsModule } from "../channels/channels.module";
import { QuickEntryModule } from "../quick-entry/quick-entry.module";
import { PublicModule } from "../public/public.module";
import { GeoModule } from "../geo/geo.module";
import { NestRouteDispatcher } from "./nest-route.dispatcher";

@Module({
  imports: [
    AuthModule,
    DocumentsModule,
    RagModule,
    ChatModule,
    AnalyticsModule,
    SalesModule,
    CalendarModule,
    AuditModule,
    SalesLinksModule,
    SelectionPagesModule,
    ChannelsModule,
    QuickEntryModule,
    PublicModule,
    FileVaultModule,
    GeoModule,
  ],
  providers: [NestRouteDispatcher],
  exports: [NestRouteDispatcher],
})
export class RoutingModule {}
