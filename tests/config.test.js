import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, detectLanguage, normalizeConfig, validateConfig } from "../src/config.js";

test("detects supported browser languages and falls back to English", () => {
  assert.equal(detectLanguage("zh-HK,zh;q=0.9,en;q=0.8"), "zh-TW");
  assert.equal(detectLanguage("ja-JP,ja;q=0.9"), "ja");
  assert.equal(detectLanguage("fr-FR,fr;q=0.9"), "en");
});

test("default configuration is valid", () => {
  assert.deepEqual(validateConfig(normalizeConfig(DEFAULT_CONFIG)), []);
});

test("converts legacy GitHub to a normal website and builds email links", () => {
  const input = structuredClone(DEFAULT_CONFIG);
  input.links.push({ id: "github", type: "github", label: "My Code", value: "", url: "https://github.com/example", enabled: true, order: 6 });
  const email = input.links.find((link) => link.type === "email");
  email.value = "hello@example.com";
  email.url = "";
  email.enabled = true;
  const config = normalizeConfig(input);
  assert.deepEqual(config.links.find((link) => link.id === "github"), { id: "github", type: "link", icon: "github", label: "My Code", value: "", url: "https://github.com/example", enabled: true, order: 6 });
  assert.equal(config.links.find((link) => link.type === "email").url, "mailto:hello@example.com");
  assert.deepEqual(validateConfig(config), []);
});

test("rejects unsafe links and duplicate ids", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.links[0].url = "javascript:alert(1)";
  config.links[1].id = config.links[0].id;
  const errors = validateConfig(config);
  assert.ok(errors.some((error) => error.includes("only supports")));
  assert.ok(errors.some((error) => error.includes("unique")));
});

test("rejects oversized profile data", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.name = "x".repeat(81);
  config.links = Array.from({ length: 21 }, (_, index) => ({ id: String(index), type: "link", label: "Link", value: "", url: "https://example.com", enabled: true, order: index }));
  assert.equal(validateConfig(config).length, 2);
});

test("normalizes and validates footer links", () => {
  const config = normalizeConfig({ ...structuredClone(DEFAULT_CONFIG), settings: { siteTitle: "Hub", canonicalUrl: "https://example.com" } });
  assert.deepEqual(config.settings.footerLinks, [{ id: "footer", label: "", url: "", order: 1 }]);
  config.settings.footerLinks[0].url = "javascript:alert(1)";
  assert.ok(validateConfig(config).some((error) => error.includes("Footer links[0].url")));
  config.settings.footerLinks.push({ id: "second", label: "Second", url: "https://example.com", order: 2 });
  assert.ok(validateConfig(config).some((error) => error.includes("at most 1 item")));
});

test("accepts a blank footer slot and restores the editor slot from legacy empty data", () => {
  const config = normalizeConfig({ ...structuredClone(DEFAULT_CONFIG), settings: { ...DEFAULT_CONFIG.settings, footerLinks: [] } });
  assert.deepEqual(config.settings.footerLinks, [{ id: "footer", label: "", url: "", order: 1 }]);
  assert.deepEqual(validateConfig(config), []);
});

test("deleted website and contact methods stay deleted, while custom contacts are retained", () => {
  const input = structuredClone(DEFAULT_CONFIG);
  input.links = input.links.filter((link) => !["website", "telegram"].includes(link.type));
  input.links.push({ id: "signal", type: "contact", icon: "signal", label: "Signal", value: "我的帳號", url: "https://signal.me/example", enabled: true, order: 6 });
  const config = normalizeConfig(input);
  assert.equal(config.links.some((link) => link.type === "website"), false);
  assert.equal(config.links.some((link) => link.type === "telegram"), false);
  assert.equal(config.links.find((link) => link.id === "signal").icon, "signal");
  assert.deepEqual(validateConfig(config), []);
});

test("allows an enabled link without a URL so its switch can be saved", () => {
  const config = normalizeConfig(DEFAULT_CONFIG);
  config.links[0].enabled = true;
  config.links[0].url = "";
  assert.deepEqual(validateConfig(config), []);
});
