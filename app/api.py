"""KiranaWise API: a thin web layer over the shop logic.

Run:  uvicorn app.api:app --reload
Docs: http://127.0.0.1:8000/docs
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import date, timedelta
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import assistant, catalog, db, khata, orders, planner


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="KiranaWise Store API", version="3.0.0", lifespan=lifespan)

_origins = os.environ.get("KIRANA_CORS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in _origins if o.strip()],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def get_conn():
    """One database connection per request; saved on success, undone on error."""
    conn = db.connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


Conn = Depends(get_conn)


def _bad_request(exc: Exception) -> HTTPException:
    code = 404 if isinstance(exc, LookupError) else 400
    return HTTPException(status_code=code, detail=str(exc))


# ---------------------------------------------------------------- basics

@app.get("/health")
def health():
    return {"status": "ok", "model_ready": planner.MODEL_PATH.exists()}


@app.get("/summary")
def summary(conn: sqlite3.Connection = Conn):
    return planner.daily_summary(conn)


# ---------------------------------------------------------------- stock

class ItemIn(BaseModel):
    product: str = Field(min_length=1, max_length=120)
    stock: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=20)
    cost_price: float | None = Field(default=None, ge=0)
    sell_price: float | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=120)
    shelf_life_days: int | None = Field(default=None, ge=0)
    aliases: str | None = Field(default=None, max_length=300)
    category: str | None = Field(default=None, max_length=60)


@app.get("/inventory")
def get_inventory(conn: sqlite3.Connection = Conn):
    return {"items": catalog.list_inventory(conn)}


@app.get("/products")
def products(conn: sqlite3.Connection = Conn):
    return {"products": [i["product"] for i in catalog.list_inventory(conn)]}


@app.post("/inventory")
def save_item(payload: ItemIn, conn: sqlite3.Connection = Conn):
    """Add a new item or change an existing one. Only the fields you send are changed."""
    try:
        item = catalog.upsert_product(conn, payload.product, **payload.model_dump(exclude={"product"}))
    except ValueError as exc:
        raise _bad_request(exc)
    return {"saved": True, **item}


class ReceiveIn(BaseModel):
    product: str = Field(min_length=1, max_length=120)
    quantity: int = Field(gt=0)
    expiry_date: date | None = None
    cost_price: float | None = Field(default=None, ge=0)


@app.post("/inventory/receive")
def receive(payload: ReceiveIn, conn: sqlite3.Connection = Conn):
    """New goods arrived: add to stock and remember the expiry date."""
    try:
        return catalog.receive_stock(conn, payload.product, payload.quantity, payload.expiry_date, payload.cost_price)
    except ValueError as exc:
        raise _bad_request(exc)


@app.delete("/inventory/{product}")
def delete_item(product: str, conn: sqlite3.Connection = Conn):
    row = catalog.get_product(conn, product)
    if not row:
        raise HTTPException(404, "Item not found.")
    conn.execute("DELETE FROM batches WHERE product = ?", (row["product"],))
    conn.execute("DELETE FROM inventory WHERE product = ?", (row["product"],))
    return {"deleted": row["product"]}


# ---------------------------------------------------------------- sales

class SaleIn(BaseModel):
    product: str = Field(min_length=1, max_length=120)
    quantity: int = Field(gt=0)
    sale_date: date = Field(default_factory=date.today)
    price: float | None = Field(default=None, ge=0)
    payment: Literal["cash", "upi", "credit"] = "cash"
    customer_id: int | None = None


@app.post("/sales")
def add_sale(payload: SaleIn, conn: sqlite3.Connection = Conn):
    try:
        result = catalog.record_sale(conn, payload.product, payload.quantity, payload.sale_date,
                                     payload.price, payload.payment, payload.customer_id)
    except ValueError as exc:
        raise _bad_request(exc)
    return {"saved": True, **result}


@app.get("/sales")
def get_sales(limit: int = Query(30, ge=1, le=200), conn: sqlite3.Connection = Conn):
    return {"sales": catalog.recent_sales(conn, limit)}


# ---------------------------------------------------------------- advice

@app.get("/suggestions")
def suggestions(budget: float | None = Query(None, ge=0), conn: sqlite3.Connection = Conn):
    return planner.reorder_suggestions(conn, budget)


@app.get("/expiry")
def expiry(days: int = Query(planner.EXPIRY_SOON_DAYS, ge=1, le=120), conn: sqlite3.Connection = Conn):
    return {"items": planner.expiry_report(conn, days)}


@app.get("/dead-stock")
def dead_stock(days: int = Query(planner.DEAD_STOCK_DAYS, ge=7, le=365), conn: sqlite3.Connection = Conn):
    return {"items": planner.dead_stock(conn, days)}


@app.get("/forecast")
def forecast(product: str, days: int = Query(7, ge=1, le=30),
             lead_time_days: int = Query(2, ge=1, le=30), safety_stock: int = Query(0, ge=0),
             current_stock: int | None = Query(None, ge=0), conn: sqlite3.Connection = Conn):
    """Simple forecast for one item, from the owner's own sales (or sample history if there are none)."""
    row = catalog.get_product(conn, product)
    if not row:
        raise HTTPException(404, f"Item '{product}' not found.")
    per_day, source = planner.daily_demand(conn, row["product"])
    boost, festival = planner.festival_boost(row["product"])
    per_day *= boost
    stock = row["stock"] if current_stock is None else current_stock
    today = db.today()
    daily = [{"date": (today + timedelta(days=i)).isoformat(), "expected_units": round(per_day, 1)}
             for i in range(1, days + 1)]
    lead_demand = per_day * min(lead_time_days, days)
    return {"product": row["product"], "forecast_days": days, "daily_forecast": daily,
            "expected_total_demand": round(per_day * days, 1), "current_stock": stock,
            "lead_time_days": lead_time_days, "safety_stock": safety_stock,
            "lead_time_demand": round(lead_demand, 1), "reorder_point": round(lead_demand + safety_stock, 1),
            "suggested_order_quantity": max(0, round(lead_demand + safety_stock - stock)),
            "festival": festival, "demand_source": source}


