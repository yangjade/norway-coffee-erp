# 挪威的咖啡｜配銷 ERP

可操作教學系統（角色權限＋首頁 KPI＋客戶／商品／報價／報價轉訂單／訂單／**出貨**／庫存／應收）。企業情境為**挪威的咖啡**（Nordic specialty coffee）。

靜態匯出（`output: "export"`）→ `out/`，部署至 **GitHub Pages**：https://yangjade.github.io/norway-coffee-erp/

## 本機啟動

```bash
npm install
npm run dev
```

開啟：http://127.0.0.1:43123

靜態預覽：

```bash
npm run build
npm run preview:static
```

專案頁 basePath：

```bash
BASE_PATH=/norway-coffee-erp npm run build
npm run preview:static
```

## 模組摘要

| 週次 | 模組 | 能力 |
|------|------|------|
| 5–6 | 客戶／訂單 | 主檔 CRUD、狀態、KPI |
| 7 | 商品／報價 | 牌價、快照單價、狀態流、搜尋篩選、列印 |
| **8** | **報價轉訂單** | Accepted → Sales_Order＋明細；quote↔order；停用客戶／商品不可轉 |
| **10** | **庫存** | Product.On_Hand；出貨扣庫／取消還原；Admin 手動調整；異動紀錄 |
| **11** | **出貨** | 揀貨清單、On_Hand 檢核、確認出貨（同訂單扣庫＋應收）；可取消出貨 |
| **12** | **應收** | 出貨產生 AR；登記收款；未收餘額（非營所稅） |

資料：`localStorage` 鍵 `norway-coffee-erp-demo-v4`（會自 v2／v3 遷移）。

## 建議點擊路徑

報價 Q003（Accepted）→ 轉成訂單 → **出貨**揀貨確認 → 庫存 On_Hand 下降 → 應收出現 → 登記收款。

## 部署

`.github/workflows/deploy-github-pages.yml`：push `main` 後 build `out/`。亦可將 `out/` 推到 `gh-pages` 分支。

## 技術

Next.js 15 + TypeScript + Tailwind。靜態匯出，無伺服器 API。
