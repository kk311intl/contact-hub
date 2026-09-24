export const CONFIG_KEY = "profile_config";
export const MAX_BODY_BYTES = 384 * 1024;
export const LANGUAGES = ["zh-TW", "en", "ja"];
export function adminLanguage(value) { return LANGUAGES.includes(value) ? value : "en"; }

export const DEFAULT_CONFIG = Object.freeze({
  name: "Your Name",
  avatar: "",
  status: {
    "zh-TW": "歡迎聯絡",
    en: "Available",
    ja: "お問い合わせ歓迎"
  },
  bio: {
    "zh-TW": "歡迎透過下方連結與我聯絡。",
    en: "Find my links and contact details below.",
    ja: "リンクと連絡先はこちらです。"
  },
  links: [
    { id: "website", type: "website", icon: "globe", label: "Website", value: "", url: "", enabled: false, order: 1 },
    { id: "email", type: "email", label: "Email", value: "", url: "", enabled: false, order: 2 },
    { id: "telegram", type: "telegram", label: "Telegram", value: "", url: "", enabled: false, order: 3 }
  ],
  settings: {
    autoRedirectEnabled: false,
    autoRedirectSeconds: 5,
    siteTitle: "",
    canonicalUrl: "",
    footerLinks: [
      { id: "footer", label: "", url: "", order: 1 }
    ]
  }
});

const cloneDefault = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG));
const VALIDATION = {
  "zh-TW": {
    fields: { name: "名稱", avatar: "頭像", bio: "個人簡介", status: "狀態", links: "聯絡連結", siteTitle: "網頁標題", canonical: "網站公開網址", footer: "頁尾連結" },
    length: (required, max) => `必須是 ${required ? "1" : "0"}–${max} 個字元`, avatar: "必須是 http(s) 網址或 256 KiB 以下的 JPG、PNG、WebP 圖片", maxLinks: "必須是最多 20 項的陣列", email: "必須是有效的電子郵件地址", boolean: "必須是布林值", order: "必須是 0–999 的整數", linkUrl: "僅支援 https 或 mailto", duplicate: "不可重複", canonical: "必須是 http 或 https 網址", maxFooter: "必須是最多 1 項的陣列", footerUrl: "必須是 http 或 https 網址"
  },
  en: {
    fields: { name: "Name", avatar: "Avatar", bio: "Bio", status: "Status", links: "Contact links", siteTitle: "Page title", canonical: "Public site URL", footer: "Footer links" },
    length: (required, max) => `must contain ${required ? "1" : "0"}–${max} characters`, avatar: "must be an http(s) URL or a JPG, PNG, or WebP image under 256 KiB", maxLinks: "must be an array of at most 20 items", email: "must be a valid email address", boolean: "must be true or false", order: "must be an integer from 0 to 999", linkUrl: "only supports https or mailto", duplicate: "must be unique", canonical: "must be an http or https URL", maxFooter: "must be an array of at most 1 item", footerUrl: "must be an http or https URL"
  },
  ja: {
    fields: { name: "名前", avatar: "画像", bio: "自己紹介", status: "ステータス", links: "連絡先リンク", siteTitle: "ページタイトル", canonical: "公開サイトの URL", footer: "フッターのリンク" },
    length: (required, max) => `${required ? "1" : "0"}〜${max}文字で入力してください`, avatar: "http(s) の URL、または 256 KiB 以下の JPG・PNG・WebP 画像にしてください", maxLinks: "最大 20 件の配列にしてください", email: "有効なメールアドレスを入力してください", boolean: "真偽値にしてください", order: "0〜999 の整数にしてください", linkUrl: "https または mailto のみ使用できます", duplicate: "重複できません", canonical: "http または https の URL にしてください", maxFooter: "最大 1 件の配列にしてください", footerUrl: "http または https の URL にしてください"
  }
};

export function normalizeConfig(input) {
  const fallback = cloneDefault();
  if (!input || typeof input !== "object" || Array.isArray(input)) return fallback;
  return {
    name: typeof input.name === "string" ? input.name : fallback.name,
    avatar: typeof input.avatar === "string" ? input.avatar : "",
    status: normalizeLocalized(input.status, fallback.status),
    bio: normalizeLocalized(input.bio, fallback.bio),
    links: normalizeLinks(input.links, fallback.links),
    settings: {
      autoRedirectEnabled: input.settings?.autoRedirectEnabled ?? false,
      autoRedirectSeconds: input.settings?.autoRedirectSeconds ?? 5,
      siteTitle: typeof input.settings?.siteTitle === "string" ? input.settings.siteTitle : fallback.settings.siteTitle,
      canonicalUrl: typeof input.settings?.canonicalUrl === "string" ? input.settings.canonicalUrl : "",
      footerLinks: normalizeFooterLinks(input.settings?.footerLinks, fallback.settings.footerLinks)
    }
  };
}

function normalizeFooterLinks(input, fallback) {
  if (!Array.isArray(input)) return fallback;
  if (!input.length) return [{ id: "footer", label: "", url: "", order: 1 }];
  return input.slice(0, 1).map((link) => ({
    id: String(link?.id ?? ""),
    label: String(link?.label ?? ""),
    url: String(link?.url ?? ""),
    order: Number.isFinite(Number(link?.order)) ? Number(link.order) : 0
  }));
}

function normalizeLocalized(value, fallback) {
  return Object.fromEntries(LANGUAGES.map((lang) => [lang, typeof value?.[lang] === "string" ? value[lang] : fallback[lang]]));
}

