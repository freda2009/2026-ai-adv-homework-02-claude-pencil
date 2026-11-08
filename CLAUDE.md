# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述
花卉電商網站（backend-project）— Node.js + Express 4 + SQLite（better-sqlite3）+ EJS + Tailwind CSS 4 全端電商平台。CommonJS 模組；前台頁面由 EJS 渲染，頁面互動由 `public/js/pages/*.js` 以 fetch 呼叫 `/api/*`。

## 常用指令
```bash
npm run start          # 編譯 CSS 並啟動伺服器（預設 PORT 3001）
npm run dev:server     # 僅啟動伺服器（不編譯 CSS）
npm run dev:css        # Tailwind CSS watch 模式
npm run css:build      # 編譯並壓縮 CSS
npm run test           # 執行全部測試（vitest run）
npx vitest run tests/cart.test.js            # 單一測試檔
npx vitest run tests/cart.test.js -t "名稱"   # 單一測試案例
npm run openapi        # 從路由 JSDoc 生成 openapi.json
```
無 lint 設定。需先複製 `.env.example` 為 `.env`（`JWT_SECRET`、`ADMIN_EMAIL/PASSWORD`、`ECPAY_*` 等）。

## 架構要點
- `app.js` 組裝 Express（middleware 與路由掛載順序見 docs/ARCHITECTURE.md）；`server.js` 僅負責 listen。測試以 supertest 直接載入 `app`，不啟動伺服器。
- `src/database.js` 於 require 時同步建表並寫入種子資料（admin 帳號 + 8 個花卉商品）；訂單 `status` 僅限 `pending | paid | failed`。
- 認證三層：`sessionMiddleware`（全域，取 `X-Session-Id`）、`authMiddleware`（JWT，並查 DB 確認使用者存在）、`adminMiddleware`（`role === 'admin'`）。`cartRoutes.js` 內自建 dualAuth。
- 付款：`PATCH /api/orders/:id/pay` 為模擬付款；真實流程走綠界 ECPay（`src/utils/ecpay.js` 做 CheckMacValue 簽章與 QueryTradeInfo，`/ecpay/payment/:orderId` 頁面回傳自動送出的表單，`POST /api/orders/:id/check-payment` 查詢結果）。
- API 文件來源為各 routes 檔案的 JSDoc，設定於 `swagger-config.js`，新增/修改端點時同步更新註解。

## 關鍵規則
- 所有 API 回應統一格式：`{ data, error, message }`，錯誤時 `data: null`；錯誤碼（`VALIDATION_ERROR`、`STOCK_INSUFFICIENT`、`CART_EMPTY`、`INVALID_STATUS`、`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`CONFLICT`、`INTERNAL_ERROR`）見 docs/ARCHITECTURE.md；500 一律回「伺服器內部錯誤」，不洩露細節。
- 購物車使用**雙模式認證**（dualAuth）：優先 JWT，fallback 到 `X-Session-Id`；建立訂單僅支援 JWT。
- 訂單建立使用 `db.transaction()` 原子操作：建立訂單 → 寫入品項快照 → 扣庫存 → 清空購物車。
- 資料庫為 SQLite（better-sqlite3 同步 API，勿用 async/await 包裝 DB 呼叫），WAL 模式，foreign keys 啟用。
- 測試**循序執行且有檔案順序依賴**（見 `vitest.config.js` 的 `sequence.files`，auth → products → cart → orders → adminProducts → adminOrders），共用同一個 `database.sqlite`；新增測試檔須加入該清單。輔助函式在 `tests/setup.js`。
- 功能開發使用 docs/plans/ 記錄計畫；完成後移至 docs/plans/archive/。

## 詳細文件
- ./docs/README.md — 項目介紹與快速開始
- ./docs/ARCHITECTURE.md — 架構、目錄結構、資料流、API 總覽、錯誤碼
- ./docs/DEVELOPMENT.md — 開發規範、命名規則
- ./docs/FEATURES.md — 功能列表與完成狀態
- ./docs/TESTING.md — 測試規範與指南
- ./docs/CHANGELOG.md — 更新日誌

## 回覆的語氣
- 請採用文言文的方式回覆訊息，以節省回覆的 token（開發上不需要特別節省）。
