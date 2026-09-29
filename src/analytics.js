// Existing table names and category keys are retained for data compatibility.
export const DAILY_LIMIT = 5000;
const DAY = 86400000;
export const DIMENSIONS = { country: "國家／地區", device: "設備", os: "作業系統", browser: "瀏覽器", app: "App 內瀏覽器", source: "來源網域" };

const TEXT = {
  "zh-TW": {
    title: "訪問統計", range: "統計期間", today: "今日", days: n => `近 ${n} 天`, refresh: "重新整理",
    updated: "報表更新時間", unknown: "未知", views: "已記錄訪問（非已知機器人）", bots: "已辨識機器人請求", bot: "機器人", daily: "每日概況", empty: "尚無資料", capped: "已達上限",
    note: "以 UTC 換日；保留 30 天。這是頁面訪問次數，不是獨立人數，不會回填既有訪客總數。UA、設備、App 僅為推測；國家是網路出口位置。沒有來源標頭時無法區分直接開啟與 App 隱藏來源。",
    capWarning: "此期間有日期達到每日統計上限，資料不完整。",
    failureWarning: "曾發生統計寫入失敗，部分訪問可能未記錄。最近偵測", failureEnd: "此提示不代表目前仍故障。",
    limits: n => `每日最多記錄 ${n} 次首頁請求，超出後停止新增統計；不保存原始 IP、完整 UA、來源路徑或查詢參數。不會自動刷新，按「重新整理」即可更新。儲存完全不可用且執行個體重啟時，異常標記可能無法保留。`,
    loading: "正在讀取統計…", signIn: "請重新登入後再查看統計。", failed: "暫時無法讀取統計，請重新點選「訪問統計」重試。",
    dimensions: DIMENSIONS, values: {}
  },
  en: {
    title: "Visit statistics", range: "Reporting period", today: "Today", days: n => `Last ${n} days`, refresh: "Refresh",
    updated: "Report updated", unknown: "Unknown", views: "Recorded visits (excluding known bots)", bots: "Recognized bot requests", bot: "Bots", daily: "Daily summary", empty: "No data yet", capped: "Limit reached",
    note: "Days use UTC; data is kept for 30 days. These are page views, not unique visitors; earlier visitor totals are not backfilled. UA, device and app categories are estimates; country reflects the network exit location. A missing referrer cannot distinguish direct visits from apps that hide their source.",
    capWarning: "Some days in this period reached the daily recording limit. The data is incomplete.",
    failureWarning: "Some visits may be missing because statistics could not be written. Last detected", failureEnd: "This does not necessarily mean the problem is ongoing.",
    limits: n => `Records at most ${n} homepage requests per day, then stops adding statistics. Raw IP addresses, full UAs, referrer paths and query strings are not stored. There is no automatic polling; use Refresh to update. If storage remains unavailable until the instance restarts, the failure marker may be lost.`,
    loading: "Loading statistics…", signIn: "Please sign in again to view statistics.", failed: "Statistics are temporarily unavailable. Select Visit statistics again to retry.",
    dimensions: { country: "Country / region", device: "Device", os: "Operating system", browser: "Browser", app: "In-app browser", source: "Referrer domain" },
    values: { "未知": "Unknown", "平板": "Tablet", "手機": "Phone", "電腦": "Desktop", "其他／未知": "Other / unknown", "未辨識／一般瀏覽器": "Unrecognized / standard browser", "直接／未知": "Direct / unknown", "站內": "Same site", "其他來源": "Other sources" }
  },
  ja: {
    title: "アクセス統計", range: "集計期間", today: "今日", days: n => `過去${n}日間`, refresh: "更新",
    updated: "集計結果の更新日時", unknown: "不明", views: "記録済みアクセス（既知のボットを除く）", bots: "識別されたボットのリクエスト", bot: "ボット", daily: "日別の概要", empty: "まだデータがありません", capped: "上限到達",
    note: "日付は UTC 基準で、30日間保存します。訪問者数ではなくページの表示回数です。既存の累計訪問者数からの補完は行いません。UA・端末・アプリは推定で、国は接続元ネットワークの出口を表します。参照元ヘッダーがなければ、直接アクセスと参照元を隠すアプリを区別できません。",
    capWarning: "この期間には1日の記録上限に達した日があるため、データは完全ではありません。",
    failureWarning: "統計の書き込みに失敗したため、一部のアクセスが記録されていない可能性があります。最終検出", failureEnd: "現在も障害が続いているとは限りません。",
    limits: n => `トップページへのリクエストは1日最大${n}件まで記録し、上限後は統計の追加を停止します。元の IP アドレス、完全な UA、参照元のパスやクエリは保存しません。自動更新は行わないため「更新」を押してください。ストレージが使えないまま実行インスタンスが再起動すると、障害の記録が失われる場合があります。`,
    loading: "統計を読み込んでいます…", signIn: "統計を見るには再度ログインしてください。", failed: "統計を読み込めません。「アクセス統計」をもう一度選んでお試しください。",
    dimensions: { country: "国・地域", device: "端末", os: "OS", browser: "ブラウザー", app: "アプリ内ブラウザー", source: "参照元ドメイン" },
    values: { "未知": "不明", "平板": "タブレット", "手機": "スマートフォン", "電腦": "パソコン", "其他／未知": "その他・不明", "未辨識／一般瀏覽器": "未識別・通常のブラウザー", "直接／未知": "直接・不明", "站內": "同じサイト", "其他來源": "その他の参照元" }
  }
};

