// Explicit app UA markers or Telegram's injected bridge; never infer an app from generic Safari.
// Marker references: https://github.com/shalanah/inapp-spy and https://github.com/ua-parser/uap-core
// Telegram: https://core.telegram.org/bots/webapps#additional-data-in-user-agent
const APPS = [
  ["Threads", /\bBarcelona\b|\bThreads\//i, ["threads.net", "threads.com"]],
  ["Instagram", /\bInstagram\b/i, ["instagram.com"]],
  ["Messenger", /\bFBAN\/Messenger|\bMessengerFor/i, ["messenger.com", "m.me"]],
  ["Facebook", /\bFBAN\/|\bFB_IAB\/|\bFBAV\/|\bFacebook\//i, ["facebook.com", "fb.com", "fb.me"]],
  ["X", /\bTwitter(?:\b|\/)/i, ["twitter.com", "x.com"]],
  ["LINE", /\bLine\//i, ["line.me", "lin.ee"]],
  ["TikTok", /\bTikTok\b|musical_ly|trill\//i, ["tiktok.com"]],
  ["Snapchat", /\bSnapchat\b/i, ["snapchat.com"]],
  ["LinkedIn", /\bLinkedInApp\b/i, ["linkedin.com"]],
  ["WhatsApp", /\b(?:WAiOS|WA4A)\//i, ["whatsapp.com", "wa.me"]],
  ["Reddit", /\bReddit\//i, ["reddit.com", "redd.it"]],
  ["Telegram", /\bTelegram(?:-Android|-iOS)?\//i, ["t.me", "telegram.me"]],
  ["Pinterest", /\bPinterest(?: for Android(?: Tablet)?|)\//i, ["pinterest.com", "pin.it"]],
  ["KakaoTalk", /\bKAKAOTALK\//i, ["open.kakao.com", "pf.kakao.com"]],
  ["Weibo", /\bweibo__|\bWeiboliteiOS\b|\bWeiboIntliOS\b/i, ["weibo.com", "weibo.cn"]]
];

export function redirectTarget(config, ua, currentUrl, telegramBridge = false) {
  if (config?.settings?.autoRedirectEnabled !== true) return null;
  // WeChat has no general personal-account HTTPS contact link; keep copy-only contacts manual.
  if (/\bMicroMessenger\//i.test(ua)) return null;
  if (/bot\b|crawler|spider/i.test(ua)) return null;
  if (!Number.isInteger(config.settings.autoRedirectSeconds) || config.settings.autoRedirectSeconds < 1 || config.settings.autoRedirectSeconds > 10) return null;
  const app = APPS.find(([, pattern]) => pattern.test(ua)) || (telegramBridge ? APPS.find(([name]) => name === "Telegram") : null);
  if (!app) return null;
  for (const link of [...config.links].sort((a, b) => a.order - b.order)) {
    if (!link.enabled || ["website", "link", "email"].includes(link.type)) continue;
    try {
      const url = new URL(link.url);
      if (url.protocol !== "https:" || url.username || url.password || url.origin === new URL(currentUrl).origin) continue;
      if (app[2].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return { app: app[0], url: url.href, label: link.label };
    } catch { /* Invalid or missing URLs are not redirect targets. */ }
  }
  return null;
}

const MESSAGES = {
  "zh-Hant": { countdown: (name, seconds) => `${seconds} 秒後開啟 ${name}\n輕點取消`, cancelled: "已取消自動跳轉" },
  en: { countdown: (name, seconds) => `Opening ${name} in ${seconds}s\nTap to cancel`, cancelled: "Auto-redirect cancelled" },
  ja: { countdown: (name, seconds) => `${seconds}秒後に${name}を開きます\nタップでキャンセル`, cancelled: "自動移動をキャンセルしました" }
};

export function startRedirect(config, browser = window) {
  // Telegram iOS BrowserWebContent.swift injects this bridge even without an app UA token.
  // Only inspect it; do not invoke the native bridge.
  const telegramBridge = typeof browser.TelegramWebviewProxy?.postEvent === "function";
  const target = redirectTarget(config, browser.navigator.userAgent, browser.location.href, telegramBridge);
  if (!target) return;
  const { document } = browser;
  const notice = document.querySelector("[data-redirect-notice]");
  if (!notice) return;
  const message = notice.querySelector("[data-redirect-message]");
  // A session marker avoids repeated redirects after Back/reload; no UA is stored or sent.
  try {
    if (browser.sessionStorage.getItem("contact-auto-redirect")) return;
    browser.sessionStorage.setItem("contact-auto-redirect", "1");
  } catch { return; }
  let remaining = config.settings.autoRedirectSeconds;
  let stopped = false;
  notice.style.setProperty("--redirect-duration", `${remaining}s`);
  notice.style.setProperty("--redirect-progress", "0%");
  notice.dataset.redirectState = document.visibilityState === "hidden" ? "paused" : "running";
  const messages = () => MESSAGES[document.documentElement.lang] || MESSAGES.en;
  const update = () => { message.textContent = messages().countdown(target.label || target.app, remaining); };
  notice.hidden = false;
  update();
  const cancel = () => {
    stopped = true;
    notice.style.setProperty("--cancel-width", browser.getComputedStyle?.(notice, "::before").width || notice.style.getPropertyValue?.("--redirect-progress") || "0%");
    const border = notice.querySelector(".redirect-border rect");
    const borderOffset = Number.parseFloat(border && browser.getComputedStyle?.(border).strokeDashoffset) || 0;
    notice.style.setProperty("--border-fill-start", String(borderOffset));
    notice.style.setProperty("--border-fill-end", String(borderOffset + 44));
    notice.dataset.redirectState = "completing";
    browser.clearInterval(timer);
    message.textContent = messages().cancelled;
    browser.setTimeout(() => {
      notice.dataset.redirectState = "exiting";
      browser.setTimeout(() => { notice.hidden = true; }, 220);
    }, 2000);
  };
  notice.addEventListener("click", cancel, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!stopped) notice.dataset.redirectState = document.visibilityState === "hidden" ? "paused" : "running";
  });
  document.querySelectorAll("[data-language]").forEach((select) => select.addEventListener("change", () => { if (!stopped) update(); }));
  document.querySelectorAll("[data-link-id], [data-admin-entry]").forEach((link) => link.addEventListener("click", () => { if (!stopped) cancel(); }));
  const timer = browser.setInterval(() => {
    if (stopped || document.visibilityState === "hidden") return;
    remaining -= 1;
    notice.style.setProperty("--redirect-progress", `${100 * (1 - remaining / config.settings.autoRedirectSeconds)}%`);
    if (remaining > 0) { update(); return; }
    stopped = true;
    browser.clearInterval(timer);
    notice.hidden = true;
    browser.location.assign(target.url);
  }, 1000);
  browser.addEventListener("pagehide", () => { stopped = true; browser.clearInterval(timer); notice.hidden = true; }, { once: true });
}

if (typeof document !== "undefined") {
  const bootstrap = JSON.parse(document.querySelector("#bootstrap")?.textContent || "{}");
  startRedirect(bootstrap.config);
}
