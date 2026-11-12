import React, { useState } from "react";
import { api, rupees } from "../api";
import { fill } from "../i18n";
import { useApp } from "../context";
import { useLoad } from "../hooks";
import { Badge, ErrorBox, Field, Loading, Page, Sheet } from "../ui";

export default function Khata() {
  const { t, version, bump, toast } = useApp();
  const { data, error, loading } = useLoad("/customers", version);
  const settings = useLoad("/settings", version);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

  if (error) return <Page title={t.khataTitle}><ErrorBox error={error} /></Page>;
  if (loading) return <Page title={t.khataTitle}><Loading /></Page>;

  return (
    <Page title={t.khataTitle} action={<button className="btn primary" onClick={() => setAdding(true)}>＋ {t.addCustomer}</button>}>
      <div className="stat bad wide">
        <small>{t.totalPending}</small>
        <b>{rupees(data.total_pending)}</b>
      </div>

      <div className="card list">
        {data.customers.length === 0 && <p className="muted center pad">{t.noCustomersYet}</p>}
        {data.customers.map((c) => (
          <button className="row tap" key={c.id} onClick={() => setOpenId(c.id)}>
            <span className="avatar">{c.name.slice(0, 1).toUpperCase()}</span>
            <span className="grow"><b>{c.name}</b><small>{c.phone}</small></span>
            {c.balance > 0 ? <Badge tone="bad">{rupees(c.balance)}</Badge> : <Badge tone="good">{t.settled}</Badge>}
          </button>
        ))}
      </div>

      {adding && <AddCustomer onClose={() => setAdding(false)} onDone={() => { setAdding(false); bump(); toast(t.saved); }} />}
      {openId && (
        <CustomerSheet
          id={openId}
          shop={settings.data?.shop_name || ""}
          onClose={() => setOpenId(null)}
        />
      )}
    </Page>
  );
}

function AddCustomer({ onClose, onDone }) {
  const { t, toast } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function save(e) {
    e.preventDefault();
    try {
      await api.post("/customers", { name, phone });
      onDone();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <Sheet title={t.addCustomer} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <Field label={t.customerName}><input required value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label={t.phone}><input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <button className="btn primary big">{t.save}</button>
      </form>
    </Sheet>
  );
}

function CustomerSheet({ id, shop, onClose }) {
  const { t, bump, toast, version } = useApp();
  const { data, loading } = useLoad(`/customers/${id}`, version);
  const [amount, setAmount] = useState("");

  async function write(kind) {
    const value = Number(amount);
    if (!value || value <= 0) return;
    try {
      await api.post(`/customers/${id}/entries`, { amount: value, kind });
      setAmount("");
      toast(t.entryDone);
      bump();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (loading || !data) return <Sheet title="…" onClose={onClose}><Loading /></Sheet>;

  const phone = (data.phone || "").replace(/\D/g, "");
  const reminder = encodeURIComponent(fill(t.remindText, { name: data.name, amount: Math.max(0, data.balance), shop }));
  const reminderUrl = `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${reminder}`;

  return (
    <Sheet title={data.name} onClose={onClose}>
      <div className="stat wide">
        <small>{t.owes}</small>
        <b>{rupees(Math.max(0, data.balance))}</b>
      </div>
      <Field label={t.amount}>
        <input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="btn-row">
        <button className="btn" disabled={!amount} onClick={() => write("credit")}>＋ {t.tookUdhar}</button>
        <button className="btn primary" disabled={!amount} onClick={() => write("payment")}>✓ {t.paidBack}</button>
      </div>
      {data.balance > 0 && phone && (
        <a className="btn big" href={reminderUrl} target="_blank" rel="noreferrer">💬 {t.remind}</a>
      )}
      <h3 className="section">{t.history}</h3>
      <div className="list">
        {data.history.map((h) => (
          <div className="row" key={h.id}>
            <span className="grow"><b>{h.kind === "credit" ? t.credit : t.payment}</b><small>{h.entry_date}{h.note ? ` · ${h.note}` : ""}</small></span>
            <b className={h.kind === "credit" ? "neg" : "pos"}>{h.kind === "credit" ? "+" : "−"}{rupees(h.amount)}</b>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
