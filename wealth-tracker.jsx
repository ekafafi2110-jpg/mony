import { useState, useEffect, useCallback } from "react";

// ==================== STORAGE ====================
const STORAGE_KEY = "sysbizjo_wealth_v1";

const defaultState = {
  setup: { salary: 0, budget: 0, goldPrice24: 0, currency: "JD" },
  assets: { bank: 0, cash: 0, gold: 0, goldKarat: 24, stocks: 0 },
  transactions: [],
  transfers: [],
  monthStart: { bank: 0, cash: 0, gold: 0, stocks: 0 },
  setupDone: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ==================== HELPERS ====================
const CATEGORIES = [
  "🛒 مشتريات",
  "🍽️ مطاعم",
  "⛽ وقود",
  "🏥 صحة",
  "👕 ملابس",
  "📚 تعليم",
  "🎉 ترفيه",
  "💸 فواتير",
  "📦 متنوع",
];

const ASSET_LABELS = { bank: "🏦 بنك", cash: "💵 كاش", gold: "🥇 ذهب", stocks: "📈 أسهم" };

function goldValue(grams, karat, price24) {
  if (!price24 || !grams) return 0;
  return grams * (karat / 24) * price24;
}

function today() {
  return new Date().toLocaleDateString("ar-JO", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmt(n, currency = "JD") {
  return `${Number(n || 0).toFixed(2)} ${currency}`;
}

// ==================== COMPONENTS ====================

function TopBar({ page, setPage }) {
  const pages = [
    { id: "home", label: "الرئيسية", icon: "◉" },
    { id: "assets", label: "الأصول", icon: "◈" },
    { id: "report", label: "التقارير", icon: "◧" },
    { id: "setup", label: "الإعداد", icon: "⚙" },
  ];
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 20px", borderBottom: "1px solid rgba(212,175,55,0.2)",
      background: "rgba(10,10,10,0.95)", backdropFilter: "blur(10px)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ fontFamily: "'Scheherazade New', serif", fontSize: 13, color: "#d4af37", letterSpacing: 1 }}>
        SysBizJO
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {pages.map(p => (
          <button key={p.id} onClick={() => setPage(p.id)} style={{
            background: page === p.id ? "rgba(212,175,55,0.15)" : "transparent",
            border: page === p.id ? "1px solid rgba(212,175,55,0.4)" : "1px solid transparent",
            color: page === p.id ? "#d4af37" : "#666",
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
            fontSize: 12, fontFamily: "'Cairo', sans-serif",
            transition: "all 0.2s",
          }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BudgetGauge({ spent, budget, currency }) {
  const remaining = budget - spent;
  const overBudget = remaining < 0;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const color = overBudget ? "#e74c3c" : pct > 80 ? "#e67e22" : "#d4af37";

  return (
    <div style={{
      background: overBudget ? "rgba(231,76,60,0.08)" : "rgba(212,175,55,0.05)",
      border: `1px solid ${overBudget ? "rgba(231,76,60,0.3)" : "rgba(212,175,55,0.2)"}`,
      borderRadius: 16, padding: "24px 20px", marginBottom: 20,
      transition: "all 0.4s",
    }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{
          fontSize: 13, color: "#888", fontFamily: "'Cairo', sans-serif", marginBottom: 6,
        }}>رصيد الصرف المتبقي</div>
        <div style={{
          fontSize: 40, fontWeight: 700,
          color: color,
          fontFamily: "'Cairo', sans-serif",
          transition: "color 0.3s",
        }}>
          {overBudget ? "-" : ""}{fmt(Math.abs(remaining), currency)}
        </div>
        {overBudget && (
          <div style={{
            marginTop: 8, background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.4)",
            borderRadius: 8, padding: "6px 14px", display: "inline-block",
            color: "#e74c3c", fontSize: 13, fontFamily: "'Cairo', sans-serif",
          }}>
            ⚠️ تجاوزت الميزانية!
          </div>
        )}
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 100, height: 8, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 100,
          background: `linear-gradient(90deg, #d4af37, ${color})`,
          transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 8,
        fontSize: 11, color: "#555", fontFamily: "'Cairo', sans-serif",
      }}>
        <span>صُرف: {fmt(spent, currency)}</span>
        <span>الميزانية: {fmt(budget, currency)}</span>
      </div>
    </div>
  );
}

function AddExpenseForm({ onAdd, categories }) {
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState(categories[0]);
  const [note, setNote] = useState("");
  const [source, setSource] = useState("budget");

  const handle = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    onAdd({ amount: n, category: cat, note, source, date: today() });
    setAmount("");
    setNote("");
  };

  const inp = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(212,175,55,0.15)",
    borderRadius: 10, color: "#e0e0e0",
    padding: "10px 14px", width: "100%",
    fontFamily: "'Cairo', sans-serif", fontSize: 14,
    outline: "none", boxSizing: "border-box",
    direction: "rtl",
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)",
      borderRadius: 14, padding: 20, marginBottom: 20,
    }}>
      <div style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 15 }}>
        + إضافة مصروف
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <input
          style={inp} type="number" placeholder="المبلغ" min="0"
          value={amount} onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handle()}
        />
        <select style={inp} value={cat} onChange={e => setCat(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <input
        style={{ ...inp, marginBottom: 10 }}
        placeholder="ملاحظة (اختياري)"
        value={note} onChange={e => setNote(e.target.value)}
      />
      <button onClick={handle} style={{
        width: "100%", padding: "12px", borderRadius: 10, cursor: "pointer",
        background: "linear-gradient(135deg, #d4af37, #b8962e)",
        border: "none", color: "#0a0a0a", fontWeight: 700,
        fontFamily: "'Cairo', sans-serif", fontSize: 15,
        transition: "opacity 0.2s",
      }}>
        تسجيل المصروف
      </button>
    </div>
  );
}

