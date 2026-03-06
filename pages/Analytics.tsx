import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, DollarSign, Package, AlertCircle, ArrowUpRight, ArrowDownRight, Target, X } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-100 min-w-[180px]">
        <p className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-50 pb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm mb-1 last:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-500 capitalize font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-slate-700">
              {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue')
                ? `₹${entry.value.toLocaleString()}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsInsightsPanel = ({ selectedKpi, products, sales, onClose }: any) => {
  if (!selectedKpi) return null;

  let content = null;
  if (selectedKpi === 'Avg. Order Value') {
    const topOrders = [...sales].sort((a: any, b: any) => b.totalPrice - a.totalPrice).slice(0, 5);
    content = (
      <div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <DollarSign className="text-indigo-500" size={18} /> Highest Value Transactions
        </h4>
        <div className="space-y-2">
          {topOrders.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
              <div className="flex flex-col">
                <span className="font-medium text-sm text-slate-800">{s.customerName || 'Walk-in Guest'}</span>
                <span className="text-xs text-slate-500">{new Date(s.date).toLocaleDateString()} &middot; {s.quantity}x {s.productName}</span>
              </div>
              <span className="font-bold text-indigo-700 text-sm">₹{s.totalPrice.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (selectedKpi === 'Total Revenue') {
    const revenueByDate: Record<string, number> = {};
    sales.forEach((s: any) => {
      const d = new Date(s.date).toLocaleDateString();
      revenueByDate[d] = (revenueByDate[d] || 0) + s.totalPrice;
    });
    const topDays = Object.entries(revenueByDate).sort((a, b) => b[1] - a[1]).slice(0, 5);
    content = (
      <div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={18} /> Highest Grossing Days
        </h4>
        <div className="space-y-2">
          {topDays.map(([date, rev]) => (
            <div key={date} className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
              <span className="font-medium text-sm text-slate-800">{date}</span>
              <span className="font-bold text-emerald-700 text-sm">₹{rev.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (selectedKpi === 'Top Performing Cat.') {
    const catData = products.reduce((acc: any[], p: any) => {
      const existing = acc.find((c: any) => c.name === p.category);
      const val = p.price * p.stockQuantity;
      if (existing) {
        existing.value += val;
      } else {
        acc.push({ name: p.category, value: val });
      }
      return acc;
    }, []).sort((a: any, b: any) => b.value - a.value);

    content = (
      <div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <PieIcon className="text-blue-500" size={18} /> Categories by Valuation
        </h4>
        <div className="space-y-2">
          {catData.map((c: any) => (
            <div key={c.name} className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
              <span className="font-medium text-sm text-slate-800">{c.name}</span>
              <span className="font-bold text-blue-700 text-sm">₹{c.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 mb-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
      <div className="absolute top-0 right-0 p-4">
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>
      {content}
    </div>
  );
};

const Analytics: React.FC = () => {
  const { products, sales, predictions } = useData();
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  // --- Data Preparation ---

  // 1. Category Distribution (Stock Value)
  const categoryData = products.reduce((acc: any[], product) => {
    const existing = acc.find(c => c.name === product.category);
    const value = product.price * product.stockQuantity;
    if (existing) {
      existing.value += value;
      existing.count += product.stockQuantity;
    } else {
      acc.push({ name: product.category, value, count: product.stockQuantity });
    }
    return acc;
  }, []);

  // 2. Sales Trend — built dynamically based on selected window (see visibleSalesTrend below)

  // 3. Top 5 Products by Revenue
  const productPerformance = products.map(p => {
    const pSales = sales.filter(s => s.productId === p.id);
    const totalRevenue = pSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalSold = pSales.reduce((sum, s) => sum + s.quantity, 0);
    return {
      name: p.name.split(' ').slice(0, 2).join(' '),
      fullName: p.name,
      revenue: totalRevenue,
      sold: totalSold
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // 4. Inventory Health Status
  const healthData = [
    { name: 'Healthy', value: predictions.filter(p => p.status === 'Healthy').length, color: '#10b981' },
    { name: 'Low', value: predictions.filter(p => p.status === 'Low').length, color: '#f59e0b' },
    { name: 'Critical', value: predictions.filter(p => p.status === 'Critical').length, color: '#ef4444' },
    { name: 'Overstocked', value: predictions.filter(p => p.status === 'Overstocked').length, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  // Stats
  const avgOrderValue = sales.length > 0 ? sales.reduce((a, b) => a + b.totalPrice, 0) / sales.length : 0;
  const totalRevenue = sales.reduce((a, b) => a + b.totalPrice, 0);

  // Compute real trend: compare most recent half of sales vs older half
  const computeTrend = (values: number[]): string => {
    if (values.length < 2) return '';
    const mid = Math.floor(values.length / 2);
    const older = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const recent = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
    if (older === 0) return '';
    const pct = ((recent - older) / older) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };
  const allPrices = [...sales].reverse().map(s => s.totalPrice);   // chronological
  const allAOVs = [...sales].reverse().map(s => s.totalPrice);   // per-transaction AOV proxy
  const revenueTrend = computeTrend(allPrices);
  const aovTrend = computeTrend(allAOVs);

  const StatCard = ({ title, value, icon: Icon, color, trend, isSelected, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white p-6 rounded-[2rem] shadow-sm border relative overflow-hidden group hover:shadow-lg transition-all duration-300 ${isSelected ? `ring-2 ring-${color}-500 scale-[1.02]` : 'border-slate-100'}`}
    >
      {/* Glow Effect */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 bg-${color}-500 blur-2xl group-hover:opacity-30 transition-opacity`}></div>

      <div className="flex justify-between items-start mb-6">
        <div className={`p-3.5 rounded-2xl bg-${color}-50 text-${color}-600 ring-4 ring-${color}-50/50`}>
          <Icon size={24} />
        </div>
        {trend && (() => {
          const isNeg = trend.startsWith('-');
          return (
            <span className={`${isNeg ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border`}>
              {isNeg ? <ArrowDownRight size={12} strokeWidth={3} /> : <ArrowUpRight size={12} strokeWidth={3} />} {trend}
            </span>
          );
        })()}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-semibold mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-800">{value}</h3>
      </div>
    </button>
  );

  const [trendLimit, setTrendLimit] = useState<20 | 50 | 0>(20);

  // Build the chart data for the selected window — newest-N reversed to chronological
  const buildTrendData = (limit: 20 | 50 | 0) => {
    const subset = limit === 0 ? sales : sales.slice(0, limit);
    return [...subset].reverse().map(s => ({
      name: new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: s.totalPrice,
      qty: s.quantity,
    }));
  };
  const visibleSalesTrend = buildTrendData(trendLimit);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Financial Intelligence</h1>
          <p className="text-slate-500 mt-2">Deep dive into your inventory performance and sales trends.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:text-indigo-600 shadow-sm transition-colors">
            <Target size={16} /> Set Goals
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Avg. Order Value"
          value={`₹${Math.round(avgOrderValue).toLocaleString()}`}
          icon={DollarSign}
          color="indigo"
          trend={aovTrend || undefined}
          isSelected={selectedKpi === 'Avg. Order Value'}
          onClick={() => setSelectedKpi(selectedKpi === 'Avg. Order Value' ? null : 'Avg. Order Value')}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="emerald"
          trend={revenueTrend || undefined}
          isSelected={selectedKpi === 'Total Revenue'}
          onClick={() => setSelectedKpi(selectedKpi === 'Total Revenue' ? null : 'Total Revenue')}
        />
        <StatCard
          title="Top Performing Cat."
          value={categoryData.sort((a: any, b: any) => b.value - a.value)[0]?.name || 'N/A'}
          icon={PieIcon}
          color="blue"
          isSelected={selectedKpi === 'Top Performing Cat.'}
          onClick={() => setSelectedKpi(selectedKpi === 'Top Performing Cat.' ? null : 'Top Performing Cat.')}
        />
      </div>

      <AnalyticsInsightsPanel
        selectedKpi={selectedKpi}
        products={products}
        sales={sales}
        onClose={() => setSelectedKpi(null)}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Sales Trend Chart */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Revenue Trajectory</h3>
              <p className="text-xs text-slate-400 mt-0.5">{visibleSalesTrend.length} transactions shown · actual sale dates</p>
            </div>
            <select
              value={trendLimit}
              onChange={e => setTrendLimit(Number(e.target.value) as 20 | 50 | 0)}
              className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-600 rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            >
              <option value={20}>Last 20 Txns</option>
              <option value={50}>Last 50 Txns</option>
              <option value={0}>All Time</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleSalesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-8">Top Products by Revenue</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productPerformance} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  stroke="#64748b"
                  fontSize={12}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 8, 8, 0]} barSize={24} animationDuration={1500}>
                  {productPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Donut Chart */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Value by Category</h3>
          <p className="text-sm text-slate-400 mb-6">Stock valuation distribution</p>
          <div className="h-[320px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={8}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;