# Contact Hub · v1.0.0

[中文](#中文) · [日本語](#日本語) · [English](#english)

## 中文

> AI 無代碼部署提示詞：請閱讀此 repository 的 README、`package.json`、`wrangler.example.jsonc` 和實際程式，陪我在自己的 Cloudflare 帳戶部署這個 Contact Hub。請先確認我有 Node.js 及 Cloudflare Workers 帳戶，再依本版的 Worker、KV、SQLite Durable Object、靜態資產與兩個 Secret 的設定完成安裝、設定、測試、部署及網址驗證。只詢問真正缺少的值；後台語言由我選 `zh-TW`、`ja` 或 `en`，訪客頁仍可自行切換三語。登入 Cloudflare、授權、輸入密碼／Secret 和涉及帳戶的實體操作必須由我本人完成；不要把 Secret 顯示在對話、命令列輸出或 Git。先檢查 Worker 名稱與資源是否已存在，未經我確認不得覆寫既有部署。不要改寫架構；每步只報告已實際驗證的結果，失敗時協助排錯，不要宣稱未驗證的部署已完成。

這是一個可部署到 Cloudflare Workers 的個人聯絡頁，附密碼登入後台、可編輯的網站與聯絡連結、頭像及訪客計數。版本為 v1.0.0。需要 Node.js 20 以上、npm 和 Cloudflare Workers 帳戶；使用 Workers、KV、SQLite Durable Object，設計上可用於免費方案，但仍受 Cloudflare 額度限制。

1. 執行 `npm ci`，複製 `wrangler.example.jsonc` 為受 Git 忽略的 `wrangler.jsonc`。將 `name` 改為你自己的、尚未使用的 Worker 名稱。設定 `ADMIN_LANGUAGE` 為 `en`（預設）、`zh-TW` 或 `ja`；它只固定後台語言。訪客頁依瀏覽器語言顯示，並可手動切換及記住選擇。
2. 由帳號持有人執行 `npx wrangler login`；執行 `npx wrangler kv namespace create PROFILE_KV`，把建立結果中的 namespace ID 填入 `wrangler.jsonc` 的 `YOUR_KV_NAMESPACE_ID`。不要共用別人的 KV。
3. 複製 `.dev.vars.example` 為受 Git 忽略的 `.dev.vars`，在本機填入獨一的 `ADMIN_PASSWORD` 與隨機、足夠長的 `SESSION_SECRET`。勿提交此檔或使用範例值。執行 `npm run check`，本機預覽可用 `npm run dev`。
4. 確認 Worker 名稱不會覆寫現有服務後，執行 `npx wrangler deploy --secrets-file .dev.vars`。部署後開啟 Wrangler 回報的 `workers.dev` 網址檢查公開頁及 `/admin/login`。首次登入用設定的密碼；後續可在後台修改。換密碼後，KV 中的新密碼會覆蓋初始 Secret。

後台可更改公開名稱、三語簡介與狀態、頭像、連結、網頁標題和頁尾連結；公開頁點頭像五次也可進入登入頁。頭像與資料會存在 KV 中，公開頁資料可被訪客讀取，請勿輸入私人資訊。自訂網域和防濫用 WAF 規則需自行在 Cloudflare 設定；程式不會代你啟用。免費額度耗盡可能導致請求失敗。原始碼以 MIT 授權；內附 Kalam 字體依其 `public/fonts/Kalam-OFL.txt` 的 SIL OFL 1.1 授權。服務商圖示僅用於識別，其商標仍屬各權利人。

## 日本語

> AI によるコード不要のデプロイ用プロンプト：この repository の README、`package.json`、`wrangler.example.jsonc` と実際のコードを読んで、私自身の Cloudflare アカウントに Contact Hub を導入する手順を案内してください。Node.js と Workers アカウントを確認し、この版で使う Worker、KV、SQLite Durable Object、静的アセット、二つの Secret に合わせてインストール・設定・テスト・デプロイ・URL 確認を進めてください。本当に不足する値だけ質問してください。管理画面の言語は私が `zh-TW`、`ja`、`en` から選び、訪問者は三言語を切り替えられます。Cloudflare へのログイン、認可、パスワードや Secret の入力、本人確認などはアカウント所有者が行います。Secret を会話、端末出力、Git に載せないでください。既存の Worker やリソースを確認し、私の了承なく上書きしないでください。構成を勝手に変えず、実際に確認した作業だけを完了と報告し、問題があれば原因を調べてください。

Contact Hub は Cloudflare Workers で動く個人用リンク・連絡先ページです。パスワードで入る管理画面、編集可能なリンク・画像、訪問者カウンターがあります。バージョンは v1.0.0。Node.js 20 以上、npm、Cloudflare Workers アカウントが必要です。Workers、KV、SQLite Durable Object を使い、無料プランでも利用できますが、無料枠の制限は適用されます。

1. `npm ci` を実行し、`wrangler.example.jsonc` を Git 対象外の `wrangler.jsonc` にコピーします。`name` を未使用の自分専用 Worker 名に変更します。`ADMIN_LANGUAGE` は既定の `en`、`zh-TW`、`ja` から選びます。これは管理画面だけの言語設定で、公開ページはブラウザー言語に応じて表示され、訪問者が切り替え・保存できます。
2. アカウント所有者が `npx wrangler login` を実行します。`npx wrangler kv namespace create PROFILE_KV` で KV を作り、返された namespace ID を `wrangler.jsonc` の `YOUR_KV_NAMESPACE_ID` に設定します。他人の KV は使わないでください。
3. `.dev.vars.example` を Git 対象外の `.dev.vars` にコピーし、固有の `ADMIN_PASSWORD` と十分に長いランダムな `SESSION_SECRET` をローカルで設定します。例の値を使わず、ファイルをコミットしないでください。`npm run check` で確認し、ローカル表示には `npm run dev` を使えます。
4. 既存サービスと Worker 名が衝突しないことを確かめてから `npx wrangler deploy --secrets-file .dev.vars` を実行します。表示された `workers.dev` URL の公開ページと `/admin/login` を確認します。初回は設定したパスワードでログインし、後から管理画面で変更できます。変更後は KV の新しいパスワードが初期 Secret より優先されます。

管理画面では名前、三言語の紹介文・ステータス、画像、リンク、ページタイトル、フッターリンクを編集できます。公開ページの画像を五回クリックしてもログイン画面へ移動できます。画像と設定は KV に保存され、公開ページの情報は訪問者にも読めるため、非公開情報を入力しないでください。独自ドメインや不正アクセス対策の WAF ルールは Cloudflare 側で別途設定してください。無料枠を超えるとリクエストが失敗する場合があります。コードは MIT License、同梱の Kalam フォントは `public/fonts/Kalam-OFL.txt` の SIL OFL 1.1 です。サービスのロゴや商標は各権利者に帰属します。

## English

> No-code deployment prompt for an AI coding agent: Read this repository's README, `package.json`, `wrangler.example.jsonc`, and the actual code, then guide me through deploying Contact Hub to my own Cloudflare account. Check that I have Node.js and a Workers account. Use this version's Worker, KV, SQLite Durable Object, static assets, and two required secrets to install, configure, test, deploy, troubleshoot, and verify the URL. Ask only for missing values. Let me choose `zh-TW`, `ja`, or `en` as the fixed admin language; visitors must still be able to switch among all three. I, the account holder, must perform sign-in, authorization, secret entry, and any identity or physical-account steps. Never reveal secrets in chat, terminal output, or Git. Check for existing Worker names and resources before deployment; do not overwrite anything without my approval. Do not redesign the project, and report only steps you have actually verified.

Contact Hub is a personal links and contact page for Cloudflare Workers, with a password-protected editor, editable avatar and links, and a visitor counter. This is v1.0.0. You need Node.js 20+, npm, and a Cloudflare Workers account. It uses Workers, KV, and a SQLite-backed Durable Object. It can run on the Free plan, subject to Cloudflare's limits.

1. Run `npm ci`. Copy `wrangler.example.jsonc` to the Git-ignored `wrangler.jsonc`, and change `name` to a unique Worker name that you own. Set `ADMIN_LANGUAGE` to `en` (default), `zh-TW`, or `ja`. This fixes only the admin language; the public page detects the browser language and lets visitors switch and save their choice.
2. As the account holder, run `npx wrangler login`. Run `npx wrangler kv namespace create PROFILE_KV`, then place the returned namespace ID in `wrangler.jsonc` in place of `YOUR_KV_NAMESPACE_ID`. Do not reuse someone else's KV.
3. Copy `.dev.vars.example` to the Git-ignored `.dev.vars`. Enter a unique `ADMIN_PASSWORD` and a long random `SESSION_SECRET` locally; never commit this file or use its placeholder values. Run `npm run check`; use `npm run dev` for a local preview.
4. Verify that your Worker name will not overwrite an existing service, then run `npx wrangler deploy --secrets-file .dev.vars`. Check the reported `workers.dev` public URL and `/admin/login`. Sign in with the configured password; you can change it in the editor. After a change, the new password stored in KV takes precedence over the initial secret.

The editor changes your public name, three-language bio and status, avatar, links, browser title, and footer link. Five clicks on the public avatar also open the login page. The avatar and settings live in KV, and public-page data is readable by visitors, so do not enter private information. Configure a custom domain and abuse-mitigation WAF rules separately in Cloudflare; this code does not enable them. Requests may fail after Free-plan quotas are exhausted. Code is MIT licensed; the bundled Kalam font remains under SIL OFL 1.1 in `public/fonts/Kalam-OFL.txt`. Service logos are identifiers, and their trademarks belong to their owners.
