# Contact Hub · v1.4.1

[中文](#中文) · [日本語](#日本語) · [English](#english)

## 中文

> AI 無代碼部署提示詞：請閱讀此 repository 的 README、`package.json`、`wrangler.example.jsonc` 和實際程式，陪我在自己的 Cloudflare 帳戶部署這個 Contact Hub。請先確認我有 Node.js 及 Cloudflare Workers 帳戶，再依本版的 Worker、KV、SQLite Durable Object、靜態資產、登入保護的分類統計與兩個 Secret 的設定完成安裝、設定、測試、部署及網址驗證。只詢問真正缺少的值；後台語言由我選 `zh-TW`、`ja` 或 `en`，訪客頁仍可自行切換三語。登入 Cloudflare、授權、輸入密碼／Secret 和涉及帳戶的實體操作必須由我本人完成；不要把 Secret 顯示在對話、命令列輸出或 Git。先檢查 Worker 名稱與資源是否已存在，未經我確認不得覆寫既有部署。不要改寫架構；每步只報告已實際驗證的結果，失敗時協助排錯，不要宣稱未驗證的部署已完成。

這是一個可部署到 Cloudflare Workers 的個人聯絡頁，附密碼登入後台、可編輯的網站與聯絡連結、頭像及訪客計數。需要 Node.js 22.13 以上、npm 和 Cloudflare Workers 帳戶；使用 Workers、KV、SQLite Durable Object，可用於免費方案，但仍受 Cloudflare 額度限制。

[線上示範](https://kk311.me/)：作者實際使用的首頁，含個人客製化，與預設部署可能略有不同。

### 部署

1. 執行 `npm ci`，複製 `wrangler.example.jsonc` 為受 Git 忽略的 `wrangler.jsonc`。將 `name` 改為你自己的、尚未使用的 Worker 名稱。設定 `ADMIN_LANGUAGE` 為 `en`（預設）、`zh-TW` 或 `ja`；它只固定後台語言。訪客頁依瀏覽器語言顯示，並可手動切換及記住選擇。
2. 由帳號持有人執行 `npx wrangler login`；執行 `npx wrangler kv namespace create PROFILE_KV`，把建立結果中的 namespace ID 填入 `wrangler.jsonc` 的 `YOUR_KV_NAMESPACE_ID`。不要共用別人的 KV。
3. 複製 `.dev.vars.example` 為受 Git 忽略的 `.dev.vars`，在本機填入獨一的 `ADMIN_PASSWORD` 與隨機、足夠長的 `SESSION_SECRET`。勿提交此檔或使用範例值。執行 `npm run check`，本機預覽可用 `npm run dev`。
4. 確認 Worker 名稱不會覆寫現有服務後，首次執行 `npx wrangler deploy --secrets-file .dev.vars`。部署後開啟 Wrangler 回報的 `workers.dev` 網址檢查公開頁及 `/admin/login`。首次登入用設定的密碼；後續可在後台修改。換密碼後，KV 中的新密碼會覆蓋初始 Secret。日後更新用 `npx wrangler deploy --keep-vars --strict`，不必重送本機 Secret；若檢查到遠端設定衝突，先查明原因。

### 使用

直接開啟 `/admin/login`，或在首頁 5 秒內點擊頁尾統計圖示五次，輸入密碼進入後台；畫面使用根網址。可編輯名稱、三語簡介與狀態、頭像、連結、網頁標題與頁尾連結。設定存在 KV，公開內容可被訪客讀取，請勿填入私人資訊。自訂網域與 WAF 防濫用規則在 Cloudflare 設定。Worker 版本回退不會還原 KV 或 Durable Object 資料，更新前請另外備份重要設定。

聯絡圖標有網址時開啟連結；網址留空但有帳戶內容時，點擊即可複製（需 HTTPS 或 localhost）。選擇圖標會自動填入空白或預設名稱，保留自訂名稱。

「網站設定 → 設定備份」可匯出已儲存設定，含頭像與隱藏項目，不含密碼、憑證或統計。匯入 JSON 最多 1 MiB，確認後載入編輯器，按儲存才生效。未儲存編輯會留在此瀏覽器，再次進入後台可恢復或捨棄，設定已改變時會提醒。草稿未加密，共用裝置上的其他人可能讀取；備份也請妥善保管。連結可選「啟用／準備中／隱藏」，隱藏項目仍留在後台與備份，但不出現在公開資料或自動跳轉中；不能撤回先前已被他人取得的內容。

儲存期間繼續編輯的內容會保留，需再按儲存。瀏覽器禁止儲存偏好時，語言與外觀仍可切換，但不會記住選擇。修改密碼會撤銷舊登入；受 Workers KV 同步延遲影響，不保證所有節點立即生效。

App 內自動跳轉可在「網站設定」開啟，預設關閉，倒數 1–10 秒（預設 5 秒）。可辨識 App 時，按順序選第一個已啟用、未隱藏且有同平台 HTTPS 網址的聯絡項目；支援清單見後台。點擊提示可取消，背景頁面暫停倒數，同一分頁工作階段只提示一次。識別及連結行為受 App 版本影響，不保證開啟原生 App 或直接進入對話。微信僅提供帳戶複製。

### 統計與注意事項

登入後可看國家／地區、設備、系統、瀏覽器、App 與來源網域。統計以 UTC 保存 30 天，提供今日／7 天／30 天檢視；每天最多記錄 5,000 次首頁請求（含已辨識機器人），來源網域最多 50 種，其餘合併。分類資料不保留原始 IP、完整 UA 或來源路徑／查詢；分類是推測，訪問次數不是獨立人數。報表僅供登入者查看，手動更新；達上限或寫入異常會提示資料可能不完整。免費額度仍可能耗盡。

每日概況以雙柱狀圖顯示訪問與機器人請求；懸停、點擊或鍵盤選擇可查看數值，30 天可橫向滑動，未有記錄的日期不視為零。

程式以 [GNU GPL v3，僅第 3 版](LICENSE)（`GPL-3.0-only`）授權。Kalam 字體採 [SIL OFL 1.1](public/fonts/Kalam-OFL.txt)；Simple Icons 圖示採 CC0，Bootstrap Icons 採 MIT，來源與聲明見 [public/icons.js](public/icons.js)。商標屬各權利人。

## 日本語

> AI によるコード不要のデプロイ用プロンプト：この repository の README、`package.json`、`wrangler.example.jsonc` と実際のコードを読んで、私自身の Cloudflare アカウントに Contact Hub を導入する手順を案内してください。Node.js と Workers アカウントを確認し、この版で使う Worker、KV、SQLite Durable Object、静的アセット、ログイン保護されたアクセス統計、二つの Secret に合わせてインストール・設定・テスト・デプロイ・URL 確認を進めてください。本当に不足する値だけ質問してください。管理画面の言語は私が `zh-TW`、`ja`、`en` から選び、訪問者は三言語を切り替えられます。Cloudflare へのログイン、認可、パスワードや Secret の入力、本人確認などはアカウント所有者が行います。Secret を会話、端末出力、Git に載せないでください。既存の Worker やリソースを確認し、私の了承なく上書きしないでください。構成を勝手に変えず、実際に確認した作業だけを完了と報告し、問題があれば原因を調べてください。

Contact Hub は Cloudflare Workers で動く個人用リンク・連絡先ページです。パスワードで入る管理画面、編集可能なリンク・画像、訪問者カウンターがあります。Node.js 22.13 以上、npm、Cloudflare Workers アカウントが必要です。Workers、KV、SQLite Durable Object を使い、無料プランでも利用できますが、無料枠の制限は適用されます。

[デモを見る](https://kk311.me/)：作者が実際に使っているサイトです。個人向けに調整しているため、初期設定とは一部異なります。

### デプロイ

1. `npm ci` を実行し、`wrangler.example.jsonc` を Git 対象外の `wrangler.jsonc` にコピーします。`name` を未使用の自分専用 Worker 名に変更します。`ADMIN_LANGUAGE` は既定の `en`、`zh-TW`、`ja` から選びます。これは管理画面だけの言語設定で、公開ページはブラウザー言語に応じて表示され、訪問者が切り替え・保存できます。
2. アカウント所有者が `npx wrangler login` を実行します。`npx wrangler kv namespace create PROFILE_KV` で KV を作り、返された namespace ID を `wrangler.jsonc` の `YOUR_KV_NAMESPACE_ID` に設定します。他人の KV は使わないでください。
3. `.dev.vars.example` を Git 対象外の `.dev.vars` にコピーし、固有の `ADMIN_PASSWORD` と十分に長いランダムな `SESSION_SECRET` をローカルで設定します。例の値を使わず、ファイルをコミットしないでください。`npm run check` で確認し、ローカル表示には `npm run dev` を使えます。
4. 既存サービスと Worker 名が衝突しないことを確かめてから、初回は `npx wrangler deploy --secrets-file .dev.vars` を実行します。表示された `workers.dev` URL の公開ページと `/admin/login` を確認します。初回は設定したパスワードでログインし、後から管理画面で変更できます。変更後は KV の新しいパスワードが初期 Secret より優先されます。以後の更新には `npx wrangler deploy --keep-vars --strict` を使い、ローカルの Secret を再送しません。リモート設定との競合が出たら、原因を確認してください。

### 使い方

`/admin/login` を開くか、トップページのフッターの統計アイコンを5秒以内に5回押し、パスワードを入力します。管理画面はルート URL に表示されます。名前、三言語の紹介文・ステータス、画像、リンク、ページタイトル、フッターリンクを編集できます。設定は KV に保存され、公開内容は訪問者も取得できるため、非公開情報を入力しないでください。独自ドメインと不正アクセス対策の WAF ルールは Cloudflare 側で設定します。Worker のバージョンを戻しても KV や Durable Object のデータは戻らないため、重要な設定を更新前に別途保存してください。

連絡先アイコンは URL があればリンクを開き、URL が空欄でアカウントが入力されていればクリックでコピーします（HTTPS または localhost が必要です）。アイコンを選ぶと空欄または既定の表示名が自動入力され、手動で付けた名前は保持されます。

「サイト設定 → 設定のバックアップ」で保存済み設定を出力できます。画像と非表示項目を含み、パスワード・認証情報・統計は含みません。JSON は1 MiB 以下で、確認後に編集画面へ読み込み、保存して初めて適用されます。未保存の編集はこのブラウザーに残り、再ログイン時に復元・破棄を選べます。設定が変わっていれば警告します。下書きは暗号化されず、共用端末では他の人が読める可能性があります。バックアップも安全に保管してください。リンクは「有効／準備中／非表示」を選べます。非表示項目は管理画面とバックアップに残り、公開データや自動移動から除外されます。すでに取得された内容までは取り消せません。

保存中に行った編集は保持されますが、もう一度保存する必要があります。ブラウザーが設定の保存を拒否しても言語と外観は切り替えられますが、選択は記憶されません。パスワード変更で古いログインは無効になりますが、Workers KV の同期に時間がかかるため、全拠点で即時に反映されるとは限りません。

アプリ内の自動移動はサイト設定で有効にできます。初期設定はオフ、待ち時間は1〜10秒（初期値5秒）です。判別できたアプリ内で、有効・非表示でない連絡先のうち、同じサービスの HTTPS URL を持つ最初の項目を選びます。対応アプリは管理画面に表示します。通知を押すとキャンセルし、バックグラウンドでは待ち時間を止め、同じタブのセッションでは一度だけ表示します。識別やリンクの動作はアプリの版によって変わり、ネイティブアプリや会話画面の起動は保証しません。WeChat はアカウントのコピーのみ対応します。

### 統計と注意点

ログイン後、国・地域、端末、OS、ブラウザー、アプリ、参照元ドメイン別の統計を確認できます。UTC 基準で30日間保存し、今日・7日間・30日間を選べます。記録は識別されたボットを含め1日5,000件、参照元ドメインは50種類までで、残りはまとめます。分類データに元の IP、完全な UA、参照元のパスやクエリは保存しません。分類は推定で、アクセス回数は訪問者数とは異なります。報告はログインした人だけが閲覧し、手動で更新します。上限や書き込み失敗は警告しますが、無料枠を超える可能性はあります。

日別の概要はアクセスとボットの棒グラフで表示します。カーソル・タップ・キーボードで数値を確認でき、30日表示は横スクロールに対応します。記録のない日はゼロと区別します。

コードは [GNU GPL バージョン3のみ](LICENSE)（`GPL-3.0-only`）です。Kalam は [SIL OFL 1.1](public/fonts/Kalam-OFL.txt)、Simple Icons は CC0、Bootstrap Icons は MIT です。出典と表記は [public/icons.js](public/icons.js) を参照してください。商標は各権利者に帰属します。

## English

> No-code deployment prompt for an AI coding agent: Read this repository's README, `package.json`, `wrangler.example.jsonc`, and the actual code, then guide me through deploying Contact Hub to my own Cloudflare account. Check that I have Node.js and a Workers account. Use this version's Worker, KV, SQLite Durable Object, static assets, sign-in-protected visit statistics, and two required secrets to install, configure, test, deploy, troubleshoot, and verify the URL. Ask only for missing values. Let me choose `zh-TW`, `ja`, or `en` as the fixed admin language; visitors must still be able to switch among all three. I, the account holder, must perform sign-in, authorization, secret entry, and any identity or physical-account steps. Never reveal secrets in chat, terminal output, or Git. Check for existing Worker names and resources before deployment; do not overwrite anything without my approval. Do not redesign the project, and report only steps you have actually verified.

Contact Hub is a personal links and contact page for Cloudflare Workers, with a password-protected editor, editable avatar and links, and a visitor counter. You need Node.js 22.13+, npm, and a Cloudflare Workers account. It uses Workers, KV, and a SQLite-backed Durable Object. It can run on the Free plan, subject to Cloudflare's limits.

[Live demo](https://kk311.me/): the author's own site, with personal customizations that may differ from a default deployment.

### Deploy

1. Run `npm ci`. Copy `wrangler.example.jsonc` to the Git-ignored `wrangler.jsonc`, and change `name` to a unique Worker name that you own. Set `ADMIN_LANGUAGE` to `en` (default), `zh-TW`, or `ja`. This fixes only the admin language; the public page detects the browser language and lets visitors switch and save their choice.
2. As the account holder, run `npx wrangler login`. Run `npx wrangler kv namespace create PROFILE_KV`, then place the returned namespace ID in `wrangler.jsonc` in place of `YOUR_KV_NAMESPACE_ID`. Do not reuse someone else's KV.
3. Copy `.dev.vars.example` to the Git-ignored `.dev.vars`. Enter a unique `ADMIN_PASSWORD` and a long random `SESSION_SECRET` locally; never commit this file or use its placeholder values. Run `npm run check`; use `npm run dev` for a local preview.
4. Verify that your Worker name will not overwrite an existing service, then run `npx wrangler deploy --secrets-file .dev.vars` for the first deployment. Check the reported `workers.dev` public URL and `/admin/login`. Sign in with the configured password; you can change it in the editor. After a change, the new password stored in KV takes precedence over the initial secret. For later updates, use `npx wrangler deploy --keep-vars --strict` without re-uploading the local secrets. Investigate any remote configuration conflict before proceeding.

### Use

Open `/admin/login`, or click the homepage's footer statistics icon five times within five seconds, then enter your password. Admin uses the root URL. Edit your name, three-language bio and status, avatar, links, page title, and footer link. Settings live in KV; visitors can read public content, so do not enter private information. Configure custom domains and abuse-mitigation WAF rules in Cloudflare. Rolling back a Worker version does not restore KV or Durable Object data. Back up important settings separately before updates.

Contact icons open their URL when provided. With no URL but an account value, clicking copies the account (requires HTTPS or localhost). Choosing an icon fills a blank or default name without replacing a custom name.

Site settings → Settings backup exports saved settings, including the avatar and hidden items, but no passwords, credentials, or statistics. Import JSON up to 1 MiB; confirmation loads it into the editor, and Save applies it. Unsaved edits stay in this browser, with restore/discard choices on returning to admin and a warning if settings have changed. Drafts are not encrypted and may be readable by others using a shared device; keep backups private too. Links can be Active, Coming soon, or Hidden. Hidden items remain in admin and backups but are excluded from public data and auto-redirect. Hiding cannot retract content someone already obtained.

Edits made while a save is pending are kept and need another save. If browser storage is blocked, language and theme controls still work without remembering your choice. Changing the password revokes old sessions, but Workers KV propagation delays mean this is not immediate at every location.

Enable in-app auto-redirect in Site settings (off by default), with a 1–10 second delay (default 5). In a recognized app, it selects the first active, non-hidden contact with an HTTPS URL on that platform. Supported apps are listed in admin. Click the notice to cancel; the countdown pauses in the background and appears once per tab session. Detection and link behavior depend on app versions. Opening a native app or conversation is not guaranteed. WeChat supports account copying only.

### Statistics and notes

After sign-in, view country/region, device, OS, browser, app, and referrer-domain statistics. Data is kept for 30 UTC days, with today/7-day/30-day views. Recording stops after 5,000 homepage requests per day, including recognized bots; up to 50 referrer domains are kept separately and the rest grouped. Category data does not retain raw IPs, full UAs, or referrer paths/queries. Categories are estimates and page views are not unique visitors. Reports require sign-in and refresh manually. Limit and write-failure warnings flag incomplete data; free quotas can still be exhausted.

The daily chart separates visits and bot requests. Hover, tap or focus a date for values; the 30-day view scrolls horizontally. Missing records are distinguished from zero.

Code is licensed under [GNU GPL version 3 only](LICENSE) (`GPL-3.0-only`). Kalam uses [SIL OFL 1.1](public/fonts/Kalam-OFL.txt); Simple Icons artwork uses CC0 and Bootstrap Icons uses MIT. Sources and notices are in [public/icons.js](public/icons.js). Trademarks belong to their respective owners.

Copyright (c) 2026 Contact Hub contributors.
