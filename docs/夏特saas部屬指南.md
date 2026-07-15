# 🚀 夏特 SaaS 平台 (Shutter SaaS) 部署指南

Shutter SaaS 是一個包含多個微服務與多租戶架構的大型系統。在正式的生產環境部署中，建議您準備以下獨立的服務節點，本指南將以標準 Docker / 雲端平台 (如 Railway) 的思維，帶您完成整個部署流程。

---

## 🏗 系統架構總覽

在正式的 SaaS 架構中，我們將整個系統拆分為 **7 個獨立服務**：

**資料庫層 (Database)**
1. `Shutter DB` (共用資料庫 - 同時儲存餐廳主系統與 ERP 的資料)

**後端服務 (Backend)**
2. `api-server` (提供 REST API、WebSocket 與背景排程處理)

**前端介面 (Frontends)**
3. `adminfront` (各餐廳老闆登入的管理後台)
4. `storefront` (給消費者使用的線上點餐前台)
5. `erpfront` (總部用來管理多門市與原物料的 ERP 系統)
6. `saasfront` (SaaS 平台總部專用的超級管理員介面)

**邊緣層 (Edge)**
7. `cf-worker` (Cloudflare 邊緣快取節點，攔截高頻率讀取請求)

---

## 第一部分：環境變數 (.env / Railway Config)

在 SaaS 多租戶架構中，**環境變數僅用於啟動伺服器與定義基礎網域**。請「不要」將各家餐廳的金流或 LINE 機器人金鑰寫在環境變數中，那些會由各租戶登入後台後自行設定並存入資料庫。

請為後端 `api-server` 配置以下**全域環境變數**：

### 📌 1. 核心與資料庫設定
| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------|--------|----------|
| `PORT` | API 伺服器運行的通訊埠 | `3000` | 否 |
| `NODE_ENV` | 執行環境（生產環境請務必填寫 `production`） | `development`| 否 |
| `DATABASE_URL` | `Shutter DB` 系統資料庫的 PostgreSQL 連線字串 | — | **是** |
| `SAAS_URL_PUBLIC` | `saasfront` 的對外公開網址（如 `https://saas.example.com`） | — | **是** |
| `STORE_URL_PUBLIC` | `storefront` 的對外公開網址（如 `https://store.example.com`） | — | **是** |
| `ADMIN_URL_PUBLIC` | `adminfront` 的對外公開網址（如 `https://admin.example.com`） | — | **是** |
| `ERP_URL_PUBLIC` | `erpfront` 的對外公開網址（如 `https://erp.example.com`） | — | **是** |
| `API_URL_PUBLIC` | 後端 API 的對外公開網址 | `http://localhost:3000` | **是** |

### 📌 2. 系統安全與 AI 基礎建設
| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------|--------|----------|
| `JWT_SECRET` | 簽署 Token 的密鑰 (請填寫一段高強度隨機字串) | — | **是** |
| `INTEGRATION_KEY`| ERP 與主系統之間的內部驗證金鑰 | — | **是** |
| `GEMINI_API_KEY` | Google Gemini API 金鑰 (SaaS 平台共用，用於菜單辨識) | — | 否 |

### 📌 3. Cloudflare KV 快取設定 (用於 api-server 主動清除快取)
| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------|--------|----------|
| `CF_ACCOUNT_ID` | Cloudflare 帳戶 ID (32 碼英數字) | — | **是** |
| `CF_KV_NAMESPACE_ID` | Cloudflare KV Namespace ID (32 碼英數字) | — | **是** |
| `CF_API_TOKEN` | 具備 Workers KV Storage 編輯權限的 API Token | — | **是** |

> [!NOTE]
> 系統啟動時會自動將前端網址加入 CORS 允許清單，因此您**不需要手動設定 `CORS_ORIGINS`**。

---

## 第二部分：前端管理後台設定 (存於資料庫)

當系統部署完成且管理員登入 `adminfront` 後，以下資料請至**「進階與效能設定」**中動態填寫。這些資料會存在租戶各自的資料庫中，實現真正的多租戶隔離，讓每個老闆可以使用自己的免費額度與金流帳號。

