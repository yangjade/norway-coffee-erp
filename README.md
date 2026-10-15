# 挪威的咖啡｜配銷 ERP 首頁 v1

可操作教學系統首頁（角色權限＋四項 KPI）。企業情境為**挪威的咖啡**。

靜態匯出（`output: "export"`）→ `out/`，可部署到 **GitHub Pages**。

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

## 部署到 GitHub Pages（穩定 github.io）

本 repo 已含 `.github/workflows/deploy-github-pages.yml`：push `main` 後會 build `out/` 並部署。

1. 在 **github.com** 建立空 repo（建議名：`norway-coffee-erp`）
2. 把本專案推上去（目前 Cursor Origin 遠端**不是** GitHub）：

```bash
git remote add github https://github.com/<你的帳號>/norway-coffee-erp.git
git push -u github main
```

3. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. 等 Actions 綠燈後開啟：

- 專案頁：`https://<帳號>.github.io/norway-coffee-erp/`
- 若 repo 名是 `<帳號>.github.io`：根網址 `https://<帳號>.github.io/`

Workflow 會依 repo 名稱自動設定 `BASE_PATH`（專案頁為 `/repo-name`）。本機若要模擬專案頁：

```bash
BASE_PATH=/norway-coffee-erp npm run build
```

### 需要你提供的憑證（代理人無法代推 GitHub 時）

環境內 `GITHUB_TOKEN` 無效、無 SSH、無 `GH_TOKEN`。請擇一：

- 在本機／Cursor 登入 GitHub 後自行 `git push`，或
- 提供有效 **Personal Access Token**（權限：`repo` + `pages` / `workflow`）設成 secret `GITHUB_TOKEN` 或 `GH_TOKEN`

## 功能摘要

- 六選單：首頁／客戶／商品／訂單／出貨（預留）／使用者設定
- Admin ↔ Staff 模擬切換（標示「教學用權限模擬」）
- 四項 KPI 由樣本資料計算
- 三層權限：選單隱藏、設定頁擋下、修改操作檢查

## 技術

Next.js 15 + TypeScript + Tailwind。樣本資料在瀏覽器記憶體；重新整理或「重設樣本」還原。
