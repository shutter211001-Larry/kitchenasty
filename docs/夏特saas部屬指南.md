# 🚀 夏特 SaaS 平台 (Shutter SaaS) 部署指南

Shutter SaaS 是一個包含多個微服務與多租戶架構的大型系統。在正式的生產環境部署中，建議您準備以下獨立的服務節點，本指南將以標準 Docker / 雲端平台 (如 Railway) 的思維，帶您完成整個部署流程。

---

## 🏗 系統架構總覽

在正式的 SaaS 架構中，我們將整個系統拆分為 **6 個獨立服務**：

**資料庫層 (Database)**
1. `Shutter DB` (共用資料庫 - 同時儲存餐廳主系統與 ERP 的資料)

**後端服務 (Backend)**
2. `api-server` (提供 REST API、WebSocket 與背景排程處理)

**前端介面 (Frontends)**
3. `adminfront` (各餐廳老闆登入的管理後台)
4. `storefront` (給消費者使用的線上點餐前台)
5. `erpfront` (總部用來管理多門市與原物料的 ERP 系統)
6. `saasfront` (SaaS 平台總部專用的超級管理員介面)

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
