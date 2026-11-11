import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function MetricCard({ label, value, detail, icon }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><Icon>{icon}</Icon></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

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
        if (!healthResponse.ok || !productsResponse.ok) throw new Error("Could not connect to the model API.");
        const health = await healthResponse.json();
        const productData = await productsResponse.json();
        if (!health.model_ready) throw new Error("The model is not trained yet. Run the training command first.");
        if (!active) return;
        setApiReady(true);
        setProducts(productData.products || []);
        setProduct((current) => current || productData.products?.[0] || "");
      } catch (err) {
        if (!active) return;
        setApiReady(false);
        setError(err.message || "Could not connect to the API.");
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
      if (!response.ok) throw new Error(data.detail || "Forecast request failed.");
      setForecast(data);
    } catch (err) {
      setError(err.message || "Unable to load forecast.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (apiReady && product) getForecast();
    // Load a forecast when the API or selected product becomes ready/changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, product]);

  const maxDemand = useMemo(
    () => Math.max(1, ...(forecast?.daily_forecast || []).map((item) => item.expected_units)),
    [forecast]
  );

  const recommendation = forecast?.suggested_order_quantity > 0
    ? `Consider ordering ${forecast.suggested_order_quantity} units of ${forecast.product}.`
    : `Your current stock appears sufficient for the selected supplier lead time and safety stock settings.`;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">K</div><div><b>KiranaWise</b><small>STORE INTELLIGENCE</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <a className="nav-item active" href="#overview"><Icon>▦</Icon> Overview</a>
        <a className="nav-item" href="#forecast"><Icon>↗</Icon> Demand forecast</a>
        <a className="nav-item" href="#inventory"><Icon>▤</Icon> Stock planning</a>
        <div className="sidebar-bottom">
          <div className="help-card"><span>Need a hand?</span><p>Your forecast is an estimate. Check stock and expiry before ordering.</p></div>
          <div className="store-profile"><div className="avatar">KS</div><div><b>My Store</b><small>Owner dashboard</small></div></div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div><span className="eyebrow">STORE OVERVIEW</span><h1>Good day, Store Owner <span>✦</span></h1><p>Here is your demand planning snapshot.</p></div>
          <div className={`connection-pill ${apiReady ? "online" : "offline"}`}><i />{apiReady ? "Model connected" : "Connecting to model"}</div>
        </header>

        {!apiReady && <div className="notice error"><b>Can't reach the forecasting API.</b><span>Keep the backend terminal running at {API_BASE}. Then refresh this page.</span></div>}
        {error && <div className="notice error"><b>Something needs attention</b><span>{error}</span></div>}

        <section className="metric-grid">
          <MetricCard label="Products tracked" value={products.length || "—"} detail="Available in your sales data" icon="▦" />
          <MetricCard label="Forecast period" value={`${days} days`} detail="Expected product demand" icon="◷" />
          <MetricCard label="Selected product" value={product || "—"} detail="Change product below" icon="⌕" />
          <MetricCard label="Forecast model" value={forecast?.model || "—"} detail="Selected after model evaluation" icon="✧" />
        </section>

        <section className="content-grid" id="forecast">
          <article className="panel forecast-panel">
            <div className="panel-heading"><div><span className="eyebrow">DEMAND FORECAST</span><h2>Plan your next order</h2><p>Choose a product and enter the stock you currently have.</p></div><span className="panel-icon">↗</span></div>
            <form className="controls" onSubmit={getForecast}>
              <label>Product
                <select value={product} onChange={(e) => setProduct(e.target.value)}>
                  {products.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div className="input-row">
                <label>Current stock <span>(units)</span><input type="number" min="0" value={stock} onChange={(e) => setStock(Math.max(0, Number(e.target.value)))} /></label>
                <label>Supplier lead time <span>(days)</span><input type="number" min="1" max="30" value={leadTime} onChange={(e) => setLeadTime(Math.max(1, Number(e.target.value)))} /></label>
                <label>Safety stock <span>(units)</span><input type="number" min="0" value={safety} onChange={(e) => setSafety(Math.max(0, Number(e.target.value)))} /></label>
              </div>
              <label>Forecast period
                <div className="period-options">
                  {[7, 14, 30].map((n) => <button type="button" key={n} className={days === n ? "period active" : "period"} onClick={() => setDays(n)}>{n} days</button>)}
                </div>
              </label>
              <button className="primary-button" type="submit" disabled={!apiReady || loading}>{loading ? "Calculating..." : "Generate demand forecast"} <span>→</span></button>
            </form>
            {forecast && <div className="forecast-result">
              <div className="result-heading"><div><span className="eyebrow">EXPECTED DEMAND</span><h3>{forecast.product}</h3></div><div className="total-demand"><b>{forecast.expected_total_demand}</b><small>units in {forecast.forecast_days} days</small></div></div>
              <div className="bar-chart" role="img" aria-label="Expected daily product demand">
                {forecast.daily_forecast.map((item) => <div className="bar-column" key={item.date}><b>{item.expected_units}</b><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(5, item.expected_units / maxDemand * 100)}%` }} /></div><small>{new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</small></div>)}
              </div>
              <div className="chart-caption">Estimated units sold per day · Forecast based on the trained sample model</div>
            </div>}
          </article>

          <article className="panel order-panel" id="inventory">
            <div className="panel-heading"><div><span className="eyebrow">STOCK PLANNING</span><h2>Reorder advice</h2><p>Use this as a planning guide.</p></div><span className="panel-icon">▤</span></div>
            {forecast ? <>
              <div className="order-number"><b>{forecast.suggested_order_quantity}</b><span>units</span></div>
              <div className={forecast.suggested_order_quantity > 0 ? "advice-tag attention" : "advice-tag good"}>{forecast.suggested_order_quantity > 0 ? "Reorder suggested" : "Stock looks sufficient"}</div>
              <p className="recommendation">{recommendation}</p>
              <div className="calculation">
                <div><span>Demand during lead time</span><b>{forecast.lead_time_demand} units</b></div>
                <div><span>Safety stock</span><b>{forecast.safety_stock} units</b></div>
                <div><span>Current stock</span><b>{forecast.current_stock} units</b></div>
                <div className="calculation-total"><span>Suggested order</span><b>{forecast.suggested_order_quantity} units</b></div>
              </div>
            </> : <div className="empty-state">Generate a forecast to see the suggested order quantity.</div>}
          </article>
        </section>

        {forecast && <section className="panel daily-panel">
          <div className="panel-heading"><div><span className="eyebrow">DAY-BY-DAY VIEW</span><h2>Expected sales</h2></div><span className="muted">Forecast for {forecast.product}</span></div>
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Day</th><th>Expected units</th></tr></thead><tbody>
            {forecast.daily_forecast.map((item) => <tr key={item.date}><td>{new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td>{new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" })}</td><td><b>{item.expected_units}</b></td></tr>)}
          </tbody></table></div>
        </section>}

        <footer className="footer-note"><span>✦</span> Predictions are estimates based on available sales history. Verify stock, expiry dates and supplier conditions before placing an order.</footer>
      </main>
    </div>
  );
}

export default App;
