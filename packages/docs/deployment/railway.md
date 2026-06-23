# 🚂 Railway 部署指南 (微服務架構)

Shutter 是一個包含多個模組的大型系統。在您的架構中，包含了 **2 個資料庫**、**1 個後端伺服器 (Server)** 以及 **3 個前端應用 (Frontends)**。

本指南將帶領您在 [Railway](https://railway.app/) 建立這 6 個獨立的服務，並設定完整的環境變數與金鑰。

---

## 🏗 架構總覽

在 Railway 專案中，我們需要建立以下 6 個服務：

**資料庫 (Databases)**
1. `Shutter DB` (主資料庫)
2. `Shutter ERP DB` (ERP 資料庫)

**後端伺服器 (Backend)**
3. `Server` (API 伺服器，對應 `packages/server`)

**前端介面 (Frontends)**
4. `Admin` (後台管理介面，對應 `packages/admin`)
5. `Storefront` (顧客點餐前台，對應 `packages/storefront`)
6. `ERP Frontend` (ERP 管理介面，對應 `packages/shutter-erp-frontend`)

---

## 第一部分：建立專案與 2 個資料庫

1. **建立專案**：前往 [Railway](https://railway.app/) 點擊 **New Project**，選擇 **Empty Project**。
2. **新增主資料庫**：
   - 點擊 **Create** -> **Database** -> **Add PostgreSQL**。
   - 建立完成後，您可以點選卡片的 **Settings** 將其重新命名為 `Shutter DB` 以防混淆。
3. **新增 ERP 資料庫**：
   - 再次點擊 **Create** -> **Database** -> **Add PostgreSQL**。
   - 建立完成後，重新命名為 `Shutter ERP DB`。

> [!TIP]
> 點擊個別資料庫卡片，切換到 **Variables**，您可以找到各自的 `DATABASE_URL`。請將這兩組網址先複製到記事本備用。

---

## 第二部分：部署 Server 與 3 個前台

因為我們使用的是 Monorepo (單一儲存庫)，您需要**重複 4 次**從 GitHub 匯入同一個儲存庫，並為每個服務設定不同的「根目錄 (Root Directory)」。

1. 點擊 **Create** -> **GitHub Repo**，選擇您的 `shutter` 儲存庫。（請重複此動作 4 次，建立 4 個 App 服務）
2. 針對這 4 個卡片，分別點擊進入 **Settings** 分頁，往下找到 **Root Directory**。
3. 依照下方對應表，更改 Root Directory，並在上方更改卡片名稱：

| 服務名稱 (建議命名) | Root Directory | 用途 |
|-----------------|----------------|------|
| `Server` | `/packages/server` | 後端 API |
| `Admin` | `/packages/admin` | 管理員後台 |
| `Storefront` | `/packages/storefront` | 顧客點餐前台 |
| `ERP Frontend` | `/packages/shutter-erp-frontend` | ERP 前台系統 |

4. **綁定網域名稱 (Domains)**：
   - 分別進入這 4 個服務的 **Settings** -> **Public Networking**。
   - 點擊 **Generate Domain** 取得免費網址（例如 `admin-production.up.railway.app`），或綁定您自己的網域。
   - 請將取得的 **4 個網址**記錄下來，稍後環境變數會用到。

---

## 第三部分：設定後端 (Server) 環境變數

請點擊 **`Server`** 卡片，切換到 **"Variables"** 分頁。這些環境變數是系統運作的核心。

### 📌 1. 核心與資料庫設定
| 變數名稱 | 說明 |
|----------|------|
| `PORT` | 填寫 `3000` |
| `NODE_ENV` | 填寫 `production` |
| `CORS_ORIGINS` | 填寫您 **3 個前端**的網址，以逗號分隔。例如：`https://admin.up.railway.app,https://store.up.railway.app,https://erp.up.railway.app` |
| `STOREFRONT_URL` | 填寫 `Storefront` 服務的網址。用於信件與 LINE 推播中的返回連結。 |
| `DATABASE_URL` | 填入第一階段取得的 `Shutter DB` 連線字串 |
| `SHUTTER_ERP_DATABASE_URL`| 填入第一階段取得的 `Shutter ERP DB` 連線字串 |
| `SHUTTER_ERP_API_URL` | 填寫您的 `Server` 對外 API 網址 (與 KITCHENASTY_API_URL 相同，因 ERP API 合併在 Server 中) |
| `KITCHENASTY_API_URL` | 填寫您的 `Server` 對外 API 網址 |
| `INTEGRATION_KEY` | ERP 與主系統間的內部驗證金鑰（請自訂一段隨機字串，例如 `super-secret-key`） |

### 📌 2. 安全驗證 (Authentication)
| 變數名稱 | 說明 |
|----------|------|
| `JWT_SECRET` | 簽署 Token 的密鑰。請填寫一段隨機長字串。 |
| `JWT_EXPIRES_IN` | 填寫 `7d` |

### 📌 3. AI 服務與 Google 整合
- 取得金鑰詳細步驟請見：[第三方金鑰取得指南](../configuration/provider-keys.md)
| 變數名稱 | 說明 |
|----------|------|
| `GEMINI_API_KEY` | Gemini AI 金鑰 |
| `GOOGLE_LOGIN_CLIENT_ID` | 顧客登入 ID |
| `GOOGLE_LOGIN_CLIENT_SECRET`| 顧客登入密碼 |
| `GOOGLE_CLIENT_ID` | 系統寄信識別 ID |
| `GOOGLE_CLIENT_SECRET` | 系統寄信識別密碼 |
| `GOOGLE_REFRESH_TOKEN` | 寄信長期憑證 |
| `EMAIL_FROM` | 寄件人名稱，如 `Shutter <noreply@yourdomain.com>` |

### 📌 4. LINE 機器人
| 變數名稱 | 說明 |
|----------|------|
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN`| LINE 長期 Access Token |

---

## 第四部分：設定前端環境變數 (Admin, Storefront, ERP)

對於 3 個前端服務 (`Admin`, `Storefront`, `ERP Frontend`)，您需要在各自的 **Variables** 分頁中，告訴它們後端 API 在哪裡。
請依照您的 Vite 前端設定，加入環境變數（通常為 `VITE_API_URL`）：

| 變數名稱 | 說明 |
|----------|------|
| `VITE_API_URL` | 填寫您的 `Server` 網址（例如 `https://server-production.up.railway.app`） |

> [!IMPORTANT]
> **重新建置前端**：前端的環境變數必須在「建置階段 (Build time)」寫入，因此在設定好 `VITE_API_URL` 後，請務必點擊各自前端服務右上角的 **Deploy** 按鈕來觸發重新建置。

---

## ✅ 最終檢查清單

- [ ] 在 Railway 畫面上，您可以看到 6 個方塊 (2 個 DB, 1 個 Server, 3 個 Frontend)。
- [ ] 3 個前端服務都有設定對應的 `/packages/xxx` 作為 Root Directory。
- [ ] `Server` 已經成功連結了兩個資料庫的連線字串 (`DATABASE_URL` 與 `SHUTTER_ERP_DATABASE_URL`)。
- [ ] `Server` 的 `CORS_ORIGINS` 包含了 3 個前端的完整網址 (確保不會產生 CORS 跨網域錯誤)。
- [ ] 第三方金鑰（Google、LINE、Gemini）皆已正確填入 `Server`。
- [ ] 所有前端與後端服務皆顯示 **Active (綠燈)**。