| 設定類別 | 包含的金鑰參數 | 說明 |
|----------|----------------|------|
| **雲端圖床 (S3)** | `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `BUCKET_NAME` | 用於上傳菜單與使用者圖片，上傳後系統會自動 normal 化並釋放原圖。 |
| **金流串接 (Stripe)** | `Stripe Secret Key`, `Webhook Secret` | 消費者線上刷卡結帳。 |
| **金流串接 (LINE Pay)**| `Channel ID`, `Channel Secret`, `Proxy URL` | 消費者 LINE Pay 結帳。 |
| **顧客 Google 登入** | `Client ID`, `Client Secret` | 消費者在前台使用 Google 快速註冊。 |
| **LINE 訂單通知** | `Channel Secret`, `Access Token` | 消費者點餐後，透過 LINE 收到訂單狀態。 |

---

## 第三部分：第三方服務金鑰申請指南 (詳細步驟)

這部分包含所有金鑰的取得方式，供平台管理員或租戶參考。

### 💳 1. LINE Pay (需綁定固定 IP)
LINE Pay 在 Sandbox 或正式環境中，**強制要求伺服器必須有固定 IP** 才能發起交易。由於 Railway 或 Vercel 等雲端服務通常無法提供固定對外 IP，您必須設定一個轉發網址 (Proxy URL) 來固定 IP (例如透過 Fixie 或是 AWS NAT Gateway)。
1. 前往 [LINE Pay 商家中心](https://pay.line.me/portal/tw/main)。
2. 申請成為合作夥伴 / 進入 Sandbox 測試環境。
3. 進入**「管理付款連結」>「管理金鑰」**。
4. 複製 **Channel ID** 與 **Channel Secret Key**。
5. 在 `adminfront` 中填寫時，除了金鑰外，**請務必填寫您的「固定 IP 轉發網址 (Proxy URL)」**。

### 💳 2. Stripe (信用卡支付)
1. 前往 [Stripe Dashboard](https://dashboard.stripe.com/) 註冊帳號。
2. 點擊右上角 **Developers (開發人員)**。
3. 在左側選單選擇 **API keys**。
4. 複製 **Secret key** (如 `sk_test_...` 或 `sk_live_...`)。
5. 接著點選 **Webhooks**，點擊 **Add an endpoint**。
6. 輸入網址：`https://<你的後端API網址>/api/webhook/stripe/<租戶ID>`。
7. 選擇事件：勾選 `payment_intent.succeeded` 與 `payment_intent.payment_failed`。
8. 建立後，點擊 **Reveal** 獲取 **Webhook Signing Secret** (`whsec_...`)。

### 🤖 3. Gemini AI 金鑰 (填於全域 .env)
1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2. 登入 Google 帳號，點擊左側 **"Get API key"**。
3. 點擊 **"Create API key in new project"** 產生金鑰。
4. 複製金鑰並將其填入 `.env` (或伺服器環境變數) 的 `GEMINI_API_KEY` 中。

