"""Buying suggestions for the owner.

The planner answers four plain questions:
  * What should I buy, and how much?       -> reorder_suggestions()
  * What will go out of date soon?          -> expiry_report()
  * What is just sitting on my shelf?       -> dead_stock()
  * What does today look like?              -> daily_summary()

Nothing here changes the shop. Suggestions only become an order when the owner
approves them (see orders.py).
"""
from __future__ import annotations

import math
import sqlite3
from datetime import date, timedelta
from functools import lru_cache

from . import catalog, db

ROOT = db.ROOT
MODEL_PATH = ROOT / "models" / "demand_model.joblib"

# Approximate dates of big shopping occasions: (month, day) by year. They shift each
# year with the lunar calendar, so they are a starting point, not a promise.
FESTIVALS = [
    ("Christmas", date(2026, 12, 25), 1.25, ["biscuit", "cake", "chocolate", "soft drink", "juice"]),
    ("Sankranti / Pongal", date(2027, 1, 14), 1.35, ["sugar", "rice", "oil", "ghee", "dal"]),
    ("Republic Day", date(2027, 1, 26), 1.10, ["soft drink", "biscuit", "chocolate"]),
    ("Eid al-Fitr", date(2027, 3, 10), 1.40, ["sugar", "milk", "ghee", "rice", "oil"]),
    ("Holi", date(2027, 3, 22), 1.35, ["sugar", "soft drink", "oil", "atta", "milk"]),
    ("Ugadi", date(2027, 4, 7), 1.30, ["sugar", "oil", "rice", "dal", "ghee"]),
    ("Ganesh Chaturthi", date(2027, 9, 5), 1.30, ["sugar", "ghee", "rice", "oil", "milk"]),
    ("Diwali", date(2027, 10, 29), 1.50, ["sugar", "oil", "ghee", "atta", "biscuit", "dal", "chocolate"]),
]
FESTIVAL_LOOKAHEAD_DAYS = 10  # start stocking up this many days before the occasion

DEAD_STOCK_DAYS = 30  # nothing sold for this long => dead stock
EXPIRY_SOON_DAYS = 14


# ---------------------------------------------------------------- demand

@lru_cache(maxsize=1)
def _model_bundle():
    """The optional machine-learning model trained from sample data (python -m app.train)."""
    if not MODEL_PATH.exists():
        return None
    try:
        import joblib
        return joblib.load(MODEL_PATH)
    except Exception:  # a broken or incompatible model file must never break the shop app
        return None


def _model_daily_demand(product: str) -> float | None:
    bundle = _model_bundle()
    if not bundle:
        return None
    try:
        import pandas as pd
        history = pd.DataFrame(bundle["history"])
        rows = history[history["product"].str.casefold() == product.casefold()]
        if rows.empty:
            return None
        return float(rows.sort_values("date")["units_sold"].tail(28).mean())
    except Exception:
        return None


def daily_demand(conn: sqlite3.Connection, product: str) -> tuple[float, str]:
    """Average units sold per day, and where the number came from.

    Real sales recorded in the app are preferred. With less than a week of records
    the sample-data model is used if it knows the item, otherwise what little exists.
    """
    today = db.today()
    window = 28
    row = conn.execute(
        "SELECT COALESCE(SUM(quantity), 0) AS qty, MIN(sale_date) AS first_day FROM sales "
        "WHERE product = ? COLLATE NOCASE AND sale_date >= ?",
        (product, (today - timedelta(days=window)).isoformat())).fetchone()
    qty = row["qty"]
    if qty > 0 and row["first_day"]:
        span = min(window, max(1, (today - date.fromisoformat(row["first_day"])).days + 1))
        if span >= 7:
            return qty / span, "your sales"
    modelled = _model_daily_demand(product)
    if modelled is not None:
        return modelled, "past pattern"
    if qty > 0:
        return qty / max(1, span), "few sales so far"
    return 0.0, "no sales yet"


def festival_boost(product: str, on: date | None = None) -> tuple[float, str | None]:
    """Extra demand because a festival is close. Returns (multiplier, festival name)."""
    on = on or db.today()
    lowered = catalog.normalize_text(product)
    best = (1.0, None)
    for name, day, boost, keywords in FESTIVALS:
        if 0 <= (day - on).days <= FESTIVAL_LOOKAHEAD_DAYS and any(k in lowered for k in keywords):
            if boost > best[0]:
                best = (boost, name)
    return best


# ---------------------------------------------------------------- suggestions

