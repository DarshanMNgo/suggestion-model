from datetime import timedelta

import pytest

from app import assistant, catalog, db, khata, orders, planner, seed


# ------------------------------------------------------------------ catalog / stock

def test_aliases_added_automatically(conn):
    catalog.upsert_product(conn, "Milk")
    assert catalog.resolve_product(conn, "doodh") == "Milk"
    assert catalog.resolve_product(conn, "ಹಾಲು") == "Milk"
    assert catalog.resolve_product(conn, "दूध") == "Milk"


def test_sale_reduces_stock_and_follows_fifo(conn):
    catalog.upsert_product(conn, "Milk", stock=0, sell_price=27)
    catalog.receive_stock(conn, "Milk", 10, expiry_date=db.today() + timedelta(days=5))
    catalog.receive_stock(conn, "Milk", 10, expiry_date=db.today() + timedelta(days=2))
    result = catalog.record_sale(conn, "Milk", 12)
    assert result["stock_left"] == 8
    batches = catalog.live_batches(conn, "Milk")
    assert [b["quantity"] for b in batches] == [8]  # the 2-day batch was used first
    assert batches[0]["expiry_date"] == (db.today() + timedelta(days=5)).isoformat()


def test_selling_more_than_stock_warns_but_never_goes_negative(conn):
    catalog.upsert_product(conn, "Rice", stock=2)
    result = catalog.record_sale(conn, "Rice", 5)
    assert result["stock_left"] == 0 and result["warning"] == "short_stock"


def test_invalid_quantities_rejected(conn):
    catalog.upsert_product(conn, "Rice", stock=2)
    with pytest.raises(ValueError):
        catalog.record_sale(conn, "Rice", 0)
    with pytest.raises(ValueError):
        catalog.receive_stock(conn, "Rice", -3)


def test_credit_sale_goes_to_khata(conn):
    catalog.upsert_product(conn, "Rice", stock=20, sell_price=60)
    ramesh = khata.add_customer(conn, "Ramesh")
    catalog.record_sale(conn, "Rice", 2, payment="credit", customer_id=ramesh["id"])
    assert khata.get_customer(conn, ramesh["id"])["balance"] == 120


def test_credit_sale_needs_customer_and_price(conn):
    catalog.upsert_product(conn, "Rice", stock=20)
    with pytest.raises(ValueError):
        catalog.record_sale(conn, "Rice", 1, payment="credit")
    person = khata.add_customer(conn, "Ramesh")
    with pytest.raises(ValueError):  # no selling price set
        catalog.record_sale(conn, "Rice", 1, payment="credit", customer_id=person["id"])


def test_old_database_is_upgraded_without_losing_data(tmp_path, monkeypatch):
    import sqlite3
    path = tmp_path / "old.db"
    old = sqlite3.connect(path)
    old.execute("CREATE TABLE inventory (product TEXT PRIMARY KEY, stock INTEGER NOT NULL DEFAULT 0, "
                "low_stock_threshold INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL)")
    old.execute("CREATE TABLE sales (id INTEGER PRIMARY KEY AUTOINCREMENT, product TEXT NOT NULL, "
                "quantity INTEGER NOT NULL, sale_date TEXT NOT NULL, created_at TEXT NOT NULL)")
    old.execute("INSERT INTO inventory VALUES ('Milk', 7, 5, '2026-01-01')")
    old.commit(); old.close()
    monkeypatch.setenv("KIRANA_DB", str(path))
    db.init_db()
    conn = db.connect()
    assert catalog.get_product(conn, "Milk")["stock"] == 7
    assert catalog.get_product(conn, "Milk")["sell_price"] == 0


# ------------------------------------------------------------------ planner

def _add_sales(conn, product, per_day, days=14):
    for back in range(1, days + 1):
        conn.execute("INSERT INTO sales(product, quantity, sale_date, created_at, price, payment) "
                     "VALUES (?, ?, ?, datetime('now'), 10, 'cash')",
                     (product, per_day, (db.today() - timedelta(days=back)).isoformat()))


def test_reorder_suggests_when_stock_will_run_out(conn):
    catalog.upsert_product(conn, "Sugar 1kg", stock=5, cost_price=40, low_stock_threshold=2)
    _add_sales(conn, "Sugar 1kg", 10)
    plan = planner.reorder_suggestions(conn, budget=100000)
    row = plan["items"][0]
    assert row["product"] == "Sugar 1kg" and row["urgency"] == "now" and row["suggested_qty"] > 60


