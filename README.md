# KiranaWise: a simple shop helper for kirana stores

> Tech4Bharath · Problem 5.1 — *Kiranas tie up cash in dead stock while running out of what sells*

KiranaWise is built for an owner-run kirana store. It keeps **stock, sales and khata** in one simple place, tells the owner **what to buy, what will expire and what is not selling**, and has a **voice assistant** (English / Hindi / Kannada) so the owner can just *say* what happened instead of typing.

**Design rule: simple first.** Big buttons, emoji item pictures, three languages, no jargon, works on a phone. Every screen answers one question.

## What the owner can do

| Screen | What it does | Problem-statement point |
|---|---|---|
| **Home** | Today's sales, khata pending, and a short "needs your attention" list (buy now, expiring, low, not selling), plus a festival banner | Daily view without a billing system |
| **Sell** | Tap an item, tap +/−, choose Cash / UPI / Udhar. Stock goes down by itself (oldest batch first) | "No billing system to learn from": sales records start in seconds |
| **Stock** | Items with local-name aliases (*doodh*, *ಹಾಲು*, *दूध*), expiry dates, "goods arrived", filters for Low / Expiring / Not selling | Expired goods flagged **in advance**, dead stock visible |
| **Buy** | Suggested quantities within the owner's **cash budget**, urgent items first, festival uplift, grouped **per distributor** into draft orders | Cash budget + **owner approves every order** |
| **Buy → Neighbours** | One-tap WhatsApp message to nearby shops to order together | Joint ordering with neighbouring shops |
| **Khata** | Customer ledger (took udhar / paid back), WhatsApp reminder, and the Buy screen shows how much cash is stuck in khata | Customer credit affects buying power |
| **Voice assistant** 🎤 | "Sold 5 milk", "20 cheeni aaya", "ರಮೇಶ್ 200 ಉದ್ರಿ", "what should I buy?" | Reduces manual work |

### The voice assistant

- Works with the browser's built-in speech recognition (Chrome / Edge on Android and desktop) and falls back to typing. No API key, no cloud service, so it keeps working with poor internet.
- Understands English, Hindi, Kannada and Hinglish, including numbers in words (*paanch*, *ಐದು*).
- **Asks before it changes anything.** Reading questions ("how much milk?", "what is expiring?") are answered immediately. Anything that changes the shop (a sale, new stock, khata entry, preparing orders) is read back with **Yes / No** first, and you can also just say *haan* / *ಹೌದು*.
- If it is unsure it asks a question instead of guessing, and it never invents an item it cannot find.

### How "what to buy" is decided (`app/planner.py`)

1. **Demand per day** comes from the shop's own last 4 weeks of sales. With less than a week of records, it falls back to the sample-data model (if trained), so the app is useful from day one.
2. **Festival uplift**: for items linked to an upcoming occasion, demand is raised (e.g. sugar, oil, ghee before Sankranti / Diwali). Festival dates are approximate and live in one list at the top of `planner.py`.
3. **Order size** = days of cover wanted + supplier lead time, plus the owner's alert level, minus current stock.
4. **Expiry aware**: stock about to expire is not counted as "good stock" and is not re-ordered on top of itself.
5. **Cash budget**: the most urgent items get cash first; if money runs out, quantities are reduced or the item is listed as "not enough cash".
6. **Nothing is ordered automatically.** The app creates *draft* orders; the owner edits quantities and approves; only then can the order be sent (WhatsApp) and later marked "goods arrived", which adds stock and expiry dates.

## Project structure

```text
suggestion-model/
├── app/
│   ├── api.py            FastAPI routes (thin)
│   ├── db.py             SQLite schema, upgrades old databases automatically
│   ├── catalog.py        items, aliases/local names, stock, sales, expiry batches
│   ├── planner.py        buy suggestions, expiry report, dead stock, festival uplift
│   ├── orders.py         draft → approved → received orders, joint-order message
│   ├── khata.py          customer credit ledger
│   ├── assistant.py      voice/chat command understanding (EN / HI / KN)
│   ├── seed.py           sample shop for demos
│   ├── data_generator.py + train.py   original demand-model pipeline (optional)
├── frontend/             React + Vite app (src/screens/*, Assistant.jsx, i18n.js)
├── tests/                pytest suite for the shop logic and the assistant
├── data/  models/        local database and trained model (git-ignored)
└── requirements.txt
```

## Run it (Windows PowerShell)

Backend:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.seed                 # optional: load a sample shop
uvicorn app.api:app --reload
```

Frontend (second terminal):

```powershell
cd frontend
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173). On first launch, tap **Load sample shop** on the Home screen, or add your own items.

API docs: http://127.0.0.1:8000/docs. To open the app from a phone on the same Wi-Fi, run the backend with `--host 0.0.0.0` and set `VITE_API_URL` (and `KIRANA_CORS`) to the computer's address.

### Optional: the demand-forecast model

The original machine-learning pipeline is kept. It trains on generated sample data and is used only as a fallback for demand when a shop has under a week of real sales.

```powershell
pip install -r requirements-ml.txt
python -m app.data_generator
python -m app.train
```

### Deploying (demo)

**Backend on Vercel** (project root = repository root): `index.py` is the entry point Vercel looks for, and
`requirements.txt` is kept small on purpose (the ML libraries are in `requirements-ml.txt`).
Vercel's disk is temporary, so the shop database lives in `/tmp` and the **sample shop is loaded automatically**
whenever it starts empty. Data you add in a hosted demo is therefore not permanent and may reset, and separate
server instances do not share data. For a permanent single-owner deployment use a host with a disk
(Render, Railway, Fly.io) and `uvicorn app.api:app --host 0.0.0.0 --port $PORT`; set `KIRANA_DB` to a path on its disk.

**Frontend on Vercel** (second project, *Root Directory* = `frontend`): set the environment variable
`VITE_API_URL` to the backend's URL (no trailing slash) *before* building. Backends on `*.vercel.app` already
accept requests from any `*.vercel.app` frontend; for another domain set `KIRANA_CORS` on the backend to that address.

### Tests

```powershell
pip install -r requirements-dev.txt
python -m pytest -q
```

## Honest limits (what a real pilot would add)

- **Voice** uses the browser's speech engine; recognition quality for Kannada varies by device. Typing always works.
- **Festival dates** are approximate and should be refreshed yearly.
- **Imports are manual** today. Reading UPI alerts and photographing distributor bills (OCR) are the natural next step; the sale / receive endpoints are already what such an importer would call.
- **No login**: it is a single-shop app that stores data in a local SQLite file.
- Sample data is generated and only for demonstration.

## Who benefits beyond one shop

The same sales and expiry data, anonymised across many shops, tells **distributors and FMCG brands** what a thousand small shops will need next week, which is the "following the money" question in the problem statement.
