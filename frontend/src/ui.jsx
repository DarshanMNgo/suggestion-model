import React from "react";
import { useApp } from "./context";

export function Loading() {
  const { t } = useApp();
  return <p className="muted center pad">{t.loading}</p>;
}

export function ErrorBox({ error }) {
  const { t, bump } = useApp();
  if (error?.message === "OFFLINE") {
    return (
      <div className="card warn">
        <h3>{t.offlineTitle}</h3>
        <p>{t.offlineHelp}</p>
        <button className="btn" onClick={bump}>{t.retry}</button>
      </div>
    );
  }
  return (
    <div className="card warn">
      <p>{error?.message}</p>
      <button className="btn" onClick={bump}>{t.retry}</button>
    </div>
  );
}

export function Page({ title, action, children }) {
  return (
    <section className="page">
      <header className="page-head">
        <h1>{title}</h1>
        {action}
      </header>
      {children}
    </section>
  );
}

/** A slide-up window used for editing an item or taking a quantity. */
export function Sheet({ title, onClose, children }) {
  const { t } = useApp();
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** Big + / - buttons: much easier than typing on a phone. */
export function Stepper({ value, onChange, min = 1 }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="-">−</button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.floor(Number(e.target.value) || min)))}
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="+">+</button>
    </div>
  );
}

export function Badge({ tone = "info", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
