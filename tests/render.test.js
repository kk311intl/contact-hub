import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, normalizeConfig } from "../src/config.js";
import { renderAdmin, renderHome, renderLogin } from "../src/render.js";

test("keeps visitor language selection and contact icons above website cards", () => {
  const html = renderHome(normalizeConfig(DEFAULT_CONFIG), "zh-TW", "https://example.com");
  assert.match(html, /data-language/);
  assert.match(html, /id="bootstrap"/);
  assert.ok(html.indexOf('class="contact-icons"') < html.indexOf('class="link-list"'));
  assert.equal((html.match(/class="contact-icon-button/g) || []).length, 2);
  assert.equal((html.match(/class="site-card/g) || []).length, 1);
  assert.match(html, /data-tooltip="準備中"/);
  assert.match(html, /data-admin-entry/);
});

test("renders custom contact icons and does not restore deleted contacts", () => {
  const config = normalizeConfig({ ...structuredClone(DEFAULT_CONFIG), links: [
    { id: "signal", type: "contact", icon: "signal", label: "Message", value: "Signal", url: "https://signal.me/example", enabled: true, order: 1 }
  ] });
  const html = renderHome(config, "en", "https://example.com");
  assert.equal((html.match(/class="contact-icon-button/g) || []).length, 1);
  assert.match(html, /data-tooltip="Message"/);
  assert.doesNotMatch(html, /data-link-id="telegram"/);
});

test("uses the editable page title and avatar as the favicon", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.settings.siteTitle = "My Hub";
  config.avatar = "https://example.com/avatar.webp";
  const html = renderHome(config, "en", "https://example.com");
  assert.match(html, /<title>My Hub<\/title>/);
  assert.match(html, /<link rel="icon" href="https:\/\/example\.com\/avatar\.webp">/);
});

test("renders the current year, shared profile name, and optional footer link", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.name = "Example Person";
  config.settings.footerLinks[0] = { id: "status", label: "Status", url: "https://status.example.com", order: 1 };
  const html = renderHome(config, "en", "https://example.com");
  assert.match(html, new RegExp(`© ${new Date().getUTCFullYear()}`));
  assert.match(html, /Powered by <strong data-footer-name>Example Person<\/strong>/);
  assert.match(html, />Status<\/a>/);
  config.settings.footerLinks[0].url = "";
  assert.doesNotMatch(renderHome(config, "en", "https://example.com"), /class="footer-link"/);
});

test("legacy public presentation keeps the existing language switcher and footer", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  const html = renderHome(config, "ja", "https://example.com", 123, true);
  assert.match(html, /class="language-icon"/);
  assert.match(html, /<option value="en">EN<\/option>/);
  assert.match(html, /aria-label="外観" data-theme-toggle/);
  assert.match(html, /<span class="footer-credit">Powered by <strong/);
  assert.match(html, /123人目の訪問者/);
});

test("admin and login follow the deployment's fixed language", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.avatar = "https://example.com/avatar.webp";
  for (const [lang, save, signIn] of [["zh-TW", "儲存變更", "登入"], ["en", "Save changes", "Sign in"], ["ja", "変更を保存", "ログイン"]]) {
    const admin = renderAdmin(config, lang);
    assert.ok(admin.includes(`>${save}</button>`));
    assert.match(admin, /id="bootstrap"/);
    const login = renderLogin(config, "", lang);
    assert.ok(login.includes(`<button type="submit">${signIn}</button>`));
    assert.match(login, /class="login-mark"[^>]*><img src="https:\/\/example\.com\/avatar\.webp"/);
  }
});
