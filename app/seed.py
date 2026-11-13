"""Sample shop data, so the app can be tried without typing a hundred items.

Run:  python -m app.seed          (adds the sample shop if the shop is empty)
      python -m app.seed --reset  (wipes the shop and starts again)
It is also behind the "Load sample shop" button in Settings.
"""
from __future__ import annotations

import random
import sqlite3
import sys
from datetime import timedelta

from . import catalog, db, khata

# name, unit, cost, sell, supplier, shelf life (days), stock, alert level, average sales per day
DEMO_ITEMS = [
    ("Milk", "packet", 24, 27, "Nandini Dairy", 3, 30, 10, 22),
    ("Bread", "packet", 30, 35, "Local Bakery", 5, 12, 6, 9),
    ("Curd 400g", "cup", 30, 36, "Nandini Dairy", 6, 14, 4, 3),
    ("Eggs", "piece", 6, 7, "Poultry Mart", 21, 60, 30, 28),
    ("Rice 1kg", "kg", 52, 60, "Sri Traders", 0, 40, 15, 8),
    ("Atta 5kg", "bag", 210, 235, "Sri Traders", 0, 6, 4, 2.5),
    ("Sugar 1kg", "kg", 41, 46, "Sri Traders", 0, 14, 10, 7),
    ("Cooking Oil 1L", "bottle", 118, 130, "Sri Traders", 0, 9, 6, 4),
    ("Toor Dal 1kg", "kg", 135, 150, "Sri Traders", 0, 10, 5, 3),
    ("Tea Powder 250g", "packet", 95, 108, "Sri Traders", 0, 14, 5, 3),
    ("Biscuits", "packet", 8, 10, "City Distributors", 120, 80, 25, 14),
    ("Maggi Noodles", "packet", 12, 14, "City Distributors", 150, 45, 20, 11),
    ("Soft Drink 600ml", "bottle", 32, 40, "City Distributors", 120, 24, 12, 9),
    ("Soap", "piece", 28, 34, "City Distributors", 0, 30, 10, 5),
    ("Detergent 1kg", "packet", 95, 110, "City Distributors", 0, 8, 4, 1.5),
    ("Salt 1kg", "packet", 18, 22, "Sri Traders", 0, 20, 8, 4),
    ("Hair Oil Sachet", "piece", 2, 3, "City Distributors", 0, 70, 20, 0),  # dead stock on purpose
    ("Chilli Sauce", "bottle", 45, 60, "City Distributors", 200, 18, 4, 0.1),
]

DEMO_CUSTOMERS = [("Ramesh", "9876500001", 850), ("Lakshmi Amma", "9876500002", 1240), ("Suresh", "9876500003", 300)]
DEMO_NEIGHBOURS = [("Shree Provision Store", "9876510001"), ("Gowda Kirana", "9876510002")]


def shop_is_empty(conn: sqlite3.Connection) -> bool:
    return conn.execute("SELECT COUNT(*) AS n FROM inventory").fetchone()["n"] == 0


def reset_shop(conn: sqlite3.Connection) -> None:
    for table in ("order_items", "orders", "khata", "customers", "batches", "sales", "inventory", "neighbours"):
        conn.execute(f"DELETE FROM {table}")


