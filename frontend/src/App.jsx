import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "./context";
import { fill, STRINGS } from "./i18n";
import Assistant from "./Assistant.jsx";
import Home from "./screens/Home.jsx";
import Sell from "./screens/Sell.jsx";
import Stock from "./screens/Stock.jsx";
import Buy from "./screens/Buy.jsx";
import Khata from "./screens/Khata.jsx";
import Settings from "./screens/Settings.jsx";

const SCREENS = { home: Home, sell: Sell, stock: Stock, buy: Buy, khata: Khata, settings: Settings };
const TABS = [
  ["home", "🏠", "navHome"],
  ["sell", "🧾", "navSell"],
  ["stock", "📦", "navStock"],
  ["buy", "🛒", "navBuy"],
  ["khata", "📒", "navKhata"],
];

function readStored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback; // storage can be blocked (private mode)
  }
}

export default function App() {
  const [lang, setLangState] = useState(() => readStored("kw_lang", "en"));
  const [screen, setScreen] = useState("home");
  const [nav, setNav] = useState({});
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState([]);
  const nextToast = useRef(1);
  const t = STRINGS[lang] || STRINGS.en;

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem("kw_lang", code); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${t.appName} · ${t.tagline}`;
  }, [lang, t]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const go = useCallback((to, options = {}) => {
    setNav(options);
    setScreen(to);
    window.scrollTo({ top: 0 });
  }, []);

  const toast = useCallback((message, tone = "ok") => {
    const id = nextToast.current++;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo(
    () => ({ t, lang, setLang, version, bump, go, nav, toast, fill }),
    [t, lang, setLang, version, bump, go, nav, toast],
  );

  const Screen = SCREENS[screen] || Home;

  return (
    <AppContext.Provider value={value}>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand" onClick={() => go("home")}>
            <span className="brand-mark">K</span>
            <span><b>{t.appName}</b><small>{t.tagline}</small></span>
          </div>
          {TABS.map(([key, icon, label]) => (
            <button key={key} className={`side-link ${screen === key ? "on" : ""}`} onClick={() => go(key)}>
              <span>{icon}</span>{t[label]}
            </button>
          ))}
          <button className={`side-link bottom ${screen === "settings" ? "on" : ""}`} onClick={() => go("settings")}>
            <span>⚙️</span>{t.navSettings}
          </button>
        </aside>

        <main className="content">
          <button className="gear" onClick={() => go("settings")} aria-label={t.navSettings}>⚙️</button>
          {/* key forces a fresh screen (and fresh form state) when navigating */}
          <Screen key={`${screen}:${JSON.stringify(nav)}`} />
        </main>

        <nav className="tabbar" aria-label="Main">
          {TABS.map(([key, icon, label]) => (
            <button key={key} className={screen === key ? "on" : ""} onClick={() => go(key)}>
              <span>{icon}</span>{t[label]}
            </button>
          ))}
        </nav>

        <Assistant />

        <div className="toasts" aria-live="polite">
          {toasts.map((x) => <div key={x.id} className={`toast ${x.tone}`}>{x.message}</div>)}
        </div>
      </div>
    </AppContext.Provider>
  );
}
