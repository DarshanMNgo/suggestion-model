// Tiny helper around fetch. Every call returns JSON or throws an Error with a readable message.
export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("OFFLINE");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const detail = data?.detail;
    // FastAPI sends a list for validation errors; show something a person can read.
    const message = Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail;
    throw new Error(message || `Something went wrong (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body = {}) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
};

export const rupees = (value) =>
  "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const EMOJI = [
  ["rice", "🍚"], ["atta", "🌾"], ["wheat", "🌾"], ["milk", "🥛"], ["curd", "🥣"], ["oil", "🫗"],
  ["sugar", "🍬"], ["salt", "🧂"], ["tea", "🍵"], ["coffee", "☕"], ["soap", "🧼"], ["detergent", "🧺"],
  ["biscuit", "🍪"], ["bread", "🍞"], ["egg", "🥚"], ["dal", "🫘"], ["onion", "🧅"], ["potato", "🥔"],
  ["tomato", "🍅"], ["banana", "🍌"], ["water", "💧"], ["juice", "🧃"], ["drink", "🥤"], ["maggi", "🍜"],
  ["noodle", "🍜"], ["sauce", "🌶️"], ["ghee", "🧈"], ["chocolate", "🍫"], ["hair", "💆"],
];

export function emojiFor(name = "") {
  const lower = name.toLowerCase();
  const hit = EMOJI.find(([key]) => lower.includes(key));
  return hit ? hit[1] : "🛍️";
}
