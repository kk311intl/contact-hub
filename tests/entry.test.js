import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';
import { createSession, sessionCookie } from '../src/auth.js';
import { uiFor } from '../src/i18n.js';
import { statsFor } from '../src/analytics.js';

// Reuse Wrangler's bundled build/runtime tools; no remote resources or personal configuration.
const require = createRequire(import.meta.resolve('wrangler'));
const { build } = require('esbuild');
const { Miniflare, convertV4MiniflareOptions } = require('miniflare');

test('the deployed entry supports three admin languages, root navigation and protected reports', async () => {
  const { outputFiles } = await build({ entryPoints: [fileURLToPath(new URL('../src/index.js', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'browser' });
  for (const lang of ['zh-TW', 'en', 'ja']) {
    const runtime = new Miniflare(convertV4MiniflareOptions({
      modules: true, script: outputFiles[0].text, compatibilityDate: '2026-09-22', cf: false,
      bindings: { ADMIN_LANGUAGE: lang, ADMIN_PASSWORD: 'local-test-only', SESSION_SECRET: 'local-session-test-only' },
      kvNamespaces: ['PROFILE_KV'], durableObjects: { VISITOR_COUNTER: { className: 'VisitorCounter', useSQLite: true } },
      kvPersist: false, durableObjectsPersist: false, cachePersist: false
    }));
    try {
      const fetch = (path, init) => runtime.dispatchFetch('https://example.com' + path, { redirect: 'manual', ...init });
      const post = (body, cookie = '') => fetch('/', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie }, body });
      const login = await fetch('/admin/login');
      assert.equal(login.status, 200);
      const loginHtml = await login.text();
      assert.ok(loginHtml.includes(uiFor(lang).admin.loginPrompt));
      assert.match(loginHtml, /data-contact-view="admin"/);
      assert.match(loginHtml, /form class="login-form" action="\/"/);
      assert.match(loginHtml, /name="_contact_action" value="login"/);
      const entry = await post('_contact_action=view&view=admin');
      assert.match(await entry.text(), /class="login-form"/);
      const publicPage = await fetch('/', { headers: { 'Accept-Language': 'ja' } });
      const publicHtml = await publicPage.text();
      assert.match(publicHtml, /<html lang="ja"/);
      assert.match(publicHtml, /<script type="module" src="\/app-v3.js"><\/script>/);
      assert.match(publicHtml, /data-shell-src="\/inapp-redirect.js"/);
      assert.doesNotMatch(publicHtml, /data-admin-entry|data-admin-form/);
      const signedIn = await post('_contact_action=login&password=local-test-only');
      assert.equal(signedIn.status, 200);
      const cookie = signedIn.headers.get('Set-Cookie').split(';')[0];
      assert.match(cookie, /^contact_admin=/);
      assert.match(await signedIn.text(), /data-admin-form/);
      const restored = await fetch('/', { headers: { Cookie: cookie, 'X-Contact-View': 'admin' } });
      assert.match(await restored.text(), /data-section="analytics"/);
      const report = await fetch('/api/admin/analytics?days=7', { headers: { Cookie: cookie } });
      assert.equal(report.status, 200);
      assert.equal(report.headers.get('Cache-Control'), 'no-store');
      assert.ok((await report.text()).includes(statsFor(lang).updated));
      assert.equal((await fetch('/api/admin/analytics')).status, 401);
      const crossOrigin = await fetch('/', { method: 'POST', headers: { Origin: 'https://other.example' }, body: '_contact_action=view&view=admin' });
      assert.equal(crossOrigin.status, 403);
      const signedOut = await post('_contact_action=logout', cookie);
      assert.match(signedOut.headers.get('Set-Cookie'), /contact_admin=;.*Max-Age=0/);
      assert.match(await signedOut.text(), /data-contact-view="public"/);
    } finally { await runtime.dispose(); }
  }
});

test('entry API failures return localized errors rather than unhandled rejections', async () => {
  const secret = 'local-error-test-only';
  const cookie = sessionCookie(await createSession(secret));
  for (const lang of ['zh-TW', 'en', 'ja']) {
    const env = { ADMIN_LANGUAGE: lang, SESSION_SECRET: secret, PROFILE_KV: { async get() { throw new Error('Simulated storage failure'); } } };
    for (const path of ['/api/admin/config', '/api/admin/password', '/api/admin/analytics']) {
      const response = await worker.fetch(new Request('https://example.com' + path, { headers: { Cookie: cookie } }), env);
      assert.equal(response.status, 500);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.deepEqual(await response.json(), { error: uiFor(lang).api.serverError });
    }
  }
});
