import test from "node:test";
import assert from "node:assert/strict";
import { redirectTarget, startRedirect } from "../public/inapp-redirect.js";
import { DEFAULT_CONFIG, normalizeConfig, validateConfig } from "../src/config.js";
import { renderAdmin } from "../src/render.js";

const page = "https://example.com/";
function configuration(url = "https://line.me/example") {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.settings.autoRedirectEnabled = true;
  config.links = [{ id: "contact", type: "contact", icon: "link", label: "Contact", url, enabled: true, order: 1 }];
  return config;
}

test("explicit app markers match only enabled contact URLs on their own platforms", () => {
  for (const [ua, host, app] of [
    ["Barcelona 1 Instagram 2", "threads.net", "Threads"], ["Instagram 300", "instagram.com", "Instagram"],
    ["[FBAN/MessengerForiOS;FBAV/1]", "m.me", "Messenger"], ["[FBAN/FBIOS;FBAV/1]", "facebook.com", "Facebook"],
    ["Twitter for iPhone", "x.com", "X"], ["Line/14.0", "line.me", "LINE"],
    ["musical_ly_44 BytedanceWebview/1", "tiktok.com", "TikTok"],
    ["Snapchat/1", "snapchat.com", "Snapchat"], ["LinkedInApp", "linkedin.com", "LinkedIn"],
    ["WAiOS/1", "wa.me", "WhatsApp"], ["Reddit/1", "reddit.com", "Reddit"],
    ["Telegram-Android/11.3.3", "t.me", "Telegram"],
    ["[Pinterest/1]", "pinterest.com", "Pinterest"], ["KAKAOTALK/11.0.1", "open.kakao.com", "KakaoTalk"],
    ["weibo__14.1.0", "weibo.com", "Weibo"]
  ]) assert.equal(redirectTarget(configuration(`https://${host}/example`), ua, page)?.app, app);
  for (const ua of ["Mozilla/5.0 Safari/605.1", "Mozilla/5.0 Chrome/130 Mobile Safari/537.36", "BytedanceWebview/1", "Discordbot/2.0"]) {
    assert.equal(redirectTarget(configuration(), ua, page), null);
  }
  for (const url of ["", "mailto:example@example.com", "https://line.me.evil.example/", "https://evil.example/line.me", "https://line.me@evil.example/", "http://line.me/example", "https://user@line.me/example", page]) {
    assert.equal(redirectTarget(configuration(url), "Line/14", page), null);
  }
  const config = configuration();
  assert.equal(redirectTarget(configuration("https://weixin.qq.com/example"), "MicroMessenger/8", page), null);
  assert.equal(redirectTarget(configuration("https://telegram.org/"), "Telegram-Android/11.3.3", page), null);
  assert.equal(redirectTarget(configuration("https://pinterest.com/example"), "Pinterest/1 +https://www.pinterest.com/bot.html", page), null);
  config.links[0].enabled = false;
  assert.equal(redirectTarget(config, "Line/14", page), null);
  config.links[0].enabled = true;
  config.links[0].type = "link";
  assert.equal(redirectTarget(config, "Line/14", page), null);
  config.links[0].type = "contact";
  config.settings.autoRedirectEnabled = false;
  assert.equal(redirectTarget(config, "Line/14", page), null);
});

test("settings default safely, validate in three languages, and appear in the admin form", () => {
  const config = normalizeConfig({ ...DEFAULT_CONFIG, settings: {} });
  assert.equal(config.settings.autoRedirectEnabled, false);
  assert.equal(config.settings.autoRedirectSeconds, 5);
  for (const lang of ["zh-TW", "en", "ja"]) {
    assert.match(renderAdmin(config, lang), /name="autoRedirectEnabled"/);
    assert.match(renderAdmin(config, lang), /<small data-redirect-apps>[^<]*Telegram[^<]*Weibo[^<]*<\/small>/);
    assert.match(renderAdmin(config, lang), /name="autoRedirectSeconds" min="1" max="10" step="1" value="5"/);
    for (const value of [0, 11, 1.5, "5", NaN]) {
      config.settings.autoRedirectSeconds = value;
      assert.equal(validateConfig(config, lang).length, 1);
    }
    config.settings.autoRedirectSeconds = 5;
  }
  config.settings.autoRedirectEnabled = "false";
  assert.equal(validateConfig(config).length, 1);
});

function browser(language = "en") {
  const events = {};
  const notice = { hidden: true, dataset: {}, style: { setProperty(key, value) { this[key] = value; } }, addEventListener: (name, fn) => { events[name] = fn; } };
  notice.querySelector = () => notice;
  const storage = new Map();
  let tick, destination;
  const env = {
    document: { documentElement: { lang: language }, visibilityState: "visible", querySelector: () => notice, querySelectorAll: () => [], addEventListener: (name, fn) => { events[name] = fn; } },
    navigator: { userAgent: "Line/14" }, location: { href: page, assign: (url) => { destination = url; } },
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setInterval: (fn) => { tick = fn; return 1; }, clearInterval() {}, setTimeout() {},
    addEventListener: (name, fn) => { events[name] = fn; }
  };
  return { env, notice, events, tick: () => tick?.(), destination: () => destination };
}

