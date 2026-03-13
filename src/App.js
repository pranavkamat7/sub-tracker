import { useState, useEffect, useCallback, useRef } from "react";

const CLIENT_ID =
  "872324162882-nsn0o9lmv770lm61ijul6conkeuqp1pt.apps.googleusercontent.com";
const SHEET_ID = "18qPN8GXUvlJvW2STFFnj6vmKxPgD8vuqjtish7CdTQw";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";
const RANGE = "Subscriptions!A2:K";

const CATEGORIES = [
  "Design",
  "Social Media",
  "BD",
  "Tech",
  "Ops",
  "SEO",
  "Other",
];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "CAD", "AUD"];
const BILLING_CYCLES = ["Monthly", "Yearly", "Weekly", "Quarterly"];

const CATEGORY_COLORS = {
  Design: "#FF6B6B",
  "Social Media": "#A78BFA",
  BD: "#34D399",
  Tech: "#60A5FA",
  Ops: "#FBBF24",
  SEO: "#2d382c",
  Other: "#94969e",
};
const CATEGORY_ICONS = {
  Design: "🎨",
  "Social Media": "📱",
  BD: "💼",
  Tech: "💻",
  Ops: "⚙️",
  SEO: "🔍",
  Other: "❓",
};
const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
};
const sym = (c) => CURRENCY_SYMBOLS[c] || c;