def seed_demo(conn: sqlite3.Connection, reset: bool = False) -> dict:
    if reset:
        reset_shop(conn)
    elif not shop_is_empty(conn):
        return {"seeded": False, "message": "Your shop already has items, so nothing was added. Use reset to start over."}

    rng = random.Random(7)  # same sample shop every time
    today = db.today()
    for name, unit, cost, price, supplier, shelf, stock, alert, per_day in DEMO_ITEMS:
        catalog.upsert_product(conn, name, unit=unit, cost_price=cost, sell_price=price, supplier=supplier,
                               shelf_life_days=shelf, low_stock_threshold=alert)
        conn.execute("UPDATE inventory SET created_at = ? WHERE product = ?",
                     ((today - timedelta(days=90)).isoformat(), name))
        # six weeks of past sales, with a busier weekend
        for back in range(45, 0, -1):
            day = today - timedelta(days=back)
            if per_day <= 0:
                continue
            if name == "Chilli Sauce" and back < 40:
                continue  # sold only a couple of bottles, long ago
            average = per_day * (1.25 if day.weekday() >= 5 else 1.0)
            qty = max(0, round(rng.gauss(average, max(0.6, average * 0.25))))
            if qty:
                conn.execute(
                    "INSERT INTO sales(product, quantity, sale_date, created_at, price, payment) "
                    "VALUES (?, ?, ?, datetime('now'), ?, ?)",
                    (name, qty, day.isoformat(), price, rng.choice(["cash", "cash", "upi"])))
        # today's sales so the home screen is not empty
        if per_day >= 2:
            qty = max(1, round(per_day * rng.uniform(0.3, 0.6)))
            conn.execute("INSERT INTO sales(product, quantity, sale_date, created_at, price, payment) "
                         "VALUES (?, ?, ?, datetime('now'), ?, 'cash')", (name, qty, today.isoformat(), price))
            stock += 0  # stock below is what is on the shelf now
        conn.execute("UPDATE inventory SET stock = ? WHERE product = ?", (stock, name))

    # expiry batches: some fine, some close to expiry on purpose
    batches = {
        "Milk": [(18, 1), (12, 3)],       # 18 packets expire tomorrow
        "Bread": [(6, 2), (6, 4)],
        "Curd 400g": [(10, 2), (4, 5)],   # more curd than will sell in 2 days: a real expiry risk
        "Eggs": [(40, 12), (20, 18)],
        "Biscuits": [(30, 25), (50, 110)],
        "Maggi Noodles": [(45, 140)],
        "Soft Drink 600ml": [(24, 100)],
    }
    for product, entries in batches.items():
        for qty, days in entries:
            conn.execute("INSERT INTO batches(product, quantity, expiry_date, received_date) VALUES (?, ?, ?, ?)",
                         (product, qty, (today + timedelta(days=days)).isoformat(), today.isoformat()))
    conn.execute("UPDATE inventory SET stock = 30 WHERE product = 'Milk'")
    conn.execute("UPDATE inventory SET stock = 12 WHERE product = 'Bread'")
    conn.execute("UPDATE inventory SET stock = 60 WHERE product = 'Eggs'")
    conn.execute("UPDATE inventory SET stock = 80 WHERE product = 'Biscuits'")

    for name, phone, owed in DEMO_CUSTOMERS:
        person = khata.add_customer(conn, name, phone)
        khata.add_entry(conn, person["id"], owed + 200, "credit", "monthly groceries")
        khata.add_entry(conn, person["id"], 200, "payment", "paid part")
    for name, phone in DEMO_NEIGHBOURS:
        conn.execute("INSERT INTO neighbours(name, phone) VALUES (?, ?)", (name, phone))
    db.save_settings(conn, {"shop_name": "Sri Lakshmi Kirana", "weekly_budget": 12000})
    return {"seeded": True, "items": len(DEMO_ITEMS), "customers": len(DEMO_CUSTOMERS),
            "message": "Sample shop loaded."}


def prepare_database() -> None:
    """Create the tables, and on hosted demos load the sample shop if the shop is empty.

    Hosted demos (Vercel, or KIRANA_AUTOSEED=1) start with an empty temporary database after every
    restart, so without this the owner would open the app and see nothing.
    """
    import os
    db.init_db()
    if os.environ.get("VERCEL") or os.environ.get("KIRANA_AUTOSEED") == "1":
        with db.connect() as conn:
            if shop_is_empty(conn):
                seed_demo(conn)


if __name__ == "__main__":
    db.init_db()
    with db.connect() as connection:
        print(seed_demo(connection, reset="--reset" in sys.argv))
