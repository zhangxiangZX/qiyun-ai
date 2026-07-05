import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/dashboard/route";
import { dashboardWithBots } from "@/lib/dashboard/mock-data";

test("dashboard BFF returns preview snapshot when upstream is not configured", async () => {
  const original = process.env.API_BASE_URL;
  const originalPublic = process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.API_BASE_URL;
  delete process.env.NEXT_PUBLIC_API_BASE_URL;

  try {
    const response = await GET(new NextRequest("http://localhost:3000/api/dashboard"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.hasBots, dashboardWithBots.hasBots);
    assert.equal(body.kpis.length, dashboardWithBots.kpis.length);
  } finally {
    if (original === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = original;
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = originalPublic;
  }
});

test("dashboard BFF forwards upstream error responses", async () => {
  const original = process.env.API_BASE_URL;
  const originalFetch = global.fetch;
  process.env.API_BASE_URL = "http://localhost:3001";

  global.fetch = (async () =>
    new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "No active session." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  try {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/dashboard", {
        headers: { cookie: "qiyun_access_token=demo" },
      }),
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      code: "UNAUTHORIZED",
      message: "No active session.",
    });
  } finally {
    global.fetch = originalFetch;
    if (original === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = original;
  }
});

test("dashboard BFF returns 502 when upstream fetch throws", async () => {
  const original = process.env.API_BASE_URL;
  const originalFetch = global.fetch;
  process.env.API_BASE_URL = "http://localhost:3001";

  global.fetch = (async () => {
    throw new Error("connection refused");
  }) as typeof fetch;

  try {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/dashboard", {
        headers: { cookie: "qiyun_access_token=demo" },
      }),
    );
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      code: "INTERNAL_ERROR",
      message: "Dashboard upstream unreachable.",
    });
  } finally {
    global.fetch = originalFetch;
    if (original === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = original;
  }
});
