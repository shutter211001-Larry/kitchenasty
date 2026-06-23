# 🔑 第三方服務金鑰（API Keys）取得完全指南

這份指南是專為「完全沒有技術背景」的使用者設計的。我們會一步步教你如何取得 Shutter 運作所需的各種「數位通行證」（金鑰）。

---

## 💡 在開始之前：什麼是 API 金鑰？

你可以把 **API 金鑰（API Key）** 想像成一串「專用的密碼」。
*   **為什麼需要它？** 因為當 Shutter 想要代表你寄信、使用 AI 或傳送 LINE 訊息時，Google 或 LINE 需要確認「是誰在要求這項服務」以及「是否有權限」。
*   **安全警示：** 這些金鑰就像你的提款卡密碼。**請絕對不要將它們公開分享或貼到網路上**。

---

## 📝 變數清單（這是你要填空的作業）

你會在專案的 `.env` 檔案（或是 Railway 的 Variables 設定區）看到這些欄位：

```dotenv
GEMINI_API_KEY=              # 讓系統會說話、能分析（Gemini AI）
GOOGLE_CLIENT_ID=            # 讓系統能「寄信」給客人的識別證
GOOGLE_CLIENT_SECRET=        # 寄信識別證的密碼
GOOGLE_REFRESH_TOKEN=        # 讓寄信功能可以長期有效的「自動續期憑證」
GOOGLE_LOGIN_CLIENT_ID=      # 讓顧客可以「用 Google 登入」的識別證
GOOGLE_LOGIN_CLIENT_SECRET=  # 顧客登入識別證的密碼
LINE_CHANNEL_ACCESS_TOKEN=   # 讓系統能傳 LINE 訊息給客人的通行證
LINE_CHANNEL_SECRET=         # 驗證 LINE 訊息來源的防偽印章
```

---

## 🤖 1. Gemini AI 金鑰 (GEMINI_API_KEY)

這串金鑰是讓你的 Shutter 擁有 AI 靈魂的關鍵，用來處理自動化的文字分析。

### 取得步驟：

1.  **開啟網頁：** 點擊前往 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2.  **登入帳號：** 使用你平常使用的 Google 帳號（例如 Gmail 帳號）登入。
3.  **建立金鑰：**
    *   在左側選單找到 **"Get API key"**。
    *   點擊藍色的按鈕 **"Create API key in new project"**（在新建專案中建立金鑰）。
4.  **複製金鑰：** 畫面會跳出一串長長的亂碼，點擊旁邊的 **Copy** 圖示把它複製起來。
5.  **填寫設定：** 將這串亂碼貼到你的設定中。

---

## 🔐 2. Google 服務（登入與寄信）

Google 的設定比較多，因為它需要區分「寄信給人（高權限）」和「讓客人登入（低權限）」。

### 概念說明：Google Cloud 專案
你可以把 Google Cloud 想像成一個辦公室。我們建議建立 **兩個專案** 以策安全：
*   **專案 A (寄信專案)：** 擁有寄信權力。
*   **專案 B (登入專案)：** 只能看客人的名字和信箱，不能寄信。

---

