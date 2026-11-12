"""Products, stock movements and name matching.

Shop owners call the same item by many names ("doodh", "milk", "ಹಾಲು"). Every product
can carry aliases and the matching code below finds the right product from whatever
the owner typed or said.
"""
from __future__ import annotations

import difflib
import re
import sqlite3
import unicodedata
from datetime import date, timedelta

from . import db

# Everyday names used in shops. They are added automatically to a new product whose
# name contains the key, so the owner does not have to type them.
COMMON_ALIASES: dict[str, list[str]] = {
    "milk": ["doodh", "dudh", "दूध", "ಹಾಲು", "haalu"],
    "rice": ["chawal", "चावल", "ಅಕ್ಕಿ", "akki"],
    "sugar": ["cheeni", "chini", "shakkar", "चीनी", "शक्कर", "ಸಕ್ಕರೆ", "sakkare"],
    "oil": ["tel", "तेल", "ಎಣ್ಣೆ", "enne"],
    "egg": ["anda", "ande", "अंडा", "अंडे", "ಮೊಟ್ಟೆ", "mutte"],
    "bread": ["pav", "double roti", "ब्रेड", "ಬ್ರೆಡ್"],
    "biscuit": ["बिस्कुट", "ಬಿಸ್ಕತ್", "ಬಿಸ್ಕೆಟ್"],
    "soft drink": ["cold drink", "colddrink", "soda", "कोल्ड ड्रिंक", "ಕೋಲ್ಡ್ ಡ್ರಿಂಕ್"],
    "atta": ["flour", "wheat flour", "आटा", "ಗೋಧಿ ಹಿಟ್ಟು", "ಆಟ್ಟಾ"],
    "tea": ["chai", "chai patti", "चाय", "ಚಹಾ"],
    "salt": ["namak", "नमक", "ಉಪ್ಪು", "uppu"],
    "dal": ["daal", "pulses", "दाल", "ಬೇಳೆ", "bele"],
    "noodles": ["maggi", "मैगी", "ಮ್ಯಾಗಿ"],
    "soap": ["sabun", "साबुन", "ಸೋಪು"],
    "detergent": ["washing powder", "surf", "सर्फ", "ಡಿಟರ್ಜೆಂಟ್"],
    "ghee": ["घी", "ತುಪ್ಪ", "tuppa"],
}

_ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍﻿"), None)
_INDIC_DIGITS = str.maketrans("०१२३४५६७८९೦೧೨೩೪೫೬೭೮೯", "01234567890123456789")
_SPLITTER = re.compile(r"[\s,;:.!?()\[\]\"'`।|/\\]+")
_SIZE_WORD = re.compile(r"^\d+(\.\d+)?(kg|g|gm|l|ltr|ml|pcs)?$")


def normalize_text(text: str) -> str:
    """Lowercase, unify unicode, turn Hindi/Kannada digits into 0-9, drop invisible marks."""
    text = unicodedata.normalize("NFC", text or "").translate(_ZERO_WIDTH).translate(_INDIC_DIGITS)
    return text.lower().strip()


def tokenize(text: str) -> list[str]:
    """Split on spaces and punctuation only.

    Python's \\w does not treat Hindi/Kannada vowel signs as letters, so a regex like
    \\w+ would cut those words into pieces.
    """
    return [token for token in _SPLITTER.split(normalize_text(text)) if token]


def aliases_for(name: str, extra: str = "") -> str:
    """Comma-separated aliases: the owner's own plus the common local names."""
    found: list[str] = []
    lowered = normalize_text(name)
    for key, names in COMMON_ALIASES.items():
        if key in lowered:
            found.extend(names)
    found.extend(part.strip() for part in (extra or "").split(","))
    seen: list[str] = []
    for item in found:
        item = item.strip()
        if item and normalize_text(item) != lowered and item not in seen:
            seen.append(item)
    return ", ".join(seen)


def parse_date(value: str | date | None) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError as exc:
        raise ValueError(f"'{value}' is not a valid date (use YYYY-MM-DD).") from exc


# ---------------------------------------------------------------- lookup

def get_product(conn: sqlite3.Connection, name: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM inventory WHERE product = ? COLLATE NOCASE", (name.strip(),)
    ).fetchone()