function normalizeLink(link) {
  if (!link || typeof link !== "object") return null;
  const normalized = {
    id: String(link.id ?? ""),
    type: String(link.type ?? "link"),
    icon: String(link.icon ?? ""),
    label: String(link.label ?? ""),
    value: String(link.value ?? ""),
    url: String(link.url ?? ""),
    enabled: Boolean(link.enabled),
    order: Number.isFinite(Number(link.order)) ? Number(link.order) : 0
  };
  if (normalized.type === "email") {
    if (!normalized.value && normalized.url.toLowerCase().startsWith("mailto:")) normalized.value = normalized.url.slice(7);
    normalized.url = normalized.value ? `mailto:${normalized.value}` : "";
  }
  if (normalized.type === "github") {
    normalized.type = "link";
    normalized.icon ||= "github";
  }
  if (!normalized.icon && normalized.type === "website") normalized.icon = "globe";
  if (!normalized.icon && normalized.type === "link") normalized.icon = "link";
  if (!normalized.icon && ["email", "telegram", "line", "x"].includes(normalized.type)) normalized.icon = normalized.type;
  return normalized;
}

function normalizeLinks(input, defaults) {
  if (!Array.isArray(input)) return defaults;
  return input.map(normalizeLink).filter(Boolean);
}

export function validateConfig(config, language = "en") {
  const v = VALIDATION[adminLanguage(language)];
  const errors = [];
  const text = (value, path, max, required = true) => {
    if (typeof value !== "string" || (required && !value.trim()) || value.length > max) errors.push(`${path} ${v.length(required, max)}`);
  };
  text(config?.name, v.fields.name, 80);
  text(config?.avatar, v.fields.avatar, 360000, false);
  if (config?.avatar && !isValidAvatar(config.avatar)) errors.push(`${v.fields.avatar} ${v.avatar}`);
  for (const lang of LANGUAGES) {
    text(config?.bio?.[lang], `${v.fields.bio} ${lang}`, 1000, false);
    text(config?.status?.[lang], `${v.fields.status} ${lang}`, 80, false);
  }
  if (!Array.isArray(config?.links) || config.links.length > 20) {
    errors.push(`${v.fields.links} ${v.maxLinks}`);
  } else {
    const ids = new Set();
    config.links.forEach((link, index) => {
      const base = `${v.fields.links}[${index}]`;
      text(link?.id, `${base}.id`, 40);
      text(link?.type, `${base}.type`, 40);
      text(link?.icon, `${base}.icon`, 40, false);
      text(link?.label, `${base}.label`, 80);
      text(link?.value, `${base}.value`, 200, false);
      text(link?.url, `${base}.url`, 2048, false);
      if (link?.type === "email" && link?.value && !isEmail(link.value)) errors.push(`${base}.value ${v.email}`);
      if (typeof link?.enabled !== "boolean") errors.push(`${base}.enabled ${v.boolean}`);
      if (!Number.isInteger(link?.order) || link.order < 0 || link.order > 999) errors.push(`${base}.order ${v.order}`);
      if (link?.url && !isAllowedLink(link.url)) errors.push(`${base}.url ${v.linkUrl}`);
      if (ids.has(link?.id)) errors.push(`${base}.id ${v.duplicate}`);
      ids.add(link?.id);
    });
  }
  text(config?.settings?.siteTitle, v.fields.siteTitle, 120, false);
  if (typeof config?.settings?.autoRedirectEnabled !== "boolean") errors.push(`autoRedirectEnabled ${v.boolean}`);
  if (!Number.isInteger(config?.settings?.autoRedirectSeconds) || config.settings.autoRedirectSeconds < 1 || config.settings.autoRedirectSeconds > 10) {
    errors.push(({ "zh-TW": "自動跳轉時間必須是 1–10 秒的整數", en: "Auto-redirect delay must be an integer from 1 to 10 seconds", ja: "自動移動までの時間は1〜10秒の整数にしてください" })[adminLanguage(language)]);
  }
  text(config?.settings?.canonicalUrl, v.fields.canonical, 2048, false);
  if (config?.settings?.canonicalUrl && !isHttpUrl(config.settings.canonicalUrl)) errors.push(`${v.fields.canonical} ${v.canonical}`);
  if (!Array.isArray(config?.settings?.footerLinks) || config.settings.footerLinks.length > 1) {
    errors.push(`${v.fields.footer} ${v.maxFooter}`);
  } else {
    const ids = new Set();
    config.settings.footerLinks.forEach((link, index) => {
      const base = `${v.fields.footer}[${index}]`;
      text(link?.id, `${base}.id`, 40);
      text(link?.label, `${base}.label`, 40, false);
      text(link?.url, `${base}.url`, 2048, false);
      if (link?.url && !isHttpUrl(link.url)) errors.push(`${base}.url ${v.footerUrl}`);
      if (!Number.isInteger(link?.order) || link.order < 0 || link.order > 999) errors.push(`${base}.order ${v.order}`);
      if (ids.has(link?.id)) errors.push(`${base}.id ${v.duplicate}`);
      ids.add(link?.id);
    });
  }
  return errors;
}

export function detectLanguage(header = "") {
  const codes = header.toLowerCase().split(",").map((part) => part.trim().split(";")[0]);
  for (const code of codes) {
    if (code === "zh-tw" || code === "zh-hk" || code.startsWith("zh-hant")) return "zh-TW";
    if (code === "ja" || code.startsWith("ja-")) return "ja";
    if (code === "en" || code.startsWith("en-")) return "en";
  }
  return "en";
}

function isHttpUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function isAllowedLink(value) {
  try { return ["https:", "mailto:"].includes(new URL(value).protocol); } catch { return false; }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidAvatar(value) {
  if (isHttpUrl(value)) return true;
  const match = /^data:image\/(?:jpeg|png|webp);base64,([a-z0-9+/]+={0,2})$/i.exec(value);
  if (!match) return false;
  return Math.floor(match[1].length * 3 / 4) <= 256 * 1024;
}
