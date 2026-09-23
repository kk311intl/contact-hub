import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { adminLanguage, DEFAULT_CONFIG, validateConfig } from "../src/config.js";

const phrases = {
  "zh-TW": { login: "輸入管理密碼", save: "儲存變更", error: "新密碼不可為空" },
  en: { login: "Enter your admin password", save: "Save changes", error: "New password cannot be empty" },
  ja: { login: "管理者パスワードを入力", save: "変更を保存", error: "新しいパスワードを入力" }
};

test("owner-selected language applies to the live login response", async () => {
  for (const [lang, words] of Object.entries(phrases)) {
    const env = { ADMIN_LANGUAGE: lang, PROFILE_KV: { async get() { return null; } } };
    const response = await worker.fetch(new Request("https://example.com/admin/login", { headers: { "Accept-Language": "fr" } }), env);
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(words.login));
    assert.equal(adminLanguage(lang), lang);
    const errors = validateConfig({ ...DEFAULT_CONFIG, name: "" }, lang);
    assert.ok(errors.some((error) => error.includes(lang === "zh-TW" ? "名稱" : lang === "ja" ? "名前" : "Name")));
  }
});

test("visitor language stays independent from the owner setting", async () => {
  const env = { ADMIN_LANGUAGE: "ja", PROFILE_KV: { async get() { return null; } } };
  for (const [header, expected] of [["zh-TW", "聯絡方式"], ["en-US", "Contact"], ["ja-JP", "連絡先"]]) {
    const response = await worker.fetch(new Request("https://example.com/", { headers: { "Accept-Language": header } }), env);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(expected));
    assert.match(html, /data-language/);
  }
});
