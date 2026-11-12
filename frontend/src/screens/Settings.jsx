import React, { useEffect, useState } from "react";
import { api } from "../api";
import { LANGUAGES } from "../i18n";
import { useApp } from "../context";
import { useLoad } from "../hooks";
import { ErrorBox, Field, Loading, Page } from "../ui";

export default function Settings() {
  const { t, lang, setLang, version, bump, toast } = useApp();
  const { data, error, loading } = useLoad("/settings", version);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (error) return <Page title={t.settingsTitle}><ErrorBox error={error} /></Page>;
  if (loading || !form) return <Page title={t.settingsTitle}><Loading /></Page>;

  async function save(e) {
    e.preventDefault();
    try {
      await api.put("/settings", {
        shop_name: form.shop_name,
        weekly_budget: Number(form.weekly_budget) || 0,
        cover_days: Math.max(1, Number(form.cover_days) || 7),
        lead_time_days: Math.max(1, Number(form.lead_time_days) || 2),
        language: lang,
      });
      toast(t.saved);
      bump();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function resetSample() {
    if (!window.confirm(t.resetWarn)) return;
    try {
      await api.post("/demo/seed?reset=true");
      toast(t.saved);
      bump();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <Page title={t.settingsTitle}>
      <div className="card">
        <div className="field">
          <span>{t.language}</span>
          <div className="chips">
            {LANGUAGES.map((l) => (
              <button key={l.code} type="button" className={`chip ${lang === l.code ? "on" : ""}`} onClick={() => setLang(l.code)}>{l.label}</button>
            ))}
          </div>
        </div>
      </div>

      <form className="card form" onSubmit={save}>
        <Field label={t.shopName}><input value={form.shop_name} onChange={set("shop_name")} /></Field>
        <Field label={t.weeklyBudget}><input type="number" inputMode="numeric" min="0" value={form.weekly_budget} onChange={set("weekly_budget")} /></Field>
        <div className="two">
          <Field label={t.coverDays}><input type="number" inputMode="numeric" min="1" value={form.cover_days} onChange={set("cover_days")} /></Field>
          <Field label={t.leadTime}><input type="number" inputMode="numeric" min="1" value={form.lead_time_days} onChange={set("lead_time_days")} /></Field>
        </div>
        <button className="btn primary big">{t.save}</button>
      </form>

      <div className="card">
        <h3>{t.sampleTitle}</h3>
        <p className="muted">{t.sampleText}</p>
        <button className="btn danger" onClick={resetSample}>{t.resetSample}</button>
      </div>
      <p className="muted center pad">{t.about}</p>
    </Page>
  );
}
