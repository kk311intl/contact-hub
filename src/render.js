import { iconSvg } from "../public/icons.js";
import { uiFor } from "./i18n.js";

export function renderHome(config, lang, origin, visitorCount = null, legacyPublicUi = false) {
  const ui = uiFor(lang);
  const links = [...config.links].sort((a, b) => a.order - b.order);
  const websites = links.filter((link) => ["website", "link"].includes(link.type));
  const contacts = links.filter((link) => !["website", "link"].includes(link.type));
  const initials = makeInitials(config.name);
  const canonical = config.settings.canonicalUrl || origin;
  const description = config.bio[lang] || config.bio.en;
  const footerLinks = config.settings.footerLinks.filter((link) => link.label.trim() && link.url.trim()).slice(0, 1);
  const currentYear = new Date().getUTCFullYear();
  return documentShell({
    lang,
    title: config.settings.siteTitle || `${config.name} — ${ui.contact}`,
    description,
    canonical,
    favicon: config.avatar,
    bodyClass: "public-page",
    body: `
      <a class="skip-link" href="#main">${ui.skip}</a>
      <header class="topbar" aria-label="${legacyPublicUi ? "Site preferences" : ui.preferences}">${preferenceControls(lang, legacyPublicUi)}</header>
      <main id="main" class="contact-shell">
        <section class="identity reveal reveal-1" aria-labelledby="profile-name">
          <button class="avatar-wrap" type="button" aria-label="${escapeAttr(config.name)}" data-admin-entry>${config.avatar ? `<img class="avatar" src="${escapeAttr(config.avatar)}" alt="" width="112" height="112" data-avatar><span class="avatar-fallback" aria-hidden="true">${escapeHtml(initials)}</span>` : `<span class="avatar avatar-fallback" aria-hidden="true">${escapeHtml(initials)}</span>`}</button>
          <h1 id="profile-name">${escapeHtml(config.name)}</h1>
          <p class="bio" data-bio>${escapeHtml(description)}</p>
          <p class="status"><span aria-hidden="true"></span><span data-status>${escapeHtml(config.status[lang] || config.status.en)}</span></p>
        </section>
        <section class="links-hub reveal reveal-2">
          <nav class="contact-icons" aria-label="${ui.contact}" data-contact-icons>${contacts.map((link) => renderContactIcon(link, ui.pending)).join("")}</nav>
          <h2 class="sr-only" data-websites-title>${ui.websites}</h2>
          <div class="link-list" data-links>${websites.map((link) => renderSiteLink(link, ui.pending)).join("")}</div>
        </section>
      </main>
      <footer><div class="footer-meta"><span class="footer-year">© ${currentYear}</span><span class="footer-credit">${legacyPublicUi ? "Powered by" : ui.credit} <strong data-footer-name>${escapeHtml(config.name)}</strong>${!legacyPublicUi && ui.creditEnd ? ` ${ui.creditEnd}` : ""}</span>${footerLinks.map((link) => `<a class="footer-link" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div><span class="footer-visitors" data-visitors${Number.isSafeInteger(visitorCount) && visitorCount > 0 ? ` data-count="${visitorCount}"` : ""} aria-live="polite"${visitorCount ? "" : " hidden"}>${visitorCount ? escapeHtml(visitorText(lang, visitorCount)) : ""}</span></footer>
      ${bootstrap(config, lang)}
      <script type="module" src="/app-v3.js"></script>`
  });
}

function visitorText(lang, count) {
  const number = count.toLocaleString(lang);
  if (lang === "zh-TW") return `第 ${number} 位來訪者`;
  if (lang === "ja") return `${number}人目の訪問者`;
  return `Visitor #${number}`;
}

export function renderAdmin(config, lang = "en") {
  const ui = uiFor(lang).admin;
  return documentShell({
    lang,
    title: `${ui.title} — ${config.settings.siteTitle || config.name}`,
    description: ui.description,
    canonical: "",
    favicon: config.avatar,
    bodyClass: "admin-page",
    body: `
      <a class="skip-link" href="#admin-main">${uiFor(lang).skip}</a>
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div><a class="admin-brand" href="/" aria-label="${uiFor(lang).back}"><span class="admin-brand-avatar">${config.avatar ? `<img src="${escapeAttr(config.avatar)}" alt="">` : escapeHtml(makeInitials(config.name))}</span><b>${escapeHtml(config.name)}</b></a></div>
          <nav class="admin-nav" aria-label="${ui.menu}">
            <button class="active" data-section-button="profile">${ui.profile}</button>
            <button data-section-button="bio">${ui.bio}</button>
            <button data-section-button="links">${ui.links}</button>
            <button data-section-button="settings">${ui.settings}</button>
          </nav>
          <div class="sidebar-footer"><a class="view-site" href="/" target="_blank" rel="noopener noreferrer">${ui.viewSite} <span aria-hidden="true">↗</span></a><form action="/admin/logout" method="post"><button type="submit">${ui.logout}</button></form></div>
        </aside>
        <main id="admin-main" class="admin-main">
          <header class="admin-header"><div><p>Contact Hub</p><h1>${ui.content}</h1></div><div class="admin-actions"><form class="mobile-logout" action="/admin/logout" method="post"><button type="submit">${ui.logout}</button></form><button class="save-button" type="button" data-save>${ui.save}</button></div></header>
          <form data-admin-form autocomplete="off" novalidate>
            <section class="editor-section active" data-section="profile"><div class="section-heading"><h2>${ui.profile}</h2><p>${ui.profileHelp}</p></div><div class="form-card">
              ${field("name", ui.name, config.name, "text", 80)}
              <div class="avatar-editor"><div class="avatar-preview" data-avatar-preview>${config.avatar ? `<img src="${escapeAttr(config.avatar)}" alt="${ui.currentAvatar}">` : `<span>${escapeHtml(makeInitials(config.name))}</span>`}</div><div><strong>${ui.avatar}</strong><small>${ui.avatarHelp}</small><div class="avatar-actions"><button type="button" data-avatar-upload>${ui.chooseImage}</button><button type="button" data-avatar-remove>${ui.remove}</button></div><input type="file" accept="image/jpeg,image/png,image/webp" data-avatar-file hidden></div></div>
              ${field("avatar", ui.imageUrl, config.avatar.startsWith("data:") ? "" : config.avatar, "url", 2048, ui.imageUrlHelp)}
              <fieldset><legend>${ui.status}</legend><div class="locale-grid">${localeFields("status", config.status, 80)}</div></fieldset>
            </div></section>
            <section class="editor-section" data-section="bio"><div class="section-heading"><h2>${ui.bio}</h2><p>${ui.bioHelp}</p></div><div class="form-card locale-stack">${localeFields("bio", config.bio, 1000, true)}</div></section>
            <section class="editor-section" data-section="links"><div class="section-heading section-heading-actions"><div><h2>${ui.links}</h2><p>${ui.linksHelp}</p></div><div class="link-add-actions"><button type="button" class="add-link-button" data-add-link>${ui.addWebsite}</button><button type="button" class="add-link-button" data-add-contact>${ui.addContact}</button><button type="button" class="add-link-button" data-add-email>${ui.addEmail}</button></div></div><div class="links-editor" data-links-editor></div></section>
            <section class="editor-section" data-section="settings"><div class="section-heading"><h2>${ui.settings}</h2><p>${ui.settingsHelp}</p></div><div class="form-card">${field("siteTitle", ui.siteTitle, config.settings.siteTitle, "text", 120, ui.siteTitleHint)}${field("canonicalUrl", ui.canonical, config.settings.canonicalUrl, "url", 2048, ui.canonicalHint)}</div><div class="footer-settings"><div class="section-heading"><h3>${ui.footerLink}</h3><p>${ui.footerHelp}</p></div><div class="footer-links-editor" data-footer-links-editor></div></div></section></form><section class="editor-section" data-section="settings"><div class="form-card password-card" data-password-panel><div><h3>${ui.changePassword}</h3><p>${ui.passwordHelp}</p></div>${passwordField("currentPassword", ui.currentPassword, "current-password")}${passwordField("newPassword", ui.newPassword, "new-password")}${passwordField("confirmPassword", ui.confirmPassword, "new-password")}<button class="password-button" type="button" data-password-save>${ui.updatePassword}</button></div></section>
        </main>
      </div>
      <div class="toast" role="status" aria-live="polite" data-toast></div>
      ${bootstrap(config, lang, true)}
      <script type="module" src="/admin-v4.js"></script>`
  });
}

export function renderNotFound(lang) {
  const ui = uiFor(lang);
  return documentShell({ lang, title: `404 — ${ui.notFound}`, description: ui.notFound, canonical: "", bodyClass: "error-page", body: `<main><p class="error-code">404</p><h1>${ui.notFound}</h1><a class="back-link" href="/">${ui.back} <span aria-hidden="true">→</span></a></main>` });
}

export function renderForbidden(lang = "en") {
  const ui = uiFor(lang).admin;
  return documentShell({ lang, title: `403 — ${ui.forbidden}`, description: ui.forbidden, canonical: "", bodyClass: "error-page", body: `<main><p class="error-code">403</p><h1>${ui.forbidden}</h1><p class="error-detail">${ui.forbiddenDetail}</p><a class="back-link" href="/admin/login">${ui.goToLogin} <span aria-hidden="true">→</span></a></main>` });
}

export function renderLogin(config, error = "", lang = "en") {
  const ui = uiFor(lang).admin;
  const mark = config.avatar ? `<img src="${escapeAttr(config.avatar)}" alt="">` : escapeHtml(makeInitials(config.name));
  return documentShell({
    lang,
    title: `${ui.signIn} — Contact Hub`,
    description: ui.description,
    canonical: "",
    favicon: config.avatar,
    bodyClass: "login-page",
    body: `<main class="login-shell"><a class="login-mark" href="/" aria-label="${uiFor(lang).back}">${mark}</a><div class="login-heading"><p>Contact Hub</p><h1>${ui.title}</h1><span>${ui.loginPrompt}</span></div>${error ? `<p class="login-error" role="alert">${escapeHtml(error)}</p>` : ""}<form class="login-form" action="/admin/login" method="post"><label class="field"><span>${ui.password}</span><input name="password" type="password" autocomplete="current-password" required autofocus></label><button type="submit">${ui.signIn}</button></form><a class="login-back" href="/">← ${ui.backToSite}</a></main>`
  });
}

function documentShell({ lang, title, description, canonical, favicon = "", bodyClass, body }) {
  return `<!doctype html><html lang="${lang === "zh-TW" ? "zh-Hant" : lang}" data-theme="auto"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeAttr(description)}"><meta name="color-scheme" content="light dark"><meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f5f7"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#050505">${canonical ? `<link rel="canonical" href="${escapeAttr(canonical)}"><meta property="og:url" content="${escapeAttr(canonical)}">` : ""}<meta property="og:type" content="profile"><meta property="og:title" content="${escapeAttr(title)}"><meta property="og:description" content="${escapeAttr(description)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeAttr(title)}"><meta name="twitter:description" content="${escapeAttr(description)}"><link rel="icon" href="${escapeAttr(favicon || "/favicon.svg")}"><link rel="stylesheet" href="/styles-v6.css"></head><body class="${bodyClass}">${body}</body></html>`;
}

function preferenceControls(lang, legacy = false) {
  const ui = uiFor(lang);
  if (legacy) return `<div class="preferences"><label><span>${ui.language}</span><svg class="language-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-2.5 2.5-3.8 5.5-3.8 9s1.3 6.5 3.8 9M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9"/></svg><select data-language aria-label="${ui.language}"><option value="zh-TW"${lang === "zh-TW" ? " selected" : ""}>中文</option><option value="en"${lang === "en" ? " selected" : ""}>EN</option><option value="ja"${lang === "ja" ? " selected" : ""}>日本語</option></select></label><button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="${lang === "ja" ? "外観" : ui.appearance}" data-theme-toggle><span class="sun" aria-hidden="true">☀</span><span class="theme-track" aria-hidden="true"><i></i></span><span class="moon" aria-hidden="true">☾</span></button></div>`;
  return `<div class="preferences"><label class="language-control"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg><span class="sr-only">${ui.language}</span><select aria-label="${ui.language}" data-language><option value="zh-TW"${lang === "zh-TW" ? " selected" : ""}>中文</option><option value="en"${lang === "en" ? " selected" : ""}>English</option><option value="ja"${lang === "ja" ? " selected" : ""}>日本語</option></select></label><button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="${ui.appearance}" data-theme-toggle><span class="sun" aria-hidden="true">☀</span><span class="theme-track" aria-hidden="true"><i></i></span><span class="moon" aria-hidden="true">☾</span></button></div>`;
}

function renderSiteLink(link, pending) {
  const available = link.enabled && Boolean(link.url);
  const classes = `site-card${available ? "" : " disabled"}`;
  const content = `<span class="link-icon" aria-hidden="true">${iconSvg(link.icon || link.type)}</span><span class="link-copy"><strong>${escapeHtml(link.label)}</strong><small${available ? "" : " data-pending"}>${escapeHtml(available ? (link.value || link.url) : pending)}</small></span><span class="arrow" aria-hidden="true">${available ? "↗" : "—"}</span>`;
  if (!available) return `<div class="${classes}" aria-disabled="true" data-link-id="${escapeAttr(link.id)}">${content}</div>`;
  const external = !link.url.toLowerCase().startsWith("mailto:");
  return `<a class="${classes}" href="${escapeAttr(link.url)}"${external ? ` target="_blank" rel="noopener noreferrer"` : ""} data-link-id="${escapeAttr(link.id)}">${content}</a>`;
}

function renderContactIcon(link, pending) {
  const available = link.enabled && Boolean(link.url);
  const label = `${link.label} — ${available ? (link.value || link.url) : pending}`;
  const content = `${iconSvg(link.icon || link.type)}<span class="sr-only">${escapeHtml(link.label)} — ${available ? escapeHtml(link.value || link.url) : `<span data-pending>${escapeHtml(pending)}</span>`}</span>`;
  if (!available) return `<span class="contact-icon-button disabled" aria-disabled="true" tabindex="0" data-tooltip="${escapeAttr(pending)}" data-pending-tooltip data-link-id="${escapeAttr(link.id)}">${content}</span>`;
  const external = !link.url.toLowerCase().startsWith("mailto:");
  return `<a class="contact-icon-button" href="${escapeAttr(link.url)}" aria-label="${escapeAttr(label)}" data-tooltip="${escapeAttr(link.label)}"${external ? ` target="_blank" rel="noopener noreferrer"` : ""} data-link-id="${escapeAttr(link.id)}">${content}</a>`;
}

function field(name, label, value, type, maxlength, hint = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" maxlength="${maxlength}" value="${escapeAttr(value)}">${hint ? `<small>${hint}</small>` : ""}</label>`;
}

function passwordField(name, label, autocomplete, hint = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="password" autocomplete="${autocomplete}">${hint ? `<small>${hint}</small>` : ""}</label>`;
}

function localeFields(name, values, maxlength, textarea = false) {
  const labels = { "zh-TW": "中文", en: "English", ja: "日本語" };
  return Object.entries(labels).map(([lang, label]) => `<label class="field"><span>${label}</span>${textarea ? `<textarea name="${name}.${lang}" maxlength="${maxlength}" rows="5">${escapeHtml(values[lang])}</textarea>` : `<input name="${name}.${lang}" maxlength="${maxlength}" value="${escapeAttr(values[lang])}">`}</label>`).join("");
}

function bootstrap(config, lang, includeUi = false) {
  const ui = uiFor(lang);
  return `<script type="application/json" id="bootstrap">${JSON.stringify({ config, lang, admin: includeUi ? ui.admin : undefined, icons: includeUi ? ui.icons : undefined }).replace(/</g, "\\u003c")}</script>`;
}

function makeInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : [...(parts[0] || "?")].slice(0, 2).join("")).toUpperCase();
}

function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function escapeAttr(value = "") { return escapeHtml(value).replace(/`/g, "&#96;"); }