def name_index(conn: sqlite3.Connection) -> dict[str, str]:
    """Map every spoken/typed key (name or alias, normalised) to the real product name."""
    rows = conn.execute("SELECT product, aliases FROM inventory").fetchall()
    index: dict[str, str] = {normalize_text(row["product"]): row["product"] for row in rows}

    def add_unique(candidates: dict[str, set[str]]) -> None:
        # A key that points to two different items (e.g. "oil" -> cooking oil AND hair oil)
        # is dropped, so the app asks instead of guessing wrong.
        for key, owners in candidates.items():
            if key and key not in index and len(owners) == 1:
                index[key] = next(iter(owners))

    from_aliases: dict[str, set[str]] = {}
    for row in rows:
        for alias in (row["aliases"] or "").split(","):
            from_aliases.setdefault(normalize_text(alias), set()).add(row["product"])
    add_unique(from_aliases)

    # "sugar" should find "Sugar 1kg": index every part of the name, ignoring sizes like 1kg / 250g.
    from_names: dict[str, set[str]] = {}
    for row in rows:
        words = [w for w in tokenize(row["product"]) if not _SIZE_WORD.match(w)]
        for start in range(len(words)):
            for end in range(start + 1, len(words) + 1):
                from_names.setdefault(" ".join(words[start:end]), set()).add(row["product"])
    add_unique(from_names)
    return index


def match_products(conn: sqlite3.Connection, tokens: list[str], skip: set[str] | None = None):
    """Find product mentions inside a token list.

    Returns [(product, first_token, last_token)] with the longest phrases matched first.
    Exact name/alias matches win; a close spelling (for voice typing mistakes) is the fallback.
    """
    skip = skip or set()
    index = name_index(conn)
    taken = [False] * len(tokens)
    found: list[tuple[str, int, int]] = []

    def claim(start: int, end: int, product: str) -> None:
        for pos in range(start, end + 1):
            taken[pos] = True
        found.append((product, start, end))

    for size in (3, 2, 1):  # longest phrase first, so "soft drinks" beats "soft"
        for start in range(0, len(tokens) - size + 1):
            end = start + size - 1
            if any(taken[start:end + 1]):
                continue
            key = " ".join(tokens[start:end + 1])
            if key in index:
                claim(start, end, index[key])

    keys = list(index)
    for pos, token in enumerate(tokens):
        if taken[pos] or token in skip or token.isdigit() or len(token) < 4:
            continue
        close = difflib.get_close_matches(token, keys, n=1, cutoff=0.84)
        if close:
            claim(pos, pos, index[close[0]])

    return sorted(found, key=lambda item: item[1])


def resolve_product(conn: sqlite3.Connection, text: str) -> str | None:
    """Return the product name best matching free text, or None."""
    row = get_product(conn, text)
    if row:
        return row["product"]
    hits = match_products(conn, tokenize(text))
    return hits[0][0] if hits else None


# ---------------------------------------------------------------- products

def upsert_product(conn: sqlite3.Connection, name: str, **fields) -> dict:
    """Create a product or update the fields that were supplied (None means 'leave as is')."""
    name = (name or "").strip()
    if not name:
        raise ValueError("Item name is required.")
    existing = get_product(conn, name)
    stamp = db.today().isoformat()
    columns = ("stock", "low_stock_threshold", "unit", "cost_price", "sell_price",
               "supplier", "shelf_life_days", "category")
    values = {key: fields[key] for key in columns if fields.get(key) is not None}
    if existing:
        name = existing["product"]
        extra_aliases = fields.get("aliases")
        if extra_aliases is not None:
            values["aliases"] = aliases_for(name, extra_aliases)
    else:
        values["aliases"] = aliases_for(name, fields.get("aliases") or "")
        conn.execute(
            "INSERT INTO inventory(product, stock, low_stock_threshold, updated_at, created_at) "
            "VALUES (?, 0, 5, ?, ?)", (name, stamp, stamp))
    if values:
        assignments = ", ".join(f"{key} = ?" for key in values)
        conn.execute(f"UPDATE inventory SET {assignments}, updated_at = ? WHERE product = ?",
                     (*values.values(), stamp, name))
    return dict(get_product(conn, name))


def get_or_create(conn: sqlite3.Connection, name: str) -> str:
    row = get_product(conn, name)
    return row["product"] if row else upsert_product(conn, name)["product"]


def live_batches(conn: sqlite3.Connection, product: str) -> list[dict]:
    """Expiry batches that still hold stock, earliest expiry first.

    If the owner lowered the stock count by hand, the earliest batches are assumed to
    have been sold first (shops sell oldest stock first).
    """
    row = get_product(conn, product)
    if not row:
        return []
    batches = [dict(b) for b in conn.execute(
        "SELECT id, quantity, expiry_date, received_date FROM batches "
        "WHERE product = ? AND quantity > 0 ORDER BY expiry_date, id", (row["product"],))]
    excess = sum(b["quantity"] for b in batches) - row["stock"]
    for batch in batches:
        if excess <= 0:
            break
        cut = min(batch["quantity"], excess)
        batch["quantity"] -= cut
        excess -= cut
    return [b for b in batches if b["quantity"] > 0]