### 第一步：進入 Google Cloud 控制台
1.  打開 [Google Cloud Console](https://console.cloud.google.com/)。
2.  如果你第一次進來，可能要同意一些服務條款。

### 第二步：建立「登入專案」 (GOOGLE_LOGIN_...)
1.  點擊頁面最左上角的專案選擇器（通常寫著專案名稱或 ID）。
2.  點擊右側的 **"NEW PROJECT"**（新專案）。
3.  專案名稱寫 `Shutter-Login`，點擊 **CREATE**。
4.  等它轉完，在專案選擇器改選剛剛建立的 `Shutter-Login`。

#### 設定「同意畫面」（告訴客人你是誰）
1.  在左側搜尋框搜尋 "OAuth consent screen" 並進入。
2.  選擇 **External** (外部)，點擊 **CREATE**。
3.  填寫：
    *   **App name:** Shutter
    *   **User support email:** 選你的信箱
    *   **Developer contact info:** 填你的信箱
4.  一路點 **SAVE AND CONTINUE** 直到結束（回到 Dashboard）。

#### 取得登入用的 ID 與密碼
1.  左側點選 **Credentials** (憑證)。
2.  點擊上方 **+ CREATE CREDENTIALS** -> **OAuth client ID**。
3.  **Application type:** 選 **Web application**。
4.  **Authorized JavaScript origins:** (填入你的網址)
    *   `http://localhost:5173` (本地測試用)
    *   `https://你的前台網址.railway.app`
5.  **Authorized redirect URIs:** (填入 API 接收位置)
    *   `http://localhost:3000/api/auth/google/callback`
    *   `https://你的後台網址.railway.app/api/auth/google/callback`
6.  點擊 **CREATE**，你會看到 `Client ID` 和 `Client Secret`。**複製下來貼到對應變數。**

---

### 第三步：建立「寄信專案」 (GOOGLE_CLIENT_...)
這部分的流程與上面「建立專案」完全一樣，但專案名稱請叫 `Shutter-Email`。

1.  建立專案後，先搜尋 "Gmail API" 並點擊 **ENABLE** (啟用)。
2.  一樣設定 "OAuth consent screen"。
3.  在 **Credentials** 建立 OAuth client ID 時，**Authorized redirect URIs** 請填入：
    *   `https://developers.google.com/oauthplayground`
4.  複製 `Client ID` 和 `Client Secret` 貼到 `GOOGLE_CLIENT_ID` 與 `GOOGLE_CLIENT_SECRET`。

---

### 第四步：取得「長期寄信憑證」 (GOOGLE_REFRESH_TOKEN)
因為 Google 為了安全，寄信通行證每小時會過期一次。我們需要一組「續期憑證」。

1.  打開 [Google OAuth Playground](https://developers.google.com/oauthplayground/)。
2.  點擊右上角的 **齒輪圖示** (Settings)。
3.  勾選 **Use your own OAuth credentials**。
4.  填入剛剛「寄信專案」的 `Client ID` 和 `Client Secret`。
5.  在左側清單搜尋 **Gmail API v1**，展開後選取 `https://www.googleapis.com/auth/gmail.send`。
6.  點擊藍色的 **Authorize APIs**，然後登入你要用來「寄信」的 Gmail 帳號。
7.  點擊 **Exchange authorization code for tokens**。
8.  你會在下方看到 **Refresh token**，把它複製下來貼到 `GOOGLE_REFRESH_TOKEN`。

---

## 💬 3. LINE 訊息服務 (LINE_CHANNEL_...)

這是讓你的系統可以傳送 LINE 通知給顧客。

### 取得步驟：

1.  **進入後台：** 打開 [LINE Developers Console](https://developers.line.biz/console/)。
2.  **建立 Provider：** 點擊 **Create** 建立一個供應商，名稱可以寫 `Shutter-Service`。
3.  **建立 Channel：**
    *   點選 **Create a new channel**。
    *   選擇 **Messaging API**。
    *   填寫名稱、描述、信箱等基本資訊。
4.  **取得 Secret：**
    *   在 **Basic settings** 分頁，往下找 **Channel secret**。這就是你的 `LINE_CHANNEL_SECRET`。
5.  **取得 Token：**
    *   切換到 **Messaging API** 分頁。
    *   滑到底找到 **Channel access token (long-lived)**。
    *   點擊 **Issue** (發行)，這串長長的就是 `LINE_CHANNEL_ACCESS_TOKEN`。

---

## 🚂 4. 如何設定到 Railway？

如果你已經將程式部署到 Railway：

1.  進入你的專案。
2.  點擊 **server** (或後端 API) 的服務。
3.  點擊上方的 **Variables** 分頁。
4.  點擊 **+ Add Variable**。
5.  將上述所有名稱與值一對一填入。
6.  點擊 **Deploy** (或等待自動重新部署)。

---

## ✅ 最後檢查清單

*   [ ] `GEMINI_API_KEY`: 系統可以正常進行 AI 分析。
*   [ ] `GOOGLE_LOGIN...`: 前台點擊「Google 登入」不會噴錯。
*   [ ] `GOOGLE_REFRESH_TOKEN`: 測試寄送系統通知信可以收到。
*   [ ] `LINE_...`: LINE 機器人有反應（若有開啟 Webhook）。

---

> [!WARNING]
> **絕對不要** 將這些金鑰放在 `.txt` 檔案並隨便傳給別人。如果有外洩疑慮，請立刻回到上述後台重新產生（Regenerate）一組新的。