function DeficitModal({ amount, assets, currency, onConfirm, onCancel }) {
  const [chosen, setChosen] = useState(null);
  const available = Object.entries(assets).filter(([k]) => k !== "goldKarat" && assets[k] > 0);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, padding: 20,
    }}>
      <div style={{
        background: "#111", border: "1px solid rgba(231,76,60,0.4)",
        borderRadius: 18, padding: 28, maxWidth: 360, width: "100%",
        fontFamily: "'Cairo', sans-serif",
      }}>
        <div style={{ color: "#e74c3c", fontSize: 17, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
          ⚠️ عجز في الميزانية
        </div>
        <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
          المبلغ الزائد: <span style={{ color: "#e74c3c", fontWeight: 700 }}>{fmt(amount, currency)}</span><br />
          اختر الأصل لتغطية العجز:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {available.map(([k, v]) => (
            <button key={k} onClick={() => setChosen(k)} style={{
              padding: "10px 16px", borderRadius: 10, cursor: "pointer",
              background: chosen === k ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${chosen === k ? "#d4af37" : "rgba(255,255,255,0.1)"}`,
              color: chosen === k ? "#d4af37" : "#ccc",
              textAlign: "right", fontSize: 14,
            }}>
              {ASSET_LABELS[k]} — {fmt(v, k === "gold" ? "غ" : currency)}
            </button>
          ))}
          {available.length === 0 && (
            <div style={{ color: "#e74c3c", textAlign: "center", fontSize: 13 }}>لا توجد أصول كافية!</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => chosen && onConfirm(chosen)} style={{
            flex: 1, padding: 12, borderRadius: 10, cursor: "pointer",
            background: chosen ? "linear-gradient(135deg, #d4af37, #b8962e)" : "#333",
            border: "none", color: chosen ? "#0a0a0a" : "#666",
            fontWeight: 700, fontFamily: "'Cairo', sans-serif", fontSize: 14,
          }}>
            تأكيد
          </button>
          <button onClick={onCancel} style={{
            flex: 1, padding: 12, borderRadius: 10, cursor: "pointer",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#888", fontFamily: "'Cairo', sans-serif", fontSize: 14,
          }}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionList({ transactions, currency, onDelete }) {
  const recent = [...transactions].reverse().slice(0, 15);
  if (!recent.length) return (
    <div style={{ textAlign: "center", color: "#444", fontFamily: "'Cairo', sans-serif", padding: 30 }}>
      لا توجد مصاريف مسجلة بعد
    </div>
  );
  return (
    <div>
      <div style={{ color: "#888", fontFamily: "'Cairo', sans-serif", fontSize: 12, marginBottom: 10 }}>
        آخر المصاريف
      </div>
      {recent.map((t, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", borderRadius: 10, marginBottom: 6,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{t.category?.split(" ")[0]}</span>
            <div>
              <div style={{ color: "#e0e0e0", fontFamily: "'Cairo', sans-serif", fontSize: 13 }}>
                {t.category?.split(" ").slice(1).join(" ")}
              </div>
              <div style={{ color: "#555", fontSize: 11, fontFamily: "'Cairo', sans-serif" }}>
                {t.date} {t.note && `· ${t.note}`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 14 }}>
              {fmt(t.amount, currency)}
            </span>
            <button onClick={() => onDelete(transactions.length - 1 - i)} style={{
              background: "none", border: "none", color: "#444",
              cursor: "pointer", fontSize: 16, padding: "0 4px",
            }}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetsPage({ state, setState, currency }) {
  const [from, setFrom] = useState("bank");
  const [to, setTo] = useState("cash");
  const [amount, setAmount] = useState("");
  const [grams, setGrams] = useState("");
  const [karat, setKarat] = useState(21);
  const { assets, setup } = state;

  const handleTransfer = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0 || from === to) return;
    if (from === "gold" && assets.gold < n) { alert("رصيد الذهب غير كافٍ!"); return; }
    if (from !== "gold" && assets[from] < n) { alert("الرصيد غير كافٍ!"); return; }
    const newAssets = { ...assets };
    newAssets[from] = parseFloat((newAssets[from] - n).toFixed(4));
    newAssets[to] = parseFloat((newAssets[to] + n).toFixed(4));
    const transfer = { from, to, amount: n, date: today() };
    setState(s => ({
      ...s,
      assets: newAssets,
      transfers: [...s.transfers, transfer],
    }));
    setAmount("");
  };

  const handleAddGold = () => {
    const g = parseFloat(grams);
    if (!g || g <= 0) return;
    setState(s => ({ ...s, assets: { ...s.assets, gold: parseFloat((s.assets.gold + g).toFixed(4)), goldKarat: parseInt(karat) } }));
    setGrams("");
  };

  const goldVal = goldValue(assets.gold, assets.goldKarat || 24, setup.goldPrice24);
  const totalVal =
    assets.bank + assets.cash + goldVal + assets.stocks;

  const inp = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.15)",
    borderRadius: 10, color: "#e0e0e0", padding: "10px 14px",
    fontFamily: "'Cairo', sans-serif", fontSize: 14, outline: "none",
    direction: "rtl",
  };

  const assetItems = [
    { key: "bank", val: assets.bank, label: "🏦 بنك", unit: currency },
    { key: "cash", val: assets.cash, label: "💵 كاش", unit: currency },
    { key: "gold", val: assets.gold, label: "🥇 ذهب", unit: "غ", sub: `عيار ${assets.goldKarat || 24} ≈ ${fmt(goldVal, currency)}` },
    { key: "stocks", val: assets.stocks, label: "📈 أسهم", unit: currency },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "#888", fontFamily: "'Cairo', sans-serif", fontSize: 12, marginBottom: 4 }}>
          إجمالي الثروة المقدّرة
        </div>
        <div style={{ color: "#d4af37", fontSize: 32, fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
          {fmt(totalVal, currency)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {assetItems.map(a => (
          <div key={a.key} style={{
            background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)",
            borderRadius: 14, padding: 16,
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{a.label.split(" ")[0]}</div>
            <div style={{ color: "#d4af37", fontWeight: 700, fontSize: 18, fontFamily: "'Cairo', sans-serif" }}>
              {a.val.toFixed(a.unit === "غ" ? 3 : 2)} {a.unit}
            </div>
            {a.sub && <div style={{ color: "#666", fontSize: 11, fontFamily: "'Cairo', sans-serif" }}>{a.sub}</div>}
            <div style={{ color: "#888", fontSize: 12, fontFamily: "'Cairo', sans-serif", marginTop: 2 }}>
              {a.label.split(" ").slice(1).join(" ")}
            </div>
          </div>
        ))}
      </div>

      {/* Add Gold */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 14, padding: 18, marginBottom: 16,
      }}>
        <div style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, marginBottom: 12 }}>
          🥇 إضافة ذهب
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <input style={inp} type="number" placeholder="الوزن (غرام)" value={grams} onChange={e => setGrams(e.target.value)} />
          <select style={inp} value={karat} onChange={e => setKarat(e.target.value)}>
            {[24, 22, 21, 18, 14].map(k => <option key={k} value={k}>عيار {k}</option>)}
          </select>
        </div>
        <button onClick={handleAddGold} style={{
          width: "100%", padding: "10px", borderRadius: 10, cursor: "pointer",
          background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)",
          color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontSize: 14,
        }}>
          إضافة
        </button>
      </div>

      {/* Transfer */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 14, padding: 18,
      }}>
        <div style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, marginBottom: 12 }}>
          ⇄ مناقلة بين الأصول
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <select style={inp} value={from} onChange={e => setFrom(e.target.value)}>
            {Object.keys(ASSET_LABELS).map(k => <option key={k} value={k}>{ASSET_LABELS[k]}</option>)}
          </select>
          <select style={inp} value={to} onChange={e => setTo(e.target.value)}>
            {Object.keys(ASSET_LABELS).map(k => <option key={k} value={k}>{ASSET_LABELS[k]}</option>)}
          </select>
        </div>
        <input style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: 10 }}
          type="number" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} />
        <button onClick={handleTransfer} style={{
          width: "100%", padding: "10px", borderRadius: 10, cursor: "pointer",
          background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)",
          color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontSize: 14,
        }}>
          تنفيذ المناقلة
        </button>

        {state.transfers.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: "#555", fontSize: 11, fontFamily: "'Cairo', sans-serif", marginBottom: 8 }}>
              سجل المناقلات
            </div>
            {[...state.transfers].reverse().slice(0, 5).map((t, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                fontFamily: "'Cairo', sans-serif", fontSize: 12, color: "#888",
              }}>
                <span>{ASSET_LABELS[t.from]} ← {ASSET_LABELS[t.to]}</span>
                <span style={{ color: "#d4af37" }}>{fmt(t.amount, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportPage({ state, currency }) {
  const { transactions, monthStart, assets, setup } = state;

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const byCategory = {};
  transactions.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const goldVal = goldValue(assets.gold, assets.goldKarat || 24, setup.goldPrice24);
  const endVals = { bank: assets.bank, cash: assets.cash, gold: goldVal, stocks: assets.stocks };
  const startVals = monthStart;
  const assetKeys = ["bank", "cash", "gold", "stocks"];

  const exportData = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wealth-tracker-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          📊 تقرير الشهر الحالي
        </div>
        <div style={{ color: "#666", fontFamily: "'Cairo', sans-serif", fontSize: 12 }}>
          إجمالي المصروف: <span style={{ color: "#e0e0e0" }}>{fmt(totalSpent, currency)}</span>
          {" "}/ الميزانية: <span style={{ color: "#d4af37" }}>{fmt(setup.budget, currency)}</span>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 14, padding: 18, marginBottom: 16,
      }}>
        <div style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
          المصاريف حسب الفئة
        </div>
        {sorted.length === 0 && <div style={{ color: "#444", fontFamily: "'Cairo', sans-serif", fontSize: 13, textAlign: "center" }}>لا بيانات</div>}
        {sorted.map(([cat, val]) => {
          const pct = totalSpent > 0 ? (val / totalSpent) * 100 : 0;
          return (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#ccc", fontFamily: "'Cairo', sans-serif", fontSize: 13 }}>{cat}</span>
                <span style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontSize: 13 }}>{fmt(val, currency)}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 100, height: 5 }}>
                <div style={{
                  width: `${pct}%`, height: "100%", borderRadius: 100,
                  background: "linear-gradient(90deg, #d4af37, #b8962e)",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly savings change */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 14, padding: 18, marginBottom: 16,
      }}>
        <div style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
          التغير الشهري في المدخرات
        </div>
        {assetKeys.map(k => {
          const start = startVals[k] || 0;
          const end = endVals[k] || 0;
          const diff = end - start;
          const label = ASSET_LABELS[k];
          return (
            <div key={k} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              fontFamily: "'Cairo', sans-serif",
            }}>
              <span style={{ color: "#888", fontSize: 13 }}>{label}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#ccc", fontSize: 12 }}>
                  {fmt(start, currency)} ← {fmt(end, currency)}
                </div>
                <div style={{
                  color: diff >= 0 ? "#2ecc71" : "#e74c3c", fontSize: 12, fontWeight: 700,
                }}>
                  {diff >= 0 ? "▲" : "▼"} {fmt(Math.abs(diff), currency)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export */}
      <button onClick={exportData} style={{
        width: "100%", padding: "12px", borderRadius: 10, cursor: "pointer",
        background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)",
        color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontSize: 14,
        fontWeight: 700,
      }}>
        ⬇ تصدير البيانات (JSON)
      </button>
    </div>
  );
}

function SetupPage({ state, setState }) {
  const { setup, assets } = state;
  const [form, setForm] = useState({
    salary: setup.salary || "",
    budget: setup.budget || "",
    goldPrice24: setup.goldPrice24 || "",
    currency: setup.currency || "JD",
  });
  const [dist, setDist] = useState({
    bank: assets.bank || "",
    cash: assets.cash || "",
    gold: assets.gold || "",
    stocks: assets.stocks || "",
  });

  const savings = parseFloat(form.salary || 0) - parseFloat(form.budget || 0);

  const handleSave = () => {
    const newSetup = {
      salary: parseFloat(form.salary) || 0,
      budget: parseFloat(form.budget) || 0,
      goldPrice24: parseFloat(form.goldPrice24) || 0,
      currency: form.currency,
    };
    const newAssets = {
      ...assets,
      bank: parseFloat(dist.bank) || 0,
      cash: parseFloat(dist.cash) || 0,
      gold: parseFloat(dist.gold) || 0,
      stocks: parseFloat(dist.stocks) || 0,
    };
    const monthStart = { bank: newAssets.bank, cash: newAssets.cash, gold: newAssets.gold, stocks: newAssets.stocks };
    setState(s => ({ ...s, setup: newSetup, assets: newAssets, monthStart, setupDone: true }));
    alert("تم حفظ الإعداد ✓");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        setState(imported);
        alert("تم استيراد البيانات ✓");
      } catch { alert("ملف غير صالح"); }
    };
    reader.readAsText(file);
  };

  const inp = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.15)",
    borderRadius: 10, color: "#e0e0e0", padding: "10px 14px", width: "100%",
    fontFamily: "'Cairo', sans-serif", fontSize: 14, outline: "none",
    boxSizing: "border-box", direction: "rtl", marginBottom: 10,
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ color: "#d4af37", fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
        ⚙ إعداد الشهر
      </div>

      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 14, padding: 18, marginBottom: 16,
      }}>
        <div style={{ color: "#888", fontFamily: "'Cairo', sans-serif", fontSize: 13, marginBottom: 12 }}>الراتب والميزانية</div>
        <input style={inp} type="number" placeholder="الراتب الشهري" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
        <input style={inp} type="number" placeholder="مبلغ الصرف (سقف)" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
        <input style={inp} type="number" placeholder="سعر غرام الذهب عيار 24 (مرجعي)" value={form.goldPrice24} onChange={e => setForm(f => ({ ...f, goldPrice24: e.target.value }))} />
        <select style={inp} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
          {["JD", "SAR", "USD", "EGP"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {savings > 0 && (
          <div style={{
            background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)",
            borderRadius: 10, padding: "8px 14px", fontFamily: "'Cairo', sans-serif",
            fontSize: 13, color: "#2ecc71",
          }}>
            💰 الادخار المبدئي: {fmt(savings, form.currency)}
          </div>
        )}
      </div>

      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.1)",
        borderRadius: 14, padding: 18, marginBottom: 16,
      }}>
        <div style={{ color: "#888", fontFamily: "'Cairo', sans-serif", fontSize: 13, marginBottom: 12 }}>توزيع الأصول الافتتاحي</div>
        {Object.keys(ASSET_LABELS).map(k => (
          <input key={k} style={inp} type="number"
            placeholder={`${ASSET_LABELS[k]} ${k === "gold" ? "(غرام)" : `(${form.currency})`}`}
            value={dist[k]} onChange={e => setDist(d => ({ ...d, [k]: e.target.value }))}
          />
        ))}
      </div>

      <button onClick={handleSave} style={{
        width: "100%", padding: "13px", borderRadius: 10, cursor: "pointer",
        background: "linear-gradient(135deg, #d4af37, #b8962e)",
        border: "none", color: "#0a0a0a", fontWeight: 700,
        fontFamily: "'Cairo', sans-serif", fontSize: 15, marginBottom: 10,
      }}>
        حفظ الإعداد
      </button>

      <label style={{
        display: "block", width: "100%", padding: "10px", borderRadius: 10, cursor: "pointer",
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
        color: "#888", fontFamily: "'Cairo', sans-serif", fontSize: 14, textAlign: "center",
        boxSizing: "border-box",
      }}>
        ⬆ استيراد بيانات (JSON)
        <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
      </label>

      <button onClick={() => {
        if (window.confirm("هل أنت متأكد؟ سيتم حذف جميع البيانات!")) {
          saveState(defaultState);
          window.location.reload();
        }
      }} style={{
        width: "100%", padding: "10px", borderRadius: 10, cursor: "pointer",
        background: "transparent", border: "1px solid rgba(231,76,60,0.3)",
        color: "#e74c3c", fontFamily: "'Cairo', sans-serif", fontSize: 13, marginTop: 8,
      }}>
        🗑 إعادة تعيين كاملة
      </button>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  const [state, setStateRaw] = useState(loadState);
  const [page, setPage] = useState("home");
  const [deficitModal, setDeficitModal] = useState(null);

  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      saveState(next);
      return next;
    });
  }, []);

  const { setup, assets, transactions } = state;
  const currency = setup.currency || "JD";

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);

  const handleAddExpense = (entry) => {
    const remaining = setup.budget - totalSpent;
    if (entry.amount > remaining && remaining >= 0) {
      const overAmount = entry.amount - remaining;
      setDeficitModal({ entry, overAmount });
      return;
    }
    setState(s => ({ ...s, transactions: [...s.transactions, entry] }));
  };

  const handleDeficitConfirm = (assetKey) => {
    const { entry, overAmount } = deficitModal;
    const newAssets = { ...assets };
    newAssets[assetKey] = parseFloat((newAssets[assetKey] - overAmount).toFixed(4));
    setState(s => ({
      ...s,
      transactions: [...s.transactions, { ...entry, coveredBy: assetKey, overAmount }],
      assets: newAssets,
    }));
    setDeficitModal(null);
  };

  const handleDeleteTransaction = (idx) => {
    setState(s => {
      const updated = [...s.transactions];
      updated.splice(idx, 1);
      return { ...s, transactions: updated };
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e0e0e0",
      direction: "rtl",
      fontFamily: "'Cairo', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Scheherazade+New:wght@700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder { color: #444; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        select option { background: #111; color: #e0e0e0; }
      `}</style>

      <TopBar page={page} setPage={setPage} />

      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>
        {page === "home" && (
          <div style={{ padding: 20 }}>
            {!state.setupDone && (
              <div style={{
                background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 12, padding: 14, marginBottom: 20,
                fontFamily: "'Cairo', sans-serif", fontSize: 13, color: "#d4af37",
                textAlign: "center", cursor: "pointer",
              }} onClick={() => setPage("setup")}>
                ⚠️ لم يتم الإعداد بعد — اضغط هنا للبدء
              </div>
            )}
            <BudgetGauge spent={totalSpent} budget={setup.budget} currency={currency} />
            <AddExpenseForm onAdd={handleAddExpense} categories={CATEGORIES} />
            <TransactionList
              transactions={transactions}
              currency={currency}
              onDelete={handleDeleteTransaction}
            />
          </div>
        )}
        {page === "assets" && (
          <AssetsPage state={state} setState={setState} currency={currency} />
        )}
        {page === "report" && (
          <ReportPage state={state} currency={currency} />
        )}
        {page === "setup" && (
          <SetupPage state={state} setState={setState} />
        )}
      </div>

      {deficitModal && (
        <DeficitModal
          amount={deficitModal.overAmount}
          assets={assets}
          currency={currency}
          onConfirm={handleDeficitConfirm}
          onCancel={() => setDeficitModal(null)}
        />
      )}
    </div>
  );
}