def list_inventory(conn: sqlite3.Connection) -> list[dict]:
    items = []
    today = db.today()
    for row in conn.execute("SELECT * FROM inventory ORDER BY product COLLATE NOCASE"):
        item = dict(row)
        batches = live_batches(conn, row["product"])
        nearest = parse_date(batches[0]["expiry_date"]) if batches else None
        item["nearest_expiry"] = nearest.isoformat() if nearest else None
        item["days_to_expiry"] = (nearest - today).days if nearest else None
        item["stock_value"] = round(row["stock"] * row["cost_price"], 2)
        item["is_low"] = row["stock"] <= row["low_stock_threshold"]
        items.append(item)
    return items


# ---------------------------------------------------------------- stock movements

def receive_stock(conn: sqlite3.Connection, product: str, quantity: int,
                  expiry_date: str | date | None = None, cost_price: float | None = None) -> dict:
    """Goods arrived: add to stock and remember the expiry date."""
    if quantity <= 0:
        raise ValueError("Quantity must be more than zero.")
    name = get_or_create(conn, product)
    row = get_product(conn, name)
    stamp = db.today().isoformat()
    expiry = parse_date(expiry_date)
    if expiry is None and row["shelf_life_days"] > 0:
        expiry = db.today() + timedelta(days=row["shelf_life_days"])
    if expiry is not None:
        conn.execute("INSERT INTO batches(product, quantity, expiry_date, received_date) VALUES (?, ?, ?, ?)",
                     (name, quantity, expiry.isoformat(), stamp))
    conn.execute("UPDATE inventory SET stock = stock + ?, updated_at = ? WHERE product = ?",
                 (quantity, stamp, name))
    if cost_price is not None and cost_price > 0:
        conn.execute("UPDATE inventory SET cost_price = ? WHERE product = ?", (cost_price, name))
    fresh = get_product(conn, name)
    return {"product": name, "added": quantity, "stock": fresh["stock"],
            "expiry_date": expiry.isoformat() if expiry else None}


def _take_from_batches(conn: sqlite3.Connection, product: str, quantity: int) -> None:
    """Sell oldest stock first (FIFO) from the expiry batches."""
    remaining = quantity
    for batch in conn.execute(
            "SELECT id, quantity FROM batches WHERE product = ? AND quantity > 0 "
            "ORDER BY expiry_date, id", (product,)).fetchall():
        if remaining <= 0:
            break
        used = min(batch["quantity"], remaining)
        remaining -= used
        conn.execute("UPDATE batches SET quantity = quantity - ? WHERE id = ?", (used, batch["id"]))


def record_sale(conn: sqlite3.Connection, product: str, quantity: int,
                sale_date: str | date | None = None, price: float | None = None,
                payment: str = "cash", customer_id: int | None = None) -> dict:
    if quantity <= 0:
        raise ValueError("Quantity must be more than zero.")
    if payment not in ("cash", "upi", "credit"):
        raise ValueError("Payment must be cash, upi or credit.")
    name = get_or_create(conn, product)
    row = get_product(conn, name)
    unit_price = float(price) if price else float(row["sell_price"])
    amount = round(unit_price * quantity, 2)
    when = (parse_date(sale_date) or db.today()).isoformat()

    if payment == "credit":
        if not customer_id or not conn.execute("SELECT 1 FROM customers WHERE id = ?", (customer_id,)).fetchone():
            raise ValueError("Choose the customer who is taking this on credit.")
        if amount <= 0:
            raise ValueError(f"Set a selling price for {name} first, so the khata amount is right.")

    cur = conn.execute(
        "INSERT INTO sales(product, quantity, sale_date, created_at, price, payment, customer_id) "
        "VALUES (?, ?, ?, datetime('now'), ?, ?, ?)",
        (name, quantity, when, unit_price, payment, customer_id))
    warning = None
    if quantity > row["stock"]:
        warning = "short_stock"  # sold more than the app thought was in stock
    conn.execute("UPDATE inventory SET stock = MAX(0, stock - ?), updated_at = ? WHERE product = ?",
                 (quantity, db.today().isoformat(), name))
    _take_from_batches(conn, name, quantity)

    if payment == "credit":
        conn.execute(
            "INSERT INTO khata(customer_id, amount, kind, note, entry_date) VALUES (?, ?, 'credit', ?, ?)",
            (customer_id, amount, f"{quantity} x {name}", when))
    fresh = get_product(conn, name)
    return {"sale_id": cur.lastrowid, "product": name, "quantity": quantity, "amount": amount,
            "payment": payment, "stock_left": fresh["stock"], "warning": warning}


def recent_sales(conn: sqlite3.Connection, limit: int = 30) -> list[dict]:
    rows = conn.execute(
        "SELECT s.id, s.product, s.quantity, s.sale_date, s.price, s.payment, s.customer_id, "
        "c.name AS customer FROM sales s LEFT JOIN customers c ON c.id = s.customer_id "
        "ORDER BY s.sale_date DESC, s.id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) | {"amount": round(row["price"] * row["quantity"], 2)} for row in rows]
