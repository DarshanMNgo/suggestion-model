import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState("");
  const [days, setDays] = useState(7);
  const [stock, setStock] = useState(10);
  const [leadTime, setLeadTime] = useState(2);
  const [safety, setSafety] = useState(5);
  const [forecast, setForecast] = useState(null);
  const [apiReady, setApiReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [healthResponse, productsResponse] = await Promise.all([
          fetch(`${API_BASE}/health`),
          fetch(`${API_BASE}/products`)
        ]);
        if (!healthResponse.ok || !productsResponse.ok) throw new Error("We could not connect to the store forecast. Please check that the app server is running.");
        const health = await healthResponse.json();
        const productData = await productsResponse.json();
        if (!health.model_ready) throw new Error("The forecast is not ready yet. Please ask your app administrator to prepare it.");
        if (!active) return;
        setApiReady(true);
        setProducts(productData.products || []);
        setProduct((current) => current || productData.products?.[0] || "");
      } catch (err) {
        if (!active) return;
        setApiReady(false);
        setError(err.message || "Could not load your store information.");
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  async function getForecast(event) {
    event?.preventDefault();
    if (!product) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        product,
        days: String(days),
        current_stock: String(stock),
        lead_time_days: String(leadTime),
        safety_stock: String(safety)
      });
      const response = await fetch(`${API_BASE}/forecast?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "We couldn't prepare this estimate. Please try again.");
      setForecast(data);
    } catch (err) {
      setError(err.message || "Unable to prepare the estimate.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (apiReady && product) getForecast();
    // Refresh the estimate when the app connects or the selected item changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, product]);

  const maxDemand = useMemo(
    () => Math.max(1, ...(forecast?.daily_forecast || []).map((item) => item.expected_units)),
    [forecast]
  );

  const orderQuantity = forecast?.suggested_order_quantity || 0;

  return (
    <div className="app-shell owner-friendly">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">K</div><div><b>KiranaWise</b><small>YOUR STORE HELPER</small></div></div>
        <div className="side-label">MENU</div>
        <a className="nav-item active" href="#home">⌂ &nbsp; My shop</a>
        <a className="nav-item" href="#order">▣ &nbsp; Buying advice</a>
        <div className="sidebar-bottom">
          <div className="help-card"><span>Small tip</span><p>Enter the stock you can count on your shelf. The app will help estimate what you may need.</p></div>
          <div className="store-profile"><div className="avatar">店</div><div><b>My Shop</b><small>Shop owner</small></div></div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR DAILY SHOP UPDATE</span>
            <h1>Welcome to your shop 👋</h1>
            <p>Let’s see what you may need to buy next.</p>
          </div>
          <div className={`connection-pill ${apiReady ? "online" : "offline"}`}><i />{apiReady ? "Ready to help" : "Connecting…"}</div>
        </header>

        {!apiReady && <div className="notice error"><b>Your shop helper is not connected yet.</b><span>Please keep the app's server running, then refresh this page.</span></div>}
        {error && <div className="notice error"><b>One small issue</b><span>{error}</span></div>}

        <section className="friendly-intro">
          <div><span className="eyebrow">QUICK AND EASY</span><h2>Check what to restock</h2><p>Choose an item, tell us how much is left, and get a simple buying suggestion.</p></div>
          <div className="intro-emoji" aria-hidden="true">🛒</div>
        </section>

        <section className="content-grid friendly-grid" id="order">
          <article className="panel forecast-panel">
            <div className="panel-heading"><div><span className="eyebrow">STEP 1</span><h2>Tell us about an item</h2><p>Just enter what you know. You can change these numbers anytime.</p></div><span className="panel-icon">🧺</span></div>
            <form className="controls friendly-controls" onSubmit={getForecast}>
              <label>Which item do you want to check?
                <select value={product} onChange={(e) => setProduct(e.target.value)}>
                  {products.length === 0 && <option value="">No items available</option>}
                  {products.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>How many are left in your shop?
                <input type="number" min="0" value={stock} onChange={(e) => setStock(Math.max(0, Number(e.target.value)))} />
                <small className="field-help">Count the units or packets you can sell now.</small>
              </label>
              <label>How many days does your supplier take to deliver?
                <input type="number" min="1" max="30" value={leadTime} onChange={(e) => setLeadTime(Math.max(1, Number(e.target.value)))} />
                <small className="field-help">For example: enter 2 if delivery takes two days.</small>
              </label>
              <label>How many extra units do you want to keep?
                <input type="number" min="0" value={safety} onChange={(e) => setSafety(Math.max(0, Number(e.target.value)))} />
                <small className="field-help">This is your backup stock in case more customers buy.</small>
              </label>
              <div className="period-label">How far ahead should we check?</div>
              <div className="period-options">
                {[7, 14, 30].map((n) => <button type="button" key={n} className={days === n ? "period active" : "period"} onClick={() => setDays(n)}>{n} days</button>)}
              </div>
              <button className="primary-button friendly-button" type="submit" disabled={!apiReady || loading || !product}>{loading ? "Checking your item…" : "Show my buying suggestion"} <span>→</span></button>
            </form>
          </article>

          <article className="panel order-panel friendly-order">
            <div className="panel-heading"><div><span className="eyebrow">STEP 2</span><h2>Your buying suggestion</h2><p>A simple estimate to help plan your next purchase.</p></div><span className="panel-icon">📦</span></div>
            {forecast ? <>
              <div className="suggestion-copy">{orderQuantity > 0 ? "You may need to order:" : "Good news! Based on these details, you may not need to order more right now."}</div>
              <div className="order-number"><b>{orderQuantity}</b><span>units</span></div>
              <div className={orderQuantity > 0 ? "advice-tag attention" : "advice-tag good"}>{orderQuantity > 0 ? "Consider restocking" : "Stock may be enough for now"}</div>
              <p className="recommendation">{orderQuantity > 0 ? `For ${forecast.product}, consider ordering around ${orderQuantity} units.` : `Your current ${forecast.product} stock may be enough for the supplier waiting period and extra stock you want to keep.`}</p>
              <div className="calculation">
                <div><span>Expected sales before delivery</span><b>{forecast.lead_time_demand} units</b></div>
                <div><span>Your extra backup stock</span><b>{forecast.safety_stock} units</b></div>
                <div><span>Already in your shop</span><b>{forecast.current_stock} units</b></div>
              </div>
              <p className="simple-note">This is a suggestion, not an order. Please check your shelf and expiry dates before buying.</p>
            </> : <div className="empty-state">Your buying suggestion will appear here. First choose an item and enter the stock you have.</div>}
          </article>
        </section>

        {forecast && <section className="panel daily-panel friendly-daily">
          <div className="panel-heading"><div><span className="eyebrow">SALES ESTIMATE</span><h2>How much may sell each day?</h2><p>Estimated sales for {forecast.product} over the next {forecast.forecast_days} days.</p></div></div>
          <div className="bar-chart" role="img" aria-label="Estimated daily sales">
            {forecast.daily_forecast.map((item) => <div className="bar-column" key={item.date}><b>{item.expected_units}</b><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(5, item.expected_units / maxDemand * 100)}%` }} /></div><small>{new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</small></div>)}
          </div>
          <div className="chart-caption">Total expected sales: <b>{forecast.expected_total_demand} units</b>. These are estimates from the sales records available in the app.</div>
        </section>}

        <footer className="footer-note"><span>ℹ</span> The app gives an estimate using available sales records. Actual sales can change due to festivals, weather, offers and customer demand. Use your shop experience before placing an order.</footer>
      </main>
    </div>
  );
}

export default App;
