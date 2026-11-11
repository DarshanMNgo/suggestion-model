# KiranaWise React dashboard

This is the shop-owner dashboard for the demand forecasting API.

## Run locally

Keep the FastAPI backend running in a separate terminal from the repository root:

```powershell
uvicorn app.api:app --reload
```

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

The dashboard calls the API at http://127.0.0.1:8000. The backend includes CORS permission for the Vite local development URLs.

## Dashboard features

- API connection status
- Product selector
- Current stock, supplier lead time, and safety stock inputs
- 7, 14, or 30-day demand forecast
- Daily demand chart and table
- Suggested reorder quantity and calculation

The current backend uses synthetic demonstration sales. Replace these with real store sales and inventory records before relying on the suggested order quantities.
