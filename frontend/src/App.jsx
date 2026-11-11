import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PRODUCT_PICTURES = [
  ["rice", "🍚"], ["atta", "🌾"], ["wheat", "🌾"], ["milk", "🥛"],
  ["oil", "🫗"], ["sugar", "🧂"], ["salt", "🧂"], ["tea", "🍵"],
  ["coffee", "☕"], ["soap", "🧼"], ["biscuit", "🍪"], ["bread", "🍞"],
  ["egg", "🥚"], ["egg", "🥚"], ["dal", "🫘"], ["pulse", "🫘"],
  ["onion", "🧅"], ["potato", "🥔"], ["tomato", "🍅"], ["banana", "🍌"],
  ["apple", "🍎"], ["water", "💧"], ["juice", "🧃"], ["default", "🛍️"]
];
function productEmoji(name = "") {
  const match = PRODUCT_PICTURES.find(([key]) => key !== "default" && name.toLowerCase().includes(key));
  return match ? match[1] : "🛍️";
}

const WORDS = {
  en: {
    menu:"MENU", shop:"My shop", stock:"Stock & alerts", sales:"Daily sales",
    welcome:"Welcome to your shop", subtitle:"A simple view of what is selling and what may need restocking.",
    connected:"Ready to help", connecting:"Connecting…", restock:"Items to check",
    products:"Products in your shop", salesToday:"Sales entries", low:"Low-stock items",
    inventoryTitle:"Your shop stock", inventorySub:"Update the quantity you can count on your shelves.",
    item:"Choose an item", quantity:"Quantity available", lowThreshold:"Show an alert when stock reaches",
    saveStock:"Save stock", salesTitle:"Record today's sales", salesSub:"Enter what you sold. The app will reduce that quantity from your stock.",
    sold:"How many did you sell?", saveSale:"Save sale", recent:"Recent sales",
    alertTitle:"Please check these items", noAlerts:"No low-stock items right now.",
    forecastTitle:"Buying suggestion", forecastSub:"Choose an item to see what you may need to buy.",
    lead:"Supplier delivery time (days)", backup:"Extra stock to keep", horizon:"Look ahead",
    showAdvice:"Show buying suggestion", expected:"Expected sales", order:"Consider buying",
    enough:"Your stock may be enough for now", units:"units", beforeDelivery:"Expected sales before delivery",
    current:"Stock in your shop", extra:"Extra stock you want to keep", estimate:"This is an estimate. Check your shelf and expiry dates before buying.",
    language:"ಕನ್ನಡ", noProducts:"No products found", saved:"Saved successfully", loading:"Loading your shop…",
    today:"Today", date:"Sale date", picture:"Product", action:"Action", stockStatus:"Available",
    restockBadge:"Low stock", okay:"Stock available", refresh:"Refresh",
    quickTip:"Tip: Record sales each day and update stock after receiving new goods.",
  },
  kn: {
    menu:"ಮೆನು", shop:"ನನ್ನ ಅಂಗಡಿ", stock:"ಸ್ಟಾಕ್ ಮತ್ತು ಎಚ್ಚರಿಕೆ", sales:"ದೈನಂದಿನ ಮಾರಾಟ",
    welcome:"ನಿಮ್ಮ ಅಂಗಡಿಗೆ ಸ್ವಾಗತ", subtitle:"ಯಾವ ವಸ್ತುಗಳು ಮಾರಾಟವಾಗುತ್ತಿವೆ ಮತ್ತು ಯಾವುದನ್ನು ಮತ್ತೆ ತರಬೇಕು ಎಂಬ ಸರಳ ಮಾಹಿತಿ.",
    connected:"ಸಹಾಯಕ್ಕೆ ಸಿದ್ಧ", connecting:"ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ…", restock:"ಪರಿಶೀಲಿಸಬೇಕಾದ ವಸ್ತುಗಳು",
    products:"ಅಂಗಡಿಯಲ್ಲಿರುವ ವಸ್ತುಗಳು", salesToday:"ಮಾರಾಟ ದಾಖಲೆಗಳು", low:"ಕಡಿಮೆ ಸ್ಟಾಕ್",
    inventoryTitle:"ನಿಮ್ಮ ಅಂಗಡಿಯ ಸ್ಟಾಕ್", inventorySub:"ಶೆಲ್ಫ್‌ನಲ್ಲಿ ಇರುವ ವಸ್ತುಗಳ ಸಂಖ್ಯೆಯನ್ನು ದಾಖಲಿಸಿ.",
    item:"ವಸ್ತುವನ್ನು ಆಯ್ಕೆಮಾಡಿ", quantity:"ಈಗ ಲಭ್ಯವಿರುವ ಪ್ರಮಾಣ", lowThreshold:"ಈ ಪ್ರಮಾಣಕ್ಕೆ ಬಂದಾಗ ಎಚ್ಚರಿಸಿ",
    saveStock:"ಸ್ಟಾಕ್ ಉಳಿಸಿ", salesTitle:"ಇಂದಿನ ಮಾರಾಟ ದಾಖಲಿಸಿ", salesSub:"ಮಾರಾಟವಾದ ಪ್ರಮಾಣ ನಮೂದಿಸಿ. ಆ ಪ್ರಮಾಣ ಸ್ಟಾಕ್‌ನಿಂದ ಕಡಿಮೆಯಾಗುತ್ತದೆ.",
    sold:"ಎಷ್ಟು ಮಾರಾಟವಾಯಿತು?", saveSale:"ಮಾರಾಟ ಉಳಿಸಿ", recent:"ಇತ್ತೀಚಿನ ಮಾರಾಟ",
    alertTitle:"ಈ ವಸ್ತುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ", noAlerts:"ಈಗ ಕಡಿಮೆ ಸ್ಟಾಕ್ ಇರುವ ವಸ್ತುಗಳಿಲ್ಲ.",
    forecastTitle:"ಖರೀದಿ ಸಲಹೆ", forecastSub:"ನೀವು ಖರೀದಿಸಬೇಕಾದ ಪ್ರಮಾಣವನ್ನು ತಿಳಿಯಲು ವಸ್ತುವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    lead:"ಸರಬರಾಜುದಾರರಿಂದ ಬರಲು ಬೇಕಾದ ದಿನಗಳು", backup:"ಹೆಚ್ಚುವರಿಯಾಗಿ ಇಡಬೇಕಾದ ಸ್ಟಾಕ್", horizon:"ಮುಂದಿನ ಅವಧಿ",
    showAdvice:"ಖರೀದಿ ಸಲಹೆ ತೋರಿಸಿ", expected:"ಅಂದಾಜು ಮಾರಾಟ", order:"ಖರೀದಿಸಲು ಪರಿಗಣಿಸಿ",
    enough:"ಈಗಿರುವ ಸ್ಟಾಕ್ ಸಾಕಾಗಬಹುದು", units:"ಘಟಕಗಳು", beforeDelivery:"ಸರಕು ಬರುವ ಮೊದಲು ಅಂದಾಜು ಮಾರಾಟ",
    current:"ಅಂಗಡಿಯಲ್ಲಿರುವ ಸ್ಟಾಕ್", extra:"ನೀವು ಇಡಲು ಬಯಸುವ ಹೆಚ್ಚುವರಿ ಸ್ಟಾಕ್", estimate:"ಇದು ಅಂದಾಜು ಮಾತ್ರ. ಖರೀದಿಸುವ ಮೊದಲು ಸ್ಟಾಕ್ ಮತ್ತು ಅವಧಿ ಮುಗಿಯುವ ದಿನಾಂಕ ಪರಿಶೀಲಿಸಿ.",
    language:"English", noProducts:"ವಸ್ತುಗಳು ಕಂಡುಬಂದಿಲ್ಲ", saved:"ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ", loading:"ಅಂಗಡಿ ಮಾಹಿತಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    today:"ಇಂದು", date:"ಮಾರಾಟದ ದಿನಾಂಕ", picture:"ವಸ್ತು", action:"ಕ್ರಿಯೆ", stockStatus:"ಲಭ್ಯವಿದೆ",
    restockBadge:"ಸ್ಟಾಕ್ ಕಡಿಮೆ", okay:"ಸ್ಟಾಕ್ ಲಭ್ಯವಿದೆ", refresh:"ಮತ್ತೆ ಲೋಡ್ ಮಾಡಿ",
    quickTip:"ಸಲಹೆ: ಪ್ರತಿದಿನ ಮಾರಾಟ ದಾಖಲಿಸಿ ಮತ್ತು ಹೊಸ ಸರಕು ಬಂದಾಗ ಸ್ಟಾಕ್ ನವೀಕರಿಸಿ.",
  }
};

