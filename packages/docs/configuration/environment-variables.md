# 🔐 Environment Variables (環境變數)

All server configuration is managed through environment variables. In a local setup, these are defined in `packages/server/.env`. When deploying (e.g., to Railway, Docker), these must be added to your deployment platform's environment variables section.

---

## ⚙️ Core Configuration (核心設定)

These are the essential settings for running the server.

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `PORT` | API server port | `3000` | No |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` | No |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g., `http://localhost:5173,https://your-site.com`) | `http://localhost:5173,http://localhost:5174` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | — | Yes |
| `STOREFRONT_URL` | The public URL of your storefront (used for redirect links in emails & LINE) | `http://localhost:5174` | Yes |

---

## 🔑 Authentication (安全驗證與授權)

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `JWT_SECRET` | Secret key for signing JWT tokens. Use a long, random string. | — | Yes |
| `JWT_EXPIRES_IN` | Token expiration duration (e.g., `7d`, `24h`) | `7d` | No |

---

## 🤖 AI Services (AI 服務設定)

Shutter uses AI for advanced data analysis and automation.

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API Key. | — | No |
| `GOOGLE_API_KEY` | (Legacy/Alias) Alternate variable for Gemini API Key. | — | No |

---

## 🔗 Google & Social Login (Google 登入與服務)

Used for customer Google OAuth login and system email sending (via Gmail API).

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `BASE_URL` | Public base URL for OAuth callbacks | `http://localhost:3000` | No |
| `GOOGLE_LOGIN_CLIENT_ID` | Client ID for Google Login | — | No |
| `GOOGLE_LOGIN_CLIENT_SECRET`| Client Secret for Google Login | — | No |
| `FACEBOOK_APP_ID` | Facebook app ID | — | No |
| `FACEBOOK_APP_SECRET` | Facebook app secret | — | No |

---

## 📧 Email Service (電子郵件寄送)

You can use standard SMTP, Google Gmail API, or Mailgun for system emails.

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `MAIL_SERVICE_TYPE`| `SMTP`, `GMAIL_API`, or `MAILGUN` | `SMTP` | No |
| `EMAIL_FROM` | Default "from" address (e.g., `Admin <noreply@site.com>`) | — | No |
| **SMTP** |
| `SMTP_HOST` | SMTP server hostname | — | No |
| `SMTP_PORT` | SMTP server port | `587` or `1025` | No |
| `SMTP_USER` | SMTP username | — | No |
| `SMTP_PASS` | SMTP password | — | No |
| **GMAIL API** |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for sending emails | — | No |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret for sending emails| — | No |
| `GOOGLE_REFRESH_TOKEN`| Long-lived refresh token for Gmail API | — | No |
| **MAILGUN** |
| `MAILGUN_DOMAIN` | Mailgun sending domain | — | No |
| `MAILGUN_API_KEY` | Mailgun private API key | — | No |

---

## 💬 LINE Bot Integration (LINE 機器人通知)

Used for sending order notifications via LINE.

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `LINE_CHANNEL_SECRET` | LINE Messaging API Channel Secret | — | No |
| `LINE_CHANNEL_ACCESS_TOKEN`| LINE Messaging API Long-lived Access Token | — | No |

---

## 💳 Payments (支付串接)

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret API key (`sk_test_...` or `sk_live_...`) | — | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) | — | No |
| `PAYPAL_CLIENT_ID` | PayPal REST API client ID | — | No |
| `PAYPAL_CLIENT_SECRET` | PayPal REST API secret | — | No |
| `PAYPAL_SANDBOX` | `true` or `false` to enable PayPal sandbox mode | `false` | No |

---

## 🏢 Shutter ERP / PizzaMaster ERP Integration (ERP 系統整合)

If you are using the integrated ERP system.

| Variable | Description | Default | Required |
|----------|------------|---------|----------|
| `SHUTTER_ERP_DATABASE_URL`| Separate PostgreSQL connection for ERP | `DATABASE_URL` | No |
| `SHUTTER_ERP_API_URL` | Shutter ERP instance URL | `http://localhost:3000` | No |
| `KITCHENASTY_API_URL` | Shutter main API URL | `http://localhost:3000` | No |
| `INTEGRATION_KEY` | Secret key shared between Shutter and ERP | `pizzamaster...`| No |

---

## 📄 Example `.env` File

```dotenv
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
STOREFRONT_URL=http://localhost:5174

DATABASE_URL=postgresql://kitchenasty:kitchenasty@localhost:5432/kitchenasty
JWT_SECRET=change-this-to-a-random-secret
JWT_EXPIRES_IN=7d

# ... add your specific integrations here ...
```

::: tip
For step-by-step instructions on obtaining API keys for Google, LINE, and Gemini, please refer to the [Provider Keys Guide](./provider-keys.md) (第三方服務金鑰取得完全指南).
:::