def reorder_suggestions(conn: sqlite3.Connection, budget: float | None = None) -> dict:
    """What to buy now. Items that will run out sooner come first and get the cash first."""
    settings = db.get_settings(conn)
    budget = float(budget if budget is not None else settings["weekly_budget"])
    cover_days = max(1, int(float(settings["cover_days"])))
    default_lead = max(1, int(float(settings["lead_time_days"])))
    today = db.today()
    rows = []

    for item in catalog.list_inventory(conn):
        per_day, source = daily_demand(conn, item["product"])
        boost, festival = festival_boost(item["product"])
        per_day_adj = per_day * boost
        stock = item["stock"]
        if per_day_adj <= 0:
            # never or rarely sold: only warn when the owner's own alert level is hit
            if item["is_low"] and item["low_stock_threshold"] > 0:
                need = max(1, item["low_stock_threshold"] * 2 - stock)
            else:
                continue
            days_left = None
        else:
            days_left = stock / per_day_adj
            target = per_day_adj * (cover_days + default_lead) + item["low_stock_threshold"]
            need = max(0, math.ceil(target - stock))
            if need == 0 and not item["is_low"]:
                continue
            if item["is_low"] and need == 0:
                need = max(1, item["low_stock_threshold"])

        # Do not order what will just expire on the shelf.
        batches = catalog.live_batches(conn, item["product"])
        soon = sum(b["quantity"] for b in batches
                   if (catalog.parse_date(b["expiry_date"]) - today).days <= default_lead + cover_days)
        if need > 0 and soon > 0 and per_day_adj > 0 and soon > per_day_adj * (cover_days + default_lead):
            need = max(0, need - (soon - math.ceil(per_day_adj * (cover_days + default_lead))))
        if need <= 0:
            continue

        cost = item["cost_price"]
        urgency = "now" if (days_left is not None and days_left <= default_lead) or stock == 0 else (
            "soon" if (days_left is not None and days_left <= default_lead + 3) or item["is_low"] else "later")
        reason = (f"Sells about {per_day_adj:.1f}/day ({source}); {stock} left"
                  + (f", ~{days_left:.0f} days" if days_left is not None else ""))
        if festival:
            reason += f". {festival} is coming, so demand is higher."
        rows.append({
            "product": item["product"], "supplier": item["supplier"] or "Any supplier",
            "unit": item["unit"], "stock": stock, "daily_demand": round(per_day_adj, 2),
            "days_left": round(days_left, 1) if days_left is not None else None,
            "suggested_qty": int(need), "unit_cost": cost, "line_cost": round(need * cost, 2),
            "urgency": urgency, "festival": festival, "reason": reason, "demand_source": source,
        })

    order = {"now": 0, "soon": 1, "later": 2}
    rows.sort(key=lambda r: (order[r["urgency"]], r["days_left"] if r["days_left"] is not None else 999))

    # Spend the owner's cash on the most urgent items first. Items with no cost price
    # set are not counted against the budget (the owner has not told us the price yet).
    remaining = budget
    for row in rows:
        if row["line_cost"] <= remaining or row["unit_cost"] == 0:
            row["fits_budget"] = True
            remaining -= row["line_cost"]
        elif row["unit_cost"] > 0 and remaining >= row["unit_cost"] and row["urgency"] != "later":
            affordable = int(remaining // row["unit_cost"])
            row["suggested_qty"] = affordable
            row["line_cost"] = round(affordable * row["unit_cost"], 2)
            row["fits_budget"] = True
            row["reason"] += " Reduced to fit your cash budget."
            remaining -= row["line_cost"]
        else:
            row["fits_budget"] = False
    total = round(sum(r["line_cost"] for r in rows if r["fits_budget"]), 2)
    from . import khata  # imported here because khata does not depend on the planner
    return {
        "budget": budget, "total_cost": total, "cash_left": round(budget - total, 2),
        # money customers still owe: cash that is not available for buying stock
        "khata_pending": khata.total_outstanding(conn),
        "items": rows,
        "skipped_for_budget": [r["product"] for r in rows if not r["fits_budget"]],
        "note": "These are suggestions. Nothing is ordered until you approve it.",
    }


def expiry_report(conn: sqlite3.Connection, within_days: int = EXPIRY_SOON_DAYS) -> list[dict]:
    """Batches that are expired or about to expire, with a simple action to take."""
    today = db.today()
    out = []
    for product in [r["product"] for r in conn.execute("SELECT product FROM inventory")]:
        row = catalog.get_product(conn, product)
        per_day, _ = daily_demand(conn, product)
        for batch in catalog.live_batches(conn, product):
            days = (catalog.parse_date(batch["expiry_date"]) - today).days
            if days > within_days:
                continue
            will_sell = per_day * max(days, 0)
            if days < 0:
                action, level = "Remove from the shelf", "expired"
            elif will_sell >= batch["quantity"]:
                action, level = "Will probably sell in time", "ok"
            elif days <= 3:
                action, level = "Sell fast: put at the front or give a discount", "urgent"
            else:
                action, level = "Move to the front and offer a small discount", "soon"
            loss = round(max(0, batch["quantity"] - will_sell) * row["cost_price"], 2)
            out.append({"product": product, "quantity": batch["quantity"],
                        "expiry_date": batch["expiry_date"], "days_left": days,
                        "level": level, "action": action, "money_at_risk": loss})
    order = {"expired": 0, "urgent": 1, "soon": 2, "ok": 3}
    return sorted(out, key=lambda r: (order[r["level"]], r["days_left"]))


def dead_stock(conn: sqlite3.Connection, days: int = DEAD_STOCK_DAYS) -> list[dict]:
    """Items on the shelf that have not sold for a long time (money lying idle)."""
    today = db.today()
    cutoff = (today - timedelta(days=days)).isoformat()
    out = []
    for row in conn.execute("SELECT * FROM inventory WHERE stock > 0 ORDER BY product COLLATE NOCASE"):
        last = conn.execute("SELECT MAX(sale_date) AS d FROM sales WHERE product = ? COLLATE NOCASE",
                            (row["product"],)).fetchone()["d"]
        if last and last >= cutoff:
            continue
        if not last:
            # never sold: only call it dead once it has been in the shop long enough
            added = (row["created_at"] or row["updated_at"] or today.isoformat())[:10]
            if added > cutoff:
                continue
        idle_days = (today - date.fromisoformat(last)).days if last else None
        out.append({"product": row["product"], "stock": row["stock"], "last_sold": last,
                    "idle_days": idle_days, "money_locked": round(row["stock"] * row["cost_price"], 2),
                    "action": "Stop buying this. Try a discount or a combo offer."})
    return sorted(out, key=lambda r: -r["money_locked"])


def sales_summary(conn: sqlite3.Connection, day: date | None = None) -> dict:
    day = day or db.today()
    rows = conn.execute(
        "SELECT payment, COALESCE(SUM(price * quantity), 0) AS amount, COALESCE(SUM(quantity), 0) AS units, "
        "COUNT(*) AS bills FROM sales WHERE sale_date = ? GROUP BY payment", (day.isoformat(),)).fetchall()
    by_payment = {r["payment"]: round(r["amount"], 2) for r in rows}
    return {"date": day.isoformat(), "total": round(sum(by_payment.values()), 2),
            "units": sum(r["units"] for r in rows), "entries": sum(r["bills"] for r in rows),
            "by_payment": by_payment}


def daily_summary(conn: sqlite3.Connection) -> dict:
    """Everything the home screen needs in one call."""
    from . import khata
    inventory = catalog.list_inventory(conn)
    plan = reorder_suggestions(conn)
    expiring = [e for e in expiry_report(conn) if e["level"] != "ok"]
    dead = dead_stock(conn)
    owed = khata.total_outstanding(conn)
    return {
        "shop_name": db.get_settings(conn)["shop_name"],
        "today": sales_summary(conn),
        "counts": {
            "items": len(inventory),
            "low_stock": sum(1 for i in inventory if i["is_low"]),
            "to_buy": len(plan["items"]),
            "expiring": len(expiring),
            "dead_stock": len(dead),
        },
        "khata_pending": owed,
        "stock_value": round(sum(i["stock_value"] for i in inventory), 2),
        "money_locked_dead": round(sum(d["money_locked"] for d in dead), 2),
        "money_at_risk_expiry": round(sum(e["money_at_risk"] for e in expiring), 2),
        "buy_now": [r for r in plan["items"] if r["urgency"] == "now" and r["fits_budget"]][:5],
        "expiring": expiring[:5],
        "dead_stock": dead[:5],
        "upcoming_festival": _next_festival(),
    }


def _next_festival() -> dict | None:
    today = db.today()
    upcoming = [(d, n) for n, d, _, _ in FESTIVALS if d >= today]
    if not upcoming:
        return None
    day, name = min(upcoming)
    return {"name": name, "date": day.isoformat(), "days_away": (day - today).days}
