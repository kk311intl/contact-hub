import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { createSession } from '../src/auth.js';
import { DEFAULT_CONFIG, normalizeConfig, validateConfig } from '../src/config.js';
import { uiFor } from '../src/i18n.js';

test('backup round-trip excludes credentials and statistics, and validation never writes', async () => {
  const original = { ...structuredClone(DEFAULT_CONFIG), ADMIN_PASSWORD: 'not-exported', statistics: { private: true } };
  const env = { SESSION_SECRET: 'local-test-only', PROFILE_KV: { async get(key) { return key === 'profile_config' ? original : null; }, async put() { assert.fail('Backup validation must not write'); } } };
  const headers = { Cookie: 'contact_admin=' + await createSession(env.SESSION_SECRET), Origin: 'https://example.com', 'Content-Type': 'application/json' };
  const exported = await worker.fetch(new Request('https://example.com/api/admin/backup', { headers }), env);
  const backup = await exported.json();
  assert.equal(backup.format, 'contact-hub');
  assert.equal(backup.version, 1);
  assert.equal(backup.config.ADMIN_PASSWORD, undefined);
  assert.equal(backup.config.statistics, undefined);
  backup.config.SESSION_SECRET = 'ignored-import-field';
  const imported = await worker.fetch(new Request('https://example.com/api/admin/backup', { method: 'POST', headers, body: JSON.stringify(backup) }), env);
  assert.equal(imported.status, 200);
  assert.deepEqual(await imported.json(), normalizeConfig(original));
});

test('invalid backups, cross-origin requests and oversized streams are rejected in three languages', async () => {
  for (const lang of ['zh-TW', 'en', 'ja']) {
    const env = { ADMIN_LANGUAGE: lang, SESSION_SECRET: 'local-test-only', PROFILE_KV: { async get() { return null; }, async put() { assert.fail('No writes'); } } };
    const headers = { Cookie: 'contact_admin=' + await createSession(env.SESSION_SECRET), Origin: 'https://example.com', 'Content-Type': 'application/json' };
    const post = (body, extra = {}) => worker.fetch(new Request('https://example.com/api/admin/backup', { method: 'POST', headers, body, ...extra }), env);
    for (const body of ['null', '{}', '{"format":"contact-hub","version":99}']) {
      const response = await post(body);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, uiFor(lang).api.invalidBackup);
    }
    assert.equal((await post('{')).status, 400);
    assert.equal((await post('{}', { headers: { ...headers, Origin: 'https://other.example' } })).status, 403);
    assert.equal((await post('{}', { headers: { ...headers, Cookie: '' } })).status, 401);
    const oversized = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(1024 * 1024 + 1)); controller.close(); } });
    assert.equal((await post(oversized, { duplex: 'half' })).status, 413);
    const config = normalizeConfig(DEFAULT_CONFIG);
    config.links[0].hidden = 'false';
    assert.equal((await post(JSON.stringify({ format: 'contact-hub', version: 1, config }))).status, 400);
  }
});

test('incomplete drafts can be recovered but cannot bypass save validation', async () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.name = '';
  config.links[0].url = 'https://';
  assert.ok(validateConfig(config).length);
  assert.deepEqual(validateConfig(config, 'en', true), []);
  const env = { SESSION_SECRET: 'local-test-only', PROFILE_KV: { async get() { return null; }, async put() { assert.fail('Invalid settings must not be saved'); } } };
  const headers = { Cookie: 'contact_admin=' + await createSession(env.SESSION_SECRET), Origin: 'https://example.com', 'Content-Type': 'application/json' };
  const recovery = await worker.fetch(new Request('https://example.com/api/admin/backup?draft=1', { method: 'POST', headers, body: JSON.stringify({ format: 'contact-hub', version: 1, config }) }), env);
  assert.equal(recovery.status, 200);
  assert.equal((await recovery.json()).links[0].url, 'https://');
  const save = await worker.fetch(new Request('https://example.com/api/admin/config?draft=1', { method: 'PUT', headers, body: JSON.stringify(config) }), env);
  assert.equal(save.status, 400);
});