test("countdown cancels in all languages and cannot redirect after cancellation or page exit", () => {
  for (const [lang, cancelled] of [["zh-Hant", "已取消自動跳轉"], ["en", "Auto-redirect cancelled"], ["ja", "自動移動をキャンセルしました"]]) {
    const b = browser(lang);
    startRedirect(configuration(), b.env);
    assert.equal(b.notice.hidden, false);
    assert.ok(b.notice.textContent.includes("5"));
    b.events.click();
    assert.equal(b.notice.dataset.redirectState, "completing");
    assert.equal(b.notice.textContent, cancelled);
    for (let i = 0; i < 6; i++) b.tick();
    assert.equal(b.destination(), undefined);
    b.notice.hidden = true;
    startRedirect(configuration(), b.env);
    assert.equal(b.notice.hidden, true);
  }
  const b = browser();
  startRedirect(configuration(), b.env);
  b.events.pagehide();
  for (let i = 0; i < 6; i++) b.tick();
  assert.equal(b.destination(), undefined);
});

test("countdown pauses while hidden, redirects once, and chooses the first contact in order", () => {
  const b = browser();
  const config = configuration();
  config.settings.autoRedirectSeconds = 2;
  config.links.push({ ...config.links[0], id: "first", order: 0, url: "https://lin.ee/example" });
  startRedirect(config, b.env);
  assert.equal(b.notice.style["--redirect-duration"], "2s");
  b.env.document.visibilityState = "hidden";
  b.events.visibilitychange();
  assert.equal(b.notice.dataset.redirectState, "paused");
  for (let i = 0; i < 6; i++) b.tick();
  assert.equal(b.destination(), undefined);
  b.env.document.visibilityState = "visible";
  b.events.visibilitychange();
  assert.equal(b.notice.dataset.redirectState, "running");
  b.tick();
  assert.equal(b.notice.style["--redirect-progress"], "50%");
  assert.equal(b.destination(), undefined);
  b.tick();
  assert.equal(b.destination(), "https://lin.ee/example");
  assert.equal(b.notice.hidden, true);
});

test("unavailable session storage fails safely without showing a redirect", () => {
  const b = browser();
  b.env.sessionStorage.getItem = () => { throw new Error("Storage blocked"); };
  startRedirect(configuration(), b.env);
  assert.equal(b.notice.hidden, true);
  b.tick();
  assert.equal(b.destination(), undefined);
});

test("cancel fills from current progress, then exits without navigating", () => {
  const b = browser();
  const timeouts = [];
  b.env.setTimeout = (callback, delay) => { timeouts.push({ callback, delay }); };
  b.env.getComputedStyle = () => ({ width: "42px", strokeDashoffset: "-30px" });
  b.env.matchMedia = () => ({ matches: true });
  startRedirect(configuration(), b.env);
  b.events.click();
  assert.equal(b.notice.style["--cancel-width"], "42px");
  assert.equal(b.notice.style["--border-fill-start"], "-30");
  assert.equal(b.notice.style["--border-fill-end"], "14");
  assert.equal(b.notice.dataset.redirectState, "completing");
  assert.equal(timeouts[0].delay, 2000);
  timeouts.shift().callback();
  assert.equal(b.notice.dataset.redirectState, "exiting");
  assert.equal(timeouts[0].delay, 220);
  timeouts.shift().callback();
  assert.equal(b.notice.hidden, true);
  for (let i = 0; i < 6; i++) b.tick();
  assert.equal(b.destination(), undefined);
});

test("Telegram iOS bridge identifies generic Safari UA without invoking native methods", () => {
  for (const cancel of [false, true]) {
    const b = browser();
    b.env.navigator.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
    const config = configuration("https://t.me/example");
    startRedirect(config, b.env);
    assert.equal(b.notice.hidden, true);
    b.env.TelegramWebviewProxy = {};
    startRedirect(config, b.env);
    assert.equal(b.notice.hidden, true);
    b.env.TelegramWebviewProxy.postEvent = () => { throw new Error("Must not call native bridge"); };
    startRedirect(config, b.env);
    assert.equal(b.notice.hidden, false);
    if (cancel) b.events.click();
    for (let i = 0; i < 5; i++) b.tick();
    assert.equal(b.destination(), cancel ? undefined : "https://t.me/example");
  }
  assert.equal(redirectTarget(configuration(), "Safari/604.1", page, true), null);
  const disabled = configuration("https://t.me/example");
  disabled.links[0].enabled = false;
  assert.equal(redirectTarget(disabled, "Safari/604.1", page, true), null);
});
