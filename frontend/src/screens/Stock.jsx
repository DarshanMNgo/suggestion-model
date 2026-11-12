import React, { useEffect, useMemo, useState } from "react";
import { api, emojiFor, rupees } from "../api";
import { fill } from "../i18n";
import { useApp } from "../context";
import { useLoad } from "../hooks";
import { Badge, ErrorBox, Field, Loading, Page, Sheet, Stepper } from "../ui";

const EMPTY = {
  product: "", stock: 0, low_stock_threshold: 5, unit: "pcs", cost_price: 0, sell_price: 0, supplier: "", shelf_life_days: 0,
};

export default function Stock() {
  const { t, version, bump, toast, nav } = useApp();
  const inv = useLoad("/inventory", version);
  const expiry = useLoad("/expiry?days=14", version);
  const dead = useLoad("/dead-stock", version);
  const [filter, setFilter] = useState(nav.filter || "all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(nav.add ? { ...EMPTY, isNew: true } : null);
  const [arriving, setArriving] = useState(null);

  // Home buttons can open this screen with a filter or an "add" sheet already chosen.
  useEffect(() => {
    if (nav.filter) setFilter(nav.filter);
    if (nav.add) setEditing({ ...EMPTY, isNew: true });
  }, [nav]);

  const items = inv.data?.items || [];
  const expiryByName = useMemo(() => Object.fromEntries((expiry.data?.items || []).map((e) => [e.product, e])), [expiry.data]);
  const deadByName = useMemo(() => Object.fromEntries((dead.data?.items || []).map((d) => [d.product, d])), [dead.data]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !i.product.toLowerCase().includes(q) && !(i.aliases || "").toLowerCase().includes(q)) return false;
      if (filter === "low") return i.is_low;
      if (filter === "expiry") return Boolean(expiryByName[i.product]);
      if (filter === "dead") return Boolean(deadByName[i.product]);
      return true;
    });
  }, [items, query, filter, expiryByName, deadByName]);

  if (inv.error) return <Page title={t.stockTitle}><ErrorBox error={inv.error} /></Page>;
  if (inv.loading) return <Page title={t.stockTitle}><Loading /></Page>;

  const filters = [["all", t.filterAll], ["low", t.filterLow], ["expiry", t.filterExpiry], ["dead", t.filterDead]];

  function expiryText(e) {
    if (e.days_left < 0) return t.expired;
    if (e.days_left === 0) return t.expiresToday;
    return fill(t.expiresIn, { days: e.days_left });
  }

  return (
    <Page
      title={t.stockTitle}
      action={<button className="btn primary" onClick={() => setEditing({ ...EMPTY, isNew: true })}>＋ {t.addItem}</button>}
    >
      <input className="search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips scroll">
        {filters.map(([key, label]) => (
          <button key={key} className={`chip ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
        <button className="chip" onClick={() => setArriving({ product: items[0]?.product || "", quantity: 1, expiry_date: "" })}>📦 {t.goodsArrived}</button>
      </div>

      {filter === "dead" && (dead.data?.items || []).length > 0 && (
        <div className="card info-note">💤 {t.moneyStuck}: <b>{rupees(dead.data.items.reduce((s, d) => s + d.money_locked, 0))}</b></div>
      )}

      <div className="card list">
        {shown.length === 0 && <p className="muted center pad">{t.noItems}</p>}
        {shown.map((i) => {
          const exp = expiryByName[i.product];
          const idle = deadByName[i.product];
          return (
            <button className="row tap" key={i.product} onClick={() => setEditing({ ...i })}>
              <span className="emoji">{emojiFor(i.product)}</span>
              <span className="grow">
                <b>{i.product}</b>
                <small>
                  {exp && exp.level !== "ok" ? <Badge tone={exp.level === "soon" ? "warn" : "bad"}>{expiryText(exp)}</Badge> : null}
                  {i.is_low ? <Badge tone="warn">{t.low}</Badge> : null}
                  {idle ? <Badge tone="info">{idle.idle_days != null ? fill(t.lastSold, { days: idle.idle_days }) : t.neverSold}</Badge> : null}
                </small>
                {filter === "expiry" && exp && <small className="hint">{exp.action}</small>}
              </span>
              <span className="right"><b>{i.stock}</b><small>{i.unit}</small></span>
            </button>
          );
        })}
      </div>

      {editing && (
        <ItemSheet
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); bump(); toast(t.saved); }}
          onArrive={() => { setArriving({ product: editing.product, quantity: 1, expiry_date: "" }); setEditing(null); }}
        />
      )}
      {arriving && (
        <ArriveSheet
          state={arriving}
          items={items}
          onClose={() => setArriving(null)}
          onSaved={() => { setArriving(null); bump(); toast(t.saved); }}
        />
      )}
    </Page>
  );
}

function ItemSheet({ item, onClose, onSaved, onArrive }) {
  const { t, toast } = useApp();
  const [form, setForm] = useState(item);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const num = (key) => (e) => setForm({ ...form, [key]: e.target.value === "" ? "" : Number(e.target.value) });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/inventory", {
        product: form.product,
        stock: Number(form.stock) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
        unit: form.unit || "pcs",
        cost_price: Number(form.cost_price) || 0,
        sell_price: Number(form.sell_price) || 0,
        supplier: form.supplier || "",
        shelf_life_days: Number(form.shelf_life_days) || 0,
      });
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await api.del(`/inventory/${encodeURIComponent(form.product)}`);
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <Sheet title={item.isNew ? t.addItem : item.product} onClose={onClose}>
      <form onSubmit={save} className="form">
        {item.isNew && (
          <Field label={t.itemName}><input required value={form.product} onChange={set("product")} autoFocus /></Field>
        )}
        <div className="two">
          <Field label={t.inStock}><input type="number" inputMode="numeric" min="0" value={form.stock} onChange={num("stock")} /></Field>
          <Field label={t.unit}><input value={form.unit} onChange={set("unit")} /></Field>
        </div>
        <div className="two">
          <Field label={t.costPrice}><input type="number" inputMode="decimal" min="0" value={form.cost_price} onChange={num("cost_price")} /></Field>
          <Field label={t.sellPrice}><input type="number" inputMode="decimal" min="0" value={form.sell_price} onChange={num("sell_price")} /></Field>
        </div>
        <div className="two">
          <Field label={t.alertAt}><input type="number" inputMode="numeric" min="0" value={form.low_stock_threshold} onChange={num("low_stock_threshold")} /></Field>
          <Field label={t.shelfLife} hint={t.shelfHint}><input type="number" inputMode="numeric" min="0" value={form.shelf_life_days} onChange={num("shelf_life_days")} /></Field>
        </div>
        <Field label={t.supplier}><input value={form.supplier || ""} onChange={set("supplier")} /></Field>
        <button className="btn primary big" disabled={busy || !form.product.trim()}>{t.save}</button>
        {!item.isNew && (
          <div className="two">
            <button type="button" className="btn" onClick={onArrive}>📦 {t.goodsArrived}</button>
            <button type="button" className="btn danger" onClick={remove}>{t.deleteItem}</button>
          </div>
        )}
      </form>
    </Sheet>
  );
}

function ArriveSheet({ state, items, onClose, onSaved }) {
  const { t, toast } = useApp();
  const [form, setForm] = useState(state);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/inventory/receive", {
        product: form.product,
        quantity: form.quantity,
        expiry_date: form.expiry_date || null,
      });
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={`📦 ${t.goodsArrived}`} onClose={onClose}>
      <form onSubmit={save} className="form">
        <Field label={t.pickItem}>
          <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
            {items.map((i) => <option key={i.product} value={i.product}>{i.product}</option>)}
          </select>
        </Field>
        <Field label={t.qtyArrived}><Stepper value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} /></Field>
        <Field label={t.expiryDate}><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
        <button className="btn primary big" disabled={busy || !form.product}>{t.addToStock}</button>
      </form>
    </Sheet>
  );
}