# ---------------------------------------------------------------- orders

@app.get("/orders")
def list_orders(status: str | None = None, conn: sqlite3.Connection = Conn):
    return {"orders": orders.list_orders(conn, status)}


class DraftIn(BaseModel):
    products: list[str] | None = None


@app.post("/orders/draft")
def draft_orders(payload: DraftIn | None = None, conn: sqlite3.Connection = Conn):
    created = orders.create_draft_orders(conn, payload.products if payload else None)
    return {"orders": created, "count": len(created)}


class ItemQty(BaseModel):
    quantity: int = Field(ge=0)


@app.patch("/orders/{order_id}/items/{item_id}")
def change_item(order_id: int, item_id: int, payload: ItemQty, conn: sqlite3.Connection = Conn):
    try:
        return orders.update_item(conn, order_id, item_id, payload.quantity)
    except (ValueError, LookupError) as exc:
        raise _bad_request(exc)


@app.post("/orders/{order_id}/approve")
def approve_order(order_id: int, conn: sqlite3.Connection = Conn):
    try:
        return orders.approve(conn, order_id)
    except (ValueError, LookupError) as exc:
        raise _bad_request(exc)


@app.post("/orders/{order_id}/reject")
def reject_order(order_id: int, conn: sqlite3.Connection = Conn):
    try:
        return orders.reject(conn, order_id)
    except (ValueError, LookupError) as exc:
        raise _bad_request(exc)


class ReceiveOrderIn(BaseModel):
    expiry_dates: dict[str, date] | None = None


@app.post("/orders/{order_id}/receive")
def receive_order(order_id: int, payload: ReceiveOrderIn | None = None, conn: sqlite3.Connection = Conn):
    dates = {k: v.isoformat() for k, v in (payload.expiry_dates or {}).items()} if payload else None
    try:
        return orders.receive(conn, order_id, dates)
    except (ValueError, LookupError) as exc:
        raise _bad_request(exc)


class NeighbourIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(default="", max_length=20)


@app.get("/joint-order")
def joint_order(conn: sqlite3.Connection = Conn):
    return orders.joint_order_message(conn)


@app.post("/neighbours")
def add_neighbour(payload: NeighbourIn, conn: sqlite3.Connection = Conn):
    cur = conn.execute("INSERT INTO neighbours(name, phone) VALUES (?, ?)", (payload.name.strip(), payload.phone.strip()))
    return {"id": cur.lastrowid, "name": payload.name.strip(), "phone": payload.phone.strip()}


@app.delete("/neighbours/{neighbour_id}")
def delete_neighbour(neighbour_id: int, conn: sqlite3.Connection = Conn):
    conn.execute("DELETE FROM neighbours WHERE id = ?", (neighbour_id,))
    return {"deleted": neighbour_id}


# ---------------------------------------------------------------- khata

class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(default="", max_length=20)


class EntryIn(BaseModel):
    amount: float = Field(gt=0)
    kind: Literal["credit", "payment"]
    note: str = Field(default="", max_length=200)


@app.get("/customers")
def customers(conn: sqlite3.Connection = Conn):
    return {"customers": khata.list_customers(conn), "total_pending": khata.total_outstanding(conn)}


@app.post("/customers")
def new_customer(payload: CustomerIn, conn: sqlite3.Connection = Conn):
    try:
        return khata.add_customer(conn, payload.name, payload.phone)
    except ValueError as exc:
        raise _bad_request(exc)


@app.get("/customers/{customer_id}")
def customer_detail(customer_id: int, conn: sqlite3.Connection = Conn):
    person = khata.get_customer(conn, customer_id)
    if not person:
        raise HTTPException(404, "Customer not found.")
    return {**person, "history": khata.history(conn, customer_id)}


@app.post("/customers/{customer_id}/entries")
def customer_entry(customer_id: int, payload: EntryIn, conn: sqlite3.Connection = Conn):
    try:
        return khata.add_entry(conn, customer_id, payload.amount, payload.kind, payload.note)
    except ValueError as exc:
        raise _bad_request(exc)


# ---------------------------------------------------------------- settings

class SettingsIn(BaseModel):
    shop_name: str | None = Field(default=None, max_length=80)
    weekly_budget: float | None = Field(default=None, ge=0)
    cover_days: int | None = Field(default=None, ge=1, le=60)
    lead_time_days: int | None = Field(default=None, ge=1, le=30)
    language: Literal["en", "hi", "kn"] | None = None


@app.get("/settings")
def read_settings(conn: sqlite3.Connection = Conn):
    return db.get_settings(conn)


@app.put("/settings")
def write_settings(payload: SettingsIn, conn: sqlite3.Connection = Conn):
    return db.save_settings(conn, payload.model_dump(exclude_none=True))


# ---------------------------------------------------------------- voice / chat assistant

class AssistantIn(BaseModel):
    text: str = Field(max_length=300)
    lang: Literal["en", "hi", "kn"] = "en"


class ConfirmIn(BaseModel):
    action: dict
    lang: Literal["en", "hi", "kn"] = "en"


@app.post("/assistant")
def assistant_message(payload: AssistantIn, conn: sqlite3.Connection = Conn):
    """Understand a spoken or typed command. Reads answer at once; changes wait for /assistant/confirm."""
    return assistant.interpret(conn, payload.text, payload.lang)


@app.post("/assistant/confirm")
def assistant_confirm(payload: ConfirmIn, conn: sqlite3.Connection = Conn):
    return assistant.execute(conn, payload.action, payload.lang)


# ---------------------------------------------------------------- demo data

@app.post("/demo/seed")
def demo_seed(reset: bool = False, conn: sqlite3.Connection = Conn):
    """Fill the app with a realistic sample shop so judges and new users can try everything."""
    from . import seed
    return seed.seed_demo(conn, reset=reset)
