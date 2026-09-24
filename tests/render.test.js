import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, normalizeConfig } from "../src/config.js";
import { renderAdmin, renderHome, renderLogin } from "../src/render.js";
import { ICON_GROUPS, iconSvg } from "../public/icons.js";

test("icon picker separates generic and brand icons without losing choices", () => {
  const generic = ICON_GROUPS.generic.map(([value]) => value);
  const brands = ICON_GROUPS.brands.map(([value]) => value);
  assert.ok(generic.includes("globe"));
  assert.ok(brands.includes("discord"));
  assert.equal(new Set([...generic, ...brands]).size, generic.length + brands.length);
  for (const value of [...generic, ...brands].filter((value) => value !== "link")) assert.notEqual(iconSvg(value), iconSvg("missing"));
});

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

test("visitor count starts behind a click-to-open summary in all three languages", () => {
  for (const [lang, label] of [["zh-TW", "第 123 位來訪者"], ["en", "Visitor #123"], ["ja", "123人目の訪問者"]]) {
    const html = renderHome(normalizeConfig(DEFAULT_CONFIG), lang, "https://example.com", 123);
    assert.match(html, /<details class="footer-visitors" data-visitors data-count="123"><summary/);
    assert.ok(html.includes(`<summary aria-label="${label}"`));
    assert.ok(html.includes(`data-visitor-count aria-live="polite">${label}</span>`));
  }
});

test("admin and login follow the deployment's fixed language", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.avatar = "https://example.com/avatar.webp";
  for (const [lang, save, signIn, generic, brand] of [["zh-TW", "儲存變更", "登入", "通用圖示", "品牌圖示"], ["en", "Save changes", "Sign in", "General", "Brands"], ["ja", "変更を保存", "ログイン", "汎用アイコン", "ブランドアイコン"]]) {
    const admin = renderAdmin(config, lang);
    assert.ok(admin.includes(`>${save}</button>`));
    assert.match(admin, /id="bootstrap"/);
    assert.ok(admin.includes(`"genericIcons":"${generic}"`));
    assert.ok(admin.includes(`"brandIcons":"${brand}"`));
    const login = renderLogin(config, "", lang);
    assert.ok(login.includes(`<button type="submit">${signIn}</button>`));
    assert.match(login, /class="login-mark"[^>]*><img src="https:\/\/example\.com\/avatar\.webp"/);
  }
});
