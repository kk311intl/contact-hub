import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { DEFAULT_CONFIG } from "../src/config.js";

test("public page counts a browser once", async () => {
  let count = 0;
  const env = {
    SESSION_SECRET: "test-secret",
    VISITOR_COUNTER: {
      idFromName(name) { return name; },
      get() { return { async fetch(_url, options) { const { existing } = JSON.parse(options.body); if (!existing) count += 1; return Response.json({ count, counted: true }); } }; }
    },
    PROFILE_KV: { async get() { return DEFAULT_CONFIG; } }
  };
  const url = "https://example.com/";
  const headers = { "CF-Connecting-IP": "192.0.2.1", "Accept-Language": "zh-TW" };
  const first = await worker.fetch(new Request(url, { headers }), env);
  assert.equal(first.status, 200);
  assert.match(await first.text(), /第 1 位來訪者/);
  const cookie = first.headers.get("Set-Cookie")?.split(";")[0];
  assert.match(cookie, /^contact_visitor=/);
  const second = await worker.fetch(new Request(url, { headers: { ...headers, Cookie: cookie } }), env);
  assert.match(await second.text(), /第 1 位來訪者/);
  assert.equal(second.headers.get("Set-Cookie"), null);
  const english = await worker.fetch(new Request(url, { headers: { ...headers, Cookie: cookie, "Accept-Language": "en" } }), env);
  assert.match(await english.text(), /Visitor #1/);
  const japanese = await worker.fetch(new Request(url, { headers: { ...headers, Cookie: cookie, "Accept-Language": "ja" } }), env);
  assert.match(await japanese.text(), /1人目の訪問者/);
});

test("public footer reserves a collapsed visitor statistics control", async () => {
  const page = await worker.fetch(new Request("https://example.com/"), { PROFILE_KV: { async get() { return DEFAULT_CONFIG; } } });
  const html = await page.text();
  assert.match(html, /<details class="footer-visitors" data-visitors hidden>/);
  assert.match(html, /<summary aria-label=""/);
  assert.match(html, /href="\/styles-v6\.css"/);
});
