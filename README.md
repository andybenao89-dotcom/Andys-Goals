# Andy’s Goals — v3

保留原本的 Helicopter Academy、Spanish Academy、Investing、AI Tutor，並加入完整測驗流程。

## 功能
- 直升機 19 個章節與 AI 即時課程
- 直升機測驗：選擇題＋簡答題、作答欄、提交、AI 批改、分數、正解與解析
- 西班牙文每日 10 個單字與獨立測驗
- 錯題概念與弱項記錄在使用者瀏覽器 localStorage
- 下一次測驗會把弱項交給 AI，優先加強
- AI Tutor、投資學習區保留
- API 金鑰只放在 Render 環境變數，不放在前端

## Render
沿用目前既有 Render Web Service，不要建立新服務。
GitHub 更新以下檔案後，Render 會依原本設定重新部署：
`server.js`, `package.json`, `index.html`, `app.js`, `styles.css`
`.env.example` 僅供參考，不要把真正 API key 放進 GitHub。
Render 原本的 `OPENAI_API_KEY` 環境變數應保留，不需要重設。
