import { useState, useEffect, useCallback } from "react";

const CLIENT_ID = "872324162882-nsn0o9lmv770lm61ijul6conkeuqp1pt.apps.googleusercontent.com";
const SHEET_ID = "18qPN8GXUvlJvW2STFFnj6vmKxPgD8vuqjtish7CdTQw";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";
const RANGE = "Subscriptions!A2:F";

const CATEGORIES = ["Entertainment", "Productivity", "Health", "Finance", "Education", "Shopping", "Other"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];
const BILLING_CYCLES = ["Monthly", "Yearly", "Weekly", "Quarterly"];

const CATEGORY_COLORS = {
  Entertainment: "#f43f5e",
  Productivity: "#6366f1",
  Health: "#10b981",
  Finance: "#f59e0b",
  Education: "#3b82f6",
  Shopping: "#ec4899",
  Other: "#8b5cf6",
};

const CATEGORY_ICONS = {
  Entertainment: "🎬",
  Productivity: "⚡",
  Health: "💚",
  Finance: "💰",
  Education: "📚",
  Shopping: "🛍️",
  Other: "📦",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #12121a;
    --surface2: #1a1a26;
    --border: #ffffff0f;
    --accent: #7c3aed;
    --accent2: #06b6d4;
    --text: #f1f0ff;
    --muted: #6b6b80;
    --danger: #f43f5e;
    --success: #10b981;
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }

  .app { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2.5rem; flex-wrap: gap; gap: 1rem; }
  .logo { font-family: 'Syne', sans-serif; font-size: 1.6rem; font-weight: 800; background: linear-gradient(135deg, #a78bfa, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .logo span { font-weight: 400; opacity: 0.6; }

  /* Auth Button */
  .btn { font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 500; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; padding: 0.6rem 1.2rem; }
  .btn-primary { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px #7c3aed44; }
  .btn-danger { background: #f43f5e22; color: #f43f5e; border: 1px solid #f43f5e33; }
  .btn-danger:hover { background: #f43f5e33; }
  .btn-ghost { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--border); }
  .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  /* Stats Grid */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.4rem; position: relative; overflow: hidden; }
  .stat-card::before { content: ''; position: absolute; inset: 0; background: var(--glow, transparent); opacity: 0.05; border-radius: inherit; }
  .stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
  .stat-value { font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; line-height: 1; }
  .stat-sub { font-size: 0.78rem; color: var(--muted); margin-top: 0.4rem; }

  /* Chart */
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
  @media (max-width: 700px) { .chart-row { grid-template-columns: 1fr; } }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.4rem; }
  .card-title { font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700; margin-bottom: 1.2rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

  /* Category bars */
  .cat-row { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.8rem; }
  .cat-label { font-size: 0.8rem; width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cat-bar-wrap { flex: 1; background: var(--surface2); border-radius: 99px; height: 6px; }
  .cat-bar { height: 6px; border-radius: 99px; transition: width 0.8s cubic-bezier(.16,1,.3,1); }
  .cat-amount { font-size: 0.78rem; color: var(--muted); min-width: 50px; text-align: right; }

  /* Upcoming */
  .upcoming-item { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0; border-bottom: 1px solid var(--border); }
  .upcoming-item:last-child { border-bottom: none; }
  .upcoming-name { font-size: 0.875rem; font-weight: 500; }
  .upcoming-date { font-size: 0.75rem; color: var(--muted); }
  .upcoming-amount { font-family: 'Syne', sans-serif; font-size: 0.9rem; font-weight: 700; }
  .badge { font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 99px; font-weight: 600; }
  .badge-warn { background: #f59e0b22; color: #f59e0b; }
  .badge-ok { background: #10b98122; color: #10b981; }

  /* Table */
  .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 2rem; }
  .table-header { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.4rem; border-bottom: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; padding: 0.8rem 1.2rem; border-bottom: 1px solid var(--border); font-weight: 500; }
  td { padding: 0.9rem 1.2rem; font-size: 0.875rem; border-bottom: 1px solid var(--border); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface2); }
  .sub-name { font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
  .cat-chip { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 99px; font-weight: 500; }
  .amount-cell { font-family: 'Syne', sans-serif; font-weight: 700; }
  .actions { display: flex; gap: 0.4rem; }
  .icon-btn { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.3rem; border-radius: 6px; transition: background 0.15s; }
  .icon-btn:hover { background: var(--surface2); }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: #00000088; backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 2rem; width: 100%; max-width: 480px; }
  .modal-title { font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 700; margin-bottom: 1.5rem; }
  .form-group { margin-bottom: 1rem; }
  label { display: block; font-size: 0.78rem; color: var(--muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.06em; }
  input, select { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.9rem; padding: 0.65rem 0.9rem; transition: border 0.2s; }
  input:focus, select:focus { outline: none; border-color: var(--accent); }
  select option { background: var(--surface2); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .modal-actions { display: flex; gap: 0.7rem; justify-content: flex-end; margin-top: 1.5rem; }

  /* Login screen */
  .login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .login-card { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 3rem 2.5rem; text-align: center; max-width: 400px; width: 100%; }
  .login-icon { font-size: 3rem; margin-bottom: 1rem; }
  .login-title { font-family: 'Syne', sans-serif; font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; background: linear-gradient(135deg, #a78bfa, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .login-sub { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; line-height: 1.6; }
  .google-btn { display: flex; align-items: center; justify-content: center; gap: 0.7rem; background: white; color: #333; border: none; border-radius: 12px; padding: 0.85rem 1.5rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; width: 100%; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
  .google-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px #ffffff22; }

  /* Empty state */
  .empty { text-align: center; padding: 3rem; color: var(--muted); }
  .empty-icon { font-size: 2.5rem; margin-bottom: 1rem; }

  /* Toast */
  .toast { position: fixed; bottom: 2rem; right: 2rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 0.9rem 1.2rem; font-size: 0.875rem; z-index: 999; animation: slideIn 0.3s ease; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* Loader */
  .loader { display: inline-block; width: 16px; height: 16px; border: 2px solid #ffffff33; border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .flex { display: flex; }
  .items-center { align-items: center; }
  .gap-2 { gap: 0.5rem; }
  .ml-auto { margin-left: auto; }
`;

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return <div className="toast">{msg}</div>;
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className="empty"><div className="empty-icon">📊</div><p>No data yet</p></div>;
  let cumulative = 0;
  const size = 140, r = 55, cx = 70, cy = 70, circum = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
      <svg width={size} height={size}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circum;
          const offset = circum - cumulative * circum;
          cumulative += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={18}
              strokeDasharray={`${dash} ${circum - dash}`}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dasharray 0.8s ease", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
            />
          );
        })}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#f1f0ff" fontSize="11" fontFamily="DM Sans">Total</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#f1f0ff" fontSize="13" fontWeight="700" fontFamily="Syne">
          {data[0]?.currency || "$"}{total.toFixed(0)}
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem" }}>{d.label}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: "auto" }}>{(pct => `${(pct * 100).toFixed(0)}%`)(d.value / total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: "", category: "Entertainment", amount: "", currency: "USD", billingCycle: "Monthly", nextBillingDate: "" });

  const showToast = (msg) => setToast(msg);

  // Load GAPI
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("client:auth2", async () => {
        await window.gapi.client.init({
          clientId: CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        });
        const auth = window.gapi.auth2.getAuthInstance();
        setSignedIn(auth.isSignedIn.get());
        auth.isSignedIn.listen(setSignedIn);
        setGapiLoaded(true);
      });
    };
    document.body.appendChild(script);
  }, []);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE });
      const rows = res.result.values || [];
      setSubs(rows.map((r, i) => ({ id: i, name: r[0] || "", category: r[1] || "Other", amount: parseFloat(r[2]) || 0, currency: r[3] || "USD", billingCycle: r[4] || "Monthly", nextBillingDate: r[5] || "" })));
    } catch (e) { showToast("❌ Failed to fetch data"); }
    setLoading(false);
  }, []);

  useEffect(() => { if (signedIn) fetchSubs(); }, [signedIn]);

  const signIn = () => window.gapi.auth2.getAuthInstance().signIn();
  const signOut = () => window.gapi.auth2.getAuthInstance().signOut();

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", category: "Entertainment", amount: "", currency: "USD", billingCycle: "Monthly", nextBillingDate: "" });
    setShowModal(true);
  };

  const openEdit = (sub) => {
    setEditItem(sub);
    setForm({ name: sub.name, category: sub.category, amount: String(sub.amount), currency: sub.currency, billingCycle: sub.billingCycle, nextBillingDate: sub.nextBillingDate });
    setShowModal(true);
  };

  const saveSub = async () => {
    if (!form.name || !form.amount) return showToast("⚠️ Name and amount required");
    setLoading(true);
    try {
      const allRows = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE });
      const rows = allRows.result.values || [];
      const newRow = [form.name, form.category, form.amount, form.currency, form.billingCycle, form.nextBillingDate];
      if (editItem !== null) {
        const rowNum = editItem.id + 2;
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID, range: `Subscriptions!A${rowNum}:F${rowNum}`,
          valueInputOption: "RAW", resource: { values: [newRow] }
        });
        showToast("✅ Subscription updated!");
      } else {
        await window.gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID, range: "Subscriptions!A:F",
          valueInputOption: "RAW", resource: { values: [newRow] }
        });
        showToast("✅ Subscription added!");
      }
      setShowModal(false);
      fetchSubs();
    } catch (e) { showToast("❌ Failed to save"); }
    setLoading(false);
  };

  const deleteSub = async (sub) => {
    if (!confirm(`Delete "${sub.name}"?`)) return;
    setLoading(true);
    try {
      // Get sheet metadata to find sheetId
      const meta = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
      const sheetId = meta.result.sheets[0].properties.sheetId;
      const rowIndex = sub.id + 1;
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: { requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }
      });
      showToast("🗑️ Deleted!");
      fetchSubs();
    } catch (e) { showToast("❌ Failed to delete"); }
    setLoading(false);
  };

  // Analytics
  const monthlyTotal = subs.reduce((s, sub) => {
    const amt = sub.billingCycle === "Yearly" ? sub.amount / 12 : sub.billingCycle === "Weekly" ? sub.amount * 4.33 : sub.billingCycle === "Quarterly" ? sub.amount / 3 : sub.amount;
    return s + amt;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;

  const categoryTotals = CATEGORIES.map(cat => ({
    label: cat, color: CATEGORY_COLORS[cat],
    value: subs.filter(s => s.category === cat).reduce((sum, s) => sum + s.amount, 0),
    currency: subs[0]?.currency || "USD"
  })).filter(c => c.value > 0);

  const upcoming = [...subs]
    .filter(s => s.nextBillingDate)
    .sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate))
    .slice(0, 5)
    .map(s => ({ ...s, daysLeft: Math.ceil((new Date(s.nextBillingDate) - new Date()) / 86400000) }));

  const currencySymbols = { USD: "$", EUR: "€", GBP: "£", INR: "₹", CAD: "C$", AUD: "A$" };
  const sym = (c) => currencySymbols[c] || c;

  if (!gapiLoaded || !signedIn) {
    return (
      <>
        <style>{styles}</style>
        <div className="login-screen">
          <div className="login-card">
            <div className="login-icon">💳</div>
            <div className="login-title">SubTrackr</div>
            <div className="login-sub">Track all your subscriptions in one place. Data saved directly to your Google Sheet.</div>
            <button className="google-btn" onClick={signIn} disabled={!gapiLoaded}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg>
              {gapiLoaded ? "Sign in with Google" : "Loading..."}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Header */}
        <div className="header">
          <div className="logo">Sub<span>Trackr</span></div>
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
            <button className="btn btn-primary" onClick={openAdd}>+ Add Subscription</button>
            <button className="btn btn-danger btn-sm" onClick={signOut}>Sign Out</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: "Monthly Cost", value: `${sym(subs[0]?.currency || "USD")}${monthlyTotal.toFixed(2)}`, sub: "across all billing cycles", glow: "#7c3aed" },
            { label: "Yearly Total", value: `${sym(subs[0]?.currency || "USD")}${yearlyTotal.toFixed(2)}`, sub: "projected annual spend", glow: "#06b6d4" },
            { label: "Active Subs", value: subs.length, sub: "subscriptions tracked", glow: "#10b981" },
            { label: "Avg per Sub", value: `${sym(subs[0]?.currency || "USD")}${subs.length ? (monthlyTotal / subs.length).toFixed(2) : "0.00"}`, sub: "monthly average", glow: "#f59e0b" },
          ].map((s, i) => (
            <div className="stat-card" key={i} style={{ "--glow": s.glow }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ background: `linear-gradient(135deg, ${s.glow}, #f1f0ff)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="chart-row">
          <div className="card">
            <div className="card-title">Spend by Category</div>
            <DonutChart data={categoryTotals} />
          </div>
          <div className="card">
            <div className="card-title">Category Breakdown</div>
            {categoryTotals.length === 0 ? <div className="empty"><div className="empty-icon">📊</div><p>No data yet</p></div> :
              categoryTotals.sort((a, b) => b.value - a.value).map((c, i) => (
                <div className="cat-row" key={i}>
                  <span className="cat-label">{CATEGORY_ICONS[c.label]} {c.label}</span>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar" style={{ width: `${(c.value / Math.max(...categoryTotals.map(x => x.value))) * 100}%`, background: c.color }} />
                  </div>
                  <span className="cat-amount">{sym(subs[0]?.currency || "USD")}{c.value.toFixed(0)}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Upcoming + Table */}
        <div className="chart-row" style={{ marginBottom: "2rem" }}>
          <div className="card">
            <div className="card-title">Upcoming Renewals</div>
            {upcoming.length === 0 ? <div className="empty"><div className="empty-icon">📅</div><p>No upcoming dates</p></div> :
              upcoming.map((s, i) => (
                <div className="upcoming-item" key={i}>
                  <div>
                    <div className="upcoming-name">{s.name}</div>
                    <div className="upcoming-date">{s.nextBillingDate}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`badge ${s.daysLeft <= 7 ? "badge-warn" : "badge-ok"}`}>{s.daysLeft}d</span>
                    <span className="upcoming-amount">{sym(s.currency)}{s.amount}</span>
                  </div>
                </div>
              ))
            }
          </div>
          <div className="card">
            <div className="card-title">Billing Cycle Split</div>
            {BILLING_CYCLES.map(cycle => {
              const count = subs.filter(s => s.billingCycle === cycle).length;
              return count > 0 ? (
                <div className="cat-row" key={cycle}>
                  <span className="cat-label">{cycle}</span>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar" style={{ width: `${(count / subs.length) * 100}%`, background: "linear-gradient(90deg, #7c3aed, #06b6d4)" }} />
                  </div>
                  <span className="cat-amount">{count}</span>
                </div>
              ) : null;
            })}
            {subs.length === 0 && <div className="empty"><div className="empty-icon">🔄</div><p>No subscriptions yet</p></div>}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-header">
            <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: "0.95rem" }}>All Subscriptions</div>
            {loading && <div className="loader" />}
          </div>
          {subs.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">💳</div>
              <p>No subscriptions yet. Add your first one!</p>
            </div>
          ) : (
            <table>
              <thead><tr>
                <th>Name</th><th>Category</th><th>Amount</th><th>Cycle</th><th>Next Bill</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {subs.map((sub, i) => (
                  <tr key={i}>
                    <td><div className="sub-name">{sub.name}</div></td>
                    <td><span className="cat-chip" style={{ background: CATEGORY_COLORS[sub.category] + "22", color: CATEGORY_COLORS[sub.category] }}>{CATEGORY_ICONS[sub.category]} {sub.category}</span></td>
                    <td><div className="amount-cell">{sym(sub.currency)}{sub.amount.toFixed(2)}</div></td>
                    <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{sub.billingCycle}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{sub.nextBillingDate || "—"}</td>
                    <td><div className="actions">
                      <button className="icon-btn" onClick={() => openEdit(sub)} title="Edit">✏️</button>
                      <button className="icon-btn" onClick={() => deleteSub(sub)} title="Delete">🗑️</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editItem !== null ? "Edit Subscription" : "Add Subscription"}</div>
            <div className="form-group">
              <label>Service Name</label>
              <input placeholder="e.g. Netflix, Spotify..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Amount</label>
                <input type="number" placeholder="9.99" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Billing Cycle</label>
                <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
                  {BILLING_CYCLES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Next Billing Date</label>
              <input type="date" value={form.nextBillingDate} onChange={e => setForm(f => ({ ...f, nextBillingDate: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSub} disabled={loading}>
                {loading ? <span className="loader" /> : editItem !== null ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </>
  );
}
