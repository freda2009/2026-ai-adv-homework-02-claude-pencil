---
name: e2e-ecpay-webatm
description: 以 Playwright MCP 執行花卉電商「登入 → 加入購物車 → 結帳 → 綠界網路ATM（台灣土地銀行）→ 訂單已付款」E2E 測試，全程錄影並於結束時截圖，存至 tests/e2e-records/，檔名帶 YYYY-MM-DD-HH-mm。當使用者要求跑 E2E、綠界結帳測試、WebATM／土地銀行付款測試、錄影測試結帳流程時使用。
---

# 綠界 WebATM 結帳 E2E 測試

流程腳本在同目錄 `flow.js`，經 Playwright MCP 執行。照下列步驟做，不要跳步。

## 為何不用 node 直接跑

本環境的 Bash 沙箱會隔離網路且禁止啟動 Chrome，沙箱內的 node 腳本既開不了瀏覽器，也連不到使用者在外部啟動的伺服器。Playwright MCP 的瀏覽器在沙箱外，所以一律經 MCP 執行。同理，**不要用沙箱內的 `curl` 判斷伺服器是否已開**，結果不準。

## 步驟

### 1. 載入工具

```
ToolSearch: select:mcp__playwright__browser_navigate,mcp__playwright__browser_run_code_unsafe
```

### 2. 確認伺服器

`browser_navigate` 至 `http://localhost:3001/`。

- 成功：繼續。
- `ERR_CONNECTION_REFUSED`：**停下**，請使用者在提示列執行 `! npm run start`（需保持執行），待使用者確認後再重試此步。不要嘗試以 `dangerouslyDisableSandbox` 自行啟動。
- 若報 Chrome 找不到：請使用者執行 `! npx playwright install chrome`。

### 3. 執行流程

```
mcp__playwright__browser_run_code_unsafe
  filename: .claude/skills/e2e-ecpay-webatm/flow.js
```

腳本會自建一個錄影用的 browser context，依序：

1. 開啟 `/login`
2. 以 `admin@hexschool.com` / `12345678` 登入
3. 首頁「迷你多肉組合盆」（`flow.js` 的 `PRODUCT`）→「加入購物車」，進 `/cart` →「前往結帳」。刻意不選第一件商品：vitest 固定用 `products[0]`，共用同一個 `database.sqlite`，爭用庫存會讓單元測試失敗
4. 填收件資料（測試用戶／admin@hexschool.com／台北市信義區測試路1號）→「確認送出訂單」
5. 綠界 stage 頁：點 **WebATM（網路ATM）** → 銀行選 **台灣土地銀行** →「前往付款」→ 提示框「關閉」
6. 土地銀行模擬頁（`MockMPPost/LandWebAtm`，預設 RC=0 交易成功）→「Save」→ 等「付款成功」
7. 「返回商店」→ 訂單詳情頁須出現「已付款」，擷取訂單編號

結束時（不論成敗）全頁截圖、關閉 context、存影片。

### 4. 回報

腳本回傳：

```js
{ status: 'PASS' | 'FAIL', step, orderNo, url, video, screenshot, error }
```

- 用 `Read` 開啟 `screenshot` 檢視，確認畫面與 status 相符。
- 以表格向使用者回報：結果、訂單編號、影片路徑、截圖路徑。
- FAIL 時：說明失敗於哪一步（`step`）與 `error`，附截圖所見；檔名會帶 `-failed`。不要宣稱通過。

## 產物

- 位置：`tests/e2e-records/`（已列入 `.gitignore`）
- 檔名：`YYYY-MM-DD-HH-mm-ecpay-webatm.webm` / `.png`（台北時間；失敗加 `-failed`）
- 影片暫存於 `tests/e2e-records/.tmp/`，存檔後自動刪除

## 注意事項

- 「ATM 網路交易」對應綠界頁籤 **WebATM（網路ATM）**，不是 **ATM（ATM虛擬帳號）**。
- 綠界為 stage 測試環境（`payment-stage.ecpay.com.tw`），不會真實扣款。
- 每次執行都會新增一筆已付款訂單，並扣一件庫存；本 skill 不清理資料。
- 選擇器若因頁面改版失效，先用 `browser_snapshot` 查實際元素，再改 `flow.js`。
- `flow.js` 檔首的 `BASE_DIR` 為專案絕對路徑；專案搬移時須同步修改。
