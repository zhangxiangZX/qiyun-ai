import type { RequestContext } from "../workspace";
import { SelectionPagesService } from "./selection-pages.service";
import type { SelectionPageConfig } from "./selection-pages.types";

export class SelectionPagesApi {
  constructor(private readonly service: SelectionPagesService) {}

  list(context: RequestContext) { return this.service.list(context.workspaceId); }
  getById(context: RequestContext, id: string) { return this.service.getById(context.workspaceId, id); }
  getBySlug(slug: string) { return this.service.getBySlug(slug); }
  create(context: RequestContext, body: { name: string; slug?: string; description?: string; config?: SelectionPageConfig }) {
    return this.service.create(context.workspaceId, body);
  }
  update(context: RequestContext, id: string, body: Parameters<SelectionPagesService["update"]>[2]) {
    return this.service.update(context.workspaceId, id, body);
  }
  delete(context: RequestContext, id: string) { return this.service.delete(context.workspaceId, id); }
  submit(slug: string, body: { answers: Record<string, string>; contactName?: string; contactPhone?: string; contactEmail?: string; attachmentIds?: string[] }) {
    return this.service.submit(slug, body);
  }
  listSubmissions(context: RequestContext, pageId: string) {
    return this.service.listSubmissions(context.workspaceId, pageId);
  }
}
