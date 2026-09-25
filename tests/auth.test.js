import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordRecord, createSession, credentialsValid, sessionCookie, sessionValid } from "../src/auth.js";

const env = { ADMIN_PASSWORD: "correct horse", SESSION_SECRET: "a-long-test-session-secret" };

test("accepts only the configured password", async () => {
  assert.equal(await credentialsValid("correct horse", env), true);
  assert.equal(await credentialsValid("wrong", env), false);
  assert.equal(await credentialsValid("", env), false);
});

test("creates a signed session that expires", async () => {
  const now = Date.UTC(2026, 8, 23);
  const token = await createSession(env.SESSION_SECRET, now);
  const request = new Request("https://example.com/admin", { headers: { Cookie: sessionCookie(token) } });
  assert.equal(await sessionValid(request, env.SESSION_SECRET, 0, now + 1000), true);
  assert.equal(await sessionValid(request, env.SESSION_SECRET, 0, now + 13 * 60 * 60 * 1000), false);
  assert.equal(await sessionValid(request, "wrong-secret", 0, now + 1000), false);
  assert.equal(await sessionValid(request, env.SESSION_SECRET, Math.floor(now / 1000) + 1, now + 1000), false);
});

test("accepts a changed password record instead of the initial password", async () => {
  const record = await createPasswordRecord("a new and secure password");
  assert.equal(await credentialsValid("a new and secure password", env, record), true);
  assert.equal(await credentialsValid("correct horse", env, record), false);
});

test("password revisions revoke sessions even within the same clock tick", async () => {
  const now = Date.UTC(2026, 8, 26) + 100;
  const old = new Request('https://example.com/admin', { headers: { Cookie: sessionCookie(await createSession(env.SESSION_SECRET, now)) } });
  const record = await createPasswordRecord('new password', now);
  assert.equal(await sessionValid(old, env.SESSION_SECRET, record.changedAt, now, record.sessionRevision), false);
  const current = new Request(old.url, { headers: { Cookie: sessionCookie(await createSession(env.SESSION_SECRET, now, record.sessionRevision)) } });
  assert.equal(await sessionValid(current, env.SESSION_SECRET, record.changedAt, now, record.sessionRevision), true);
  const next = await createPasswordRecord('another password', now);
  assert.equal(await sessionValid(current, env.SESSION_SECRET, next.changedAt, now, next.sessionRevision), false);
});