### 🔐 4. Google OAuth 登入 (顧客前台)
1. 進入 [Google Cloud Console](https://console.cloud.google.com/) 建立專案。
2. 點擊左側導覽列 **"APIs & Services" > "OAuth consent screen"**。
3. 選擇 **External (外部)** 並填寫 App 名稱與信箱，發布該 Consent Screen。
4. 點擊左側 **"Credentials"**，點擊上方 **"Create Credentials" > "OAuth client ID"**。
5. Application type 選擇 **Web application**。
6. 在 Authorized redirect URIs 中新增：
   - `https://<你的後台網址>/api/auth/google/callback`
7. 點擊 Create，獲取 `Client ID` 與 `Client Secret` 並存入 `adminfront` 設定中。

### 💬 5. LINE 機器人 (訂單通知)
1. 前往 [LINE Developers Console](https://developers.line.biz/console/) 登入。
2. 點擊 Provider，建立一個 **Messaging API** Channel。
3. 獲取 `Channel Secret` 與 `Channel Access Token`，並填入 `adminfront` 中。
4. 將 Webhook URL 設定為：`https://<你的後端API網址>/api/webhook/line/<租戶ID>`，並啟用 Webhook 功能。

### 📧 6. 系統寄信設定 (SMTP / Gmail App Password)
系統發送「邀請管理員信件」或「註冊驗證信」時，會需要一組發信伺服器的帳密。
您可以選擇直接在 **`saasfront` 的「進階與效能設定 > 郵件伺服器設定」** 裡面動態填寫，或是寫死在 Railway 後端 (`api-server`) 的環境變數中：

**選項 A：使用一般的 SMTP (例如 Resend, SendGrid, Amazon SES)**
如果您有專業的寄信服務，請在 Railway 加入以下環境變數：
- `SMTP_HOST` = `smtp.resend.com`
- `SMTP_PORT` = `465` (或 587)
- `SMTP_USER` = `resend` (或您的帳號)
- `SMTP_PASS` = `re_xxxxx...` (您的 SMTP API 金鑰)
- `EMAIL_FROM` = `noreply@yourdomain.com`
- `EMAIL_SENDER_NAME` = `夏特點餐平台`

**選項 B：使用 Gmail 應用程式密碼 (最適合初期免費測試)**
1. 登入要用來寄信的 Google 帳號，前往 [Google 帳戶安全性設定](https://myaccount.google.com/security)。
2. 開啟 **「兩步驟驗證」**。
3. 搜尋或點擊進入 **「應用程式密碼 (App Passwords)」**。
4. 建立一組新的應用程式密碼 (如: `shutter-saas`)，Google 會產生一組 16 碼的英文密碼。
5. 在 Railway 中設定：
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `465`
   - `SMTP_USER` = `你的gmail信箱@gmail.com`
   - `SMTP_PASS` = `這16碼密碼(不含空格)`
   - `EMAIL_FROM` = `你的gmail信箱@gmail.com`

**選項 C：使用正式的 Gmail API (OAuth2 機制，最高送達率)**
如果您希望使用正式的 Google OAuth2 來發信（不會被 Google 阻擋為低安全性應用程式），您需要取得 `Refresh Token`。
1. 在 [Google Cloud Console](https://console.cloud.google.com/) 的專案中，前往 **"APIs & Services" > "Library"**，搜尋並啟用 **"Gmail API"**。
2. 前往 **"Credentials"**，建立一組 **OAuth client ID** (類型選 Web application)。
   - 在 **Authorized redirect URIs** 中加入：`https://developers.google.com/oauthplayground`
   - 建立後取得 `Client ID` 與 `Client Secret`。
3. 前往 [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)。
4. 點擊右上角的**齒輪圖示 (OAuth 2.0 configuration)**，勾選 **"Use your own OAuth credentials"**。
5. 填入您剛才拿到的 `Client ID` 與 `Client Secret`。
6. 在左側 **"Step 1"** 找到 `Gmail API v1`，展開並勾選 `https://mail.google.com/`。
7. 點擊 **"Authorize APIs"**，登入您的 Gmail 帳號並授權。
8. 授權跳轉回來後，點擊 **"Step 2"** 的 **"Exchange authorization code for tokens"**。
9. 複製畫面上的 **`Refresh token`**。
10. 在 Railway 或 `saasfront` 後台配置以下變數：
    - `MAIL_SERVICE_TYPE` = `GMAIL_API`
    - `SMTP_USER` = `授權的Gmail信箱@gmail.com`
    - `EMAIL_FROM` = `授權的Gmail信箱@gmail.com`
    - `GOOGLE_CLIENT_ID` = `您的 Client ID`
    - `GOOGLE_CLIENT_SECRET` = `您的 Client Secret`
    - `GOOGLE_REFRESH_TOKEN` = `您剛才拿到的 Refresh Token`

2. 建立一個新的 **Provider**。
3. 點擊 **Create a Messaging API channel**。
4. 填寫機器人名稱與圖示後建立。
5. 進入 Channel 設定，在 **Basic settings** 分頁捲到底部，複製 **Channel secret**。
6. 切換到 **Messaging API** 分頁，捲到底部的 **Channel access token**。
7. 點擊 **Issue** 產生長期 Token 並複製。
8. 將這兩把金鑰存入 `adminfront` 系統後台。

### ☁️ 7. 雲端圖床 S3 (以 Cloudflare R2 為例)
系統中的商品圖片、餐廳 Logo 等靜態資源需要儲存在相容 S3 的圖床中。強烈推薦使用 Cloudflare R2，並綁定自訂網域。

**步驟一：建立貯體與金鑰**
1. 登入 Cloudflare 控制台，進入 **R2**，點擊 **「建立貯體 (Create bucket)」**，例如命名為 `pizzastudio26-upload`。
2. 回到 R2 總覽頁面，點擊右側的 **「管理 R2 API 權杖 (Manage R2 API Tokens)」**。
3. 點擊 **「建立 API 權杖」**：
   - 權限選擇：**「物件讀取與寫入 (Object Read & Write)」**。
   - 適用範圍：指定給剛剛建立的貯體。
4. 建立後，畫面上會顯示兩組金鑰，請**忽略第一組的「Account API Token」**。
5. 請往下捲動，複製 **「針對 S3 用戶端使用下方的認證」** 區塊中的：
   - **Access Key ID** (存取金鑰識別碼)
   - **Secret Access Key** (秘密存取金鑰)
   - **管轄區域特定端點** (Endpoint URL，如 `https://<account_id>.r2.cloudflarestorage.com`)

**步驟二：綁定公開網域 (Public URL)**
1. 進入您剛建立的 R2 貯體，點擊 **「設定 (Settings)」** 頁籤。
2. 找到 **「公開存取 (Public Access)」** 區塊，點擊 **「連接自訂網域 (Connect Custom Domain)」**。
3. 輸入您的專屬網域（例如 `assets.pizzastudio26.com`），並依照指示完成 DNS 設定。這會成為您在系統後台填寫的 **Public URL**。

**步驟三：解決 Cloudflare CDN 快取導致的 CORS 錯誤 (極度重要 ⚠️)**
當系統（例如 RxDB 離線資料庫）嘗試使用 `fetch` 抓取圖片時，Cloudflare 的邊緣快取 (Edge Cache) 經常會因為第一次載入時瀏覽器沒有帶 Origin 標頭，而把「沒有 CORS 標頭的圖片」給快取起來，導致後續出現 CORS 阻擋錯誤。您必須建立轉換規則來強迫 Cloudflare 永遠輸出 CORS 標頭：
1. 退回 Cloudflare 最外層首頁，點擊進入您綁定圖片的**網站 (Websites)**（例如 `pizzastudio26.com`），**請注意：不是在 R2 設定裡面！**
2. 在左側選單點擊 **「規則 (Rules)」** > **「轉換規則 (Transform Rules)」**。
3. 在畫面上方的頁籤，點擊 **「修改回應標頭 (Modify Response Header)」**。
4. 點擊 **「建立規則 (Create rule)」**，並依照以下設定填寫：
   - **規則名稱**：`Force CORS for R2`
   - **若傳入要求符合...**：選擇 **「自訂篩選條件運算式 (Custom filter expression)」**。
   - **欄位**：`主機名稱 (Hostname)` / **運算子**：`等於 (equals)` / **值**：您在步驟二綁定的網域（如 `assets.pizzastudio26.com`）
   - **接著修改... (修改回應標頭)**：
     - 點擊「設定靜態 (Set static)」 -> 標頭名稱：`Access-Control-Allow-Origin` / 值：`*`
     - 點擊「+ 新增標頭」 -> 「設定靜態 (Set static)」 -> 標頭名稱：`Access-Control-Allow-Methods` / 值：`GET, PUT, POST, DELETE, HEAD`
5. 點擊右下角的 **部署 (Deploy)**。部署完成後，圖片 CORS 阻擋問題將永久解決。

---

## 第四部分：部署各個獨立服務 (Railway / 雲端平台)

在 Railway 或類似的雲端平台上，由於我們是 Monorepo (單一儲存庫) 架構，請在同一個 GitHub Repo 下建立 5 個獨立的服務 (Service)，並依照以下設定：

### 1. api-server (後端核心)
- **部署方式**：Dockerfile
- **Dockerfile Path**：`packages/api-server/Dockerfile`
- **環境變數**：請參考第一部分的設定，並確保連接上您的 `DATABASE_URL`。

### 2. 四個前端專案 (adminfront, storefront, erpfront, saasfront)
這四個前端專案皆採用 Vite 框架，部署設定皆相同（只需更改指令後面的專案名稱）：
- **部署方式**：Nixpacks / Node.js
- **Root Directory**：`/` (保持根目錄，不要選入 packages)
- **Build Command**：`npm install && npm run build -w packages/<對應專案名稱>` (例如：`npm run build -w packages/adminfront`)
- **Start Command**：`npm run preview -w packages/<對應專案名稱> -- --host --port $PORT`

> [!IMPORTANT]
> 前端環境變數打包後即固定。請務必在前端服務的 Variables 頁籤中，設定 `VITE_API_URL_PUBLIC` 指向 `api-server` 的公開網址。若您日後更改了 API 網址，必須重新觸發前端的 Build 流程才會生效。

### 4. Cloudflare Worker (邊緣快取節點 cf-worker)
`cf-worker` 是負責攔截高流量 API (如菜單) 的快取代理層，它不部署在 Railway，而是直接部署至 Cloudflare。
- **部署方式**：透過本機終端機 (Wrangler CLI) 部署。
- **部署指令**：
  1. `cd packages/cf-worker`
  2. `npx wrangler login` (登入 Cloudflare 帳號)
  3. 修改 `wrangler.toml` 內的 `id` 為您的 KV Namespace ID。
  4. 修改 `wrangler.toml` 內的 `[vars]` 區塊，設定 `ORIGIN_URL` 為您後端 API 的正式網址（例如：`"https://api.pizzastudio26.com"`）。這能確保直接使用 `.workers.dev` 測試時，Worker 知道該去哪裡拿資料。
  5. `npx wrangler deploy` (發布上線)

> [!WARNING]
> **常見雷區：不要把環境變數放進 KV 空間！**
> KV (Key-Value) 空間是用來存放系統動態快取的資料（例如菜單的 JSON）。Worker 需要的環境變數（如 `ORIGIN_URL`）必須設定在 `wrangler.toml` 的 `[vars]` 中，或者是 Cloudflare 後台 Worker 專案的「Settings > Variables & Secrets」裡面。

- **綁定路由**：發布後，請至 Cloudflare 網頁後台 > Workers & Pages > `shutter-menu-cache` > Triggers，將您的後端正式 API 網址（如 `api.您的網域.com/api/menu/*`）加入路由，即可實現完美攔截。

> [!TIP]
> **FAQ：為什麼我的 KV 指標 (Reads / Writes) 都是 0？**
> KV 指標大約會有 3~5 分鐘的延遲。但最常見的原因是：**您的請求根本沒有經過 Cloudflare Worker！**
> 如果您是在本地端開發 (`localhost`)，或是直接透過瀏覽器呼叫 Railway 的後端 API（而沒有經過綁定了 Worker 的自訂網域），流量自然不會進到 Worker，KV 也不會有任何讀寫紀錄。
> 解決方法：如果您想要立即看到指標，請確保您在 `wrangler.toml` 設好了 `ORIGIN_URL`，然後直接在瀏覽器呼叫 `https://您的worker名稱.workers.dev/api/menu/items` 來觸發快取。

### 3. Monorepo Watch Paths 設定 (重要最佳化)

在 Monorepo 架構下，若沒有設定 Watch Paths，每次 Push 程式碼都會觸發所有 5 個服務同時重新建置（極度耗時且浪費資源）。
請在 Railway 中每個服務的 **Settings -> Deployments -> Watch Paths** 依序填入以下規則，確保只有在相關檔案更動時才觸發建置：

**api-server (後端)**
```text
/packages/api-server/**
/packages/shared/**
/prisma/**
/package.json
/package-lock.json
```

**adminfront, storefront, erpfront, saasfront (所有前端專案通用)**
```text
/packages/<對應的前端資料夾名稱>/**
/packages/shared/**
/package.json
/package-lock.json
```

---

## 第五部分：資料庫初始化與預設資料 (首次部署)

當所有的伺服器都亮起綠燈 (Active) 時，這代表容器已經運行，但資料庫內仍是空的。
在**第一次部署**時，請透過終端機 (或進入 `api-server` 容器內部)，依序執行以下指令來建立架構與預設資料：

1. **建立系統資料表 (Migration)**
   這會套用所有 Schema 變更並初始化資料表。
   ```bash
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```

2. **寫入種子資料 (Seed)**
   這會建立預設的超級管理員與基礎系統設定。
   ```bash
   npm run db:seed -w packages/api-server
   ```

---

## ✅ 第六部分：最終檢查清單

為確保您的 SaaS 平台穩定運作，請確認以下項目：
- [ ] 1 個資料庫 (Shutter DB) 皆已正常啟動並可連線。
- [ ] `api-server` 成功讀取 `DATABASE_URL`，且已設定 `SAAS_URL_PUBLIC` 等 4 個前端網址。
- [ ] 4 個前端專案皆已設定 `VITE_API_URL_PUBLIC` 並成功完成建置。
- [ ] 已執行 Prisma 命令 (migrate deploy 與 seed) 完成資料庫初始化。
- [ ] 透過瀏覽器訪問 `http(s)://<你的adminfront網址>/` 能夠正常看到登入畫面。
- [ ] SaaS 管理員登入後，**請引導各租戶到後台填寫 LINE Pay Proxy URL、Stripe 等資料庫金鑰設定**。

恭喜！您的夏特 SaaS 平台已經完整部署完畢！🚀
