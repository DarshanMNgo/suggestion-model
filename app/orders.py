"""Purchase orders. The app drafts them, only the owner approves.

draft -> approved -> received (stock goes up)      or      draft -> rejected
Nothing is ever sent to a supplier automatically.
"""
from __future__ import annotations

import sqlite3
from collections import defaultdict
from urllib.parse import quote

from . import catalog, db, planner


def _stamp() -> str:
    return db.today().isoformat()


def create_draft_orders(conn: sqlite3.Connection, products: list[str] | None = None) -> list[dict]:
    """Turn current suggestions into draft orders, one per supplier.

    Items that already sit in an open (draft/approved) order are skipped, so pressing
    the button twice does not double-order.
    """
    plan = planner.reorder_suggestions(conn)
    wanted = {catalog.normalize_text(p) for p in products} if products else None
    open_items = {
        catalog.normalize_text(r["product"])
        for r in conn.execute(
            "SELECT oi.product FROM order_items oi JOIN orders o ON o.id = oi.order_id "
            "WHERE o.status IN ('draft', 'approved')")}
    by_supplier: dict[str, list[dict]] = defaultdict(list)
    for item in plan["items"]:
        key = catalog.normalize_text(item["product"])
        if not item["fits_budget"] or key in open_items:
            continue
        if wanted is not None and key not in wanted:
            continue
        by_supplier[item["supplier"]].append(item)

    created = []
    for supplier, items in by_supplier.items():
        cur = conn.execute("INSERT INTO orders(supplier, status, created_at) VALUES (?, 'draft', ?)",
                           (supplier, _stamp()))
        for item in items:
            conn.execute("INSERT INTO order_items(order_id, product, quantity, unit_cost) VALUES (?, ?, ?, ?)",
                         (cur.lastrowid, item["product"], item["suggested_qty"], item["unit_cost"]))
        created.append(get_order(conn, cur.lastrowid))
    return created


def get_order(conn: sqlite3.Connection, order_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not row:
        return None
    items = [dict(r) | {"line_cost": round(r["quantity"] * r["unit_cost"], 2)} for r in conn.execute(
        "SELECT id, product, quantity, unit_cost FROM order_items WHERE order_id = ? ORDER BY id", (order_id,))]
    order = dict(row)
    order["items"] = items
    order["total_cost"] = round(sum(i["line_cost"] for i in items), 2)
    order["share_text"] = share_text(order)
    order["whatsapp_url"] = "https://wa.me/?text=" + quote(order["share_text"])
    return order


def share_text(order: dict) -> str:
    lines = [f"Order for {order['supplier']}"]
    lines += [f"- {i['product']}: {i['quantity']}" for i in order["items"]]
    return "\n".join(lines)


def list_orders(conn: sqlite3.Connection, status: str | None = None) -> list[dict]:
    query = "SELECT id FROM orders"
    args: tuple = ()
    if status:
        query += " WHERE status = ?"
        args = (status,)
    query += " ORDER BY id DESC LIMIT 50"
    return [get_order(conn, r["id"]) for r in conn.execute(query, args)]


def _require(conn: sqlite3.Connection, order_id: int, allowed: tuple[str, ...]) -> dict:
    order = get_order(conn, order_id)
    if not order:
        raise LookupError("Order not found.")
    if order["status"] not in allowed:
        raise ValueError(f"This order is already {order['status']}.")
    return order


def update_item(conn: sqlite3.Connection, order_id: int, item_id: int, quantity: int) -> dict:
    _require(conn, order_id, ("draft",))
    if quantity < 0:
        raise ValueError("Quantity cannot be negative.")
    if quantity == 0:
        conn.execute("DELETE FROM order_items WHERE id = ? AND order_id = ?", (item_id, order_id))
    else:
        conn.execute("UPDATE order_items SET quantity = ? WHERE id = ? AND order_id = ?",
                     (quantity, item_id, order_id))
    if not conn.execute("SELECT 1 FROM order_items WHERE order_id = ?", (order_id,)).fetchone():
        conn.execute("UPDATE orders SET status = 'rejected' WHERE id = ?", (order_id,))
    return get_order(conn, order_id)


def approve(conn: sqlite3.Connection, order_id: int) -> dict:
    _require(conn, order_id, ("draft",))
    conn.execute("UPDATE orders SET status = 'approved', approved_at = ? WHERE id = ?", (_stamp(), order_id))
    return get_order(conn, order_id)


def reject(conn: sqlite3.Connection, order_id: int) -> dict:
    _require(conn, order_id, ("draft", "approved"))
    conn.execute("UPDATE orders SET status = 'rejected' WHERE id = ?", (order_id,))
    return get_order(conn, order_id)


def receive(conn: sqlite3.Connection, order_id: int, expiry_dates: dict[str, str] | None = None) -> dict:
    """Goods arrived. Adds every item to stock (with its expiry date, if given)."""
    order = _require(conn, order_id, ("approved",))
    expiry_dates = {catalog.normalize_text(k): v for k, v in (expiry_dates or {}).items()}
    for item in order["items"]:
        catalog.receive_stock(conn, item["product"], item["quantity"],
                              expiry_date=expiry_dates.get(catalog.normalize_text(item["product"])),
                              cost_price=item["unit_cost"] or None)
    conn.execute("UPDATE orders SET status = 'received', received_at = ? WHERE id = ?", (_stamp(), order_id))
    return get_order(conn, order_id)


# ---------------------------------------------------------------- neighbours (joint buying)

def joint_order_message(conn: sqlite3.Connection) -> dict:
    """A ready-to-send message asking nearby shops to share one bulk order."""
    plan = planner.reorder_suggestions(conn)
    shop = db.get_settings(conn)["shop_name"]
    items = [i for i in plan["items"] if i["fits_budget"]][:6]
    if not items:
        return {"text": "", "items": [], "neighbours": []}
    lines = [f"Namaste! This is {shop}. I am placing a bulk order and can share delivery cost with you."]
    lines += [f"- {i['product']}: {i['suggested_qty']} {i['unit']}" for i in items]
    lines.append("Let me know what you also need, so we can order together at a better rate.")
    text = "\n".join(lines)
    people = [dict(r) | {"whatsapp_url": "https://wa.me/" + "".join(ch for ch in r["phone"] if ch.isdigit())
                         + "?text=" + quote(text) if r["phone"] else ""}
              for r in conn.execute("SELECT id, name, phone FROM neighbours ORDER BY name")]
    return {"text": text, "items": items, "neighbours": people,
            "whatsapp_url": "https://wa.me/?text=" + quote(text)}
