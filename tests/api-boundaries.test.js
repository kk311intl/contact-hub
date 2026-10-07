import test from 'node:test';
import assert from 'node:assert/strict';
import site, { readBody } from '../src/site.js';
import worker from '../src/index.js';
import { createSession } from '../src/auth.js';
import { DEFAULT_CONFIG, normalizeConfig, MAX_BODY_BYTES } from '../src/config.js';
import { uiFor } from '../src/i18n.js';

test('invalid settings never drop existing links or silently change types', async () => {
  for (const language of ['zh-TW', 'en', 'ja']) {
    const original = normalizeConfig(DEFAULT_CONFIG);
    const env = { ADMIN_LANGUAGE: language, SESSION_SECRET: 'local-test-only', PROFILE_KV: { async get(key) { return key === 'profile_config' ? original : null; }, async put() { assert.fail('Invalid settings must not write'); } } };
    const headers = { Cookie: 'contact_admin=' + await createSession(env.SESSION_SECRET), Origin: 'https://example.com', 'Content-Type': 'application/json' };
    for (const candidate of [null, [], {}, { ...original, links: [null] }, { ...original, links: [{ ...original.links[0], enabled: 'false' }] }, { ...original, settings: { ...original.settings, footerLinks: [original.settings.footerLinks[0], { id: 'extra', label: '', url: '', order: 2 }] } }]) {
      const response = await site.fetch(new Request('https://example.com/api/admin/config', { method: 'PUT', headers, body: JSON.stringify(candidate) }), env);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, uiFor(language).api.validationFailed);
    }
    const password = await site.fetch(new Request('https://example.com/api/admin/password', { method: 'POST', headers, body: 'null' }), env);
    assert.equal(password.status, 400);
    assert.equal((await password.json()).error, uiFor(language).api.invalidJson);
  }
});

test('body reads stop at the byte limit and decode split UTF-8 correctly', async () => {
  let cancelled = false;
  const oversized = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4097)); }, cancel() { cancelled = true; } });
  assert.equal(await readBody(new Request('https://example.com', { method: 'POST', body: oversized, duplex: 'half' }), 4096), null);
  assert.equal(cancelled, true);
  const bytes = new TextEncoder().encode('中文');
  const split = new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 1)); controller.enqueue(bytes.slice(1)); controller.close(); } });
  assert.equal(await readBody(new Request('https://example.com', { method: 'POST', body: split, duplex: 'half' }), bytes.length), '中文');
  assert.equal(await readBody(new Request('https://example.com', { method: 'POST', body: 'small', headers: { 'Content-Length': '1000000' } }), 4096), null);
});

test('all write routes reject oversized streams before parsing or writing', async () => {
  const env = { SESSION_SECRET: 'local-test-only', PROFILE_KV: { async get() { return null; }, async put() { assert.fail('No writes'); } } };
  const auth = { Cookie: 'contact_admin=' + await createSession(env.SESSION_SECRET), Origin: 'https://example.com', 'Content-Type': 'application/json' };
  for (const [path, method, limit] of [['/api/admin/config', 'PUT', MAX_BODY_BYTES], ['/api/admin/password', 'POST', 4096], ['/api/admin/backup', 'POST', 1024 * 1024], ['/admin/login', 'POST', 4096], ['/', 'POST', 4096]]) {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(limit + 1)); controller.close(); } });
    const headers = { ...auth, 'Content-Type': path.startsWith('/api/') ? 'application/json' : 'application/x-www-form-urlencoded' };
    const response = await worker.fetch(new Request('https://example.com' + path, { method, headers, body, duplex: 'half' }), env);
    assert.equal(response.status, 413, path);
  }
});
