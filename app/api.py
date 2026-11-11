"""FastAPI backend for KiranaWise forecasts, stock and daily sales records."""
from datetime import date, timedelta
from pathlib import Path
import sqlite3

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "demand_model.joblib"
DB_PATH = ROOT / "data" / "kirana_store.db"

app = FastAPI(title="KiranaWise Store API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

def connect_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with connect_db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS inventory (
            product TEXT PRIMARY KEY, stock INTEGER NOT NULL DEFAULT 0,
            low_stock_threshold INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT, product TEXT NOT NULL,
            quantity INTEGER NOT NULL, sale_date TEXT NOT NULL, created_at TEXT NOT NULL
        )""")

@app.on_event("startup")
def startup():
    init_db()

def load_bundle():
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Forecast model is not ready. Ask the app administrator to train it.")
    return joblib.load(MODEL_PATH)

@app.get("/health")
def health():
    return {"status": "ok", "model_ready": MODEL_PATH.exists()}

@app.get("/products")
def products():
    bundle = load_bundle()
    history = pd.DataFrame(bundle["history"])
    return {"products": sorted(history["product"].unique().tolist())}

@app.get("/inventory")
def get_inventory():
    bundle = load_bundle()
    history = pd.DataFrame(bundle["history"])
    names = sorted(history["product"].unique().tolist())
    with connect_db() as conn:
        for name in names:
            conn.execute(
                "INSERT OR IGNORE INTO inventory(product, stock, low_stock_threshold, updated_at) VALUES (?, 0, 5, ?)",
                (name, date.today().isoformat()),
            )
        rows = conn.execute("SELECT product, stock, low_stock_threshold, updated_at FROM inventory ORDER BY product").fetchall()
    return {"items": [dict(row) for row in rows]}

class InventoryUpdate(BaseModel):
    product: str = Field(min_length=1, max_length=120)
    stock: int = Field(ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)

@app.post("/inventory")
def update_inventory(payload: InventoryUpdate):
    with connect_db() as conn:
        conn.execute("""INSERT INTO inventory(product, stock, low_stock_threshold, updated_at)
            VALUES (?, ?, ?, ?) ON CONFLICT(product) DO UPDATE SET
            stock=excluded.stock, low_stock_threshold=excluded.low_stock_threshold,
            updated_at=excluded.updated_at""",
            (payload.product, payload.stock, payload.low_stock_threshold, date.today().isoformat()))
    return {"saved": True, "product": payload.product, "stock": payload.stock, "low_stock_threshold": payload.low_stock_threshold}

class SaleEntry(BaseModel):
    product: str = Field(min_length=1, max_length=120)
    quantity: int = Field(gt=0)
    sale_date: date = Field(default_factory=date.today)

@app.post("/sales")
def add_sale(payload: SaleEntry):
    with connect_db() as conn:
        cur = conn.execute(
            "INSERT INTO sales(product, quantity, sale_date, created_at) VALUES (?, ?, ?, datetime('now'))",
            (payload.product, payload.quantity, payload.sale_date.isoformat()),
        )
        conn.execute("""INSERT INTO inventory(product, stock, low_stock_threshold, updated_at)
            VALUES (?, 0, 5, ?) ON CONFLICT(product) DO NOTHING""",
            (payload.product, date.today().isoformat()))
        conn.execute("""UPDATE inventory SET stock=MAX(0, stock-?), updated_at=? WHERE product=?""",
            (payload.quantity, date.today().isoformat(), payload.product))
        sale_id = cur.lastrowid
    return {"saved": True, "sale_id": sale_id, "product": payload.product,
            "quantity": payload.quantity, "sale_date": payload.sale_date.isoformat(),
            "message": "Sale saved and stock reduced by the sold quantity."}

@app.get("/sales")
def get_sales(limit: int = Query(30, ge=1, le=200)):
    with connect_db() as conn:
        rows = conn.execute(
            "SELECT id, product, quantity, sale_date FROM sales ORDER BY sale_date DESC, id DESC LIMIT ?", (limit,)
        ).fetchall()
    return {"sales": [dict(row) for row in rows]}

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
    model, features = bundle["model"], bundle["features"]
    sales = product_history["units_sold"].astype(float).tolist()
    last_date = product_history["date"].max()
    predictions = []
    for step in range(1, days + 1):
        target_date = last_date + timedelta(days=step)
        row = {
            "day_of_week": target_date.dayofweek, "day_of_month": target_date.day,
            "month": target_date.month, "is_weekend": int(target_date.dayofweek >= 5),
            "promotion": promotion, "lag_1": sales[-1],
            "lag_7": sales[-7] if len(sales) >= 7 else sales[-1],
            "rolling_mean_7": sum(sales[-7:]) / min(7, len(sales)),
            "rolling_mean_28": sum(sales[-28:]) / min(28, len(sales)),
        }
        estimate = max(0.0, float(model.predict(pd.DataFrame([row], columns=features))[0]))
        predictions.append({"date": target_date.date().isoformat(), "expected_units": round(estimate, 1)})
        sales.append(estimate)
    total = sum(item["expected_units"] for item in predictions)
    lead_days = min(lead_time_days, days)
    lead_demand = sum(item["expected_units"] for item in predictions[:lead_days])
    suggested = max(0, int(round(lead_demand + safety_stock - current_stock)))
    return {
        "product": product_history["product"].iloc[-1], "forecast_days": days,
        "daily_forecast": predictions, "expected_total_demand": round(total, 1),
        "current_stock": current_stock, "lead_time_days": lead_time_days,
        "safety_stock": safety_stock, "lead_time_demand": round(lead_demand, 1),
        "reorder_point": round(lead_demand + safety_stock, 1),
        "suggested_order_quantity": suggested, "model": bundle["model_name"],
        "evaluation": bundle["metrics"],
        "note": "Estimates use the trained sample sales history. Manually entered sales are saved separately and do not retrain this model automatically."
    }
