import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import vm from "node:vm";
import { Analytics, classify, dashboard, DAILY_LIMIT, client, statsFor } from "../src/analytics.js";
import worker, { VisitorCounter } from "../src/index.js";
import { createSession, sessionCookie } from "../src/auth.js";

function storage() {
  const db = new DatabaseSync(":memory:");
  return {
    sql: { exec(query, ...args) {
      const stmt = db.prepare(query);
      const rows = /^SELECT\b/i.test(query) ? stmt.all(...args) : (stmt.run(...args), []);
      return { toArray: () => rows.map(row => ({ ...row })), one: () => { assert.equal(rows.length, 1); return rows[0]; } };
    } },
    transactionSync(fn) {
      db.exec("BEGIN");
      try { const result = fn(); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    }
  };
}
function metadata(ua = "Mozilla/5.0 (iPhone) Mobile Safari/604.1", referer = "https://example.org/private?token=not-stored") {
  const request = new Request("https://example.com/", { headers: { "User-Agent": ua, Referer: referer } });
  Object.defineProperty(request, "cf", { value: { country: "JP" } });
  return classify(request);
}

test("classifiers retain categories only, without IP, raw UA or referrer paths", () => {
  const meta = metadata();
  assert.deepEqual(meta, { country: "JP", device: "手機", os: "iOS", browser: "Safari", app: "未辨識／一般瀏覽器", source: "example.org", bot: false });
  assert.equal(metadata("Android Mobile Chrome/130 EdgA/130 Line/14").browser, "Edge");
  assert.equal(metadata("Android Mobile Chrome/130 EdgA/130 Line/14").app, "LINE");
  assert.equal(metadata("Mozilla Android Chrome/130").device, "平板");
  assert.equal(metadata("Googlebot/2").bot, true);
  assert.equal(metadata("MicroMessenger/8").app, "WeChat");
  assert.equal(metadata("Safari/600", "https://example.com/admin").source, "站內");
  assert.equal(metadata("", "invalid").source, "直接／未知");
});

test("statistics reports and API messages follow all three owner languages", async () => {
  const analytics = new Analytics(storage());
  analytics.record(metadata());
  analytics.record(metadata('', 'invalid'));
  const report = analytics.report();
  report.daily[0].capped = 1;
  report.writeFailure = new Date().toISOString();
  for (const [lang, device, country] of [['zh-TW', '手機', '日本'], ['en', 'Phone', 'Japan'], ['ja', 'スマートフォン', '日本']]) {
    const ui = statsFor(lang);
    const html = dashboard(report, lang);
    for (const label of [ui.range, ui.today, ui.days(7), ui.refresh, ui.updated, ui.views, ui.bots, ui.daily, ui.capWarning, ui.failureWarning, device, country, ...Object.values(ui.dimensions)]) assert.ok(html.includes(label), `${lang}: ${label}`);
    assert.ok(dashboard({ ...report, buckets: [] }, lang).includes(ui.empty));
    assert.ok(client(lang).includes(ui.loading));
    const env = { ADMIN_LANGUAGE: lang, PROFILE_KV: { get: async () => null } };
    const response = await worker.fetch(new Request('https://example.com/api/admin/analytics', { headers: { 'Accept-Language': 'fr' } }), env);
    assert.equal(response.status, 401);
    assert.equal(await response.text(), ui.signIn);
  }
  assert.equal(statsFor('invalid'), statsFor('en'));
});

test("localized statistics errors remain retryable", async () => {
  for (const lang of ['zh-TW', 'en', 'ja']) {
    const events = {};
    const content = { setAttribute() {}, removeAttribute() {} };
    const panel = { querySelector: () => content, addEventListener() {} };
    let status = 401;
    vm.runInNewContext(client(lang), {
      document: { querySelector: key => key === '[data-save]' ? {} : panel, querySelectorAll: () => [{ dataset: { sectionButton: 'analytics' }, addEventListener: (_, fn) => { events.load = fn; } }] },
      fetch: async () => ({ ok: false, status })
    });
    events.load();
    assert.equal(content.textContent, statsFor(lang).loading);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(content.textContent, statsFor(lang).signIn);
    status = 503;
    events.load();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(content.textContent, statsFor(lang).failed);
  }
});

test("aggregates PV separately from bots and limits daily writes without inventing totals", () => {
  const analytics = new Analytics(storage());
  const now = Date.UTC(2026, 8, 24);
  analytics.record(metadata(), now);
  analytics.record(metadata(), now);
  analytics.record(metadata("Googlebot/2"), now);
  let report = analytics.report(1, now);
  assert.equal(report.daily[0].views, 2);
  assert.equal(report.daily[0].bots, 1);
  assert.equal(report.buckets.length, 6);
  assert.ok(report.buckets.every(row => row.visits === 2));
  for (let i = 3; i < DAILY_LIMIT + 5; i++) analytics.record(metadata("Googlebot/2"), now);
  report = analytics.report(1, now);
  assert.equal(report.daily[0].views + report.daily[0].bots, DAILY_LIMIT);
  assert.equal(report.daily[0].capped, 1);
  assert.match(dashboard(report, 'zh-TW'), /資料不完整/);
});

test("bounds source cardinality and prunes only statistics after 30 UTC days", () => {
  const s = storage();
  s.sql.exec("CREATE TABLE totals (visitors INTEGER)");
  s.sql.exec("INSERT INTO totals VALUES (1234)");
  let analytics = new Analytics(s);
  const now = Date.UTC(2026, 8, 24);
  for (let i = 0; i < 80; i++) analytics.record(metadata("Safari/600", `https://source${i}.example/`), now);
  assert.equal(analytics.report(1, now).buckets.filter(r => r.dimension === "source").length, 51);
  analytics = new Analytics(s);
  analytics.record(metadata("Safari/600", "https://another.example/"), now);
  assert.equal(analytics.report(1, now).buckets.filter(r => r.dimension === "source").length, 51);
  const report = analytics.report(30, now + 30 * 86400000);
  assert.equal(report.buckets.length, 0);
  assert.equal(report.daily.length, 1);
  assert.equal(s.sql.exec("SELECT visitors FROM totals").one().visitors, 1234);
});

test("counter extension preserves existing totals and counting cookies", async () => {
  const counter = new VisitorCounter({ storage: storage() });
  for (const existing of [false, true]) {
    const r = await counter.fetch(new Request("https://counter.invalid/visit", { method: "POST", body: JSON.stringify({ existing, ip: "test-hash", day: new Date().toISOString().slice(0, 10), analytics: metadata() }) }));
    assert.equal((await r.json()).count, 1);
  }
  const report = await (await counter.fetch(new Request("https://counter.invalid/analytics?days=1"))).json();
  assert.equal(report.daily[0].views, 2);
  counter.analytics.record = () => { throw new Error("Quota exceeded"); };
  const r = await counter.fetch(new Request("https://counter.invalid/visit", { method: "POST", body: JSON.stringify({ existing: true, ip: "test", day: report.day, analytics: metadata() }) }));
  assert.equal((await r.json()).count, 1);
  const degraded = await (await counter.fetch(new Request('https://counter.invalid/analytics?days=1'))).json();
  assert.ok(degraded.writeFailure);
  assert.match(dashboard(degraded, 'zh-TW'), /統計寫入失敗/);
  assert.match(dashboard(degraded, 'zh-TW'), /報表更新時間/);
  assert.equal(counter.analytics.report().writeFailure, degraded.writeFailure);
});

test("analytics routes require current admin authentication and preserve security headers", async () => {
  const env = { SESSION_SECRET: "local-test-only", PROFILE_KV: { async get(key) { assert.equal(key, 'admin_auth'); return null; } } };
  for (const path of ["/api/admin/analytics", "/admin/analytics.css", "/admin/analytics.js"]) {
    const response = await worker.fetch(new Request(`https://example.com${path}`), env);
    assert.equal(response.status, path.startsWith("/api/") ? 401 : 303);
    assert.ok(!(await response.text()).includes("private_buckets"));
  }
  const cookie = sessionCookie(await createSession(env.SESSION_SECRET));
  const css = await worker.fetch(new Request("https://example.com/admin/analytics.css", { headers: { Cookie: cookie } }), env);
  assert.equal(css.status, 200);
  assert.match(css.headers.get("Cache-Control"), /no-store/);
  assert.match(css.headers.get("Content-Security-Policy"), /default-src 'self'/);
  env.PROFILE_KV.get = async key => key === "admin_auth" ? { changedAt: Math.floor(Date.now() / 1000) + 1 } : null;
  assert.equal((await worker.fetch(new Request("https://example.com/admin/analytics.css", { headers: { Cookie: cookie } }), env)).status, 303);
});

test("dashboard escapes source labels and displays empty data without browser scripts", () => {
  const html = dashboard({ days: 7, limit: DAILY_LIMIT, daily: [{ day: "2026-09-24", views: 1, bots: 0, capped: 0 }], buckets: [{ dimension: "source", value: '<img src=x onerror="alert(1)">', visits: 1 }] }, 'zh-TW');
  assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /&lt;img/);
  assert.match(html, /尚無資料/);
  assert.doesNotMatch(html, /href="\?days|返回後台/);
  assert.match(html, /data-stats-days="30"/);
});

test("daily chart keeps UTC order, missing records, zeros and caps distinct in all languages", () => {
  const report = { day: '2026-10-01', days: 7, limit: DAILY_LIMIT, buckets: [], daily: [
    { day: '2026-10-01', views: 0, bots: 0, capped: 0 },
    { day: '2026-09-29', views: 4800, bots: 200, capped: 1 }
  ] };
  for (const lang of ['zh-TW', 'en', 'ja']) {
    const html = dashboard(report, lang), ui = statsFor(lang);
    assert.equal((html.match(/data-stats-day=/g) || []).length, 7);
    assert.ok(html.indexOf('2026-09-25 UTC') < html.indexOf('2026-10-01 UTC'));
    assert.ok(html.includes(`2026-09-30 UTC · ${ui.noRecord}`));
    assert.ok(html.includes(`2026-10-01 UTC · ${ui.views}: 0 · ${ui.bot}: 0`));
    assert.match(html, /stats-chart-cap/);
    assert.doesNotMatch(html, /NaN|Infinity/);
    assert.ok(html.includes(ui.chartHint));
    for (const days of [1, 30]) assert.equal((dashboard({ ...report, days, daily: [] }, lang).match(/data-stats-day=/g) || []).length, days);
    assert.doesNotMatch(dashboard({ ...report, daily: report.daily.slice(0, 1) }, lang), /NaN|Infinity/);
  }
});

test("statistics tab loads on demand without navigating or replacing the editor", async () => {
  const events = {}, calls = [];
  const content = { setAttribute() {}, removeAttribute() {} };
  const save = { hidden: false };
  const panel = { querySelector: () => content, addEventListener: (_, fn) => { events.range = fn; } };
  const buttons = ['profile', 'analytics'].map(name => ({ dataset: { sectionButton: name }, addEventListener: (_, fn) => { events[name] = fn; } }));
  vm.runInNewContext(client('zh-TW'), {
    document: { querySelector: key => key === '[data-save]' ? save : panel, querySelectorAll: () => buttons },
    fetch: async url => { calls.push(url); return { ok: true, text: async () => '<p>Report</p>' }; }
  });
  assert.equal(calls.length, 0);
  events.analytics();
  assert.equal(content.textContent, '正在讀取統計…');
  events.analytics();
  events.analytics();
  assert.equal(calls.length, 1, 'pending requests are shared rather than duplicated');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(save.hidden, true);
  assert.equal(content.innerHTML, '<p>Report</p>');
  events.profile();
  assert.equal(save.hidden, false);
  events.analytics();
  assert.equal(calls.length, 1);
  events.range({ target: { closest: () => ({ dataset: { statsDays: '30' } }) } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['/api/admin/analytics?days=7', '/api/admin/analytics?days=30']);
});

test("view selection is not authentication and rejects cross-origin requests", async () => {
  const rejected = await worker.fetch(new Request('https://example.com/', { method: 'POST', headers: { 'X-Contact-View': 'admin', Origin: 'https://other.example' } }), {});
  assert.equal(rejected.status, 403);
  const env = { PROFILE_KV: { async get() { return null; } } };
  const report = await worker.fetch(new Request('https://example.com/api/admin/analytics', { headers: { Cookie: 'contact_view=admin' } }), env);
  assert.equal(report.status, 401);
});

test("only five statistics clicks within a fixed five-second window open the root admin view", async () => {
  const source = await (await worker.fetch(new Request('https://example.com/admin-shell.js'), {})).text();
  let click, now = 0;
  const calls = [], states = [];
  vm.runInNewContext(source, {
    document: {
      documentElement: { dataset: { contactView: 'auto' } },
      querySelector: selector => { assert.equal(selector, '[data-visitors] summary'); return { addEventListener: (_, fn) => { click = fn; } }; }, querySelectorAll: () => [],
      createElement: tag => tag === 'form' ? { fields: [], append(input) { this.fields.push(input); }, requestSubmit() { calls.push([this.action, this.method, ...this.fields.map(i => i.value)]); }, remove() {} } : {}, body: { append() {} }
    },
    sessionStorage: { getItem: () => null, setItem: (...values) => states.push(values) },
    Date: { now: () => now },
  });
  const event = { preventDefault() {}, stopImmediatePropagation() {} };
  for (now of [0, 1000, 2000, 3000]) click(event);
  assert.equal(calls.length, 0);
  now = 6000; click(event);
  assert.equal(calls.length, 0);
  for (now of [6500, 7000, 7500, 8000]) click(event);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, [['/', 'POST', 'view', 'admin']]);
  assert.deepEqual(states, []); // A cancelled native navigation changes no per-tab state.
});