export default function App() {
  const [lang, setLang] = useState("en");
  const t = WORDS[lang];
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [product, setProduct] = useState("");
  const [stock, setStock] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [saleQty, setSaleQty] = useState(1);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0,10));
  const [leadTime, setLeadTime] = useState(2);
  const [safety, setSafety] = useState(5);
  const [days, setDays] = useState(7);
  const [forecast, setForecast] = useState(null);
  const [apiReady, setApiReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const refreshData = useCallback(async () => {
    const [healthRes, productsRes, inventoryRes, salesRes] = await Promise.all([
      fetch(`${API_BASE}/health`), fetch(`${API_BASE}/products`),
      fetch(`${API_BASE}/inventory`), fetch(`${API_BASE}/sales?limit=12`)
    ]);
    if (![healthRes, productsRes, inventoryRes, salesRes].every(r => r.ok)) throw new Error("Could not load shop data. Check that the backend is running.");
    const health = await healthRes.json();
    const p = await productsRes.json();
    const inv = await inventoryRes.json();
    const s = await salesRes.json();
    setApiReady(!!health.model_ready);
    setProducts(p.products || []);
    setInventory(inv.items || []);
    setRecentSales(s.sales || []);
    setProduct(current => current || p.products?.[0] || "");
  }, []);

  useEffect(() => {
    refreshData().catch(err => { setApiReady(false); setNotice(err.message); });
  }, [refreshData]);

  const selectedInventory = inventory.find(x => x.product === product);
  useEffect(() => {
    if (selectedInventory) {
      setStock(selectedInventory.stock);
      setThreshold(selectedInventory.low_stock_threshold);
    }
  }, [selectedInventory?.product, selectedInventory?.stock, selectedInventory?.low_stock_threshold]);

  const lowStockItems = inventory.filter(x => x.stock <= x.low_stock_threshold);
  const todaySalesCount = recentSales.filter(s => s.sale_date === new Date().toISOString().slice(0,10)).length;
  const maxDemand = useMemo(() => Math.max(1, ...(forecast?.daily_forecast || []).map(x => x.expected_units)), [forecast]);

  async function saveInventory(e) {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
      const res = await fetch(`${API_BASE}/inventory`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({product, stock:Number(stock), low_stock_threshold:Number(threshold)})});
      const data = await res.json(); if (!res.ok) throw new Error(data.detail || "Could not save stock.");
      await refreshData(); setNotice(t.saved);
    } catch(err) { setNotice(err.message); } finally { setBusy(false); }
  }

  async function saveSale(e) {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
      const res = await fetch(`${API_BASE}/sales`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({product, quantity:Number(saleQty), sale_date:saleDate})});
      const data = await res.json(); if (!res.ok) throw new Error(data.detail || "Could not save sale.");
      await refreshData(); setNotice(lang === "kn" ? "ಮಾರಾಟ ಉಳಿಸಲಾಗಿದೆ ಮತ್ತು ಸ್ಟಾಕ್ ಕಡಿಮೆಯಾಗಿದೆ." : "Sale saved and stock reduced.");
    } catch(err) { setNotice(err.message); } finally { setBusy(false); }
  }

  async function getForecast(e) {
    e?.preventDefault(); if (!product) return;
    setBusy(true); setNotice("");
    try {
      const params = new URLSearchParams({product, days:String(days), current_stock:String(stock), lead_time_days:String(leadTime), safety_stock:String(safety)});
      const res = await fetch(`${API_BASE}/forecast?${params.toString()}`);
      const data = await res.json(); if (!res.ok) throw new Error(data.detail || "Could not prepare buying suggestion.");
      setForecast(data);
    } catch(err) { setNotice(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="app-shell owner-friendly">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">K</div><div><b>KiranaWise</b><small>YOUR SHOP HELPER</small></div></div>
        <div className="side-label">{t.menu}</div>
        <a className="nav-item active" href="#home">⌂ &nbsp; {t.shop}</a>
        <a className="nav-item" href="#stock">▣ &nbsp; {t.stock}</a>
        <a className="nav-item" href="#sales">🧾 &nbsp; {t.sales}</a>
        <div className="sidebar-bottom">
          <div className="help-card"><span>{lang === "kn" ? "ಸಣ್ಣ ಸಲಹೆ" : "A small tip"}</span><p>{t.quickTip}</p></div>
          <div className="store-profile"><div className="avatar">KS</div><div><b>{lang === "kn" ? "ನನ್ನ ಅಂಗಡಿ" : "My shop"}</b><small>{lang === "kn" ? "ಅಂಗಡಿ ಮಾಲೀಕ" : "Shop owner"}</small></div></div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar owner-topbar">
          <div><span className="eyebrow">{lang === "kn" ? "ನಿಮ್ಮ ಅಂಗಡಿಯ ದೈನಂದಿನ ಮಾಹಿತಿ" : "YOUR DAILY SHOP UPDATE"}</span><h1>{t.welcome} 👋</h1><p>{t.subtitle}</p></div>
          <div className="header-actions">
            <button className="language-button" onClick={() => setLang(lang === "en" ? "kn" : "en")}>{lang === "en" ? "ಕನ್ನಡ" : "English"}</button>
            <div className={`connection-pill ${apiReady ? "online" : "offline"}`}><i />{apiReady ? t.connected : t.connecting}</div>
          </div>
        </header>

        {notice && <div className="notice error"><b>{notice}</b></div>}
        {!apiReady && <div className="notice error"><b>{lang === "kn" ? "ಸರ್ವರ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ." : "Your shop helper is not connected."}</b><span>{lang === "kn" ? "ಬ್ಯಾಕೆಂಡ್ ಸರ್ವರ್ ಚಾಲನೆಯಲ್ಲಿದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ." : "Please keep the backend server running and refresh this page."}</span></div>}

        <section className="friendly-intro">
          <div><span className="eyebrow">{lang === "kn" ? "ಒಂದೇ ನೋಟದಲ್ಲಿ" : "AT A GLANCE"}</span><h2>{t.restock}</h2><p>{lowStockItems.length} {lang === "kn" ? "ವಸ್ತುಗಳಿಗೆ ಗಮನ ಬೇಕು. ಕೆಳಗೆ ಪರಿಶೀಲಿಸಿ." : "items need your attention. Check the list below."}</p></div><div className="intro-emoji">🛒</div>
        </section>

        <section className="metric-grid friendly-metrics">
          <article className="metric-card"><div className="metric-top">{t.products}<span>🧺</span></div><strong>{products.length}</strong><small>{lang === "kn" ? "ಮಾದರಿಯಲ್ಲಿ ಲಭ್ಯವಿರುವ ವಸ್ತುಗಳು" : "Items available in the product list"}</small></article>
          <article className="metric-card"><div className="metric-top">{t.salesToday}<span>🧾</span></div><strong>{todaySalesCount}</strong><small>{lang === "kn" ? "ಇಂದು ದಾಖಲಿಸಿದ ಮಾರಾಟಗಳು" : "Sales records entered today"}</small></article>
          <article className="metric-card"><div className="metric-top">{t.low}<span>⚠️</span></div><strong>{lowStockItems.length}</strong><small>{lang === "kn" ? "ಮತ್ತೆ ಪರಿಶೀಲಿಸಿ" : "Check these items"}</small></article>
        </section>

        <section className="panel" id="stock">
          <div className="panel-heading"><div><span className="eyebrow">01 · {t.stock.toUpperCase()}</span><h2>{t.inventoryTitle}</h2><p>{t.inventorySub}</p></div><span className="panel-icon">📦</span></div>
          <div className="product-strip">
            {products.map(name => <button type="button" key={name} className={product === name ? "product-tile selected" : "product-tile"} onClick={() => setProduct(name)}><span className="product-picture">{productEmoji(name)}</span><b>{name}</b><small>{inventory.find(x => x.product === name)?.stock ?? 0} {t.units}</small></button>)}
          </div>
          <form className="owner-form" onSubmit={saveInventory}>
            <label>{t.item}<select value={product} onChange={e => setProduct(e.target.value)}>{products.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
            <label>{t.quantity}<input type="number" min="0" value={stock} onChange={e => setStock(Math.max(0, Number(e.target.value)))}/></label>
            <label>{t.lowThreshold}<input type="number" min="0" value={threshold} onChange={e => setThreshold(Math.max(0, Number(e.target.value)))}/></label>
            <button className="primary-button" disabled={!apiReady || busy || !product}>{t.saveStock} →</button>
          </form>
        </section>

        <section className="panel alert-panel">
          <div className="panel-heading"><div><span className="eyebrow">02 · {t.restock.toUpperCase()}</span><h2>{t.alertTitle}</h2></div><span className="panel-icon">🔔</span></div>
          {lowStockItems.length ? <div className="alert-list">{lowStockItems.map(item => <div className="alert-row" key={item.product}><span className="alert-picture">{productEmoji(item.product)}</span><div><b>{item.product}</b><small>{item.stock} {t.units} · {lang === "kn" ? "ಎಚ್ಚರಿಕೆ ಮಿತಿ" : "Alert at"} {item.low_stock_threshold}</small></div><span className="advice-tag attention">{t.restockBadge}</span></div>)}</div> : <p className="empty-state">{t.noAlerts}</p>}
        </section>

        <section className="content-grid friendly-grid">
          <article className="panel" id="sales">
            <div className="panel-heading"><div><span className="eyebrow">03 · {t.sales.toUpperCase()}</span><h2>{t.salesTitle}</h2><p>{t.salesSub}</p></div><span className="panel-icon">🧾</span></div>
            <form className="owner-form one-column" onSubmit={saveSale}>
              <label>{t.item}<select value={product} onChange={e => setProduct(e.target.value)}>{products.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
              <label>{t.sold}<input type="number" min="1" value={saleQty} onChange={e => setSaleQty(Math.max(1, Number(e.target.value)))}/></label>
              <label>{t.date}<input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)}/></label>
              <button className="primary-button" disabled={!apiReady || busy || !product}>{t.saveSale} →</button>
            </form>
            <div className="recent-sales"><h3>{t.recent}</h3>{recentSales.length ? recentSales.slice(0,5).map(s => <div className="recent-row" key={s.id}><span>{productEmoji(s.product)} {s.product}</span><b>{s.quantity} {t.units}</b><small>{s.sale_date}</small></div>) : <p className="empty-state">{lang === "kn" ? "ಇನ್ನೂ ಮಾರಾಟ ದಾಖಲಾಗಿಲ್ಲ." : "No sales recorded yet."}</p>}</div>
          </article>

          <article className="panel">
            <div className="panel-heading"><div><span className="eyebrow">04 · {t.forecastTitle.toUpperCase()}</span><h2>{t.forecastTitle}</h2><p>{t.forecastSub}</p></div><span className="panel-icon">💡</span></div>
            <form className="owner-form one-column" onSubmit={getForecast}>
              <label>{t.item}<select value={product} onChange={e => setProduct(e.target.value)}>{products.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
              <label>{t.lead}<input type="number" min="1" max="30" value={leadTime} onChange={e => setLeadTime(Math.max(1, Number(e.target.value)))}/></label>
              <label>{t.backup}<input type="number" min="0" value={safety} onChange={e => setSafety(Math.max(0, Number(e.target.value)))}/></label>
              <label>{t.horizon}<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></label>
              <button className="primary-button" disabled={!apiReady || busy || !product}>{t.showAdvice} →</button>
            </form>
            {forecast && <div className="forecast-summary"><div className="eyebrow">{forecast.product}</div><h3>{forecast.suggested_order_quantity > 0 ? t.order : t.enough}</h3><div className="order-number"><b>{forecast.suggested_order_quantity}</b><span>{t.units}</span></div><p>{t.beforeDelivery}: <b>{forecast.lead_time_demand}</b> {t.units}</p><p>{t.current}: <b>{forecast.current_stock}</b> · {t.extra}: <b>{forecast.safety_stock}</b></p><small>{t.estimate}</small></div>}
          </article>
        </section>

        {forecast && <section className="panel friendly-daily"><div className="panel-heading"><div><span className="eyebrow">{t.expected.toUpperCase()}</span><h2>{forecast.product} · {forecast.expected_total_demand} {t.units}</h2></div></div><div className="bar-chart">{forecast.daily_forecast.map(item => <div className="bar-column" key={item.date}><b>{item.expected_units}</b><div className="bar-track"><div className="bar-fill" style={{height:`${Math.max(5,item.expected_units/maxDemand*100)}%`}}/></div><small>{new Date(item.date+"T00:00:00").toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN",{day:"2-digit",month:"short"})}</small></div>)}</div></section>}

        <footer className="footer-note">ℹ️ {t.estimate} {lang === "kn" ? "ದಾಖಲಿಸಿದ ಮಾರಾಟಗಳು ಪ್ರತ್ಯೇಕವಾಗಿ ಉಳಿಯುತ್ತವೆ; ಈ ಮಾದರಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮರುತರಬೇತಿ ಆಗುವುದಿಲ್ಲ." : "Recorded sales are saved separately; they do not automatically retrain the forecasting model."}</footer>

      <div
        className="floating-assistant-icon"
        role="img"
        aria-label={lang === "kn" ? "AI ಸಹಾಯಕ ಶೀಘ್ರದಲ್ಲೇ" : "AI assistant coming soon"}
        title={lang === "kn" ? "AI ಸಹಾಯಕ — ಶೀಘ್ರದಲ್ಲೇ" : "AI assistant — coming soon"}
      >
        ✦
      </div>
      </main>
    </div>
  );
}
