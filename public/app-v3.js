const bootstrap = JSON.parse(document.querySelector("#bootstrap")?.textContent || "{}");
const config = bootstrap.config;
const copyMessages = {
  "zh-TW": { success: "已複製帳戶", failure: "無法複製，請手動複製：" },
  en: { success: "Account copied", failure: "Could not copy. Please copy manually: " },
  ja: { success: "アカウントをコピーしました", failure: "コピーできませんでした。手動でコピーしてください：" }
};
const translations = {
  "zh-TW": { contact: "聯絡方式", websites: "網站", language: "語言", theme: "外觀", pending: "準備中", skip: "跳至主要內容", visitor: (n) => `第 ${n.toLocaleString("zh-TW")} 位來訪者` },
  en: { contact: "Contact", websites: "Websites", language: "Language", theme: "Appearance", pending: "Coming soon", skip: "Skip to content", visitor: (n) => `Visitor #${n.toLocaleString("en")}` },
  ja: { contact: "連絡先", websites: "ウェブサイト", language: "言語", theme: "外観", pending: "準備中", skip: "本文へ移動", visitor: (n) => `${n.toLocaleString("ja")}人目の訪問者` }
};
function readPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Preferences still apply to this page. */ }
}
const storedLanguage = readPreference("contact-language");
const currentLanguage = storedLanguage && translations[storedLanguage] ? storedLanguage : detectBrowserLanguage();
const colorScheme = matchMedia("(prefers-color-scheme: dark)");
const storedTheme = readPreference("contact-theme");
let currentTheme = ["light", "dark"].includes(storedTheme) ? storedTheme : "auto";
applyTheme(currentTheme);

document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", () => {
  const effective = currentTheme === "auto" ? (colorScheme.matches ? "dark" : "light") : currentTheme;
  applyTheme(effective === "dark" ? "light" : "dark", true);
}));
colorScheme.addEventListener("change", () => { if (currentTheme === "auto") applyTheme("auto"); });
document.querySelectorAll("[data-language]").forEach((select) => {
  select.value = currentLanguage;
  select.addEventListener("change", () => applyLanguage(select.value, true));
});
applyLanguage(currentLanguage);

let copyToastTimer;
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
  let failed = false;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
  } catch {
    failed = true;
  }
  const lang = document.documentElement.lang === "zh-Hant" ? "zh-TW" : document.documentElement.lang;
  const messages = copyMessages[lang] || copyMessages.en;
  const toast = document.querySelector("[data-toast]");
  clearTimeout(copyToastTimer);
  toast.textContent = failed ? messages.failure + button.dataset.copy : messages.success;
  toast.className = `toast show${failed ? " error" : ""}`;
  if (!failed) copyToastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}));

const visitors = document.querySelector("[data-visitors]");
visitors?.addEventListener("toggle", () => { if (!visitors.open) visitors.dataset.suppressHover = ""; });
visitors?.addEventListener("mouseleave", () => { delete visitors.dataset.suppressHover; });

document.querySelector("[data-avatar]")?.addEventListener("error", (event) => {
  event.currentTarget.hidden = true;
});

let adminEntryClicks = 0;
let adminEntryReset;
document.querySelector("[data-admin-entry]")?.addEventListener("click", () => {
  clearTimeout(adminEntryReset);
  adminEntryClicks += 1;
  if (adminEntryClicks === 5) location.assign("/admin");
  else adminEntryReset = setTimeout(() => { adminEntryClicks = 0; }, 2000);
});

function detectBrowserLanguage() {
  for (const raw of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const code = String(raw).toLowerCase();
    if (["zh-tw", "zh-hk"].includes(code) || code.startsWith("zh-hant")) return "zh-TW";
    if (code === "ja" || code.startsWith("ja-")) return "ja";
    if (code === "en" || code.startsWith("en-")) return "en";
  }
  return "en";
}

function applyTheme(theme, persist = false) {
  const selected = ["auto", "light", "dark"].includes(theme) ? theme : "auto";
  currentTheme = selected;
  document.documentElement.dataset.theme = selected;
  if (persist) writePreference("contact-theme", selected);
  const isDark = selected === "dark" || (selected === "auto" && colorScheme.matches);
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.setAttribute("aria-checked", String(isDark)));
}

function applyLanguage(language, persist = false) {
  const lang = translations[language] ? language : "en";
  document.documentElement.lang = lang === "zh-TW" ? "zh-Hant" : lang;
  if (persist) writePreference("contact-language", lang);
  document.querySelectorAll("[data-language]").forEach((select) => { select.value = lang; select.setAttribute("aria-label", translations[lang].language); });
  if (!config) return;
  const ui = translations[lang];
  const visitor = document.querySelector("[data-visitors]");
  if (visitor?.dataset.count) {
    const text = ui.visitor(Number(visitor.dataset.count));
    visitor.querySelector("[data-visitor-count]").textContent = text;
    visitor.querySelector("summary").setAttribute("aria-label", text);
  }
  document.querySelector("[data-bio]").textContent = config.bio[lang] || config.bio.en;
  document.querySelector("[data-status]").textContent = config.status[lang] || config.status.en;
  const websitesTitle = document.querySelector("[data-websites-title]");
  if (websitesTitle) websitesTitle.textContent = ui.websites;
  document.querySelector("[data-contact-icons]")?.setAttribute("aria-label", ui.contact);
  document.querySelectorAll(".preferences label:first-child > span").forEach((node) => { node.textContent = ui.language; });
  document.querySelectorAll("[data-theme-toggle]").forEach((node) => { node.setAttribute("aria-label", ui.theme); });
  const skip = document.querySelector(".skip-link");
  if (skip) skip.textContent = ui.skip;
  document.querySelectorAll("[data-pending]").forEach((node) => { node.textContent = ui.pending; });
  document.querySelectorAll("[data-pending-tooltip]").forEach((node) => { node.dataset.tooltip = ui.pending; });
  document.title = config.settings.siteTitle || `${config.name} — ${ui.contact}`;
}
