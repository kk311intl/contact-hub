import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { createSession, sessionCookie } from "../src/auth.js";
import { DEFAULT_CONFIG } from "../src/config.js";

test("saving the page title updates the next public page load", async () => {
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
  const cookie = sessionCookie(await createSession(env.SESSION_SECRET));
  const save = await worker.fetch(new Request("https://example.com/api/admin/config", {
    method: "PUT",
    headers: { Cookie: cookie, Origin: "https://example.com", "Content-Type": "application/json" },
    body: JSON.stringify(config)
  }), env);
  assert.equal(save.status, 200);
  assert.equal((await save.json()).settings.siteTitle, "New page title");

  const page = await worker.fetch(new Request("https://example.com/"), env);
  assert.match(await page.text(), /<title>New page title<\/title>/);
});
