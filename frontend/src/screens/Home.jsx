import React from "react";
import { api, emojiFor, rupees } from "../api";
import { fill } from "../i18n";
import { useApp } from "../context";
import { useLoad } from "../hooks";
import { ErrorBox, Loading, Page } from "../ui";

export default function Home() {
  const { t, version, bump, go, toast } = useApp();
  const { data, error, loading } = useLoad("/summary", version);

  if (error) return <Page title={t.appName}><ErrorBox error={error} /></Page>;
  if (loading) return <Page title={t.appName}><Loading /></Page>;

  const c = data.counts;
  const festival = data.upcoming_festival;
  const showFestival = festival && festival.days_away <= 21;

  async function loadSample() {
    try {
      await api.post("/demo/seed");
      toast(t.saved);
      bump();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (c.items === 0) {
    return (
      <Page title={`${t.hello}! 🙏`}>
        <div className="card center">
          <div className="big-emoji">🏪</div>
          <h2>{t.emptyShopTitle}</h2>
          <p className="muted">{t.emptyShopText}</p>
          <div className="stack">
            <button className="btn primary big" onClick={() => go("stock", { add: true })}>{t.addFirst}</button>
            <button className="btn big" onClick={loadSample}>{t.loadSample}</button>
          </div>
        </div>
      </Page>
    );
  }

  const tiles = [
    { key: "buy", n: c.to_buy, icon: "🛒", title: t.buyNow, hint: t.buyNowHint, tone: "bad", to: "buy" },
    { key: "exp", n: c.expiring, icon: "⏳", title: t.expiring, hint: t.expiringHint, tone: "warn", to: "stock", opts: { filter: "expiry" } },
    { key: "low", n: c.low_stock, icon: "📉", title: t.lowStock, hint: t.lowHint, tone: "warn", to: "stock", opts: { filter: "low" } },
    { key: "dead", n: c.dead_stock, icon: "💤", title: t.deadStock, hint: `${rupees(data.money_locked_dead)} · ${t.deadHint}`, tone: "info", to: "stock", opts: { filter: "dead" } },
  ].filter((tile) => tile.n > 0);

  return (
    <Page title={`${t.hello}, ${data.shop_name}`}>
      <div className="stat-row">
        <div className="stat good">
          <small>{t.todaySales}</small>
          <b>{rupees(data.today.total)}</b>
          <span>{data.today.entries} · {t.sellTitle}</span>
        </div>
        <button className="stat link" onClick={() => go("khata")}>
          <small>{t.khataPending}</small>
          <b>{rupees(data.khata_pending)}</b>
          <span>{t.navKhata} →</span>
        </button>
      </div>

      {showFestival && (
        <div className="card festival">
          🎉 {festival.days_away === 0
            ? fill(t.festivalToday, { name: festival.name })
            : fill(t.festivalIn, { name: festival.name, days: festival.days_away })}
        </div>
      )}

      <h2 className="section">{t.attention}</h2>
      {tiles.length === 0 ? (
        <div className="card center">✅ {t.allGood}</div>
      ) : (
        <div className="tile-list">
          {tiles.map((tile) => (
            <button key={tile.key} className={`alert-tile ${tile.tone}`} onClick={() => go(tile.to, tile.opts)}>
              <span className="alert-icon">{tile.icon}</span>
              <span className="alert-text">
                <b>{tile.title}</b>
                <small>{tile.hint}</small>
              </span>
              <span className="alert-count">{tile.n}</span>
            </button>
          ))}
        </div>
      )}

      {data.buy_now.length > 0 && (
        <>
          <h2 className="section">{t.buyNow}</h2>
          <div className="card list">
            {data.buy_now.map((row) => (
              <div className="row" key={row.product}>
                <span className="emoji">{emojiFor(row.product)}</span>
                <span className="grow"><b>{row.product}</b><small>{row.stock} {t.units}</small></span>
                <b>+{row.suggested_qty}</b>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section">{t.quick}</h2>
      <div className="quick-grid">
        <button className="quick" onClick={() => go("sell")}><span>🧾</span>{t.navSell}</button>
        <button className="quick" onClick={() => go("stock", { arrived: true })}><span>📦</span>{t.goodsArrived}</button>
        <button className="quick" onClick={() => go("buy")}><span>🛒</span>{t.navBuy}</button>
        <button className="quick" onClick={() => go("khata")}><span>📒</span>{t.navKhata}</button>
      </div>
      <p className="muted center pad">🎤 {t.askAssistant}</p>
    </Page>
  );
}
