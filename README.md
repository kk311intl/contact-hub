# Contact Hub · v1.4.0

[中文](#中文) · [日本語](#日本語) · [English](#english)

## 中文

> AI 無代碼部署提示詞：請閱讀此 repository 的 README、`package.json`、`wrangler.example.jsonc` 和實際程式，陪我在自己的 Cloudflare 帳戶部署這個 Contact Hub。請先確認我有 Node.js 及 Cloudflare Workers 帳戶，再依本版的 Worker、KV、SQLite Durable Object、靜態資產、登入保護的分類統計與兩個 Secret 的設定完成安裝、設定、測試、部署及網址驗證。只詢問真正缺少的值；後台語言由我選 `zh-TW`、`ja` 或 `en`，訪客頁仍可自行切換三語。登入 Cloudflare、授權、輸入密碼／Secret 和涉及帳戶的實體操作必須由我本人完成；不要把 Secret 顯示在對話、命令列輸出或 Git。先檢查 Worker 名稱與資源是否已存在，未經我確認不得覆寫既有部署。不要改寫架構；每步只報告已實際驗證的結果，失敗時協助排錯，不要宣稱未驗證的部署已完成。

這是一個可部署到 Cloudflare Workers 的個人聯絡頁，附密碼登入後台、可編輯的網站與聯絡連結、頭像及訪客計數。需要 Node.js 22.13 以上、npm 和 Cloudflare Workers 帳戶；使用 Workers、KV、SQLite Durable Object，可用於免費方案，但仍受 Cloudflare 額度限制。

聯絡圖標有網址時開啟連結；網址留空但有帳戶內容時，點擊即可複製（需 HTTPS 或 localhost）。選擇圖標會自動填入空白或預設名稱，保留自訂名稱。

[線上示範](https://kk311.me/)：作者實際使用的首頁，含個人客製化，與預設部署可能略有不同。

登入後可查看國家／地區、設備、系統、瀏覽器、App 及來源網域統計，介面跟隨 `ADMIN_LANGUAGE`，報表不對訪客公開。按 UTC 保存 30 天，可查今日／7 天／30 天；每日最多記錄 5,000 次首頁請求（含已知機器人），來源網域每日最多 50 種，其餘合併。不保存原始 IP、完整 UA 或來源路徑／查詢；分類是推測，訪問次數不是獨立訪客數。達上限或寫入異常會提示資料可能不完整，且不自動輪詢；這些限制不保證不會耗盡免費額度。重新整理後台時，用於恢復分頁的初始首頁請求仍算一次訪問。

每日概況以雙柱狀圖顯示訪問與機器人請求；懸停、點擊或鍵盤選擇可查看數值，30 天可橫向滑動，未有記錄的日期不視為零。

儲存期間繼續編輯的內容會保留，需再按儲存。瀏覽器禁止儲存偏好時，語言與外觀仍可切換，但不會記住選擇。修改密碼會撤銷舊登入；受 Workers KV 同步延遲影響，不保證所有節點立即生效。

後台「網站設定」可啟用 App 內自動跳轉（預設關閉），倒數預設 5 秒，可設 1–10 秒。僅選擇已啟用、具有同平台 HTTPS 網址的聯繫方式，按列表順序取第一個；不使用網站列表或純複製項目。點擊提示可取消，同一分頁工作階段只提示一次，背景頁面暫停倒數。UA 識別涵蓋 Facebook、Messenger、Instagram、Threads、X、LINE、TikTok、Snapchat、LinkedIn、WhatsApp、Reddit、Telegram、Pinterest、KakaoTalk、Weibo 的明確標記；Telegram iPhone 版另以 App 注入的 `TelegramWebviewProxy.postEvent` 識別；UA 與專用標記都無法辨識時不跳轉。網址不會預先連線檢查有效性，也不保證開啟原生 App。自動跳轉的 UA 判斷在訪客瀏覽器內完成；伺服器另以 UA 產生前述匿名分類統計，不保存完整 UA。微信不自動跳轉：可選微信圖標、填寫帳戶並留空網址，供訪客點擊複製。其他平台可開啟個人頁或有效的聊天／邀請連結，不代表一定直接進入對話。

1. 執行 `npm ci`，複製 `wrangler.example.jsonc` 為受 Git 忽略的 `wrangler.jsonc`。將 `name` 改為你自己的、尚未使用的 Worker 名稱。設定 `ADMIN_LANGUAGE` 為 `en`（預設）、`zh-TW` 或 `ja`；它只固定後台語言。訪客頁依瀏覽器語言顯示，並可手動切換及記住選擇。
2. 由帳號持有人執行 `npx wrangler login`；執行 `npx wrangler kv namespace create PROFILE_KV`，把建立結果中的 namespace ID 填入 `wrangler.jsonc` 的 `YOUR_KV_NAMESPACE_ID`。不要共用別人的 KV。
3. 複製 `.dev.vars.example` 為受 Git 忽略的 `.dev.vars`，在本機填入獨一的 `ADMIN_PASSWORD` 與隨機、足夠長的 `SESSION_SECRET`。勿提交此檔或使用範例值。執行 `npm run check`，本機預覽可用 `npm run dev`。
4. 確認 Worker 名稱不會覆寫現有服務後，首次執行 `npx wrangler deploy --secrets-file .dev.vars`。部署後開啟 Wrangler 回報的 `workers.dev` 網址檢查公開頁及 `/admin/login`。首次登入用設定的密碼；後續可在後台修改。換密碼後，KV 中的新密碼會覆蓋初始 Secret。日後更新用 `npx wrangler deploy --keep-vars --strict`，不必重送本機 Secret；若檢查到遠端設定衝突，先查明原因。

後台可更改公開名稱、三語簡介與狀態、頭像、連結、網頁標題和頁尾連結；可直接開啟 `/admin/login`，或在首頁 5 秒內點擊頁尾統計圖示五次進入後台；頭像不再觸發。後台畫面在根網址顯示，各分頁分別記住模式；禁止瀏覽器儲存時仍可登入，但重新整理可能需再次開啟入口。頭像與資料會存在 KV 中，公開頁資料可被訪客讀取，請勿輸入私人資訊。自訂網域和防濫用 WAF 規則需自行在 Cloudflare 設定；程式不會代你啟用。免費額度耗盡可能導致請求失敗。Worker 版本回退不會還原 KV 或 Durable Object 資料，更新前請另外備份重要設定。原始碼以 GNU GPL v3（僅第 3 版，`GPL-3.0-only`，見 [LICENSE](LICENSE)）授權；內附 Kalam 字體依其 `public/fonts/Kalam-OFL.txt` 的 SIL OFL 1.1 授權。圖示來源及 Bootstrap Icons 的 MIT 聲明見 `public/icons.js`；Simple Icons 圖示依 CC0 提供。商標仍屬各權利人。

後台「網站設定 → 設定備份」可匯出已儲存設定，包含頭像與隱藏連結，不含密碼、憑證或統計；匯入 JSON（最多 1 MiB）會先驗證並要求確認，只載入編輯器，按儲存才套用。未儲存編輯會暫存在此瀏覽器，重新登入可選擇恢復或捨棄；若網站設定已改變會提醒，不會自動覆寫。草稿未加密，共用裝置請捨棄不用的草稿；瀏覽器禁止儲存時會提示無法保留。連結可選「啟用／準備中／隱藏」；隱藏項目不出現在公開 HTML、公開資料或自動跳轉中，但仍保留於後台與備份。隱藏不能撤回先前已被他人取得的資料。

## 日本語

> AI によるコード不要のデプロイ用プロンプト：この repository の README、`package.json`、`wrangler.example.jsonc` と実際のコードを読んで、私自身の Cloudflare アカウントに Contact Hub を導入する手順を案内してください。Node.js と Workers アカウントを確認し、この版で使う Worker、KV、SQLite Durable Object、静的アセット、ログイン保護されたアクセス統計、二つの Secret に合わせてインストール・設定・テスト・デプロイ・URL 確認を進めてください。本当に不足する値だけ質問してください。管理画面の言語は私が `zh-TW`、`ja`、`en` から選び、訪問者は三言語を切り替えられます。Cloudflare へのログイン、認可、パスワードや Secret の入力、本人確認などはアカウント所有者が行います。Secret を会話、端末出力、Git に載せないでください。既存の Worker やリソースを確認し、私の了承なく上書きしないでください。構成を勝手に変えず、実際に確認した作業だけを完了と報告し、問題があれば原因を調べてください。

Contact Hub は Cloudflare Workers で動く個人用リンク・連絡先ページです。パスワードで入る管理画面、編集可能なリンク・画像、訪問者カウンターがあります。Node.js 22.13 以上、npm、Cloudflare Workers アカウントが必要です。Workers、KV、SQLite Durable Object を使い、無料プランでも利用できますが、無料枠の制限は適用されます。

連絡先アイコンは URL があればリンクを開き、URL が空欄でアカウントが入力されていればクリックでコピーします（HTTPS または localhost が必要です）。アイコンを選ぶと空欄または既定の表示名が自動入力され、手動で付けた名前は保持されます。

[デモを見る](https://kk311.me/)：作者が実際に使っているサイトです。個人向けに調整しているため、初期設定とは一部異なります。

ログイン後、国・地域、端末、OS、ブラウザー、アプリ、参照元ドメイン別の統計を確認できます。表示言語は `ADMIN_LANGUAGE` に従い、訪問者には公開しません。UTC 基準で30日間保存し、今日・7日間・30日間を選べます。記録は既知のボットを含め1日5,000件、参照元ドメインは1日50種類までで、残りはまとめます。元の IP、完全な UA、参照元のパスやクエリは保存しません。分類は推定で、アクセス回数は訪問者数とは異なります。上限到達や書き込み失敗は警告を表示し、自動ポーリングは行いません。無料枠を超えない保証ではありません。管理画面の再読み込み時にタブを復元する最初のトップページリクエストも1回に数えます。

日別の概要はアクセスとボットの棒グラフで表示します。カーソル・タップ・キーボードで数値を確認でき、30日表示は横スクロールに対応します。記録のない日はゼロと区別します。

保存中に行った編集は保持されますが、もう一度保存する必要があります。ブラウザーが設定の保存を拒否しても言語と外観は切り替えられますが、選択は記憶されません。パスワード変更で古いログインは無効になりますが、Workers KV の同期に時間がかかるため、全拠点で即時に反映されるとは限りません。

管理画面のサイト設定でアプリ内の自動移動を有効にできます（初期設定はオフ）。待ち時間は初期値5秒、1〜10秒で設定できます。有効な連絡先のうち、同じサービスのHTTPS URLを持つ最初の項目を表示順で選びます。サイト一覧やコピー専用項目は対象外です。通知を押すとキャンセルでき、同じタブのセッションでは一度だけ表示し、バックグラウンドでは待ち時間を止めます。Facebook、Messenger、Instagram、Threads、X、LINE、TikTok、Snapchat、LinkedIn、WhatsApp、Reddit、Telegram、Pinterest、KakaoTalk、Weiboの明示的なUA識別子に対応します。iPhone版Telegramはアプリが注入する `TelegramWebviewProxy.postEvent` でも識別します。UAと専用マーカーのどちらでも判別できなければ移動しません。URLの疎通確認やネイティブアプリの起動保証は行いません。自動移動の UA 判定は訪問者のブラウザー内で行います。サーバーでも前述の分類統計に UA を使いますが、完全な UA は保存しません。WeChatは自動移動の対象外です。アイコンとアカウントを設定し、URLを空欄にすればクリックでコピーできます。他のサービスでも、プロフィールやチャット・招待リンクを開く機能であり、必ず会話画面へ直接移動するとは限りません。

1. `npm ci` を実行し、`wrangler.example.jsonc` を Git 対象外の `wrangler.jsonc` にコピーします。`name` を未使用の自分専用 Worker 名に変更します。`ADMIN_LANGUAGE` は既定の `en`、`zh-TW`、`ja` から選びます。これは管理画面だけの言語設定で、公開ページはブラウザー言語に応じて表示され、訪問者が切り替え・保存できます。
2. アカウント所有者が `npx wrangler login` を実行します。`npx wrangler kv namespace create PROFILE_KV` で KV を作り、返された namespace ID を `wrangler.jsonc` の `YOUR_KV_NAMESPACE_ID` に設定します。他人の KV は使わないでください。
3. `.dev.vars.example` を Git 対象外の `.dev.vars` にコピーし、固有の `ADMIN_PASSWORD` と十分に長いランダムな `SESSION_SECRET` をローカルで設定します。例の値を使わず、ファイルをコミットしないでください。`npm run check` で確認し、ローカル表示には `npm run dev` を使えます。
4. 既存サービスと Worker 名が衝突しないことを確かめてから、初回は `npx wrangler deploy --secrets-file .dev.vars` を実行します。表示された `workers.dev` URL の公開ページと `/admin/login` を確認します。初回は設定したパスワードでログインし、後から管理画面で変更できます。変更後は KV の新しいパスワードが初期 Secret より優先されます。以後の更新には `npx wrangler deploy --keep-vars --strict` を使い、ローカルの Secret を再送しません。リモート設定との競合が出たら、原因を確認してください。

管理画面では名前、三言語の紹介文・ステータス、画像、リンク、ページタイトル、フッターリンクを編集できます。`/admin/login` を直接開くか、トップページのフッターにある統計アイコンを5秒以内に5回押すと管理画面に入れます。画像のクリックでは開きません。管理画面はルート URL に表示され、タブごとに表示モードを記憶します。ブラウザーの保存機能が無効でもログインできますが、再読み込み後は入口を開き直す場合があります。画像と設定は KV に保存され、公開ページの情報は訪問者にも読めるため、非公開情報を入力しないでください。独自ドメインや不正アクセス対策の WAF ルールは Cloudflare 側で別途設定してください。無料枠を超えるとリクエストが失敗する場合があります。Worker のバージョンを戻しても KV や Durable Object のデータは戻らないため、重要な設定は更新前に別途保存してください。コードは GNU GPL v3（バージョン 3 のみ、`GPL-3.0-only`、[LICENSE](LICENSE) 参照）、同梱の Kalam フォントは `public/fonts/Kalam-OFL.txt` の SIL OFL 1.1 です。アイコンの出典と Bootstrap Icons の MIT 表記は `public/icons.js` を参照してください。Simple Icons のアイコンは CC0、商標は各権利者に帰属します。

管理画面の「サイト設定 → 設定のバックアップ」で保存済み設定を書き出せます。画像と非表示リンクを含み、パスワード・認証情報・統計は含みません。JSON（1 MiB 以下）の読み込みは検証と確認後に編集画面へ反映され、保存するまで公開サイトは変わりません。未保存の編集はこのブラウザーに下書きとして残り、再ログイン時に復元・破棄を選べます。サイト設定が変わっていれば警告し、自動では上書きしません。下書きは暗号化されないため、共用端末では不要なものを破棄してください。ブラウザーが保存を拒否した場合は通知します。リンクは「有効／準備中／非表示」を選択できます。非表示項目は公開 HTML・公開データ・自動移動から除外されますが、管理画面とバックアップには残ります。すでに取得されたデータまでは取り消せません。

## English

> No-code deployment prompt for an AI coding agent: Read this repository's README, `package.json`, `wrangler.example.jsonc`, and the actual code, then guide me through deploying Contact Hub to my own Cloudflare account. Check that I have Node.js and a Workers account. Use this version's Worker, KV, SQLite Durable Object, static assets, sign-in-protected visit statistics, and two required secrets to install, configure, test, deploy, troubleshoot, and verify the URL. Ask only for missing values. Let me choose `zh-TW`, `ja`, or `en` as the fixed admin language; visitors must still be able to switch among all three. I, the account holder, must perform sign-in, authorization, secret entry, and any identity or physical-account steps. Never reveal secrets in chat, terminal output, or Git. Check for existing Worker names and resources before deployment; do not overwrite anything without my approval. Do not redesign the project, and report only steps you have actually verified.

Contact Hub is a personal links and contact page for Cloudflare Workers, with a password-protected editor, editable avatar and links, and a visitor counter. You need Node.js 22.13+, npm, and a Cloudflare Workers account. It uses Workers, KV, and a SQLite-backed Durable Object. It can run on the Free plan, subject to Cloudflare's limits.

Contact icons open their URL when provided. With no URL but an account value, clicking copies the account (requires HTTPS or localhost). Choosing an icon fills a blank or default name without replacing a custom name.

[Live demo](https://kk311.me/): the author's own site, with personal customizations that may differ from a default deployment.

After sign-in, statistics group visits by country/region, device, OS, browser, app and referrer domain, using `ADMIN_LANGUAGE`. Reports are not public. Data is retained for 30 UTC days, with today/7-day/30-day views. Recording is capped at 5,000 homepage requests per day, including known bots; up to 50 referrer domains per day are kept separately and the rest grouped. Raw IPs, full UAs and referrer paths/queries are not stored. Categories are estimates and page views are not unique visitors. Limit and write-failure warnings flag potentially incomplete data; there is no automatic polling. These limits do not guarantee staying within free quotas. Refreshing admin still counts the initial homepage request used to restore the tab.

The daily chart separates visits and bot requests. Hover, tap or focus a date for values; the 30-day view scrolls horizontally. Missing records are distinguished from zero.

Edits made while a save is pending are kept and need another save. If browser storage is blocked, language and theme controls still work without remembering your choice. Changing the password revokes old sessions, but Workers KV propagation delays mean this is not immediate at every location.

Site settings can enable in-app auto-redirect (off by default), with a default 5-second delay adjustable from 1–10 seconds. It selects the first enabled contact in display order with an HTTPS URL on the detected platform; website cards and copy-only contacts are excluded. Click the notice to cancel. It appears once per tab session and pauses while the page is hidden. Explicit UA markers are recognized for Facebook, Messenger, Instagram, Threads, X, LINE, TikTok, Snapchat, LinkedIn, WhatsApp, Reddit, Telegram, Pinterest, KakaoTalk, and Weibo. Telegram on iPhone is also identified by its injected `TelegramWebviewProxy.postEvent` bridge. Without an identifiable UA or app-specific marker, no redirect occurs. URLs are not probed for availability, and opening the native app is not guaranteed. Auto-redirect detection runs in the visitor's browser. The server also uses UA for the aggregate statistics described above, without retaining the full UA. WeChat does not auto-redirect: select its icon, enter an account, and leave the URL blank for click-to-copy. Other platforms may open a profile or a valid chat/invite link, not necessarily a direct conversation.

1. Run `npm ci`. Copy `wrangler.example.jsonc` to the Git-ignored `wrangler.jsonc`, and change `name` to a unique Worker name that you own. Set `ADMIN_LANGUAGE` to `en` (default), `zh-TW`, or `ja`. This fixes only the admin language; the public page detects the browser language and lets visitors switch and save their choice.
2. As the account holder, run `npx wrangler login`. Run `npx wrangler kv namespace create PROFILE_KV`, then place the returned namespace ID in `wrangler.jsonc` in place of `YOUR_KV_NAMESPACE_ID`. Do not reuse someone else's KV.
3. Copy `.dev.vars.example` to the Git-ignored `.dev.vars`. Enter a unique `ADMIN_PASSWORD` and a long random `SESSION_SECRET` locally; never commit this file or use its placeholder values. Run `npm run check`; use `npm run dev` for a local preview.
4. Verify that your Worker name will not overwrite an existing service, then run `npx wrangler deploy --secrets-file .dev.vars` for the first deployment. Check the reported `workers.dev` public URL and `/admin/login`. Sign in with the configured password; you can change it in the editor. After a change, the new password stored in KV takes precedence over the initial secret. For later updates, use `npx wrangler deploy --keep-vars --strict` without re-uploading the local secrets. Investigate any remote configuration conflict before proceeding.

The editor changes your public name, three-language bio and status, avatar, links, browser title, and footer link. Open `/admin/login` directly, or click the footer statistics icon five times within five seconds. The avatar no longer opens admin. Admin views use the root URL and remember their mode per tab. If browser storage is blocked, sign-in still works, but you may need to reopen admin after refreshing. The avatar and settings live in KV, and public-page data is readable by visitors, so do not enter private information. Configure a custom domain and abuse-mitigation WAF rules separately in Cloudflare; this code does not enable them. Requests may fail after Free-plan quotas are exhausted. Rolling back a Worker version does not restore KV or Durable Object data; back up important settings separately before updates. Code is licensed under GNU GPL version 3 only (`GPL-3.0-only`; see [LICENSE](LICENSE)); the bundled Kalam font remains under SIL OFL 1.1 in `public/fonts/Kalam-OFL.txt`. Icon sources and the Bootstrap Icons MIT notice are in `public/icons.js`; Simple Icons artwork is provided under CC0. Trademarks belong to their owners.

Under Site settings → Settings backup, export saved settings including the avatar and hidden links, but no passwords, credentials or statistics. Importing JSON (up to 1 MiB) validates it and asks for confirmation; it fills the editor without publishing until you save. Unsaved edits stay as a draft in this browser, with restore/discard choices after signing in again and a warning if the site settings changed. Drafts are not encrypted; discard unused drafts on shared devices. Storage failures show a warning. Links can be Active, Coming soon or Hidden. Hidden items are excluded from public HTML, public data and auto-redirect, but remain in admin and backups. Hiding cannot retract data someone already obtained.

Copyright (c) 2026 Contact Hub contributors.
