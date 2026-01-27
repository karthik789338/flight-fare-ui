import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function quarterFromISODate(iso) {
  const m = new Date(iso).getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}
function formatMoney(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(x);
}
function futureISO(daysFromTomorrow = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + daysFromTomorrow);
  return toISODate(d);
}

// simple normalize for search
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s/(),.-]/g, "")
    .trim();
}

// score: earlier match + shorter city strings first
function rankCities(cities, query, limit = 8) {
  const q = norm(query);
  if (!q) return [];

  const out = [];
  for (const city of cities) {
    const c = norm(city);
    const idx = c.indexOf(q);
    if (idx !== -1) {
      out.push({ city, idx, len: city.length });
    }
  }
  out.sort((a, b) => a.idx - b.idx || a.len - b.len || a.city.localeCompare(b.city));
  return out.slice(0, limit).map((x) => x.city);
}

function CityAutocomplete({
  label,
  value,
  onChange,
  onPick,
  placeholder,
  disabled,
  cities,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);

  const matches = useMemo(() => rankCities(cities, value, 8), [cities, value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    // reset selection when list changes
    setActive(matches.length ? 0 : -1);
  }, [value]); // keep it simple

  function pickCity(city) {
    onPick(city);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((p) => {
        const next = p + 1;
        return next >= matches.length ? 0 : next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((p) => {
        const next = p - 1;
        return next < 0 ? matches.length - 1 : next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (active >= 0 && matches[active]) {
        e.preventDefault();
        pickCity(matches[active]);
      }
    }
  }

  return (
    <div className="field big" ref={wrapRef}>
      <label>{label}</label>

      <div className="autoWrap">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />

        {open && matches.length > 0 && (
          <div className="autoMenu">
            {matches.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`autoItem ${i === active ? "active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  // prevent input blur before click
                  e.preventDefault();
                  pickCity(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const minDate = useMemo(() => futureISO(0), []);

  const [meta, setMeta] = useState({ cities: [], quarters: [1, 2, 3, 4] });
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");

  const [form, setForm] = useState({
    city1: "Dallas/Fort Worth, TX",
    city2: "New York City, NY (Metropolitan Area)",
    date: minDate,
  });

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");

  const [activeSuggestionId, setActiveSuggestionId] = useState(null);

  const derivedQuarter = useMemo(() => {
    if (!form.date) return null;
    return quarterFromISODate(form.date);
  }, [form.date]);

  const canSubmit = useMemo(() => {
    return (
      !!API_URL &&
      !!form.city1 &&
      !!form.city2 &&
      !!form.date &&
      new Date(form.date) >= new Date(minDate)
    );
  }, [form, minDate]);

  const suggestions = useMemo(() => {
    return [
      {
        id: "s1",
        label: "Dallas → New York",
        sub: "Popular business route",
        city1: "Dallas/Fort Worth, TX",
        city2: "New York City, NY (Metropolitan Area)",
        date: futureISO(2),
      },
      {
        id: "s2",
        label: "Chicago → Los Angeles",
        sub: "High volume route",
        city1: "Chicago, IL",
        city2: "Los Angeles, CA (Metropolitan Area)",
        date: futureISO(5),
      },
      {
        id: "s3",
        label: "Boston → Washington, DC",
        sub: "Short-haul (often cheaper)",
        city1: "Boston, MA (Metropolitan Area)",
        city2: "Washington, DC (Metropolitan Area)",
        date: futureISO(1),
      },
      {
        id: "s4",
        label: "San Francisco → Seattle",
        sub: "West coast hop",
        city1: "San Francisco, CA (Metropolitan Area)",
        city2: "Seattle, WA",
        date: futureISO(3),
      },
    ];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      setMetaLoading(true);
      setMetaError("");

      try {
        if (!API_URL) throw new Error("VITE_API_URL is missing in .env");

        const res = await fetch(API_URL, { method: "GET" });
        if (!res.ok) throw new Error(`Failed to load cities. HTTP ${res.status}`);
        const data = await res.json();

        if (!cancelled) {
          setMeta({
            cities: Array.isArray(data.cities) ? data.cities : [],
            quarters: Array.isArray(data.quarters) ? data.quarters : [1, 2, 3, 4],
          });
        }
      } catch (e) {
        if (!cancelled) setMetaError(e?.message || "Failed to load meta data");
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  async function predict(payloadOverride = null) {
    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      if (!API_URL) throw new Error("VITE_API_URL is missing in .env");

      const city1 = payloadOverride?.city1 ?? form.city1;
      const city2 = payloadOverride?.city2 ?? form.city2;
      const date = payloadOverride?.date ?? form.date;

      if (!city1 || !city2) throw new Error("Please select both cities.");
      if (city1 === city2) throw new Error("From and To cannot be the same city.");
      if (!date) throw new Error("Please pick a travel date.");
      if (new Date(date) < new Date(minDate)) {
        throw new Error("Please pick a future date (tomorrow onwards).");
      }

      const q = quarterFromISODate(date);

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city1, city2, quarter: q }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API error ${res.status}: ${txt}`);
      }

      const data = await res.json();
      if (typeof data?.prediction !== "number") throw new Error("Unexpected response from API.");

      setPrediction(data.prediction);
    } catch (e) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function swapCities() {
    setPrediction(null);
    setError("");
    setActiveSuggestionId(null);
    setForm((p) => ({ ...p, city1: p.city2, city2: p.city1 }));
  }

  function onPickSuggestion(s) {
    setActiveSuggestionId(s.id);
    setError("");
    setPrediction(null);
    const next = { city1: s.city1, city2: s.city2, date: s.date };
    setForm(next);
    predict(next);
  }

  return (
    <div className="page">
      <div className="bgGlow" />
      <div className="container">
        <header className="hero">
          <div className="heroTop">
            <div className="brandPill">
              <span className="dot" />
              <span>ML Fare Estimator</span>
            </div>
            <div className="rightTag">AWS Lambda</div>
          </div>

          <h1 className="heroTitle">Flight prices, instantly.</h1>
          <p className="heroSub">
            Choose your route and future date. We’ll predict a reasonable fare using historical patterns.
          </p>

          <div className="priceBanner">
            <div className="priceLabel">Estimated fare</div>
            <div className="priceValue">
              {prediction !== null ? formatMoney(prediction) : "—"}
            </div>
            <div className="priceMeta">
              {prediction !== null
                ? `${form.city1} → ${form.city2} • ${form.date} • Q${derivedQuarter}`
                : "Pick a route to see an estimate"}
            </div>
          </div>
        </header>

        <main className="card">
          <div className="formGrid">
            <CityAutocomplete
              label="From"
              value={form.city1}
              disabled={metaLoading}
              cities={meta.cities}
              placeholder="Type a city (ex: Dallas...)"
              onChange={(v) => {
                setPrediction(null);
                setActiveSuggestionId(null);
                setForm((p) => ({ ...p, city1: v }));
              }}
              onPick={(city) => {
                setPrediction(null);
                setActiveSuggestionId(null);
                setForm((p) => ({ ...p, city1: city }));
              }}
            />

            <button className="swapBtn" type="button" onClick={swapCities} title="Swap">
              ⇄
            </button>

            <CityAutocomplete
              label="To"
              value={form.city2}
              disabled={metaLoading}
              cities={meta.cities}
              placeholder="Type a city (ex: New York...)"
              onChange={(v) => {
                setPrediction(null);
                setActiveSuggestionId(null);
                setForm((p) => ({ ...p, city2: v }));
              }}
              onPick={(city) => {
                setPrediction(null);
                setActiveSuggestionId(null);
                setForm((p) => ({ ...p, city2: city }));
              }}
            />

            <div className="field big">
              <label>Travel date</label>
              <input
                type="date"
                value={form.date}
                min={minDate}
                onChange={(e) => {
                  setPrediction(null);
                  setActiveSuggestionId(null);
                  setError("");
                  setForm((p) => ({ ...p, date: e.target.value }));
                }}
              />
              <div className="helper">Future only. We auto-map date → quarter.</div>
            </div>

            <div className="field big">
              <label>Derived quarter</label>
              <div className="pillBig">Q{derivedQuarter}</div>
              <div className="helper">
                Sent to the model as <span className="mono">quarter</span>.
              </div>
            </div>
          </div>

          <section className="suggestSection">
            <div className="suggestTitle">Try a quick route</div>
            <div className="suggestGrid">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`suggestChip ${activeSuggestionId === s.id ? "active" : ""}`}
                  onClick={() => onPickSuggestion(s)}
                >
                  <div className="suggestMain">{s.label}</div>
                  <div className="suggestSub">
                    {s.sub} • {s.date}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {metaError && (
            <div className="alert warn">
              <strong>Couldn’t load city list.</strong> You can still type values manually.
              <div className="small">{metaError}</div>
            </div>
          )}

          {error && (
            <div className="alert err">
              <strong>Request failed:</strong> {error}
            </div>
          )}

          <button className="primaryBtn" type="button" onClick={() => predict()} disabled={!canSubmit || loading}>
            {loading ? (
              <span className="spinnerWrap">
                <span className="spinner" /> Getting estimate...
              </span>
            ) : (
              "Get estimate"
            )}
          </button>

          <div className="footnote">
            We only ask for route + date. The backend fills route-level defaults for other model inputs.
          </div>
        </main>
      </div>
    </div>
  );
}