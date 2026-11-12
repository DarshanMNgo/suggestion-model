# KiranaWise frontend

React + Vite app for the shop owner. Phone first (bottom tab bar), sidebar on desktop.

## Run

Keep the backend running from the repository root (`uvicorn app.api:app --reload`), then:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The app talks to `http://127.0.0.1:8000`; change it with `VITE_API_URL`.

## Where things are

| File | Purpose |
|---|---|
| `src/App.jsx` | Shell, navigation, language, toasts |
| `src/screens/` | Home, Sell, Stock, Buy, Khata, Settings |
| `src/Assistant.jsx` | Floating voice/chat assistant (browser speech recognition + speech output) |
| `src/i18n.js` | All text in English, Hindi and Kannada. Add a language here |
| `src/api.js` | Fetch helper and item emoji |
| `src/ui.jsx` | Shared pieces: page, bottom sheet, stepper, badge |
