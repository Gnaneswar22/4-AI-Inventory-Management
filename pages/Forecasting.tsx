import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  Package, BarChart2, Calendar, ChevronDown, ArrowUpRight,
  ArrowDownRight, Info, Loader2, Zap, X
} from 'lucide-react';
import { forecastAPI } from '../services/apiService';

// ── types ──────────────────────────────────────────────────────────────────
type Horizon = '30d' | '60d' | '90d';

interface HorizonSummary {
  total_predicted_qty: number;
  avg_daily_qty: number;
  peak_date: string;
  peak_qty: number;
  low_date: string;
  low_qty: number;
}

interface ProductForecast {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  price: number;
  modelMAE: number;
  modelRMSE: number;
  trendPercent: number;
  restockSuggested: number;
  insightReason?: string;
  generatedAt: string;
  forecasts: Record<Horizon, HorizonSummary>;
}

interface ForecastData {
  generatedAt: string;
  forecastedUpTo: string;
  horizons: string[];
  products: ProductForecast[];
}

interface DailyPoint { date: string; predicted_qty: number; }

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => n?.toLocaleString('en-IN') ?? '—';
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const HORIZON_LABELS: Record<Horizon, string> = {
  '30d': 'Next 30 Days', '60d': 'Next 60 Days', '90d': 'Next 90 Days',
};
const CATEGORY_COLORS: Record<string, string> = {
  Electronics: 'bg-blue-100 text-blue-800',
  Shoes: 'bg-emerald-100 text-emerald-800',
  Watches: 'bg-violet-100 text-violet-800',
  Clothing: 'bg-amber-100 text-amber-800',
  Accessories: 'bg-rose-100 text-rose-800',
  Books: 'bg-indigo-100 text-indigo-800',
  'Home & Kitchen': 'bg-teal-100 text-teal-800',
};