def test_well_stocked_item_not_suggested(conn):
    catalog.upsert_product(conn, "Sugar 1kg", stock=500, cost_price=40, low_stock_threshold=2)
    _add_sales(conn, "Sugar 1kg", 10)
    assert planner.reorder_suggestions(conn)["items"] == []


def test_budget_limits_spending_and_prefers_urgent(conn):
    catalog.upsert_product(conn, "Rice", stock=1, cost_price=50, low_stock_threshold=1)
    catalog.upsert_product(conn, "Salt", stock=60, cost_price=20, low_stock_threshold=40)
    _add_sales(conn, "Rice", 10)
    _add_sales(conn, "Salt", 4)
    plan = planner.reorder_suggestions(conn, budget=600)
    assert plan["total_cost"] <= 600
    assert plan["items"][0]["product"] == "Rice"


def test_festival_boosts_demand(conn, monkeypatch):
    monkeypatch.setattr(db, "today", lambda: planner.FESTIVALS[1][1] - timedelta(days=3))  # Sankranti
    boost, name = planner.festival_boost("Sugar 1kg")
    assert boost > 1 and "Sankranti" in name
    assert planner.festival_boost("Soap")[0] == 1.0


def test_expiry_and_dead_stock(demo):
    expiry = planner.expiry_report(demo)
    milk = next(e for e in expiry if e["product"] == "Milk")
    assert milk["days_left"] == 1 and milk["level"] in ("urgent", "ok")
    dead = [d["product"] for d in planner.dead_stock(demo)]
    assert "Hair Oil Sachet" in dead and "Chilli Sauce" in dead and "Milk" not in dead


def test_expired_stock_flagged(conn):
    catalog.upsert_product(conn, "Curd", stock=4, cost_price=20)
    conn.execute("INSERT INTO batches(product, quantity, expiry_date, received_date) VALUES ('Curd', 4, ?, ?)",
                 ((db.today() - timedelta(days=2)).isoformat(), db.today().isoformat()))
    assert planner.expiry_report(conn)[0]["level"] == "expired"


def test_summary_shape(demo):
    data = planner.daily_summary(demo)
    assert data["counts"]["items"] == len(seed.DEMO_ITEMS)
    assert data["khata_pending"] > 0 and data["today"]["total"] > 0


# ------------------------------------------------------------------ orders

def test_draft_approve_receive_flow(demo):
    created = orders.create_draft_orders(demo)
    assert created and all(o["status"] == "draft" for o in created)
    # pressing the button again must not double-order the same items
    assert orders.create_draft_orders(demo) == []
    order = created[0]
    item = order["items"][0]
    before = catalog.get_product(demo, item["product"])["stock"]
    with pytest.raises(ValueError):          # cannot receive before the owner approves
        orders.receive(demo, order["id"])
    orders.approve(demo, order["id"])
    orders.receive(demo, order["id"])
    assert catalog.get_product(demo, item["product"])["stock"] == before + item["quantity"]
    with pytest.raises(ValueError):          # cannot receive twice
        orders.receive(demo, order["id"])


def test_edit_and_reject(demo):
    order = orders.create_draft_orders(demo)[0]
    item = order["items"][0]
    edited = orders.update_item(demo, order["id"], item["id"], 3)
    assert edited["items"][0]["quantity"] == 3
    assert orders.reject(demo, order["id"])["status"] == "rejected"


def test_joint_order_message(demo):
    data = orders.joint_order_message(demo)
    assert data["text"] and data["whatsapp_url"].startswith("https://wa.me/") and len(data["neighbours"]) == 2


# ------------------------------------------------------------------ khata

def test_khata_balance(conn):
    person = khata.add_customer(conn, "Suresh")
    khata.add_entry(conn, person["id"], 500, "credit")
    assert khata.add_entry(conn, person["id"], 200, "payment")["balance"] == 300
    assert khata.add_customer(conn, "suresh")["id"] == person["id"]  # no duplicate
    with pytest.raises(ValueError):
        khata.add_entry(conn, person["id"], -5, "credit")


# ------------------------------------------------------------------ assistant