async function fetchRatesToINR() {
  const res = await fetch("https://open.er-api.com/v6/latest/INR", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`);
  const data = await res.json();
  const toINR = { INR: 1 };
  for (const cur of ["USD", "EUR", "GBP", "CAD", "AUD"]) {
    if (data.rates[cur])
      toINR[cur] = parseFloat((1 / data.rates[cur]).toFixed(4));
  }
  const now = new Date();
  const date = `${now.getDate().toString().padStart(2, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  return { rates: toINR, date };
}

// ── Excel export (no library needed — generates real XLSX via CSV fallback as .xls which Excel opens natively)
function exportToExcel(subs, rates) {
  const headers = [
    "Name",
    "Category",
    "Amount",
    "Currency",
    "Billing Cycle",
    "Next Billing Date",
    "Email ID",
    "User ID",
    "Password",
    "App Link",
    "Invoice Link",
    "Monthly Cost (INR)",
  ];
  const toMonthlyINR = (sub) => {
    const r = rates || {};
    const inr = sub.amount * (r[sub.currency] ?? 1);
    if (sub.billingCycle === "Yearly") return inr / 12;
    if (sub.billingCycle === "Weekly") return inr * 4.33;
    if (sub.billingCycle === "Quarterly") return inr / 3;
    return inr;
  };
  const rows = subs.map((s) => [
    s.name,
    s.category,
    s.amount,
    s.currency,
    s.billingCycle,
    s.nextBillingDate,
    s.emailId,
    s.userId,
    s.password,
    s.appLink,
    s.invoiceLink,
    toMonthlyINR(s).toFixed(2),
  ]);

  // Build HTML table — Excel opens this perfectly as .xls
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Subscriptions</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1">`;
  html += `<tr>${headers.map((h) => `<th style="background:#1A1916;color:#fff;font-weight:bold;padding:8px 12px;">${h}</th>`).join("")}</tr>`;
  rows.forEach((row, ri) => {
    html += `<tr>${row.map((cell) => `<td style="padding:6px 12px;background:${ri % 2 === 0 ? "#FAFAF8" : "#fff"}">${cell ?? ""}</td>`).join("")}</tr>`;
  });
  html += `</table></body></html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SubTrackr_Export_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #FAFAF8; --surface: #FFFFFF; --surface2: #F7F6F2; --border: #E8E6DF; --border2: #D5D2C8;
    --text: #1A1916; --text2: #6B6860; --text3: #9E9B94; --accent: #E8572A; --green: #2D9B6F;
    --yellow: #D4A017;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 20px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06);
    --radius: 16px; --radius-sm: 10px; --radius-xs: 6px;
    --font-display: 'Plus Jakarta Sans', sans-serif; --font-body: 'Space Grotesk', sans-serif;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; -webkit-font-smoothing: antialiased; }
  .app { max-width: 1160px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }

  /* HEADER */
  .hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
  .logo-wrap { display: flex; align-items: center; gap: 0.75rem; }
  .logo-mark { width: 40px; height: 40px; background: var(--accent); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(232,87,42,0.3); }
  .logo { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; color: var(--text); letter-spacing: -0.03em; }
  .logo span { color: var(--accent); }
  .hdr-right { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }

  /* RATES BAR */
  .rates-bar { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.72rem; font-weight: 500; color: var(--text3); background: var(--surface2); border: 1.5px solid var(--border); border-radius: 99px; padding: 0.28rem 0.75rem; margin-bottom: 2rem; letter-spacing: 0.01em; flex-wrap: wrap; }
  .rates-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .rates-dot-live { background: #2D9B6F; } .rates-dot-loading { background: #D4A017; animation: rpulse 1s infinite; } .rates-dot-error { background: #E8572A; }
  @keyframes rpulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* SILENT AUTH BANNER */
  .auth-banner { display: flex; align-items: center; gap: 0.6rem; background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 10px; padding: 0.6rem 1rem; margin-bottom: 1.2rem; font-size: 0.78rem; color: #1D4ED8; font-weight: 500; }
  .auth-banner-dot { width: 7px; height: 7px; border-radius: 50%; background: #3B82F6; animation: rpulse 1.2s infinite; flex-shrink: 0; }

  /* BUTTONS */
  .btn { font-family: var(--font-body); font-size: 0.875rem; font-weight: 600; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.18s cubic-bezier(0.2,0,0,1); padding: 0.6rem 1.1rem; letter-spacing: -0.01em; }
  .btn-primary { background: var(--text); color: #fff; }
  .btn-primary:hover { background: #2d2b28; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(26,25,22,0.25); }
  .btn-danger { background: transparent; color: var(--text2); border: 1.5px solid var(--border2); }
  .btn-danger:hover { border-color: #FF6B6B; color: #FF6B6B; background: #FF6B6B0F; }
  .btn-ghost { background: var(--surface2); color: var(--text); border: 1.5px solid var(--border); }
  .btn-ghost:hover { background: var(--border); }
  .btn-accent { background: var(--accent); color: #fff; box-shadow: 0 4px 14px rgba(232,87,42,0.35); }
  .btn-accent:hover { background: #d04a20; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,87,42,0.4); }
  .btn-green { background: var(--green); color: #fff; box-shadow: 0 4px 14px rgba(45,155,111,0.3); }
  .btn-green:hover { background: #248a5e; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(45,155,111,0.35); }
  .btn-sm { padding: 0.45rem 0.85rem; font-size: 0.8rem; }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

  /* STATS */
  .sgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media(max-width:900px){ .sgrid { grid-template-columns: repeat(2,1fr); } }
  @media(max-width:500px){ .sgrid { grid-template-columns: 1fr; } }
  .scard { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 1.4rem 1.5rem; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; transition: box-shadow 0.2s, transform 0.2s; }
  .scard:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
  .scard-accent { border-color: var(--accent); }
  .slabel { font-size: 0.72rem; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; display: block; }
  .sval { font-family: var(--font-display); font-size: 1.85rem; font-weight: 800; line-height: 1; letter-spacing: -0.03em; color: var(--text); }
  .scard-accent .sval { color: var(--accent); }
  .ssub { font-size: 0.73rem; color: var(--text3); margin-top: 0.45rem; }
  .scard-bg { position: absolute; right: -10px; top: -10px; font-size: 3.5rem; opacity: 0.05; line-height: 1; pointer-events: none; }

  /* CHARTS */
  .crow { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
  @media(max-width:700px){ .crow { grid-template-columns: 1fr; } }
  .card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 1.5rem; box-shadow: var(--shadow-sm); }
  .ctitle { font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.3rem; }
  .donut-wrap { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
  .donut-legend { flex: 1; min-width: 120px; }
  .legend-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.8rem; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .legend-pct { margin-left: auto; font-weight: 600; color: var(--text2); font-size: 0.75rem; }
  .brow { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.9rem; }
  .blabel { font-size: 0.8rem; font-weight: 500; width: 110px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bwrap { flex: 1; background: var(--surface2); border-radius: 99px; height: 6px; overflow: hidden; }
  .bbar { height: 6px; border-radius: 99px; transition: width 0.8s cubic-bezier(0.16,1,0.3,1); }
  .bamt { font-size: 0.78rem; color: var(--text2); font-weight: 600; min-width: 60px; text-align: right; }
  .uitem { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
  .uitem:last-child { border-bottom: none; }
  .uname { font-size: 0.875rem; font-weight: 600; }
  .udate { font-size: 0.72rem; color: var(--text3); margin-top: 0.15rem; }
  .uamt-wrap { text-align: right; }
  .uamt { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; }
  .uamt-orig { font-size: 0.68rem; color: var(--text3); margin-top: 0.1rem; }
  .badge { font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 99px; letter-spacing: 0.04em; }
  .badge-warn { background: #FEF3C7; color: #D97706; } .badge-ok { background: #D1FAE5; color: #059669; } .badge-danger { background: #FEE2E2; color: #DC2626; }

  /* TABLE */
  .twrap { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); }
  .thdr { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.5rem; border-bottom: 1.5px solid var(--border); background: var(--surface2); flex-wrap: wrap; gap: 0.6rem; }
  .thdr-title { font-family: var(--font-display); font-weight: 700; font-size: 0.95rem; }
  .thdr-right { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 0.7rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; padding: 0.85rem 1.5rem; border-bottom: 1.5px solid var(--border); background: var(--surface2); }
  td { padding: 1rem 1.5rem; font-size: 0.875rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tbody tr { transition: background 0.12s; }
  tbody tr:hover td { background: var(--surface2); }
  .chip { font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 99px; letter-spacing: 0.03em; }
  .amount-cell { font-family: var(--font-display); font-weight: 700; font-size: 0.95rem; }
  .amount-orig { font-size: 0.7rem; color: var(--text3); margin-top: 0.1rem; font-weight: 400; }
  .acts { display: flex; gap: 0.3rem; }
  .ibtn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.3rem 0.4rem; border-radius: var(--radius-xs); transition: background 0.15s; color: var(--text3); }
  .ibtn:hover { background: var(--surface2); color: var(--text); }
  .link-cell { color: #2563EB; text-decoration: none; font-size: 0.78rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.25rem; }
  .link-cell:hover { text-decoration: underline; }
  /* password mask */
  .pwd-cell { display: flex; align-items: center; gap: 0.4rem; }
  .pwd-text { font-family: monospace; font-size: 0.82rem; letter-spacing: 0.05em; }
  .pwd-toggle { background: none; border: none; cursor: pointer; font-size: 0.8rem; color: var(--text3); padding: 0.1rem 0.25rem; border-radius: 4px; transition: background 0.12s; }
  .pwd-toggle:hover { background: var(--border); }
  @media(max-width:700px){ th, td { padding: 0.7rem 0.9rem; } .hide-mobile { display: none; } }

  /* MODAL */
  .ov { position: fixed; inset: 0; background: rgba(26,25,22,0.55); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; animation: fadeIn 0.2s ease; overflow-y: auto; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal { background: var(--surface); border: 1.5px solid var(--border); border-radius: 20px; padding: 2rem; width: 100%; max-width: 520px; box-shadow: var(--shadow-lg); animation: slideUp 0.25s cubic-bezier(0.16,1,0.3,1); margin: auto; }
  @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
  .modal-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; margin-bottom: 0.4rem; letter-spacing: -0.02em; }
  .modal-sub { font-size: 0.78rem; color: var(--text3); margin-bottom: 1.5rem; }
  .section-divider { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text3); margin: 1.2rem 0 0.8rem; padding-bottom: 0.4rem; border-bottom: 1.5px solid var(--border); display: flex; align-items: center; gap: 0.4rem; }
  .fg { margin-bottom: 1rem; }
  label { display: block; font-size: 0.73rem; font-weight: 700; color: var(--text2); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.08em; }
  input, select { width: 100%; background: var(--surface2); border: 1.5px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-family: var(--font-body); font-size: 0.9rem; font-weight: 500; padding: 0.7rem 0.9rem; transition: border 0.18s, box-shadow 0.18s; -webkit-appearance: none; appearance: none; }
  input:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(232,87,42,0.12); }
  .frow { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  @media(max-width:400px){ .frow { grid-template-columns: 1fr; } }
  .macts { display: flex; gap: 0.7rem; justify-content: flex-end; margin-top: 1.5rem; }
  .preview-inr { font-size: 0.78rem; color: var(--text2); background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-xs); padding: 0.45rem 0.75rem; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
  .preview-inr strong { color: var(--green); font-family: var(--font-display); }
  .pwd-input-wrap { position: relative; }
  .pwd-input-wrap input { padding-right: 2.8rem; }
  .pwd-eye { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--text3); padding: 0.2rem; }
  .optional-tag { font-size: 0.62rem; font-weight: 500; color: var(--text3); text-transform: none; letter-spacing: 0; margin-left: 0.3rem; }
  .drive-hint { font-size: 0.72rem; color: var(--text3); margin-top: 0.35rem; display: flex; align-items: center; gap: 0.3rem; }

  /* LOGIN */
  .lscreen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 1rem; }
  .lcard { background: var(--surface); border: 1.5px solid var(--border); border-radius: 24px; padding: 3rem 2.5rem; text-align: center; max-width: 380px; width: 100%; box-shadow: var(--shadow-lg); }
  .l-icon-wrap { width: 72px; height: 72px; background: var(--accent); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 1.5rem; box-shadow: 0 8px 24px rgba(232,87,42,0.35); }
  .ltitle { font-family: var(--font-display); font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); margin-bottom: 0.5rem; }
  .ltitle span { color: var(--accent); }
  .lsub { color: var(--text2); font-size: 0.88rem; margin-bottom: 2rem; line-height: 1.7; }
  .lfeatures { display: flex; flex-direction: column; gap: 0.5rem; text-align: left; margin-bottom: 2rem; }
  .lfeat { display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; color: var(--text2); }
  .lfeat-icon { width: 22px; height: 22px; background: var(--surface2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0; }
  .gbtn { display: flex; align-items: center; justify-content: center; gap: 0.75rem; background: var(--text); color: #fff; border: none; border-radius: 12px; padding: 0.9rem 1.5rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; width: 100%; transition: all 0.2s; font-family: var(--font-body); letter-spacing: -0.01em; }
  .gbtn:hover { background: #2d2b28; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,25,22,0.25); }
  .gbtn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .silent-status { font-size: 0.75rem; color: var(--text3); display: flex; align-items: center; gap: 0.5rem; justify-content: center; margin-top: 0.8rem; }

  /* MISC */
  .empty { text-align: center; padding: 3rem 1.5rem; color: var(--text3); }
  .eicon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .empty p { font-size: 0.875rem; }
  .toast { position: fixed; bottom: 2rem; right: 2rem; background: var(--text); color: #fff; border-radius: 12px; padding: 0.85rem 1.2rem; font-size: 0.875rem; font-weight: 500; z-index: 999; animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 8px 24px rgba(26,25,22,0.3); max-width: 300px; }
  @keyframes toastIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
  .spin { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; animation: rot 0.7s linear infinite; }
  .spin-dark { border-color: rgba(26,25,22,0.2); border-top-color: var(--text); }
  @keyframes rot { to{transform:rotate(360deg)} }
  .errbox { background: #FEE2E2; border: 1.5px solid #FECACA; border-radius: 12px; padding: 1rem; color: #DC2626; font-size: 0.82rem; margin-top: 1rem; line-height: 1.6; text-align: left; }
  .table-scroll { overflow-x: auto; }
  .date-wrap { position: relative; }
  .date-icon { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 1rem; pointer-events: none; color: var(--text3); }
`;

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="toast">{msg}</div>;
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.inr, 0);
  if (!total)
    return (
      <div className="empty">
        <div className="eicon">📊</div>
        <p>No data yet</p>
      </div>
    );
  let cum = 0;
  const R = 52,
    cx = 68,
    cy = 68,
    C = 2 * Math.PI * R,
    gap = 0.015;
  const fmt = (n) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
        ? `₹${(n / 1000).toFixed(1)}K`
        : `₹${n.toFixed(0)}`;
  return (
    <div className="donut-wrap">
      <svg width="136" height="136" style={{ flexShrink: 0 }}>
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="#F4F3EF"
          strokeWidth={20}
        />
        {data.map((d, i) => {
          const pct = d.inr / total;
          const dash = Math.max(0, pct - gap) * C;
          const offset = C - cum * C;
          cum += pct;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth={18}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
                transition: "stroke-dasharray 0.8s ease",
              }}
            />
          );
        })}
        <text
          x={cx}
          y={cy - 7}
          textAnchor="middle"
          fill="#9E9B94"
          fontSize="9"
          fontFamily="Space Grotesk"
          fontWeight="600"
          letterSpacing="1"
        >
          TOTAL/MO
        </text>
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          fill="#1A1916"
          fontSize="13"
          fontWeight="800"
          fontFamily="Plus Jakarta Sans"
        >
          {fmt(total)}
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div className="legend-row" key={i}>
            <span className="legend-dot" style={{ background: d.color }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
              {d.label}
            </span>
            <span className="legend-pct">
              {((d.inr / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  category: "Design",
  amount: "",
  currency: "INR",
  billingCycle: "Monthly",
  nextBillingDate: "",
  emailId: "",
  userId: "",
  password: "",
  appLink: "",
  invoiceLink: "",
};

export default function App() {
  const [gapiReady, setGapiReady] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [silentTrying, setSilentTrying] = useState(true); // attempting silent auth on load
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [initError, setInitError] = useState(null);
  const [status, setStatus] = useState("Loading Google APIs...");
  const [rates, setRates] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);
  const [ratesError, setRatesError] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const tokenRef = useRef(null);
  const showToast = useCallback((msg) => setToast(msg), []);

  // Live exchange rates
  useEffect(() => {
    fetchRatesToINR()
      .then(({ rates: r, date }) => {
        setRates(r);
        setRatesDate(date);
      })
      .catch(() => {
        setRatesError(true);
        setRates({
          INR: 1,
          USD: 83.5,
          EUR: 90.2,
          GBP: 105.8,
          CAD: 61.5,
          AUD: 54.3,
        });
      });
  }, []);

  const convertToINR = useCallback(
    (amount, currency) => {
      if (!rates) return amount;
      return amount * (rates[currency] ?? 1);
    },
    [rates],
  );

  const fmtINR = (n) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(2)}`;
  };

  // ── Silent re-auth helper ────────────────────────────────────────────────
  // Called once both GAPI + GSI are loaded. Uses prompt:"none" — no popup ever.
  // If user previously granted access, Google returns a token silently.
  const attemptSilentAuth = useCallback(() => {
    if (!tokenRef.current) return;
    tokenRef.current.requestAccessToken({ prompt: "none" });
    // setSilentTrying stays true until callback fires (success or error)
    // We give it a 5s timeout, then let the user click manually
    setTimeout(() => setSilentTrying(false), 5000);
  }, []);

  // Track when both scripts are ready so we can attempt silent auth once
  const markReady = useCallback(
    (which) => {
      setStatus(`${which} ready`);
      // We use a module-level flag to avoid stale closure issues
      if (which === "GAPI") window.__subtrackr_gapi = true;
      if (which === "GSI") window.__subtrackr_gsi = true;
      if (window.__subtrackr_gapi && window.__subtrackr_gsi) {
        attemptSilentAuth();
      }
    },
    [attemptSilentAuth],
  );

  // Load GAPI
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.async = true;
    s.onload = () => {
      window.gapi.load("client", async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: [
              "https://sheets.googleapis.com/$discovery/rest?version=v4",
            ],
          });
          setGapiReady(true);
          markReady("GAPI");
        } catch {
          setInitError(
            "Google Sheets API failed to initialise. Make sure your origin is listed under Authorised JavaScript Origins in Google Cloud Console.",
          );
          setSilentTrying(false);
        }
      });
    };
    s.onerror = () => {
      setInitError(
        "Failed to load Google APIs – check your internet connection.",
      );
      setSilentTrying(false);
    };
    document.body.appendChild(s);
  }, [markReady]);

  // Load GSI
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      try {
        tokenRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp) => {
            setSilentTrying(false);
            if (resp.error) {
              // "access_denied" or "interaction_required" = silent auth failed, need manual click
              if (
                resp.error !== "interaction_required" &&
                resp.error !== "access_denied"
              ) {
                showToast("❌ Sign-in error: " + resp.error);
              }
              return;
            }
            setSignedIn(true);
          },
          // Re-authenticate silently every 50 minutes (token lasts 60 min)
          // by listening for token expiry implicitly — handled via auto re-request before calls
        });
        setGsiReady(true);
        markReady("GSI");
      } catch {
        setInitError(
          "Google Sign-In failed to initialise. Check your Client ID.",
        );
        setSilentTrying(false);
      }
    };
    s.onerror = () => {
      setInitError("Failed to load Google Sign-In script.");
      setSilentTrying(false);
    };
    document.body.appendChild(s);
  }, [markReady, showToast]);

  // ── Auto-refresh token every 50 minutes to keep session alive ────────────
  useEffect(() => {
    if (!signedIn) return;
    const interval = setInterval(
      () => {
        if (tokenRef.current) {
          tokenRef.current.requestAccessToken({ prompt: "none" });
        }
      },
      50 * 60 * 1000,
    ); // 50 minutes
    return () => clearInterval(interval);
  }, [signedIn]);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGE,
      });
      const rows = res.result.values || [];
      setSubs(
        rows.map((r, i) => ({
          id: i,
          name: r[0] || "",
          category: r[1] || "Other",
          amount: parseFloat(r[2]) || 0,
          currency: r[3] || "INR",
          billingCycle: r[4] || "Monthly",
          nextBillingDate: r[5] || "",
          emailId: r[6] || "",
          userId: r[7] || "",
          password: r[8] || "",
          appLink: r[9] || "",
          invoiceLink: r[10] || "",
        })),
      );
    } catch {
      showToast("❌ Could not load data from Google Sheets");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (signedIn) fetchSubs();
  }, [signedIn, fetchSubs]);

  const signIn = () => {
    if (!tokenRef.current) {
      showToast("⏳ Still loading...");
      return;
    }
    tokenRef.current.requestAccessToken({ prompt: "" });
  };

  const signOut = () => {
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {});
      window.gapi.client.setToken(null);
    }
    setSignedIn(false);
    setSubs([]);
    showToast("👋 Signed out");
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowPwd(false);
    setShowModal(true);
  };
  const openEdit = (sub) => {
    setEditItem(sub);
    setForm({
      name: sub.name,
      category: sub.category,
      amount: String(sub.amount),
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate,
      emailId: sub.emailId,
      userId: sub.userId,
      password: sub.password,
      appLink: sub.appLink,
      invoiceLink: sub.invoiceLink,
    });
    setShowPwd(false);
    setShowModal(true);
  };

  const rowFromForm = () => [
    form.name,
    form.category,
    form.amount,
    form.currency,
    form.billingCycle,
    form.nextBillingDate,
    form.emailId,
    form.userId,
    form.password,
    form.appLink,
    form.invoiceLink,
  ];

  const saveSub = async () => {
    if (!form.name.trim() || !form.amount)
      return showToast("⚠️ Name and amount are required");
    setLoading(true);
    try {
      const row = rowFromForm();
      if (editItem !== null) {
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `Subscriptions!A${editItem.id + 2}:K${editItem.id + 2}`,
          valueInputOption: "RAW",
          resource: { values: [row] },
        });
        showToast("✅ Updated!");
      } else {
        await window.gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: "Subscriptions!A:K",
          valueInputOption: "RAW",
          resource: { values: [row] },
        });
        showToast("✅ Added!");
      }
      setShowModal(false);
      fetchSubs();
    } catch {
      showToast(
        "❌ Save failed – check the sheet tab is named 'Subscriptions'",
      );
    }
    setLoading(false);
  };

  const deleteSub = async (sub) => {
    if (!window.confirm(`Delete "${sub.name}"?`)) return;
    setLoading(true);
    try {
      const meta = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
      });
      const sheetId = meta.result.sheets[0].properties.sheetId;
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: sub.id + 1,
                  endIndex: sub.id + 2,
                },
              },
            },
          ],
        },
      });
      showToast("🗑️ Deleted");
      fetchSubs();
    } catch {
      showToast("❌ Delete failed");
    }
    setLoading(false);
  };

  // ── Analytics ─────────────────────────────────────────────────────────────
  const toMonthlyINR = (sub) => {
    const inr = convertToINR(sub.amount, sub.currency);
    if (sub.billingCycle === "Yearly") return inr / 12;
    if (sub.billingCycle === "Weekly") return inr * 4.33;
    if (sub.billingCycle === "Quarterly") return inr / 3;
    return inr;
  };

  const monthlyTotal = subs.reduce((s, sub) => s + toMonthlyINR(sub), 0);
  const yearlyTotal = monthlyTotal * 12;

  const catTotals = CATEGORIES.map((cat) => ({
    label: cat,
    color: CATEGORY_COLORS[cat],
    inr: subs
      .filter((s) => s.category === cat)
      .reduce((sum, s) => sum + toMonthlyINR(s), 0),
  })).filter((c) => c.inr > 0);

  const upcoming = [...subs]
    .filter((s) => s.nextBillingDate)
    .sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate))
    .slice(0, 5)
    .map((s) => ({
      ...s,
      daysLeft: Math.ceil(
        (new Date(s.nextBillingDate) - new Date()) / 86400000,
      ),
    }));

  const isReady = gapiReady && gsiReady;
  const maxCat = Math.max(...catTotals.map((c) => c.inr), 1);
  const getBadgeClass = (d) =>
    d <= 3
      ? "badge badge-danger"
      : d <= 7
        ? "badge badge-warn"
        : "badge badge-ok";
  const previewINR =
    form.amount && form.currency !== "INR" && rates
      ? convertToINR(parseFloat(form.amount) || 0, form.currency)
      : null;

  const setF = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!signedIn) {
    return (
      <>
        <style>{css}</style>
        <div className="lscreen">
          <div className="lcard">
            <div className="l-icon-wrap">💳</div>
            <div className="ltitle">
              Sub<span>Trackr</span>
            </div>
            <div className="lsub">
              Track every subscription in one place. All costs shown in ₹ with
              live exchange rates.
            </div>
            <div className="lfeatures">
              {[
                ["📊", "Visual spend analytics by category"],
                ["₹", "Live currency conversion to Rupees"],
                ["🔔", "Upcoming renewal reminders"],
                ["🔑", "Store credentials & invoice links"],
                ["📥", "Export full data to Excel"],
              ].map(([icon, text], i) => (
                <div className="lfeat" key={i}>
                  <div className="lfeat-icon">{icon}</div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            {initError ? (
              <div className="errbox">⚠️ {initError}</div>
            ) : (
              <>
                <button
                  className="gbtn"
                  onClick={signIn}
                  disabled={!isReady || silentTrying}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path
                      fill="#4285F4"
                      d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
                    />
                    <path
                      fill="#34A853"
                      d="M2 24c0-3.3.7-6.4 1.9-9.2L8.3 19c-.5 1.6-.8 3.2-.8 5s.3 3.4.8 5l-4.4 3.8C2.7 30.4 2 27.3 2 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M24 46c5.6 0 10.3-1.9 13.8-5l-6.7-5.2C29.4 37.3 26.9 38 24 38c-6 0-11.1-4-12.9-9.5L6.7 32.3C10.1 39.4 16.5 46 24 46z"
                    />
                    <path
                      fill="#EA4335"
                      d="M44.5 20H24v8.5h11.8c-.8 2.3-2.3 4.3-4.3 5.7l6.7 5.2C42.1 36.2 44.5 30.5 44.5 24c0-1.3-.2-2.7-.5-4z"
                    />
                  </svg>
                  {silentTrying
                    ? "Signing you in…"
                    : isReady
                      ? "Continue with Google"
                      : "Loading…"}
                </button>
                {(silentTrying || !isReady) && (
                  <div className="silent-status">
                    <div className="spin spin-dark" />
                    <span>
                      {silentTrying ? "Attempting silent sign-in…" : status}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="hdr">
          <div className="logo-wrap">
            <div className="logo-mark">💳</div>
            <div className="logo">
              Sub<span>Trackr</span>
            </div>
          </div>
          <div className="hdr-right">
            {loading && <div className="spin spin-dark" />}
            <button
              className="btn btn-green btn-sm"
              onClick={() => exportToExcel(subs, rates)}
            >
              📥 Export Excel
            </button>
            <button className="btn btn-accent" onClick={openAdd}>
              + Add Subscription
            </button>
            <button className="btn btn-danger btn-sm" onClick={signOut}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Silent auth reminder — shown briefly after token refresh */}
        <div className="rates-bar">
          <span
            className={`rates-dot ${!rates ? "rates-dot-loading" : ratesError ? "rates-dot-error" : "rates-dot-live"}`}
          />
          {!rates
            ? "Fetching live exchange rates…"
            : ratesError
              ? "⚠️ Live rates unavailable · using approximate fallback"
              : `Live rates · fetched ${ratesDate} · 1 USD = ₹${rates.USD?.toFixed(2)} · 1 EUR = ₹${rates.EUR?.toFixed(2)} · 1 GBP = ₹${rates.GBP?.toFixed(2)} · 1 CAD = ₹${rates.CAD?.toFixed(2)} · 1 AUD = ₹${rates.AUD?.toFixed(2)}`}
        </div>

        {/* Stats */}
        <div className="sgrid">
          {[
            {
              label: "Monthly Cost",
              value: fmtINR(monthlyTotal),
              sub: "all subs · live ₹ rate",
              icon: "💸",
              accent: true,
            },
            {
              label: "Yearly Total",
              value: fmtINR(yearlyTotal),
              sub: "projected annual spend",
              icon: "📅",
            },
            {
              label: "Active Subs",
              value: subs.length,
              sub: "subscriptions tracked",
              icon: "📋",
            },
            {
              label: "Avg / Sub",
              value: fmtINR(subs.length ? monthlyTotal / subs.length : 0),
              sub: "monthly average in ₹",
              icon: "📊",
            },
          ].map((s, i) => (
            <div className={`scard${s.accent ? " scard-accent" : ""}`} key={i}>
              <div className="scard-bg">{s.icon}</div>
              <span className="slabel">{s.label}</span>
              <div className="sval">{s.value}</div>
              <div className="ssub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="crow">
          <div className="card">
            <div className="ctitle">Monthly Spend by Category (₹)</div>
            <DonutChart data={catTotals} />
          </div>
          <div className="card">
            <div className="ctitle">Category Breakdown (₹ / mo)</div>
            {catTotals.length === 0 ? (
              <div className="empty">
                <div className="eicon">📊</div>
                <p>No data yet</p>
              </div>
            ) : (
              [...catTotals]
                .sort((a, b) => b.inr - a.inr)
                .map((c, i) => (
                  <div className="brow" key={i}>
                    <span className="blabel">
                      {CATEGORY_ICONS[c.label]} {c.label}
                    </span>
                    <div className="bwrap">
                      <div
                        className="bbar"
                        style={{
                          width: `${(c.inr / maxCat) * 100}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                    <span className="bamt">{fmtINR(c.inr)}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="crow">
          <div className="card">
            <div className="ctitle">Upcoming Renewals</div>
            {upcoming.length === 0 ? (
              <div className="empty">
                <div className="eicon">📅</div>
                <p>Add billing dates to track renewals</p>
              </div>
            ) : (
              upcoming.map((s, i) => (
                <div className="uitem" key={i}>
                  <div>
                    <div className="uname">{s.name}</div>
                    <div className="udate">{s.nextBillingDate}</div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span className={getBadgeClass(s.daysLeft)}>
                      {s.daysLeft}d
                    </span>
                    <div className="uamt-wrap">
                      <div className="uamt">
                        {fmtINR(convertToINR(s.amount, s.currency))}
                      </div>
                      {s.currency !== "INR" && (
                        <div className="uamt-orig">
                          {sym(s.currency)}
                          {s.amount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="card">
            <div className="ctitle">Billing Cycle Split</div>
            {subs.length === 0 ? (
              <div className="empty">
                <div className="eicon">🔄</div>
                <p>No subscriptions yet</p>
              </div>
            ) : (
              BILLING_CYCLES.map((cycle) => {
                const count = subs.filter(
                  (s) => s.billingCycle === cycle,
                ).length;
                return count > 0 ? (
                  <div className="brow" key={cycle}>
                    <span className="blabel">{cycle}</span>
                    <div className="bwrap">
                      <div
                        className="bbar"
                        style={{
                          width: `${(count / subs.length) * 100}%`,
                          background: "linear-gradient(90deg,#E8572A,#FF8A5B)",
                        }}
                      />
                    </div>
                    <span className="bamt">{count}</span>
                  </div>
                ) : null;
              })
            )}
          </div>
        </div>

        {/* Table */}
        <div className="twrap">
          <div className="thdr">
            <div className="thdr-title">
              All Subscriptions{" "}
              <span style={{ color: "var(--text3)", fontWeight: 500 }}>
                ({subs.length})
              </span>
            </div>
            <div className="thdr-right">
              <button
                className="btn btn-ghost btn-sm"
                onClick={fetchSubs}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>
          </div>
          {subs.length === 0 ? (
            <div className="empty">
              <div className="eicon">💳</div>
              <p>No subscriptions yet — add your first one!</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Amount (₹)</th>
                    <th className="hide-mobile">Cycle</th>
                    <th className="hide-mobile">Next Bill</th>
                    <th className="hide-mobile">Links</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub, i) => (
                    <tr key={i}>
                      <td>
                        <strong style={{ fontWeight: 600 }}>{sub.name}</strong>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            background: CATEGORY_COLORS[sub.category] + "1A",
                            color: CATEGORY_COLORS[sub.category],
                            border: `1px solid ${CATEGORY_COLORS[sub.category]}33`,
                          }}
                        >
                          {CATEGORY_ICONS[sub.category]} {sub.category}
                        </span>
                      </td>
                      <td>
                        <div className="amount-cell">
                          {fmtINR(convertToINR(sub.amount, sub.currency))}
                        </div>
                        {sub.currency !== "INR" && (
                          <div className="amount-orig">
                            {sym(sub.currency)}
                            {sub.amount.toFixed(2)} · 1 {sub.currency} = ₹
                            {rates?.[sub.currency]?.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td
                        className="hide-mobile"
                        style={{ color: "var(--text3)", fontSize: "0.82rem" }}
                      >
                        {sub.billingCycle}
                      </td>
                      <td
                        className="hide-mobile"
                        style={{ color: "var(--text3)", fontSize: "0.82rem" }}
                      >
                        {sub.nextBillingDate || "—"}
                      </td>
                      <td className="hide-mobile">
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          {sub.appLink && (
                            <a
                              href={sub.appLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-cell"
                            >
                              🔗 App
                            </a>
                          )}
                          {sub.invoiceLink && (
                            <a
                              href={sub.invoiceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-cell"
                            >
                              🧾 Invoice
                            </a>
                          )}
                          {!sub.appLink && !sub.invoiceLink && (
                            <span style={{ color: "var(--text3)" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="acts">
                          <button
                            className="ibtn"
                            onClick={() => openEdit(sub)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="ibtn"
                            onClick={() => deleteSub(sub)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="ov"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal">
            <div className="modal-title">
              {editItem !== null ? "Edit Subscription" : "Add Subscription"}
            </div>
            <div className="modal-sub">
              Fields marked optional can be filled later.
            </div>

            {/* ── Basic Info ── */}
            <div className="section-divider">📋 Basic Info</div>
            <div className="fg">
              <label>Service Name</label>
              <input
                placeholder="e.g. Netflix, Figma, Slack…"
                value={form.name}
                onChange={setF("name")}
              />
            </div>
            <div className="frow">
              <div className="fg">
                <label>Amount</label>
                <input
                  type="number"
                  placeholder="199"
                  value={form.amount}
                  onChange={setF("amount")}
                />
                {previewINR !== null && previewINR > 0 && (
                  <div className="preview-inr">
                    ≈ <strong>{fmtINR(previewINR)}</strong>
                    <span style={{ color: "var(--text3)" }}>
                      · 1 {form.currency} = ₹
                      {rates?.[form.currency]?.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="fg">
                <label>Currency</label>
                <select value={form.currency} onChange={setF("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {sym(c)} {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="frow">
              <div className="fg">
                <label>Category</label>
                <select value={form.category} onChange={setF("category")}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Billing Cycle</label>
                <select
                  value={form.billingCycle}
                  onChange={setF("billingCycle")}
                >
                  {BILLING_CYCLES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="fg">
              <label>Next Billing Date</label>
              <div className="date-wrap">
                <input
                  type="date"
                  value={form.nextBillingDate}
                  onChange={setF("nextBillingDate")}
                  onClick={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (_) {}
                  }}
                />
                <span className="date-icon">📅</span>
              </div>
            </div>

            {/* ── Credentials ── */}
            <div className="section-divider">
              🔑 Credentials <span className="optional-tag">(optional)</span>
            </div>
            <div className="frow">
              <div className="fg">
                <label>Email ID</label>
                <input
                  type="email"
                  placeholder="team@company.com"
                  value={form.emailId}
                  onChange={setF("emailId")}
                />
              </div>
              <div className="fg">
                <label>User ID / Username</label>
                <input
                  placeholder="username or account ID"
                  value={form.userId}
                  onChange={setF("userId")}
                />
              </div>
            </div>
            <div className="fg">
              <label>Password</label>
              <div className="pwd-input-wrap">
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="app password"
                  value={form.password}
                  onChange={setF("password")}
                />
                <button
                  className="pwd-eye"
                  onClick={() => setShowPwd((s) => !s)}
                  type="button"
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* ── Links ── */}
            <div className="section-divider">
              🔗 Links <span className="optional-tag">(optional)</span>
            </div>
            <div className="fg">
              <label>App Link</label>
              <input
                type="url"
                placeholder="https://app.example.com"
                value={form.appLink}
                onChange={setF("appLink")}
              />
            </div>
            <div className="fg">
              <label>
                Invoice Link{" "}
                <span className="optional-tag">Google Drive / any URL</span>
              </label>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/…"
                  value={form.invoiceLink}
                  onChange={setF("invoiceLink")}
                  style={{ flex: 1 }}
                />

                <a
                  href="https://drive.google.com/drive/folders/1tEXcIxpxpnmStMno0gzUk_qqpC1m8Mg8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                  title="Open invoices folder in Google Drive"
                >
                  📂 Open Drive
                </a>
              </div>
              <div className="drive-hint">
                💡 Upload invoice to Drive → right-click → Copy link → paste
                here
              </div>
            </div>

            <div className="macts">
              <button
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-accent"
                onClick={saveSub}
                disabled={loading}
              >
                {loading ? (
                  <span className="spin" />
                ) : editItem !== null ? (
                  "Update"
                ) : (
                  "Add Subscription"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </>
  );
}
