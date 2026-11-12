import React, { useState } from "react";
import { api, emojiFor, rupees } from "../api";
import { fill } from "../i18n";
import { useApp } from "../context";
import { useLoad } from "../hooks";
import { Badge, ErrorBox, Field, Loading, Page, Sheet } from "../ui";

const URGENCY_TONE = { now: "bad", soon: "warn", later: "info" };

export default function Buy() {
  const { t, version, bump, toast } = useApp();
  const plan = useLoad("/suggestions", version);
  const list = useLoad("/orders", version);
  const joint = useLoad("/joint-order", version);
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(null);
  const [addingNeighbour, setAddingNeighbour] = useState(false);

  if (plan.error) return <Page title={t.buyTitle}><ErrorBox error={plan.error} /></Page>;
  if (plan.loading) return <Page title={t.buyTitle}><Loading /></Page>;

  const urgencyLabel = { now: t.urgNow, soon: t.urgSoon, later: t.urgLater };
  const statusLabel = { draft: t.statusDraft, approved: t.statusApproved, received: t.statusReceived, rejected: t.statusRejected };
  const statusTone = { draft: "warn", approved: "info", received: "good", rejected: "bad" };
  const items = plan.data.items;
  const orders = (list.data?.orders || []).filter((o) => o.status !== "rejected");

  async function run(fn, doneMessage) {
    setBusy(true);
    try {
      const result = await fn();
      if (doneMessage) toast(typeof doneMessage === "function" ? doneMessage(result) : doneMessage);
      bump();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const makeOrders = () => run(() => api.post("/orders/draft", {}), (r) => fill(t.ordersMade, { count: r.count }));

  return (
    <Page title={t.buyTitle}>
      <div className="stat-row">
        <div className="stat"><small>{t.budget}</small><b>{rupees(plan.data.budget)}</b></div>
        <div className="stat"><small>{t.cashLeft}</small><b>{rupees(plan.data.cash_left)}</b></div>
      </div>

      {plan.data.khata_pending > 0 && (
        <div className="card info-note">📒 {fill(t.khataLocked, { amount: rupees(plan.data.khata_pending) })}</div>
      )}

      <h2 className="section">{t.suggested}</h2>
      <div className="card list">
        {items.length === 0 && <p className="muted center pad">✅ {t.nothingToBuy}</p>}
        {items.map((row) => (
          <div className={`row top ${row.fits_budget ? "" : "dim"}`} key={row.product}>
            <span className="emoji">{emojiFor(row.product)}</span>
            <span className="grow">
              <b>{row.product}</b>
              <small><Badge tone={URGENCY_TONE[row.urgency]}>{urgencyLabel[row.urgency]}</Badge>{row.festival ? <Badge tone="good">🎉 {row.festival}</Badge> : null}</small>
              <small className="hint">{row.reason}</small>
            </span>
            <span className="right"><b>+{row.suggested_qty}</b><small>{row.line_cost > 0 ? rupees(row.line_cost) : row.unit}</small></span>
          </div>
        ))}
      </div>
      {plan.data.skipped_for_budget.length > 0 && (
        <p className="muted">{fill(t.skipped, { items: plan.data.skipped_for_budget.join(", ") })}</p>
      )}
      <p className="muted small-text">{t.orderNote}</p>
      {items.some((i) => i.fits_budget) && (
        <button className="btn primary big" disabled={busy} onClick={makeOrders}>{t.makeOrders}</button>
      )}

      <h2 className="section">{t.orders}</h2>
      {orders.length === 0 && <div className="card center muted">{t.noOrders}</div>}
      {orders.map((o) => (
        <div className="card order" key={o.id}>
          <div className="order-head">
            <h3>{o.supplier}</h3>
            <Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge>
          </div>
          {o.items.map((it) => (
            <div className="row" key={it.id}>
              <span className="emoji">{emojiFor(it.product)}</span>
              <span className="grow"><b>{it.product}</b>{it.line_cost > 0 && <small>{rupees(it.line_cost)}</small>}</span>
              {o.status === "draft" ? (
                <input
                  className="qty-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  defaultValue={it.quantity}
                  aria-label={it.product}
                  onBlur={(e) => {
                    const value = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    if (value !== it.quantity) run(() => api.patch(`/orders/${o.id}/items/${it.id}`, { quantity: value }));
                  }}
                />
              ) : (
                <b>× {it.quantity}</b>
              )}
            </div>
          ))}
          <div className="total-line"><span>{t.cost}</span><b>{rupees(o.total_cost)}</b></div>
          <div className="btn-row">
            {o.status === "draft" && (
              <>
                <button className="btn primary" disabled={busy} onClick={() => run(() => api.post(`/orders/${o.id}/approve`), t.saved)}>✓ {t.approve}</button>
                <button className="btn danger" disabled={busy} onClick={() => run(() => api.post(`/orders/${o.id}/reject`), t.saved)}>{t.reject}</button>
              </>
            )}
            {o.status === "approved" && (
              <>
                <a className="btn" href={o.whatsapp_url} target="_blank" rel="noreferrer">💬 {t.shareWhatsapp}</a>
                <button className="btn primary" disabled={busy} onClick={() => setReceiving(o)}>📦 {t.received}</button>
              </>
            )}
          </div>
        </div>
      ))}

      {joint.data?.items?.length > 0 && (
        <>
          <h2 className="section">🤝 {t.joint}</h2>
          <div className="card">
            <p className="muted">{t.jointHint}</p>
            <pre className="message">{joint.data.text}</pre>
            <div className="btn-row">
              <a className="btn" href={joint.data.whatsapp_url} target="_blank" rel="noreferrer">💬 {t.sendNeighbours}</a>
              <button className="btn" onClick={() => setAddingNeighbour(true)}>＋ {t.addNeighbour}</button>
            </div>
            {joint.data.neighbours.map((n) => (
              <div className="row" key={n.id}>
                <span className="emoji">🏪</span>
                <span className="grow"><b>{n.name}</b><small>{n.phone}</small></span>
                {n.whatsapp_url && <a className="btn small" href={n.whatsapp_url} target="_blank" rel="noreferrer">💬</a>}
                <button className="icon-btn" aria-label={t.close} onClick={() => run(() => api.del(`/neighbours/${n.id}`))}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {receiving && (
        <ReceiveSheet
          order={receiving}
          onClose={() => setReceiving(null)}
          onDone={() => { setReceiving(null); bump(); toast(t.saved); }}
        />
      )}
      {addingNeighbour && (
        <NeighbourSheet onClose={() => setAddingNeighbour(false)} onDone={() => { setAddingNeighbour(false); bump(); }} />
      )}
    </Page>
  );
}

function ReceiveSheet({ order, onClose, onDone }) {
  const { t, toast } = useApp();
  const [dates, setDates] = useState({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const expiry_dates = Object.fromEntries(Object.entries(dates).filter(([, v]) => v));
      await api.post(`/orders/${order.id}/receive`, { expiry_dates });
      onDone();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={`📦 ${t.received} · ${order.supplier}`} onClose={onClose}>
      <div className="form">
        <p className="muted">{t.enterExpiry}</p>
        {order.items.map((it) => (
          <Field key={it.id} label={`${it.product} × ${it.quantity}`}>
            <input type="date" value={dates[it.product] || ""} onChange={(e) => setDates({ ...dates, [it.product]: e.target.value })} />
          </Field>
        ))}
        <button className="btn primary big" disabled={busy} onClick={save}>{t.addToStock}</button>
      </div>
    </Sheet>
  );
}

function NeighbourSheet({ onClose, onDone }) {
  const { t, toast } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function save(e) {
    e.preventDefault();
    try {
      await api.post("/neighbours", { name, phone });
      onDone();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <Sheet title={t.addNeighbour} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <Field label={t.neighbourName}><input required value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label={t.phone}><input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <button className="btn primary big">{t.save}</button>
      </form>
    </Sheet>
  );
}
