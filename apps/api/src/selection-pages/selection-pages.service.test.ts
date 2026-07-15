import { describe, it } from "node:test";
import assert from "node:assert";
import { InMemorySelectionPagesRepository } from "./selection-pages.repository";
import { SelectionPagesService } from "./selection-pages.service";

function buildService() {
  return new SelectionPagesService(new InMemorySelectionPagesRepository());
}

describe("SelectionPagesService", () => {
  it("creates a page with default draft status and auto-generated slug", async () => {
    const svc = buildService();
    const page = await svc.create("ws-1", { name: "Test Page" });
    assert.strictEqual(page.name, "Test Page");
    assert.strictEqual(page.status, "draft");
    assert.ok(page.slug.startsWith("sp-"));
    assert.strictEqual(page.workspaceId, "ws-1");
  });

  it("creates a page with explicit slug", async () => {
    const svc = buildService();
    const page = await svc.create("ws-1", { name: "Custom Slug", slug: "my-custom-slug" });
    assert.strictEqual(page.slug, "my-custom-slug");
  });

  it("rejects duplicate slug on create", async () => {
    const svc = buildService();
    await svc.create("ws-1", { name: "First", slug: "dup" });
    await assert.rejects(
      () => svc.create("ws-1", { name: "Second", slug: "dup" }),
      { name: "SelectionPagesAccessError" },
    );
  });

  it("rejects duplicate slug on update (different page)", async () => {
    const svc = buildService();
    await svc.create("ws-1", { name: "A", slug: "slug-a" });
    const b = await svc.create("ws-1", { name: "B", slug: "slug-b" });
    await assert.rejects(
      () => svc.update("ws-1", b.id, { slug: "slug-a" }),
      { name: "SelectionPagesAccessError" },
    );
  });

  it("allows same slug on update (same page, no-op)", async () => {
    const svc = buildService();
    const page = await svc.create("ws-1", { name: "X", slug: "slug-x" });
    const updated = await svc.update("ws-1", page.id, { slug: "slug-x", name: "X v2" });
    assert.strictEqual(updated.name, "X v2");
    assert.strictEqual(updated.slug, "slug-x");
  });

  it("getBySlug returns published page", async () => {
    const svc = buildService();
    const created = await svc.create("ws-1", { name: "Pub", slug: "pub-page" });
    await svc.update("ws-1", created.id, { status: "published" });
    const found = await svc.getBySlug("pub-page");
    assert.ok(found);
    assert.strictEqual(found!.status, "published");
  });

  it("getBySlug returns null for draft page", async () => {
    const svc = buildService();
    await svc.create("ws-1", { name: "Draft", slug: "draft-page" });
    const found = await svc.getBySlug("draft-page");
    assert.strictEqual(found, null);
  });

  it("getBySlug returns null for disabled page", async () => {
    const svc = buildService();
    const created = await svc.create("ws-1", { name: "Disabled", slug: "disabled-page" });
    await svc.update("ws-1", created.id, { status: "published" });
    await svc.update("ws-1", created.id, { status: "disabled" });
    const found = await svc.getBySlug("disabled-page");
    assert.strictEqual(found, null);
  });

  it("getBySlug returns null for non-existent slug", async () => {
    const svc = buildService();
    const found = await svc.getBySlug("nope");
    assert.strictEqual(found, null);
  });

  it("submit creates submission for published page", async () => {
    const svc = buildService();
    const created = await svc.create("ws-1", { name: "Sub", slug: "sub-page" });
    await svc.update("ws-1", created.id, { status: "published" });
    const sub = await svc.submit("sub-page", { answers: { q1: "a1" }, contactName: "Alice" });
    assert.ok(sub.id.startsWith("ss_"));
    assert.strictEqual(sub.selectionPageId, created.id);
    assert.deepStrictEqual(sub.answers, { q1: "a1" });
    assert.strictEqual(sub.contactName, "Alice");
  });

  it("submit rejects for draft page", async () => {
    const svc = buildService();
    await svc.create("ws-1", { name: "DraftSub", slug: "draft-sub" });
    await assert.rejects(
      () => svc.submit("draft-sub", { answers: {} }),
      { name: "SelectionPagesAccessError" },
    );
  });

  it("submit rejects for disabled page", async () => {
    const svc = buildService();
    const created = await svc.create("ws-1", { name: "DisSub", slug: "dis-sub" });
    await svc.update("ws-1", created.id, { status: "published" });
    await svc.update("ws-1", created.id, { status: "disabled" });
    await assert.rejects(
      () => svc.submit("dis-sub", { answers: {} }),
      { name: "SelectionPagesAccessError" },
    );
  });

  it("listSubmissions returns only submissions for the given page", async () => {
    const svc = buildService();
    const p1 = await svc.create("ws-1", { name: "P1", slug: "p1" });
    const p2 = await svc.create("ws-1", { name: "P2", slug: "p2" });
    await svc.update("ws-1", p1.id, { status: "published" });
    await svc.update("ws-1", p2.id, { status: "published" });
    await svc.submit("p1", { answers: { a: "1" } });
    await svc.submit("p1", { answers: { b: "2" } });
    await svc.submit("p2", { answers: { c: "3" } });

    const subs1 = await svc.listSubmissions("ws-1", p1.id);
    assert.strictEqual(subs1.length, 2);
    assert.ok(subs1.every((s) => s.selectionPageId === p1.id));

    const subs2 = await svc.listSubmissions("ws-1", p2.id);
    assert.strictEqual(subs2.length, 1);
    assert.strictEqual(subs2[0].selectionPageId, p2.id);
  });

  it("list cross-workspace returns only own pages", async () => {
    const svc = buildService();
    await svc.create("ws-a", { name: "A Page", slug: "a-page" });
    await svc.create("ws-b", { name: "B Page", slug: "b-page" });
    const pagesA = await svc.list("ws-a");
    const pagesB = await svc.list("ws-b");
    assert.strictEqual(pagesA.length, 1);
    assert.strictEqual(pagesA[0].workspaceId, "ws-a");
    assert.strictEqual(pagesB.length, 1);
    assert.strictEqual(pagesB[0].workspaceId, "ws-b");
  });
});
