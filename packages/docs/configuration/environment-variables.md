# 🔐 Environment Variables (環境變數)

伺服器的所有設定都是透過環境變數來管理的。在本地開發環境中，這些變數定義在 `packages/server/.env` 檔案裡。當您準備部署到線上環境（例如 Railway 或 Docker）時，您必須將這些變數新增到您部署平台的環境變數設定區塊中。

---

## ⚙️ Core Configuration (核心設定)

這是伺服器運行所需的最基本設定。

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `PORT` | API 伺服器運行的通訊埠 (Port) | `3000` | 否 |
| `NODE_ENV` | 執行環境（`development`, `production`, `test`） | `development` | 否 |
| `DATABASE_URL` | PostgreSQL 資料庫連線字串 | — | 是 |
| `API_URL_PUBLIC` | 後端 API 的公開對外網址（例如提供給 Webhook 或信件內使用） | `http://localhost:3000` | 是 |
| `API_URL_PRIVATE` | 後端伺服器在 Railway 內部網路的網址（例如 `http://server.railway.internal:3000`） | — | 否 |
| `STORE_URL_PUBLIC` | 您的線上點餐前台公開網址（用於信件與 LINE 的跳轉連結，會自動加入 CORS 允許清單） | `http://localhost:5174` | 是 |
| `ADMIN_URL_PUBLIC` | 您的後台管理介面公開網址（會自動加入 CORS 允許清單） | `http://localhost:5173` | 是 |
| `ERP_URL_PUBLIC` | 您的 ERP 前端介面公開網址（會自動加入 CORS 允許清單） | `http://localhost:5175` | 是 |

---

## 🔑 Authentication (安全驗證與授權)

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `JWT_SECRET` | 用於簽署 JWT Token 的密鑰，請使用一段隨機且夠長的字串。 | — | 是 |
| `JWT_EXPIRES_IN` | Token 的過期時間（例如 `7d` 代表 7 天, `24h` 代表 24 小時） | `7d` | 否 |

---

## 🤖 AI Services (AI 服務設定)

系統使用 AI 進行進階的資料分析與自動化處理。

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API 金鑰。 | — | 否 |
| `GOOGLE_API_KEY` | （舊版或別名）Gemini API 金鑰的替代變數名稱。 | — | 否 |

---

## 🔗 Google & Social Login (Google 登入與社交登入)

用於顧客的 Google OAuth 登入，以及透過 Gmail API 寄送系統信件。

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `GOOGLE_LOGIN_CLIENT_ID` | Google 登入使用的用戶端 ID (Client ID) | — | 否 |
| `GOOGLE_LOGIN_CLIENT_SECRET`| Google 登入使用的用戶端密碼 (Client Secret) | — | 否 |
| `FACEBOOK_APP_ID` | Facebook 應用程式 ID | — | 否 |
| `FACEBOOK_APP_SECRET` | Facebook 應用程式密碼 | — | 否 |

---

## 📧 Email Service (電子郵件寄送服務)

您可以使用標準的 SMTP、Google Gmail API 或 Mailgun 來寄送系統信件。

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `MAIL_SERVICE_TYPE`| `SMTP`、`GMAIL_API` 或 `MAILGUN` | `SMTP` | 否 |
| `EMAIL_FROM` | 預設的寄件人名稱與信箱（例如：`Admin <noreply@site.com>`） | — | 否 |
| **SMTP** |
| `SMTP_HOST` | SMTP 伺服器主機位置 | — | 否 |
| `SMTP_PORT` | SMTP 伺服器通訊埠 | `587` 或 `1025` | 否 |
| `SMTP_USER` | SMTP 帳號名稱 | — | 否 |
| `SMTP_PASS` | SMTP 帳號密碼 | — | 否 |
| **GMAIL API** |
| `GOOGLE_CLIENT_ID` | 用來寄信的 Google OAuth 用戶端 ID | — | 否 |
| `GOOGLE_CLIENT_SECRET`| 用來寄信的 Google OAuth 用戶端密碼 | — | 否 |
| `GOOGLE_REFRESH_TOKEN`| 供 Gmail API 寄信使用的長期更新憑證 (Refresh Token) | — | 否 |
| **MAILGUN** |
| `MAILGUN_DOMAIN` | Mailgun 發信網域 | — | 否 |
| `MAILGUN_API_KEY` | Mailgun 的私有 API 金鑰 | — | 否 |

---

## 💬 LINE Bot Integration (LINE 機器人通知)

用於透過 LINE 傳送訂單狀態通知給顧客。

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `LINE_CHANNEL_SECRET` | LINE Messaging API 的 Channel Secret | — | 否 |
| `LINE_CHANNEL_ACCESS_TOKEN`| LINE Messaging API 的長期 Access Token | — | 否 |

---

## 💳 Payments (支付串接)

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `STRIPE_SECRET_KEY` | Stripe 的私有 API 金鑰（`sk_test_...` 或 `sk_live_...`） | — | 否 |
| `STRIPE_WEBHOOK_SECRET` | Stripe 的 Webhook 簽章密鑰（`whsec_...`） | — | 否 |
| `PAYPAL_CLIENT_ID` | PayPal REST API 的用戶端 ID | — | 否 |
| `PAYPAL_CLIENT_SECRET` | PayPal REST API 的用戶端密碼 | — | 否 |
| `PAYPAL_SANDBOX` | 設為 `true` 或 `false` 來啟用或關閉 PayPal 的沙盒測試模式 | `false` | 否 |

---

## 🏢 Shutter ERP / PizzaMaster ERP Integration (ERP 系統整合)

如果您有搭配整合的 ERP 系統，請設定以下變數。

| 變數名稱 | 說明 | 預設值 | 是否必填 |
|----------|------------|---------|----------|
| `SHUTTER_ERP_DATABASE_URL`| ERP 專用的獨立 PostgreSQL 連線字串 | `DATABASE_URL` | 否 |
| `INTEGRATION_KEY` | Shutter 主系統與 ERP 之間共用的內部驗證金鑰 | `pizzamaster...`| 否 |

---

## 📄 Example `.env` File (範例設定檔)

```dotenv
PORT=3000
NODE_ENV=development
API_URL_PUBLIC=http://localhost:3000
STORE_URL_PUBLIC=http://localhost:5174
ADMIN_URL_PUBLIC=http://localhost:5173
ERP_URL_PUBLIC=http://localhost:5175

DATABASE_URL=postgresql://shutter:shutter@localhost:5432/shutter
JWT_SECRET=change-this-to-a-random-secret
JWT_EXPIRES_IN=7d

# ... 在這裡加入您特定的第三方服務金鑰 ...
```

::: tip
若需要逐步了解如何取得 Google、LINE 以及 Gemini 的 API 金鑰，請參考 [Provider Keys Guide](./provider-keys.md) (第三方服務金鑰取得完全指南)。
:::
