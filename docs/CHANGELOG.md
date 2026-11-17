# 更新日誌

所有重大變更皆記錄於此文件。格式參考 [Keep a Changelog](https://keepachangelog.com/)。

## [Unreleased]

### Changed（目錄整理）
- 設計稿目錄由 `design/` 移至 `docs/design/`（`storefront.pen` 與 `images/`）
- E2E skill 由 `e2e-ecpay-webatm` 更名為 `e2e-payment-test`（`.claude/skills/e2e-payment-test/`）

### Changed（前台視覺改版）
- 前台 8 個頁面（首頁、商品詳情、購物車、結帳、登入／註冊、我的訂單、訂單詳情、404）依新設計稿重做，並支援手機版（響應式）
- 視覺方向由玫瑰粉改為「花市行情板」：墨綠 `ink`、霧紙 `paper`、鳶尾紫 `iris`（按鈕）、花粉黃 `pollen`（價格標籤）；標題字體改用 LXGW WenKai TC，內文維持 Noto Sans TC
- `public/css/input.css` 新增色彩 token、`--font-display` 與共用元件類別（`.page-wrap`、`.btn-primary`、`.btn-outline`、`.field`）；舊有 `rose-*`、`sage` 等 token 保留給後台使用
- `header-init.js`、`notification.js`、`orders.js`、`order-detail.js` 的狀態與提示配色改用新 token（待付款＝pollen、已付款＝ok、付款失敗＝danger）
- 購物車免運進度條改為依小計顯示百分比；首頁 Hero「本週花況板」取自商品 API 前 4 筆

### Added
- 新增 `design/storefront.pen`（Pencil 設計稿，含桌面 1440 與手機 390 各 8 頁）與 `design/images/` 設計用商品圖片

### Fixed
- 登入／註冊後自動合併訪客（`X-Session-Id`）購物車至使用者購物車，修正原先項目遺失問題（同商品數量相加並以庫存為上限）

### Changed
- `POST /api/orders/:id/check-payment` 改為驗證綠界回應 CheckMacValue、MerchantTradeNo 與 TradeAmt 後才標記 paid；簽章錯誤回 502
- `POST /api/orders` 回應新增 `merchant_trade_no`
- 新增 `tests/ecpay.test.js`（stub fetch，涵蓋付款頁、成功、未付款、金額不符、簽章錯誤）

### Added
- 綠界 ECPay AIO 金流串接：結帳後導向綠界付款頁面完成真實付款流程
- 新增 `src/utils/ecpay.js` 工具模組：CheckMacValue 簽章產生/驗證、ECPay 專用 URL 編碼、QueryTradeInfo API 查詢
- 新增 `GET /ecpay/payment/:orderId` 頁面路由：產生自動送出的 ECPay 付款表單
- 新增 `POST /api/orders/:id/check-payment` API：透過 QueryTradeInfo API 主動查詢付款狀態（取代本地端無法接收的 Server Notify）
- 訂單新增 `merchant_trade_no` 欄位：對應綠界 MerchantTradeNo，由 order_no 去除連字號產生

### Changed
- 結帳頁面（checkout.js）：送出訂單後導向綠界付款頁面，不再直接跳轉訂單詳情
- 訂單詳情頁面（order-detail.ejs / order-detail.js）：原「付款成功/失敗」模擬按鈕改為「查詢付款狀態」與「前往付款」按鈕；從綠界導回時自動觸發付款狀態查詢

## [1.0.0] - 2026-04-12

### 新增
- 使用者註冊、登入、個人資料 API
- 商品列表與詳情 API（公開）
- 購物車 CRUD API（雙模式認證：JWT / X-Session-Id）
- 訂單建立、查詢、模擬付款 API
- 後台商品管理 API（CRUD）
- 後台訂單查詢 API（含狀態篩選）
- EJS 前台頁面（首頁、商品詳情、購物車、結帳、訂單）
- EJS 後台頁面（商品管理、訂單管理）
- SQLite 資料庫自動初始化與種子資料
- Vitest 測試套件（6 個測試檔案，循序執行）
- Swagger/OpenAPI 文件生成
- Tailwind CSS 樣式系統
- 專案文件結構建立
