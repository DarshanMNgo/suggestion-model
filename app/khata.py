"""Khata: the notebook where the owner writes who owes how much (udhar)."""
from __future__ import annotations

import sqlite3

from . import catalog, db


def _balance_sql() -> str:
    return ("COALESCE(SUM(CASE WHEN k.kind = 'credit' THEN k.amount ELSE -k.amount END), 0)")


def add_customer(conn: sqlite3.Connection, name: str, phone: str = "") -> dict:
    name = (name or "").strip()
    if not name:
        raise ValueError("Customer name is required.")
    existing = find_customer(conn, name)
    if existing:
        return existing
    cur = conn.execute("INSERT INTO customers(name, phone, created_at) VALUES (?, ?, ?)",
                       (name, (phone or "").strip(), db.today().isoformat()))
    return get_customer(conn, cur.lastrowid)


def get_customer(conn: sqlite3.Connection, customer_id: int) -> dict | None:
    row = conn.execute(
        f"SELECT c.id, c.name, c.phone, {_balance_sql()} AS balance FROM customers c "
        "LEFT JOIN khata k ON k.customer_id = c.id WHERE c.id = ? GROUP BY c.id", (customer_id,)).fetchone()
    return dict(row) if row else None


def find_customer(conn: sqlite3.Connection, text: str) -> dict | None:
    """Match a customer by name, ignoring case; a unique partial name also works."""
    wanted = catalog.normalize_text(text)
    if not wanted:
        return None
    people = list_customers(conn)
    for person in people:
        if catalog.normalize_text(person["name"]) == wanted:
            return person
    partial = [p for p in people if wanted in catalog.normalize_text(p["name"])]
    return partial[0] if len(partial) == 1 else None


def list_customers(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        f"SELECT c.id, c.name, c.phone, {_balance_sql()} AS balance FROM customers c "
        "LEFT JOIN khata k ON k.customer_id = c.id GROUP BY c.id "
        "ORDER BY balance DESC, c.name COLLATE NOCASE").fetchall()
    return [dict(r) | {"balance": round(r["balance"], 2)} for r in rows]


def total_outstanding(conn: sqlite3.Connection) -> float:
    return round(sum(max(0, c["balance"]) for c in list_customers(conn)), 2)


def add_entry(conn: sqlite3.Connection, customer_id: int, amount: float, kind: str, note: str = "") -> dict:
    if kind not in ("credit", "payment"):
        raise ValueError("Entry must be 'credit' (took on udhar) or 'payment' (paid back).")
    if amount <= 0:
        raise ValueError("Amount must be more than zero.")
    if not get_customer(conn, customer_id):
        raise ValueError("Customer not found.")
    conn.execute("INSERT INTO khata(customer_id, amount, kind, note, entry_date) VALUES (?, ?, ?, ?, ?)",
                 (customer_id, round(float(amount), 2), kind, note.strip(), db.today().isoformat()))
    return get_customer(conn, customer_id)


def history(conn: sqlite3.Connection, customer_id: int, limit: int = 30) -> list[dict]:
    rows = conn.execute("SELECT id, amount, kind, note, entry_date FROM khata WHERE customer_id = ? "
                        "ORDER BY entry_date DESC, id DESC LIMIT ?", (customer_id, limit)).fetchall()
    return [dict(r) for r in rows]
