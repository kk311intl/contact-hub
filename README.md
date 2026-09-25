# Contact Hub · v1.1.1

[中文](#中文) · [日本語](#日本語) · [English](#english)

## 中文

> AI 無代碼部署提示詞：請閱讀此 repository 的 README、`package.json`、`wrangler.example.jsonc` 和實際程式，陪我在自己的 Cloudflare 帳戶部署這個 Contact Hub。請先確認我有 Node.js 及 Cloudflare Workers 帳戶，再依本版的 Worker、KV、SQLite Durable Object、靜態資產與兩個 Secret 的設定完成安裝、設定、測試、部署及網址驗證。只詢問真正缺少的值；後台語言由我選 `zh-TW`、`ja` 或 `en`，訪客頁仍可自行切換三語。登入 Cloudflare、授權、輸入密碼／Secret 和涉及帳戶的實體操作必須由我本人完成；不要把 Secret 顯示在對話、命令列輸出或 Git。先檢查 Worker 名稱與資源是否已存在，未經我確認不得覆寫既有部署。不要改寫架構；每步只報告已實際驗證的結果，失敗時協助排錯，不要宣稱未驗證的部署已完成。

這是一個可部署到 Cloudflare Workers 的個人聯絡頁，附密碼登入後台、可編輯的網站與聯絡連結、頭像及訪客計數。需要 Node.js 22 以上、npm 和 Cloudflare Workers 帳戶；使用 Workers、KV、SQLite Durable Object，可用於免費方案，但仍受 Cloudflare 額度限制。

聯絡圖標有網址時開啟連結；網址留空但有帳戶內容時，點擊即可複製（需 HTTPS 或 localhost）。選擇圖標會自動填入空白或預設名稱，保留自訂名稱。

儲存期間繼續編輯的內容會保留，需再按儲存。瀏覽器禁止儲存偏好時，語言與外觀仍可切換，但不會記住選擇。修改密碼會撤銷舊登入；受 Workers KV 同步延遲影響，不保證所有節點立即生效。

後台「網站設定」可啟用 App 內自動跳轉（預設關閉），倒數預設 5 秒，可設 1–10 秒。僅選擇已啟用、具有同平台 HTTPS 網址的聯繫方式，按列表順序取第一個；不使用網站列表或純複製項目。點擊提示可取消，同一分頁工作階段只提示一次，背景頁面暫停倒數。UA 識別涵蓋 Facebook、Messenger、Instagram、Threads、X、LINE、TikTok、Snapchat、LinkedIn、WhatsApp、Reddit、Telegram、Pinterest、KakaoTalk、Weibo 的明確標記；Telegram iPhone 版另以 App 注入的 `TelegramWebviewProxy.postEvent` 識別；UA 與專用標記都無法辨識時不跳轉。網址不會預先連線檢查有效性，也不保證開啟原生 App。UA 僅在訪客瀏覽器內處理。微信不自動跳轉：可選微信圖標、填寫帳戶並留空網址，供訪客點擊複製。其他平台可開啟個人頁或有效的聊天／邀請連結，不代表一定直接進入對話。

1. 執行 `npm ci`，複製 `wrangler.example.jsonc` 為受 Git 忽略的 `wrangler.jsonc`。將 `name` 改為你自己的、尚未使用的 Worker 名稱。設定 `ADMIN_LANGUAGE` 為 `en`（預設）、`zh-TW` 或 `ja`；它只固定後台語言。訪客頁依瀏覽器語言顯示，並可手動切換及記住選擇。
2. 由帳號持有人執行 `npx wrangler login`；執行 `npx wrangler kv namespace create PROFILE_KV`，把建立結果中的 namespace ID 填入 `wrangler.jsonc` 的 `YOUR_KV_NAMESPACE_ID`。不要共用別人的 KV。
3. 複製 `.dev.vars.example` 為受 Git 忽略的 `.dev.vars`，在本機填入獨一的 `ADMIN_PASSWORD` 與隨機、足夠長的 `SESSION_SECRET`。勿提交此檔或使用範例值。執行 `npm run check`，本機預覽可用 `npm run dev`。
4. 確認 Worker 名稱不會覆寫現有服務後，首次執行 `npx wrangler deploy --secrets-file .dev.vars`。部署後開啟 Wrangler 回報的 `workers.dev` 網址檢查公開頁及 `/admin/login`。首次登入用設定的密碼；後續可在後台修改。換密碼後，KV 中的新密碼會覆蓋初始 Secret。日後更新用 `npx wrangler deploy --keep-vars --strict`，不必重送本機 Secret；若檢查到遠端設定衝突，先查明原因。

後台可更改公開名稱、三語簡介與狀態、頭像、連結、網頁標題和頁尾連結；公開頁點頭像五次也可進入登入頁。頭像與資料會存在 KV 中，公開頁資料可被訪客讀取，請勿輸入私人資訊。自訂網域和防濫用 WAF 規則需自行在 Cloudflare 設定；程式不會代你啟用。免費額度耗盡可能導致請求失敗。Worker 版本回退不會還原 KV 或 Durable Object 資料，更新前請另外備份重要設定。原始碼以 GNU GPL v3（僅第 3 版，`GPL-3.0-only`，見 [LICENSE](LICENSE)）授權；內附 Kalam 字體依其 `public/fonts/Kalam-OFL.txt` 的 SIL OFL 1.1 授權。圖示來源及 Bootstrap Icons 的 MIT 聲明見 `public/icons.js`；Simple Icons 圖示依 CC0 提供。商標仍屬各權利人。

## 日本語

> AI によるコード不要のデプロイ用プロンプト：この repository の README、`package.json`、`wrangler.example.jsonc` と実際のコードを読んで、私自身の Cloudflare アカウントに Contact Hub を導入する手順を案内してください。Node.js と Workers アカウントを確認し、この版で使う Worker、KV、SQLite Durable Object、静的アセット、二つの Secret に合わせてインストール・設定・テスト・デプロイ・URL 確認を進めてください。本当に不足する値だけ質問してください。管理画面の言語は私が `zh-TW`、`ja`、`en` から選び、訪問者は三言語を切り替えられます。Cloudflare へのログイン、認可、パスワードや Secret の入力、本人確認などはアカウント所有者が行います。Secret を会話、端末出力、Git に載せないでください。既存の Worker やリソースを確認し、私の了承なく上書きしないでください。構成を勝手に変えず、実際に確認した作業だけを完了と報告し、問題があれば原因を調べてください。

Contact Hub は Cloudflare Workers で動く個人用リンク・連絡先ページです。パスワードで入る管理画面、編集可能なリンク・画像、訪問者カウンターがあります。Node.js 22 以上、npm、Cloudflare Workers アカウントが必要です。Workers、KV、SQLite Durable Object を使い、無料プランでも利用できますが、無料枠の制限は適用されます。

連絡先アイコンは URL があればリンクを開き、URL が空欄でアカウントが入力されていればクリックでコピーします（HTTPS または localhost が必要です）。アイコンを選ぶと空欄または既定の表示名が自動入力され、手動で付けた名前は保持されます。

保存中に行った編集は保持されますが、もう一度保存する必要があります。ブラウザーが設定の保存を拒否しても言語と外観は切り替えられますが、選択は記憶されません。パスワード変更で古いログインは無効になりますが、Workers KV の同期に時間がかかるため、全拠点で即時に反映されるとは限りません。

管理画面のサイト設定でアプリ内の自動移動を有効にできます（初期設定はオフ）。待ち時間は初期値5秒、1〜10秒で設定できます。有効な連絡先のうち、同じサービスのHTTPS URLを持つ最初の項目を表示順で選びます。サイト一覧やコピー専用項目は対象外です。通知を押すとキャンセルでき、同じタブのセッションでは一度だけ表示し、バックグラウンドでは待ち時間を止めます。Facebook、Messenger、Instagram、Threads、X、LINE、TikTok、Snapchat、LinkedIn、WhatsApp、Reddit、Telegram、Pinterest、KakaoTalk、Weiboの明示的なUA識別子に対応します。iPhone版Telegramはアプリが注入する `TelegramWebviewProxy.postEvent` でも識別します。UAと専用マーカーのどちらでも判別できなければ移動しません。URLの疎通確認やネイティブアプリの起動保証は行いません。UAは訪問者のブラウザー内だけで処理します。WeChatは自動移動の対象外です。アイコンとアカウントを設定し、URLを空欄にすればクリックでコピーできます。他のサービスでも、プロフィールやチャット・招待リンクを開く機能であり、必ず会話画面へ直接移動するとは限りません。

1. `npm ci` を実行し、`wrangler.example.jsonc` を Git 対象外の `wrangler.jsonc` にコピーします。`name` を未使用の自分専用 Worker 名に変更します。`ADMIN_LANGUAGE` は既定の `en`、`zh-TW`、`ja` から選びます。これは管理画面だけの言語設定で、公開ページはブラウザー言語に応じて表示され、訪問者が切り替え・保存できます。
2. アカウント所有者が `npx wrangler login` を実行します。`npx wrangler kv namespace create PROFILE_KV` で KV を作り、返された namespace ID を `wrangler.jsonc` の `YOUR_KV_NAMESPACE_ID` に設定します。他人の KV は使わないでください。
3. `.dev.vars.example` を Git 対象外の `.dev.vars` にコピーし、固有の `ADMIN_PASSWORD` と十分に長いランダムな `SESSION_SECRET` をローカルで設定します。例の値を使わず、ファイルをコミットしないでください。`npm run check` で確認し、ローカル表示には `npm run dev` を使えます。
4. 既存サービスと Worker 名が衝突しないことを確かめてから、初回は `npx wrangler deploy --secrets-file .dev.vars` を実行します。表示された `workers.dev` URL の公開ページと `/admin/login` を確認します。初回は設定したパスワードでログインし、後から管理画面で変更できます。変更後は KV の新しいパスワードが初期 Secret より優先されます。以後の更新には `npx wrangler deploy --keep-vars --strict` を使い、ローカルの Secret を再送しません。リモート設定との競合が出たら、原因を確認してください。

管理画面では名前、三言語の紹介文・ステータス、画像、リンク、ページタイトル、フッターリンクを編集できます。公開ページの画像を五回クリックしてもログイン画面へ移動できます。画像と設定は KV に保存され、公開ページの情報は訪問者にも読めるため、非公開情報を入力しないでください。独自ドメインや不正アクセス対策の WAF ルールは Cloudflare 側で別途設定してください。無料枠を超えるとリクエストが失敗する場合があります。Worker のバージョンを戻しても KV や Durable Object のデータは戻らないため、重要な設定は更新前に別途保存してください。コードは GNU GPL v3（バージョン 3 のみ、`GPL-3.0-only`、[LICENSE](LICENSE) 参照）、同梱の Kalam フォントは `public/fonts/Kalam-OFL.txt` の SIL OFL 1.1 です。アイコンの出典と Bootstrap Icons の MIT 表記は `public/icons.js` を参照してください。Simple Icons のアイコンは CC0、商標は各権利者に帰属します。

## English

> No-code deployment prompt for an AI coding agent: Read this repository's README, `package.json`, `wrangler.example.jsonc`, and the actual code, then guide me through deploying Contact Hub to my own Cloudflare account. Check that I have Node.js and a Workers account. Use this version's Worker, KV, SQLite Durable Object, static assets, and two required secrets to install, configure, test, deploy, troubleshoot, and verify the URL. Ask only for missing values. Let me choose `zh-TW`, `ja`, or `en` as the fixed admin language; visitors must still be able to switch among all three. I, the account holder, must perform sign-in, authorization, secret entry, and any identity or physical-account steps. Never reveal secrets in chat, terminal output, or Git. Check for existing Worker names and resources before deployment; do not overwrite anything without my approval. Do not redesign the project, and report only steps you have actually verified.

Contact Hub is a personal links and contact page for Cloudflare Workers, with a password-protected editor, editable avatar and links, and a visitor counter. You need Node.js 22+, npm, and a Cloudflare Workers account. It uses Workers, KV, and a SQLite-backed Durable Object. It can run on the Free plan, subject to Cloudflare's limits.

Contact icons open their URL when provided. With no URL but an account value, clicking copies the account (requires HTTPS or localhost). Choosing an icon fills a blank or default name without replacing a custom name.

Edits made while a save is pending are kept and need another save. If browser storage is blocked, language and theme controls still work without remembering your choice. Changing the password revokes old sessions, but Workers KV propagation delays mean this is not immediate at every location.

Site settings can enable in-app auto-redirect (off by default), with a default 5-second delay adjustable from 1–10 seconds. It selects the first enabled contact in display order with an HTTPS URL on the detected platform; website cards and copy-only contacts are excluded. Click the notice to cancel. It appears once per tab session and pauses while the page is hidden. Explicit UA markers are recognized for Facebook, Messenger, Instagram, Threads, X, LINE, TikTok, Snapchat, LinkedIn, WhatsApp, Reddit, Telegram, Pinterest, KakaoTalk, and Weibo. Telegram on iPhone is also identified by its injected `TelegramWebviewProxy.postEvent` bridge. Without an identifiable UA or app-specific marker, no redirect occurs. URLs are not probed for availability, and opening the native app is not guaranteed. UA processing stays in the visitor's browser. WeChat does not auto-redirect: select its icon, enter an account, and leave the URL blank for click-to-copy. Other platforms may open a profile or a valid chat/invite link, not necessarily a direct conversation.

1. Run `npm ci`. Copy `wrangler.example.jsonc` to the Git-ignored `wrangler.jsonc`, and change `name` to a unique Worker name that you own. Set `ADMIN_LANGUAGE` to `en` (default), `zh-TW`, or `ja`. This fixes only the admin language; the public page detects the browser language and lets visitors switch and save their choice.
2. As the account holder, run `npx wrangler login`. Run `npx wrangler kv namespace create PROFILE_KV`, then place the returned namespace ID in `wrangler.jsonc` in place of `YOUR_KV_NAMESPACE_ID`. Do not reuse someone else's KV.
3. Copy `.dev.vars.example` to the Git-ignored `.dev.vars`. Enter a unique `ADMIN_PASSWORD` and a long random `SESSION_SECRET` locally; never commit this file or use its placeholder values. Run `npm run check`; use `npm run dev` for a local preview.
4. Verify that your Worker name will not overwrite an existing service, then run `npx wrangler deploy --secrets-file .dev.vars` for the first deployment. Check the reported `workers.dev` public URL and `/admin/login`. Sign in with the configured password; you can change it in the editor. After a change, the new password stored in KV takes precedence over the initial secret. For later updates, use `npx wrangler deploy --keep-vars --strict` without re-uploading the local secrets. Investigate any remote configuration conflict before proceeding.

The editor changes your public name, three-language bio and status, avatar, links, browser title, and footer link. Five clicks on the public avatar also open the login page. The avatar and settings live in KV, and public-page data is readable by visitors, so do not enter private information. Configure a custom domain and abuse-mitigation WAF rules separately in Cloudflare; this code does not enable them. Requests may fail after Free-plan quotas are exhausted. Rolling back a Worker version does not restore KV or Durable Object data; back up important settings separately before updates. Code is licensed under GNU GPL version 3 only (`GPL-3.0-only`; see [LICENSE](LICENSE)); the bundled Kalam font remains under SIL OFL 1.1 in `public/fonts/Kalam-OFL.txt`. Icon sources and the Bootstrap Icons MIT notice are in `public/icons.js`; Simple Icons artwork is provided under CC0. Trademarks belong to their owners.

Copyright (c) 2026 Contact Hub contributors.
