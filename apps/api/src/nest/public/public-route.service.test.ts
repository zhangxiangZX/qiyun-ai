import assert from "node:assert/strict";
import test from "node:test";

import { InMemorySalesLinksRepository } from "../../sales-links/sales-links.repository";
import { SalesLinksService } from "../../sales-links/sales-links.service";
import { SalesLinksApi } from "../../sales-links/sales-links.api";
import type { SalesLinkRecord } from "../../sales-links/sales-links.types";
import { PublicRouteService } from "./public-route.service";
import type { ApiRuntime } from "../../runtime";

function makeRecord(overrides: Partial<SalesLinkRecord>): SalesLinkRecord {
  return {
    id: `sl_${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: "ws_1",
    name: "Link",
    slug: "active-link",
    channel: "other",
    targetUrl: "https://example.com/land",
    shortUrl: null,
    status: "active",
    visits: 0,
    inquiries: 0,
    conversions: 0,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function buildService() {
  const repo = new InMemorySalesLinksRepository();
  const service = new SalesLinksService(repo);
  const api = new SalesLinksApi(service);
  const runtime = { salesLinksApi: api } as unknown as ApiRuntime;
  const route = new PublicRouteService(runtime);
  return { repo, service, api, route };
}

function getRequest(slug: string) {
  return new Request(`http://localhost/public/sales-links/${slug}`, { method: "GET" });
}

test("active link redirects (302) and counts a visit", async () => {
  const { repo, route } = buildService();
  await repo.create(makeRecord({ slug: "active-link", targetUrl: "https://example.com/land" }));

  const result = await route.handle(getRequest("active-link"), "/public/sales-links/active-link");

  assert.ok(result);
  assert.equal(result.status, 302);
  assert.equal(result.headers?.location, "https://example.com/land?source=sales_link%3Aactive-link");

  const stored = await repo.findBySlug("active-link");
  assert.equal(stored?.visits, 1);
});

test("unknown slug returns 404 and is not counted", async () => {
  const { repo, route } = buildService();
  await repo.create(makeRecord({ slug: "active-link", visits: 3 }));

  const result = await route.handle(getRequest("ghost"), "/public/sales-links/ghost");

  assert.ok(result);
  assert.equal(result.status, 404);

  const stored = await repo.findBySlug("active-link");
  assert.equal(stored?.visits, 3); // unchanged
});

test("inactive link returns 404 and is not counted", async () => {
  const { repo, route } = buildService();
  await repo.create(makeRecord({ slug: "inactive-link", status: "inactive", visits: 2 }));

  const result = await route.handle(getRequest("inactive-link"), "/public/sales-links/inactive-link");

  assert.ok(result);
  assert.equal(result.status, 404);

  const stored = await repo.findBySlug("inactive-link");
  assert.equal(stored?.visits, 2); // unchanged
});

test("missing target url returns 400 and is not counted", async () => {
  const { repo, route } = buildService();
  await repo.create(makeRecord({ slug: "no-target", targetUrl: null }));

  const result = await route.handle(getRequest("no-target"), "/public/sales-links/no-target");

  assert.ok(result);
  assert.equal(result.status, 400);

  const stored = await repo.findBySlug("no-target");
  assert.equal(stored?.visits, 0);
});

test("javascript: target is rejected (open redirect guard) and not counted", async () => {
  const { repo, route } = buildService();
  await repo.create(makeRecord({ slug: "evil-link", targetUrl: "javascript:alert(1)" }));

  const result = await route.handle(getRequest("evil-link"), "/public/sales-links/evil-link");

  assert.ok(result);
  assert.equal(result.status, 400);

  const stored = await repo.findBySlug("evil-link");
  assert.equal(stored?.visits, 0);
});

test("protocol-relative target is rejected (open redirect guard)", async () => {
  const { repo, route } = buildService();
  await repo.create(makeRecord({ slug: "rel-link", targetUrl: "//evil.example.com/phish" }));

  const result = await route.handle(getRequest("rel-link"), "/public/sales-links/rel-link");

  assert.ok(result);
  assert.equal(result.status, 400);
});