// ── tiny sparkline ─────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: DailyPoint[]; color?: string }> = ({
  data, color = '#6366f1',
}) => {
  if (!data.length) return null;
  const W = 120, H = 36, pad = 2;
  const vals = data.map(d => d.predicted_qty);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const range = mx - mn || 1;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - mn) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${pad},${H - pad} ${pts} ${W - pad},${H - pad}`}
        fill={color} fillOpacity="0.1" stroke="none" />
    </svg>
  );
};

// ── mini bar chart ─────────────────────────────────────────────────────────
const MiniBar: React.FC<{ data: DailyPoint[]; horizon: Horizon }> = ({ data, horizon }) => {
  if (!data.length) return null;
  // group by week
  const weeks: { label: string; total: number }[] = [];
  let i = 0;
  while (i < data.length) {
    const chunk = data.slice(i, i + 7);
    weeks.push({
      label: `W${Math.floor(i / 7) + 1}`,
      total: chunk.reduce((s, d) => s + d.predicted_qty, 0),
    });
    i += 7;
  }
  const mx = Math.max(...weeks.map(w => w.total));
  return (
    <div className="flex items-end gap-1 h-16 mt-3">
      {weeks.map((w) => (
        <div key={w.label} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500"
            style={{ height: `${Math.max(4, (w.total / mx) * 52)}px` }}
            title={`${w.label}: ${Math.round(w.total)} units`}
          />
          <span className="text-[9px] text-slate-500 font-medium">{w.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── forecast insights panel ────────────────────────────────────────────────
const ForecastInsightsPanel: React.FC<{
  selectedKpi: string | null;
  data: ForecastData;
  horizon: Horizon;
  onClose: () => void;
}> = ({ selectedKpi, data, horizon, onClose }) => {
  if (!selectedKpi) return null;

  let content = null;
  const products = data.products;

  if (selectedKpi === 'Total Forecasted Units') {
    const topVolume = [...products]
      .sort((a, b) => (b.forecasts?.[horizon]?.total_predicted_qty || 0) - (a.forecasts?.[horizon]?.total_predicted_qty || 0));
    content = (
      <div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="text-indigo-500" size={18} /> Highest Demand Drivers (Top 5)
        </h4>
        <div className="space-y-2">
          {topVolume.slice(0, 5).map(p => {
            const qty = Math.round(p.forecasts?.[horizon]?.total_predicted_qty || 0);
            return (
              <div key={p.productId} className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                <span className="font-medium text-sm text-slate-800">{p.productName}</span>
                <span className="font-bold text-indigo-700 text-sm">{qty} units predicted</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (selectedKpi === 'Forecasted Revenue') {
    const topRevenue = [...products]
      .map(p => ({ ...p, expRev: (p.forecasts?.[horizon]?.total_predicted_qty || 0) * p.price }))
      .sort((a, b) => b.expRev - a.expRev);
    content = (
      <div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={18} /> Top Revenue Drivers (Top 5)
        </h4>
        <div className="space-y-2">
          {topRevenue.slice(0, 5).map(p => (
            <div key={p.productId} className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
              <span className="font-medium text-sm text-slate-800">{p.productName}</span>
              <span className="font-bold text-emerald-700 text-sm">₹{(p.expRev / 1000).toFixed(1)}k</span>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (selectedKpi === 'Need Restocking') {
    const restockers = products.filter(p => p.restockSuggested > 0)
      .sort((a, b) => b.restockSuggested - a.restockSuggested);
    content = (
      <div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={18} /> AI Restock Recommendations
        </h4>
        {restockers.length > 0 ? (
          <div className="space-y-3">
            {restockers.map(p => (
              <div key={p.productId} className="flex flex-col p-3 bg-amber-50 rounded-xl border border-amber-100/80 gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-amber-900">{p.productName}</span>
                  <span className="font-bold text-white bg-amber-500 px-2 py-0.5 rounded text-xs shadow-sm">
                    Order +{p.restockSuggested}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-amber-700">
                  <Zap size={13} className="mt-0.5 flex-shrink-0 opacity-70" />
                  <span>{p.insightReason}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No products currently flagged by ML for immediate restocking.</p>
        )}
      </div>
    );
  } else if (selectedKpi === 'Rising Demand') {
    const growers = products.filter(p => p.trendPercent > 0)
      .sort((a, b) => b.trendPercent - a.trendPercent);
    content = (
      <div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart2 className="text-violet-500" size={18} /> Products with Upward Trend
        </h4>
        {growers.length > 0 ? (
          <div className="space-y-3">
            {growers.map(p => (
              <div key={p.productId} className="flex flex-col p-3 bg-violet-50 rounded-xl border border-violet-100/80 gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-violet-900">{p.productName}</span>
                  <span className="font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded text-xs">
                    +{p.trendPercent.toFixed(1)}% growth
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-violet-700">
                  <Zap size={13} className="mt-0.5 flex-shrink-0 opacity-70" />
                  <span>{p.insightReason}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No products showing strong positive trends currently.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
      <div className="absolute top-0 right-0 p-4">
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>
      {content}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
const Forecasting: React.FC = () => {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>('30d');
  const [selectedProduct, setSelected] = useState<ProductForecast | null>(null);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [dailyLoading, setDailyLoad] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCatFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'demand' | 'trend' | 'restock' | 'name'>('demand');
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  // ── fetch all forecasts ────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await forecastAPI.getAll();
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load forecasts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── fetch daily when product / horizon changes ────────────────────────
  useEffect(() => {
    if (!selectedProduct) return;
    setDailyLoad(true);
    forecastAPI.getDaily(selectedProduct.productId, horizon)
      .then(r => setDailyData(r.daily || []))
      .catch(() => setDailyData([]))
      .finally(() => setDailyLoad(false));
  }, [selectedProduct, horizon]);

  // ── derived lists ──────────────────────────────────────────────────────
  const categories = useMemo(() => {
    if (!data) return [];
    return ['All', ...Array.from(new Set(data.products.map(p => p.category)))];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.products;
    if (categoryFilter !== 'All')
      list = list.filter(p => p.category === categoryFilter);
    if (search.trim())
      list = list.filter(p =>
        p.productName.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      const aq = a.forecasts?.[horizon]?.total_predicted_qty ?? 0;
      const bq = b.forecasts?.[horizon]?.total_predicted_qty ?? 0;
      if (sortBy === 'demand') return bq - aq;
      if (sortBy === 'trend') return b.trendPercent - a.trendPercent;
      if (sortBy === 'restock') return b.restockSuggested - a.restockSuggested;
      return a.productName.localeCompare(b.productName);
    });
  }, [data, horizon, search, categoryFilter, sortBy]);

  // ── summary KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!data) return null;
    const prods = data.products;
    const totalQty = prods.reduce(
      (s, p) => s + (p.forecasts?.[horizon]?.total_predicted_qty ?? 0), 0);
    const totalRevenue = prods.reduce(
      (s, p) => s + (p.forecasts?.[horizon]?.total_predicted_qty ?? 0) * p.price, 0);
    const restockCount = prods.filter(p => p.restockSuggested > 0).length;
    const risingCount = prods.filter(p => p.trendPercent > 0).length;
    const days = parseInt(horizon);
    return { totalQty, totalRevenue, restockCount, risingCount, days };
  }, [data, horizon]);

  // ──────────────────────────────────────────────────────────────────────
  // RENDER STATES
  // ──────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <p className="text-slate-500 font-medium">Loading ML forecasts…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
        <AlertTriangle className="text-red-500" size={28} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-800 text-lg">Forecasts Not Available</p>
        <p className="text-slate-500 text-sm mt-1 max-w-sm">{error}</p>
        <p className="text-slate-400 text-xs mt-2">
          Run <code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-mono">
            python train_forecast_model.py
          </code> in the backend folder, then refresh.
        </p>
      </div>
      <button onClick={load}
        className="mt-2 flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-md shadow-indigo-200">
        <RefreshCw size={15} /> Retry
      </button>
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6 pb-10">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap size={22} className="text-indigo-500" />
            Demand Forecasting
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ML-powered (Ridge Regression) · Trained on {fmt(12806)} synthetic records ·
            Forecasted up to{' '}
            <span className="font-semibold text-slate-700">
              {new Date(data.forecastedUpTo).toLocaleDateString('en-IN',
                { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Generated</span>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
            {new Date(data.generatedAt).toLocaleDateString('en-IN',
              { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={load}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm">
            <RefreshCw size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── HORIZON TABS ── */}
      <div className="inline-flex bg-white rounded-2xl p-1 border border-slate-200 shadow-sm gap-1">
        {(['30d', '60d', '90d'] as Horizon[]).map(h => (
          <button key={h} onClick={() => setHorizon(h)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${horizon === h
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}>
            {HORIZON_LABELS[h]}
          </button>
        ))}
      </div>

      {/* ── KPI CARDS ── */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setSelectedKpi(selectedKpi === 'Total Forecasted Units' ? null : 'Total Forecasted Units')}
            className={`cursor-pointer rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${selectedKpi === 'Total Forecasted Units' ? 'bg-indigo-50 border-indigo-400 border-2 shadow-indigo-100 scale-[1.02]' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wider ${selectedKpi === 'Total Forecasted Units' ? 'text-indigo-700' : 'text-slate-500'}`}>
                Total Forecasted Units
              </span>
              <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Package size={15} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{fmt(Math.round(kpis.totalQty))}</p>
            <p className={`text-xs mt-1 ${selectedKpi === 'Total Forecasted Units' ? 'text-indigo-600' : 'text-slate-400'}`}>across all products · {kpis.days} days</p>
          </div>

          <div
            onClick={() => setSelectedKpi(selectedKpi === 'Forecasted Revenue' ? null : 'Forecasted Revenue')}
            className={`cursor-pointer rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${selectedKpi === 'Forecasted Revenue' ? 'bg-emerald-50 border-emerald-400 border-2 shadow-emerald-100 scale-[1.02]' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wider ${selectedKpi === 'Forecasted Revenue' ? 'text-emerald-700' : 'text-slate-500'}`}>
                Forecasted Revenue
              </span>
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={15} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              ₹{fmt(Math.round(kpis.totalRevenue / 1000))}K
            </p>
            <p className={`text-xs mt-1 ${selectedKpi === 'Forecasted Revenue' ? 'text-emerald-600' : 'text-slate-400'}`}>estimated at current prices</p>
          </div>

          <div
            onClick={() => setSelectedKpi(selectedKpi === 'Need Restocking' ? null : 'Need Restocking')}
            className={`cursor-pointer rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${selectedKpi === 'Need Restocking' ? 'bg-amber-50 border-amber-400 border-2 shadow-amber-100 scale-[1.02]' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wider ${selectedKpi === 'Need Restocking' ? 'text-amber-700' : 'text-slate-500'}`}>
                Need Restocking
              </span>
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={15} className="text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.restockCount}</p>
            <p className={`text-xs mt-1 ${selectedKpi === 'Need Restocking' ? 'text-amber-600' : 'text-slate-400'}`}>products suggested for restock</p>
          </div>

          <div
            onClick={() => setSelectedKpi(selectedKpi === 'Rising Demand' ? null : 'Rising Demand')}
            className={`cursor-pointer rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${selectedKpi === 'Rising Demand' ? 'bg-violet-50 border-violet-400 border-2 shadow-violet-100 scale-[1.02]' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wider ${selectedKpi === 'Rising Demand' ? 'text-violet-700' : 'text-slate-500'}`}>
                Rising Demand
              </span>
              <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
                <BarChart2 size={15} className="text-violet-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.risingCount}</p>
            <p className={`text-xs mt-1 ${selectedKpi === 'Rising Demand' ? 'text-violet-600' : 'text-slate-400'}`}>products with positive trend</p>
          </div>
        </div>
      )}

      {selectedKpi && (
        <ForecastInsightsPanel
          selectedKpi={selectedKpi}
          data={data}
          horizon={horizon}
          onClose={() => setSelectedKpi(null)}
        />
      )}

      {/* ── FILTERS & SORT ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product…"
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm"
        />
        <select value={categoryFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 shadow-sm">
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 shadow-sm">
          <option value="demand">Sort: Highest Demand</option>
          <option value="trend">Sort: Trend %</option>
          <option value="restock">Sort: Restock Urgency</option>
          <option value="name">Sort: A–Z</option>
        </select>
      </div>

      <div className="w-full">

        {/* ── PRODUCT TABLE ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-base">
              Product Forecasts
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({filtered.length} products)
              </span>
            </h2>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1 rounded-full">
              {HORIZON_LABELS[horizon]}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Forecast Qty</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Avg / Day</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Trend</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Restock</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">MAE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => {
                  const h = p.forecasts?.[horizon];
                  const isSelected = selectedProduct?.productId === p.productId;
                  return (
                    <React.Fragment key={p.productId}>
                      <tr
                        onClick={() => setSelected(isSelected ? null : p)}
                        className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-indigo-50 hover:bg-indigo-50'
                          : 'hover:bg-slate-50'
                          }`}>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {p.productName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[p.category] ?? 'bg-slate-100 text-slate-600'
                              }`}>
                              {p.category}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Stock: {p.currentStock}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          {fmt(Math.round(h?.total_predicted_qty ?? 0))}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-600">
                          {h?.avg_daily_qty?.toFixed(1) ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${p.trendPercent >= 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {p.trendPercent >= 0
                              ? <ArrowUpRight size={11} />
                              : <ArrowDownRight size={11} />}
                            {Math.abs(p.trendPercent).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {p.restockSuggested > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                              +{fmt(p.restockSuggested)}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">OK</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center text-xs text-slate-400 font-mono">
                          {p.modelMAE?.toFixed(2)}
                        </td>
                      </tr>

                      {isSelected && (
                        <tr className="bg-slate-50/50 border-b-2 border-indigo-100">
                          <td colSpan={6} className="p-0">
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                              {/* Product Detail Card */}
                              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                                      {selectedProduct.productName}
                                    </h3>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block ${CATEGORY_COLORS[selectedProduct.category] ?? 'bg-slate-100 text-slate-600'
                                      }`}>
                                      {selectedProduct.category}
                                    </span>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${selectedProduct.trendPercent >= 0
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {selectedProduct.trendPercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {selectedProduct.trendPercent >= 0 ? '+' : ''}{selectedProduct.trendPercent}%
                                  </span>
                                </div>

                                {/* Horizon summary row */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                  {(['30d', '60d', '90d'] as Horizon[]).map(h => {
                                    const fc = selectedProduct.forecasts?.[h];
                                    return (
                                      <div key={h}
                                        onClick={() => setHorizon(h)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all ${horizon === h
                                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                                          }`}>
                                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${horizon === h ? 'text-indigo-200' : 'text-slate-500'}`}>
                                          {h}
                                        </p>
                                        <p className={`text-lg font-bold mt-0.5 ${horizon === h ? 'text-white' : 'text-slate-900'}`}>
                                          {fmt(Math.round(fc?.total_predicted_qty ?? 0))}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Peak & Low & MAE */}
                                {selectedProduct.forecasts?.[horizon] && (
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Peak Day</p>
                                      <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">
                                        {fmtDate(selectedProduct.forecasts[horizon].peak_date)}
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        {Math.round(selectedProduct.forecasts[horizon].peak_qty)} units
                                      </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Low Day</p>
                                      <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">
                                        {fmtDate(selectedProduct.forecasts[horizon].low_date)}
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        {Math.round(selectedProduct.forecasts[horizon].low_qty)} units
                                      </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Model MAE</p>
                                      <p className="font-bold text-slate-800 text-sm mt-0.5">
                                        {selectedProduct.modelMAE?.toFixed(2)}
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        Avg Error
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* AI Insight */}
                                {selectedProduct.insightReason && (
                                  <div className="mt-4 bg-indigo-50/80 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                                    <Zap size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                                        AI Reasoning
                                      </p>
                                      <p className="text-sm text-indigo-800 mt-1 leading-relaxed">
                                        {selectedProduct.insightReason}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Restock suggestion */}
                                {selectedProduct.restockSuggested > 0 && (
                                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                                        Restock Suggested
                                      </p>
                                      <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                                        Order <strong>{fmt(selectedProduct.restockSuggested)}</strong> units to fulfil {HORIZON_LABELS['30d'].toLowerCase()} demand + 25% buffer.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Daily Chart */}
                              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                                <h4 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                                  <Calendar size={18} className="text-indigo-500" />
                                  Daily Forecast
                                  <span className="ml-auto text-xs font-normal text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg">{HORIZON_LABELS[horizon]}</span>
                                </h4>
                                {dailyLoading ? (
                                  <div className="flex-1 flex items-center justify-center min-h-[150px]">
                                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                                  </div>
                                ) : (
                                  <div className="flex-1 flex flex-col">
                                    <div className="mt-4 mb-2">
                                      <MiniBar data={dailyData} horizon={horizon} />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 font-medium pb-4 border-b border-slate-100">
                                      <span>{dailyData[0]?.date ? fmtDate(dailyData[0].date) : ''}</span>
                                      <span>{dailyData[dailyData.length - 1]?.date
                                        ? fmtDate(dailyData[dailyData.length - 1].date) : ''}</span>
                                    </div>
                                    <div className="mt-3 flex-1 overflow-y-auto max-h-[180px] divide-y divide-slate-50 relative pr-2 styled-scrollbar">
                                      {dailyData.slice(0, 30).map(d => (
                                        <div key={d.date} className="flex justify-between py-2.5 text-sm hover:bg-slate-50 px-2 rounded-lg transition-colors">
                                          <span className="text-slate-600 font-medium">{fmtDate(d.date)}</span>
                                          <span className="font-bold text-slate-900">
                                            {Math.round(d.predicted_qty)} units
                                          </span>
                                        </div>
                                      ))}
                                      {dailyData.length > 30 && (
                                        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-1">
                                          <p className="text-xs text-indigo-500 font-semibold text-center hover:text-indigo-600 transition-colors cursor-pointer">
                                            +{dailyData.length - 30} more days computed
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODEL INFO FOOTER ── */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="font-semibold text-slate-700">Model: Ridge Regression (NumPy, closed-form)</span>
        </div>
        <span>· L2 regularisation (α=0.5) · lag features (1,3,7,14,30d)</span>
        <span>· Rolling averages (7,14,30d)</span>
        <span>· Cyclic month/weekday encodings</span>
        <span className="ml-auto font-medium text-slate-600">
          Trained on 12,806 records · 15 months of data
        </span>
      </div>
    </div>
  );
};

export default Forecasting;
