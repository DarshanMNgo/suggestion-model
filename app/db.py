"""SQLite storage for the shop: stock, expiry batches, sales, khata, orders, settings.

Everything lives in one small SQLite file so the app works on a shop owner's laptop
with no database server. The path can be changed with the KIRANA_DB environment
variable (the tests use this to get a throw-away database).
"""
from __future__ import annotations

import os
import sqlite3
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT / "data" / "kirana_store.db"

# Settings the owner can change in the app. Values are stored as text.
DEFAULT_SETTINGS = {
    "shop_name": "My Kirana",
    "weekly_budget": "10000",   # cash the owner is willing to spend on stock per order round (Rs)
    "cover_days": "7",          # how many days of sales one order should last
    "lead_time_days": "2",      # usual days between ordering and delivery
    "language": "en",
}


def db_path() -> Path:
    return Path(os.environ.get("KIRANA_DB", DEFAULT_DB_PATH))


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    # Each web request opens its own connection, but FastAPI may run the request's setup and
    # its handler on different worker threads, so SQLite's same-thread check must be off.
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# Columns added after the first version of the app. They are added to an older
# database automatically so nobody has to delete their data when upgrading.
_INVENTORY_EXTRA_COLUMNS = {
    "unit": "TEXT NOT NULL DEFAULT 'pcs'",
    "cost_price": "REAL NOT NULL DEFAULT 0",
    "sell_price": "REAL NOT NULL DEFAULT 0",
    "supplier": "TEXT NOT NULL DEFAULT ''",
    "shelf_life_days": "INTEGER NOT NULL DEFAULT 0",
    "aliases": "TEXT NOT NULL DEFAULT ''",
    "category": "TEXT NOT NULL DEFAULT ''",
    "created_at": "TEXT NOT NULL DEFAULT ''",
}
_SALES_EXTRA_COLUMNS = {
    "price": "REAL NOT NULL DEFAULT 0",
    "payment": "TEXT NOT NULL DEFAULT 'cash'",
    "customer_id": "INTEGER",
}


def _add_missing_columns(conn: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    for name, definition in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def init_db() -> None:
    with connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS inventory (
            product TEXT PRIMARY KEY,
            stock INTEGER NOT NULL DEFAULT 0,
            low_stock_threshold INTEGER NOT NULL DEFAULT 5,
            updated_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            sale_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""")
        _add_missing_columns(conn, "inventory", _INVENTORY_EXTRA_COLUMNS)
        _add_missing_columns(conn, "sales", _SALES_EXTRA_COLUMNS)
        conn.execute("UPDATE inventory SET created_at = updated_at WHERE created_at = ''")

        # Stock that arrived together and expires together.
        conn.execute("""CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            expiry_date TEXT NOT NULL,
            received_date TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )""")
        # kind = 'credit' (customer took goods on udhar) or 'payment' (customer paid back).
        conn.execute("""CREATE TABLE IF NOT EXISTS khata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL REFERENCES customers(id),
            amount REAL NOT NULL,
            kind TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            entry_date TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, value TEXT NOT NULL
        )""")
        # status: draft -> approved -> received   (or rejected). Only the owner approves.
        conn.execute("""CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL,
            approved_at TEXT,
            received_at TEXT,
            note TEXT NOT NULL DEFAULT ''
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id),
            product TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_cost REAL NOT NULL DEFAULT 0
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS neighbours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT ''
        )""")
        for key, value in DEFAULT_SETTINGS.items():
            conn.execute("INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)", (key, value))


def today() -> date:
    return date.today()


def get_settings(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    merged = dict(DEFAULT_SETTINGS)
    merged.update({row["key"]: row["value"] for row in rows})
    return merged


def get_setting_number(conn: sqlite3.Connection, key: str, fallback: float) -> float:
    try:
        return float(get_settings(conn).get(key, fallback))
    except (TypeError, ValueError):
        return float(fallback)


def save_settings(conn: sqlite3.Connection, values: dict[str, object]) -> dict[str, str]:
    """Save only known settings; ignore anything else."""
    for key, value in values.items():
        if key in DEFAULT_SETTINGS and value is not None:
            conn.execute(
                "INSERT INTO settings(key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, str(value)),
            )
    return get_settings(conn)