export function statsFor(language) { return Object.hasOwn(TEXT, language) ? TEXT[language] : TEXT.en; }

export function classify(request) {
  const ua = (request.headers.get("User-Agent") || "").slice(0, 2048);
  const match = (items, fallback) => items.find(([, pattern]) => pattern.test(ua))?.[0] || fallback;
  const os = match([["iOS", /iPhone|iPad|iPod/i], ["Android", /Android/i], ["Windows", /Windows/i], ["macOS", /Macintosh|Mac OS X/i], ["ChromeOS", /CrOS/i], ["Linux", /Linux/i]], "未知");
  const device = match([["平板", /iPad|Tablet|Android(?!.*Mobile)/i], ["手機", /Mobile|iPhone|iPod/i]], os === "未知" ? "未知" : "電腦");
  const browser = match([["Edge", /Edg(?:e|A|iOS)?\//i], ["Opera", /OPR\/|Opera|OPiOS/i], ["Samsung Internet", /SamsungBrowser/i], ["Firefox", /Firefox\/|FxiOS\//i], ["Chrome", /Chrome\/|CriOS\//i], ["Safari", /Safari\//i]], "其他／未知");
  const app = match([["WeChat", /MicroMessenger/i], ["Threads", /Barcelona|Threads\//i], ["Instagram", /Instagram/i], ["Messenger", /FBAN\/Messenger|MessengerFor/i], ["Facebook", /FBAN\/|FBAV\/|FB_IAB\//i], ["Telegram", /Telegram(?:-Android|-iOS)?\//i], ["LINE", /\bLine\//i], ["X / Twitter", /Twitter/i], ["TikTok", /TikTok|musical_ly|trill\//i], ["LinkedIn", /LinkedInApp/i], ["WhatsApp", /WAiOS\/|WA4A\//i], ["Reddit", /Reddit\//i], ["Pinterest", /Pinterest/i], ["Snapchat", /Snapchat/i], ["KakaoTalk", /KAKAOTALK/i], ["Weibo", /weibo__|WeiboliteiOS|WeiboIntliOS/i]], "未辨識／一般瀏覽器");
  let source = "直接／未知";
  try {
    const ref = new URL(request.headers.get("Referer"));
    if (["http:", "https:"].includes(ref.protocol)) source = ref.hostname === new URL(request.url).hostname ? "站內" : ref.hostname.slice(0, 253);
  } catch { /* Missing and withheld referrers are indistinguishable. */ }
  return { country: /^[A-Z]{2}$/.test(request.cf?.country || "") ? request.cf.country : "未知", device, os, browser, app, source, bot: /bot\b|crawler|spider|Headless|curl\/|wget\//i.test(ua) || request.cf?.botManagement?.verifiedBot === true };
}

export class Analytics {
  constructor(storage) {
    this.storage = storage;
    this.sql = storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS private_daily (day TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0, bots INTEGER NOT NULL DEFAULT 0, capped INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID");
    this.sql.exec("CREATE TABLE IF NOT EXISTS private_buckets (day TEXT, dimension TEXT, value TEXT, visits INTEGER NOT NULL, PRIMARY KEY(day, dimension, value)) WITHOUT ROWID");
    this.sql.exec("CREATE TABLE IF NOT EXISTS private_health (id INTEGER PRIMARY KEY CHECK(id = 1), last_failure TEXT NOT NULL)");
    this.day = "";
  }

  prepare(now) {
    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) {
      const cutoff = new Date(now - 29 * DAY).toISOString().slice(0, 10);
      this.storage.transactionSync(() => {
        this.sql.exec("DELETE FROM private_buckets WHERE day < ?", cutoff);
        this.sql.exec("DELETE FROM private_daily WHERE day < ?", cutoff);
        this.sql.exec("INSERT OR IGNORE INTO private_daily(day) VALUES (?)", day);
      });
      this.sources = new Set(this.sql.exec("SELECT value FROM private_buckets WHERE day = ? AND dimension = 'source'", day).toArray().map(row => row.value));
      this.day = day;
    }
    return day;
  }

  record(meta, now = Date.now()) {
    const day = this.prepare(now);
    const current = this.sql.exec("SELECT views, bots FROM private_daily WHERE day = ?", day).one();
    if (current.views + current.bots >= DAILY_LIMIT) return;
    const source = this.sources.has(meta.source) || this.sources.size < 50 ? meta.source : "其他來源";
    this.storage.transactionSync(() => {
      this.sql.exec("UPDATE private_daily SET views = views + ?, bots = bots + ?, capped = ? WHERE day = ?", meta.bot ? 0 : 1, meta.bot ? 1 : 0, current.views + current.bots + 1 >= DAILY_LIMIT ? 1 : 0, day);
      if (!meta.bot) {
        for (const dimension of Object.keys(DIMENSIONS)) {
          const value = dimension === "source" ? source : meta[dimension];
          this.sql.exec("INSERT INTO private_buckets(day, dimension, value, visits) VALUES (?, ?, ?, 1) ON CONFLICT(day, dimension, value) DO UPDATE SET visits = visits + 1", day, dimension, value);
        }
      }
    });
    if (!meta.bot) this.sources.add(source);
  }

  report(days = 7, now = Date.now()) {
    days = [1, 7, 30].includes(days) ? days : 7;
    const day = this.prepare(now);
    const cutoff = new Date(now - (days - 1) * DAY).toISOString().slice(0, 10);
    return {
      days, day, limit: DAILY_LIMIT, generatedAt: new Date(now).toISOString(),
      writeFailure: this.sql.exec("SELECT last_failure FROM private_health WHERE id = 1").toArray()[0]?.last_failure || null,
      daily: this.sql.exec("SELECT day, views, bots, capped FROM private_daily WHERE day >= ? ORDER BY day DESC", cutoff).toArray(),
      buckets: this.sql.exec("SELECT dimension, value, SUM(visits) AS visits FROM private_buckets WHERE day >= ? GROUP BY dimension, value ORDER BY visits DESC, value", cutoff).toArray()
    };
  }

  recordFailure(at) {
    this.sql.exec("INSERT INTO private_health(id, last_failure) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_failure = excluded.last_failure", at);
  }
}

const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function dashboard(report, language = "en") {
  const lang = Object.hasOwn(TEXT, language) ? language : "en";
  const ui = statsFor(lang);
  const number = value => value.toLocaleString(lang);
  const views = report.daily.reduce((n, r) => n + r.views, 0);
  const bots = report.daily.reduce((n, r) => n + r.bots, 0);
  const countries = new Intl.DisplayNames([lang], { type: "region" });
  const rows = (items, country = false) => items.map(r => {
    const label = country && /^[A-Z]{2}$/.test(r.value) ? countries.of(r.value) : Object.hasOwn(ui.values, r.value) ? ui.values[r.value] : r.value;
    return `<li><span>${escape(label)}</span><b>${number(r.visits)} <small>${views ? (100 * r.visits / views).toFixed(1) : 0}%</small></b><progress max="${Math.max(1, views)}" value="${r.visits}"></progress></li>`;
  }).join("");
  return `<nav class="stats-ranges" aria-label="${ui.range}">${[1, 7, 30].map(n => `<button type="button" data-stats-days="${n}" aria-pressed="${n === report.days}">${n === 1 ? ui.today : ui.days(n)}</button>`).join("")}<button type="button" data-stats-days="${report.days}">${ui.refresh}</button></nav>
    <p class="stats-note">${ui.updated}: ${escape(report.generatedAt?.replace('T', ' ').replace(/\.\d+Z$/, ' UTC') || ui.unknown)}</p>
    <div class="stats-summary"><section class="form-card"><span>${ui.views}</span><strong>${number(views)}</strong></section><section class="form-card"><span>${ui.bots}</span><strong>${number(bots)}</strong></section></div>
    <p class="stats-note">${ui.note}</p>
    ${report.daily.some(r => r.capped) ? `<p role="status" class="stats-warning">${ui.capWarning}</p>` : ""}
    ${report.writeFailure ? `<p role="status" class="stats-warning">${ui.failureWarning}: ${escape(report.writeFailure)}. ${ui.failureEnd}</p>` : ""}
    <section class="form-card"><h2>${ui.daily}</h2><ul class="stats-list">${report.daily.map(r => `<li><span>${escape(r.day)}${r.capped ? ` · ${ui.capped}` : ""}</span><b>${number(r.views)} <small>${ui.bot} ${number(r.bots)}</small></b></li>`).join("")}</ul></section>
    <div class="stats-grid">${Object.entries(ui.dimensions).map(([key, title]) => `<section class="form-card"><h2>${title}</h2><ul class="stats-list">${rows(report.buckets.filter(r => r.dimension === key), key === "country") || `<li>${ui.empty}</li>`}</ul></section>`).join("")}</div>
    <p class="stats-note">${ui.limits(number(report.limit))}</p>`;
}

export function client(language) {
  const { loading, signIn, failed } = statsFor(language);
  return `const ui = ${JSON.stringify({ loading, signIn, failed })};
const panel = document.querySelector('[data-section="analytics"]');
const content = panel.querySelector('[data-analytics-content]');
const save = document.querySelector('[data-save]');
let loaded = false;
let loading = false;
let requestId = 0;
async function load(days = 7) {
  if (loading) return;
  loading = true;
  const id = ++requestId;
  content.setAttribute('aria-busy', 'true');
  content.textContent = ui.loading;
  try {
    const response = await fetch('/api/admin/analytics?days=' + days, { cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 ? ui.signIn : ui.failed);
    const html = await response.text();
    if (id !== requestId) return;
    content.innerHTML = html;
    loaded = true;
  } catch (error) {
    if (id !== requestId) return;
    content.textContent = error.message === ui.signIn ? ui.signIn : ui.failed;
    loaded = false;
  } finally { loading = false; if (id === requestId) content.removeAttribute('aria-busy'); }
}
document.querySelectorAll('[data-section-button]').forEach(button => button.addEventListener('click', () => {
  const analytics = button.dataset.sectionButton === 'analytics';
  save.hidden = analytics;
  if (analytics && !loaded) load();
}));
panel.addEventListener('click', event => {
  const days = Number(event.target.closest('[data-stats-days]')?.dataset.statsDays);
  if ([1, 7, 30].includes(days)) load(days);
});`;
}

export const STYLES = `.admin-nav a{padding:10px 12px;color:var(--muted);text-decoration:none;font-size:.9rem;white-space:nowrap}.admin-nav a:hover{color:var(--text)}.stats-ranges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}.stats-ranges button{background:transparent;color:inherit;cursor:pointer;padding:7px 14px;border:1px solid var(--border);border-radius:999px;text-decoration:none}.stats-ranges [aria-pressed="true"]{background:var(--text);color:var(--bg)}.stats-summary,.stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:20px}.stats-summary strong{font-size:2rem}.stats-note{color:var(--muted);font-size:.82rem;margin:20px 0}.stats-warning{color:var(--danger)}.stats-grid{margin-top:20px}.stats-grid h2,.form-card h2{margin:0;font-size:1rem}.stats-list{list-style:none;margin:0;padding:0;max-height:360px;overflow:auto}.stats-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px;margin:14px 0;font-size:.85rem}.stats-list span{overflow-wrap:anywhere}.stats-list b{font-weight:500;text-align:right}.stats-list small{color:var(--muted);font-weight:400}.stats-list progress{grid-column:1/-1;width:100%;height:4px;accent-color:var(--muted)}@media(max-width:600px){.stats-grid{grid-template-columns:1fr}.stats-summary .form-card{padding:12px}.stats-summary span{font-size:.75rem}}`;
