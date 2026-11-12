import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { LANGUAGES, NO_WORDS, YES_WORDS } from "./i18n";
import { useApp } from "./context";

const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function words(text) {
  return text.toLowerCase().split(/[\s,.!?।]+/).filter(Boolean);
}
const isYes = (text) => {
  const w = words(text);
  return w.length > 0 && w.length <= 4 && w.some((x) => YES_WORDS.includes(x)) && !w.some((x) => NO_WORDS.includes(x));
};
const isNo = (text) => {
  const w = words(text);
  return w.length > 0 && w.length <= 4 && w.some((x) => NO_WORDS.includes(x));
};

/**
 * The floating shop assistant. The owner taps the mic (or types), the server works out
 * what was meant, and anything that changes the shop is shown back with Yes / No first.
 */
export default function Assistant() {
  const { t, lang, bump, toast } = useApp();
  const speechCode = LANGUAGES.find((l) => l.code === lang)?.speech || "en-IN";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [speakOn, setSpeakOn] = useState(() => {
    try { return localStorage.getItem("kw_speak") !== "off"; } catch { return true; }
  });
  const recognizer = useRef(null);
  const bottom = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("kw_speak", speakOn ? "on" : "off"); } catch { /* storage may be blocked */ }
    if (!speakOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [speakOn]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, pending]);

  useEffect(() => () => {
    recognizer.current?.abort?.();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const say = useCallback((text) => {
    if (!speakOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechCode;
    window.speechSynthesis.speak(utterance);
  }, [speakOn, speechCode]);

  const addMessage = (from, text) => setMessages((list) => [...list, { from, text }]);

  async function confirm(action) {
    setBusy(true);
    setPending(null);
    try {
      const result = await api.post("/assistant/confirm", { action, lang });
      addMessage("bot", result.reply);
      say(result.reply);
      if (result.ok) bump();
    } catch (err) {
      addMessage("bot", err.message === "OFFLINE" ? t.offlineTitle : err.message);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setPending(null);
    const text = lang === "hi" ? "ठीक है, रद्द किया।" : lang === "kn" ? "ಸರಿ, ರದ್ದು ಮಾಡಿದೆ." : "Okay, cancelled.";
    addMessage("bot", text);
    say(text);
  }

  async function send(raw) {
    const text = raw.trim();
    if (!text || busy) return;
    addMessage("you", text);
    setInput("");
    if (pending && isYes(text)) return confirm(pending);
    if (pending && isNo(text)) return cancel();
    setPending(null);
    setBusy(true);
    try {
      const result = await api.post("/assistant", { text, lang });
      addMessage("bot", result.reply);
      say(result.reply);
      if (result.needs_confirm && result.action) setPending(result.action);
    } catch (err) {
      addMessage("bot", err.message === "OFFLINE" ? t.offlineTitle : err.message);
    } finally {
      setBusy(false);
    }
  }

  function listen() {
    if (!Recognition) {
      toast(t.noMic, "warn");
      return;
    }
    if (listening) {
      recognizer.current?.stop();
      return;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const rec = new Recognition();
    rec.lang = speechCode;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let heard = false;
    rec.onresult = (event) => {
      heard = true;
      send(event.results[0][0].transcript);
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") toast(t.micDenied, "error");
    };
    rec.onend = () => {
      setListening(false);
      if (!heard) toast(t.didNotHear, "warn");
    };
    recognizer.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  const examples = [t.ex1, t.ex2, t.ex3, t.ex4, t.ex5];

  return (
    <>
      <button className={`fab ${listening ? "live" : ""}`} onClick={() => setOpen(true)} aria-label={t.assistant}>🎤</button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div className="sheet assistant" role="dialog" aria-modal="true" aria-label={t.assistant} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>✦ {t.assistant}</h2>
              <label className="switch">
                <input type="checkbox" checked={speakOn} onChange={(e) => setSpeakOn(e.target.checked)} />
                <span>🔊 {t.speakReplies}</span>
              </label>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t.close}>✕</button>
            </div>

            <div className="chat">
              {messages.length === 0 && (
                <div className="examples">
                  <p className="muted">{t.examples}:</p>
                  {examples.map((text) => (
                    <button key={text} className="chip" onClick={() => send(text.replace(/"/g, ""))}>{text}</button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => <div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}
              {pending && (
                <div className="confirm-row">
                  <button className="btn primary big" disabled={busy} onClick={() => confirm(pending)}>✓ {t.yes}</button>
                  <button className="btn big" disabled={busy} onClick={cancel}>✕ {t.no}</button>
                </div>
              )}
              <div ref={bottom} />
            </div>

            <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
              <button type="button" className={`mic ${listening ? "live" : ""}`} onClick={listen} aria-label={t.tapToSpeak}>
                {listening ? "■" : "🎤"}
              </button>
              <input
                value={input}
                placeholder={listening ? t.listening : t.typeHere}
                onChange={(e) => setInput(e.target.value)}
                aria-label={t.typeHere}
              />
              <button className="btn primary" disabled={busy || !input.trim()}>{t.send}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