def run(conn, text, lang="en"):
    out = assistant.interpret(conn, text, lang)
    if out["needs_confirm"]:
        done = assistant.execute(conn, out["action"], lang)
        out["done"] = done
    return out


@pytest.mark.parametrize("text,lang", [
    ("sold 5 milk", "en"), ("5 doodh becha", "hi"), ("5 दूध बेचा", "hi"), ("5 ಹಾಲು ಮಾರಿದೆ", "kn"),
    ("sell five milk", "en"),
])
def test_sell_in_three_languages(demo, text, lang):
    before = catalog.get_product(demo, "Milk")["stock"]
    out = run(demo, text, lang)
    assert out["needs_confirm"] and out["action"]["type"] == "sell" and out["action"]["quantity"] == 5
    assert out["done"]["ok"]
    assert catalog.get_product(demo, "Milk")["stock"] == before - 5


def test_nothing_changes_before_confirmation(demo):
    before = catalog.get_product(demo, "Milk")["stock"]
    out = assistant.interpret(demo, "sold 5 milk")
    assert out["needs_confirm"]
    assert catalog.get_product(demo, "Milk")["stock"] == before


@pytest.mark.parametrize("text,lang", [
    ("add 20 sugar", "en"), ("20 cheeni aaya", "hi"), ("20 ಸಕ್ಕರೆ ಬಂತು", "kn"),
])
def test_add_stock(demo, text, lang):
    before = catalog.get_product(demo, "Sugar 1kg")["stock"]
    out = run(demo, text, lang)
    assert out["action"]["type"] == "receive"
    assert catalog.get_product(demo, "Sugar 1kg")["stock"] == before + 20


def test_stock_question(demo):
    assert "Milk" in assistant.interpret(demo, "how much milk")["reply"]
    assert assistant.interpret(demo, "doodh kitna hai", "hi")["reply"]
    assert not assistant.interpret(demo, "how much milk")["needs_confirm"]


def test_what_to_buy_and_make_order(demo):
    assert assistant.interpret(demo, "what should I order")["reply"]
    out = assistant.interpret(demo, "make order")
    assert out["needs_confirm"] and out["action"]["type"] == "make_order"
    done = assistant.execute(demo, out["action"])
    assert done["ok"] and orders.list_orders(demo, "draft")


def test_khata_by_voice(demo):
    out = run(demo, "Ramesh took 200 udhar")
    assert out["action"] == {"type": "khata", "kind": "credit", "customer": "Ramesh", "amount": 200}
    assert out["done"]["ok"]
    base = khata.find_customer(demo, "Ramesh")["balance"]
    run(demo, "Ramesh paid 100")
    assert khata.find_customer(demo, "Ramesh")["balance"] == base - 100
    assert "Ramesh" in assistant.interpret(demo, "how much does Ramesh owe")["reply"]


def test_unknown_item_is_not_invented(demo):
    out = assistant.interpret(demo, "sold 5 unicorns")
    assert not out["needs_confirm"] and "unicorns" in out["reply"]


def test_missing_details_ask_a_question(demo):
    assert assistant.interpret(demo, "sold milk")["ask"]
    assert assistant.interpret(demo, "sold 5")["ask"]


def test_gibberish_and_empty(demo):
    assert not assistant.interpret(demo, "asdf qwer")["needs_confirm"]
    assert assistant.interpret(demo, "   ")["reply"]


def test_expiry_and_dead_questions(demo):
    assert "Curd" in assistant.interpret(demo, "what is expiring")["reply"]
    assert "Hair Oil" in assistant.interpret(demo, "dead stock")["reply"]


def test_yes_no_detection():
    assert assistant.is_yes("haan") and assistant.is_yes("ಹೌದು") and assistant.is_yes("yes confirm")
    assert assistant.is_no("nahi") and assistant.is_no("cancel") and not assistant.is_yes("no")


def test_execute_rejects_garbage(demo):
    assert not assistant.execute(demo, {"type": "drop_tables"})["ok"]
    assert not assistant.execute(demo, {"type": "sell", "product": "Milk", "quantity": "abc"})["ok"]
    assert not assistant.execute(demo, {"type": "sell", "product": "Milk", "quantity": -4})["ok"]


def test_seed_is_idempotent(conn):
    assert seed.seed_demo(conn)["seeded"]
    assert not seed.seed_demo(conn)["seeded"]
    assert seed.seed_demo(conn, reset=True)["seeded"]
