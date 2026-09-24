import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { createSession, sessionCookie } from "../src/auth.js";
import { DEFAULT_CONFIG } from "../src/config.js";

test("saving the page title and redirect settings updates the next public page load", async () => {
  const values = new Map();
  const env = {
    SESSION_SECRET: "test-session-secret",
    PROFILE_KV: {
      async get(key) { return values.has(key) ? JSON.parse(values.get(key)) : null; },
      async put(key, value) { values.set(key, value); }
    }
  };
  const config = structuredClone(DEFAULT_CONFIG);
  config.settings.siteTitle = "New page title";
  config.settings.autoRedirectEnabled = true;
  config.settings.autoRedirectSeconds = 8;
  const cookie = sessionCookie(await createSession(env.SESSION_SECRET));
  const save = await worker.fetch(new Request("https://example.com/api/admin/config", {
    method: "PUT",
    headers: { Cookie: cookie, Origin: "https://example.com", "Content-Type": "application/json" },
    body: JSON.stringify(config)
  }), env);
  assert.equal(save.status, 200);
  const saved = await save.json();
  assert.equal(saved.settings.siteTitle, "New page title");
  assert.equal(saved.settings.autoRedirectEnabled, true);
  assert.equal(saved.settings.autoRedirectSeconds, 8);

  const page = await worker.fetch(new Request("https://example.com/"), env);
  const html = await page.text();
  assert.match(html, /<title>New page title<\/title>/);
  assert.match(html, /"autoRedirectEnabled":true,"autoRedirectSeconds":8/);
});
