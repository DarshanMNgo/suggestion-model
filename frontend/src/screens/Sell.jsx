import React, { useMemo, useState } from "react";
import { api, emojiFor, rupees } from "../api";
import { fill } from "../i18n";
import { useApp } from "../context";
import { useLoad } from "../hooks";
import { ErrorBox, Field, Loading, Page, Stepper } from "../ui";

export default function Sell() {
  const { t, version, bump, toast, go } = useApp();
  const inv = useLoad("/inventory", version);
  const sales = useLoad("/sales?limit=8", version);
  const people = useLoad("/customers", version);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null);
  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState("cash");
  const [customerId, setCustomerId] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const items = inv.data?.items || [];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => !q || i.product.toLowerCase().includes(q) || (i.aliases || "").toLowerCase().includes(q));
  }, [items, query]);

  if (inv.error) return <Page title={t.sellTitle}><ErrorBox error={inv.error} /></Page>;
  if (inv.loading) return <Page title={t.sellTitle}><Loading /></Page>;

  const item = items.find((i) => i.product === picked);
  const unitPrice = price !== "" ? Number(price) : item?.sell_price || 0;
  const customers = people.data?.customers || [];

  function choose(name) {
    setPicked(name);
    setQty(1);
    setPrice("");
  }

  async function save() {
    setBusy(true);
    try {
      const result = await api.post("/sales", {
        product: picked,
        quantity: qty,
        payment: pay,
        customer_id: pay === "credit" ? Number(customerId) || null : null,
        price: price !== "" ? Number(price) : null,
      });
      toast(fill(t.soldDone, { qty: result.quantity, name: result.product, left: result.stock_left }));
      if (result.warning) toast(t.shortWarn, "warn");
      setPicked(null);
      setQty(1);
      setPay("cash");
      setCustomerId("");
      setPrice("");
      bump();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const needsCustomer = pay === "credit" && !customerId;

  return (
    <Page title={t.sellTitle}>
      {!item ? (
        <>
          <input className="search" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="product-grid">
            {shown.map((i) => (
              <button key={i.product} className={`product ${i.stock <= 0 ? "empty" : ""}`} onClick={() => choose(i.product)}>
                <span className="emoji">{emojiFor(i.product)}</span>
                <b>{i.product}</b>
                <small>{i.stock} {t.units}</small>
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="muted center pad">{t.noItems}</p>}
        </>
      ) : (
        <div className="card">
          <div className="picked">
            <span className="emoji big">{emojiFor(item.product)}</span>
            <div className="grow"><h2>{item.product}</h2><small className="muted">{item.stock} {t.units}</small></div>
            <button className="btn small" onClick={() => setPicked(null)}>{t.back}</button>
          </div>

          <Field label={t.howMany}><Stepper value={qty} onChange={setQty} /></Field>

          <div className="field">
            <span>{t.pay}</span>
            <div className="chips">
              {[["cash", t.cash], ["upi", t.upi], ["credit", t.udhar]].map(([key, label]) => (
                <button key={key} type="button" className={`chip ${pay === key ? "on" : ""}`} onClick={() => setPay(key)}>{label}</button>
              ))}
            </div>
          </div>

          {pay === "credit" && (
            customers.length ? (
              <Field label={t.pickCustomer}>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">—</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            ) : (
              <p className="muted">{t.noCustomers} <button className="link-btn" onClick={() => go("khata")}>{t.navKhata} →</button></p>
            )
          )}

          <Field label={t.priceEach}>
            <input type="number" inputMode="decimal" min="0" placeholder={String(item.sell_price || 0)} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>

          <div className="total-line"><span>{t.total}</span><b>{rupees(unitPrice * qty)}</b></div>
          <button className="btn primary big" disabled={busy || needsCustomer || (pay === "credit" && unitPrice <= 0)} onClick={save}>
            ✓ {t.saveSale}
          </button>
        </div>
      )}

      <h2 className="section">{t.recentSales}</h2>
      <div className="card list">
        {(sales.data?.sales || []).length === 0 && <p className="muted center">{t.noSales}</p>}
        {(sales.data?.sales || []).map((s) => (
          <div className="row" key={s.id}>
            <span className="emoji">{emojiFor(s.product)}</span>
            <span className="grow"><b>{s.product}</b><small>{s.sale_date} · {s.payment === "credit" ? `${t.udhar}${s.customer ? ` (${s.customer})` : ""}` : s.payment === "upi" ? t.upi : t.cash}</small></span>
            <span className="right"><b>× {s.quantity}</b>{s.amount > 0 && <small>{rupees(s.amount)}</small>}</span>
          </div>
        ))}
      </div>
    </Page>
  );
}
