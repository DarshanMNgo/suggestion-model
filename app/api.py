"""FastAPI endpoints for product demand forecasts and reorder advice.

Run: uvicorn app.api:app --reload
"""
from datetime import timedelta
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "demand_model.joblib"
app = FastAPI(title="Kirana Demand Suggestion API", version="1.0.0")

# Allow the local Vite development server to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_bundle():
    if not MODEL_PATH.exists():
        raise RuntimeError("Model not found. Run 'python -m app.data_generator' and 'python -m app.train'.")
    return joblib.load(MODEL_PATH)


@app.get("/health")
def health():
    return {"status": "ok", "model_ready": MODEL_PATH.exists()}


@app.get("/products")
def products():
    bundle = load_bundle()
    history = pd.DataFrame(bundle["history"])
    return {"products": sorted(history["product"].unique().tolist())}


@app.get("/forecast")
def forecast(
    product: str,
    days: int = Query(7, ge=1, le=30),
    current_stock: int = Query(0, ge=0),
    lead_time_days: int = Query(2, ge=1, le=30),
    safety_stock: int = Query(0, ge=0),
    promotion: int = Query(0, ge=0, le=1),
):
    bundle = load_bundle()
    history = pd.DataFrame(bundle["history"])
    history["date"] = pd.to_datetime(history["date"])
    product_history = history[history["product"].str.casefold() == product.casefold()].sort_values("date")
    if product_history.empty:
        raise HTTPException(status_code=404, detail=f"Product '{product}' not found.")

    model = bundle["model"]
    features = bundle["features"]
    sales = product_history["units_sold"].astype(float).tolist()
    last_date = product_history["date"].max()
    predictions = []

    # Recursive daily forecast: each prediction becomes history for the next day.
    for step in range(1, days + 1):
        target_date = last_date + timedelta(days=step)
        row = {
            "day_of_week": target_date.dayofweek,
            "day_of_month": target_date.day,
            "month": target_date.month,
            "is_weekend": int(target_date.dayofweek >= 5),
            "promotion": promotion,
            "lag_1": sales[-1],
            "lag_7": sales[-7] if len(sales) >= 7 else sales[-1],
            "rolling_mean_7": sum(sales[-7:]) / min(7, len(sales)),
            "rolling_mean_28": sum(sales[-28:]) / min(28, len(sales)),
        }
        estimate = max(0.0, float(model.predict(pd.DataFrame([row], columns=features))[0]))
        predictions.append({"date": target_date.date().isoformat(), "expected_units": round(estimate, 1)})
        sales.append(estimate)

    total_demand = sum(item["expected_units"] for item in predictions)
    lead_days = min(lead_time_days, days)
    lead_time_demand = sum(item["expected_units"] for item in predictions[:lead_days])
    reorder_point = lead_time_demand + safety_stock
    suggested_order = max(0, int(round(reorder_point - current_stock)))

    return {
        "product": product_history["product"].iloc[-1],
        "forecast_days": days,
        "daily_forecast": predictions,
        "expected_total_demand": round(total_demand, 1),
        "current_stock": current_stock,
        "lead_time_days": lead_time_days,
        "safety_stock": safety_stock,
        "lead_time_demand": round(lead_time_demand, 1),
        "reorder_point": round(reorder_point, 1),
        "suggested_order_quantity": suggested_order,
        "model": bundle["model_name"],
        "evaluation": bundle["metrics"],
        "note": "Forecasts are estimates. Check real stock, recent sales, expiry, and supplier constraints before ordering.",
    }
