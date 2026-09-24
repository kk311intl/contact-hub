import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("clipboard feedback follows the current visitor language and reports failures", async () => {
  const source = readFileSync(new URL("../public/app-v3.js", import.meta.url), "utf8");
  for (const [language, success, failure] of [
    ["zh-Hant", "已複製帳戶", "無法複製，請手動複製："],
    ["en", "Account copied", "Could not copy. Please copy manually: "],
    ["ja", "アカウントをコピーしました", "コピーできませんでした。手動でコピーしてください："]
  ]) {
    for (const denied of [false, true]) {
      let click, copied;
      const button = { dataset: { copy: "example-account" }, addEventListener: (_, handler) => { click = handler; } };
      const toast = { classList: { remove() {} } };
      const document = {
        documentElement: { lang: "en", dataset: {} },
        querySelector: (selector) => selector === "#bootstrap" ? { textContent: "{}" } : selector === "[data-toast]" ? toast : null,
        querySelectorAll: (selector) => selector === "[data-copy]" ? [button] : []
      };
      vm.runInNewContext(source, {
        document, localStorage: { getItem: () => null },
        matchMedia: () => ({ matches: false, addEventListener() {} }),
        navigator: { language: "en", clipboard: { writeText: async (value) => {
          if (denied) throw new Error("Permission denied");
          copied = value;
        } } },
        setTimeout: () => 0, clearTimeout() {}
      });
      document.documentElement.lang = language;
      await click();
      assert.equal(toast.textContent, denied ? failure + button.dataset.copy : success);
      assert.equal(toast.className, denied ? "toast show error" : "toast show");
      assert.equal(copied, denied ? undefined : button.dataset.copy);
    }
  }
});
