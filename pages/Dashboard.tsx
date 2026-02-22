import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';
import { AlertTriangle, TrendingUp, Package, Activity, DollarSign, ShieldCheck, Box, X, Plus, Tag, Factory, ShoppingCart, Layers } from 'lucide-react';

// ─── CUSTOM TOOLTIP (stable) ─────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isLowStock = data.stock < data.min;

    return (
      <div className={`bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border ${isLowStock ? 'border-red-200' : 'border-slate-100'} min-w-[200px]`}>
        <p className="text-sm font-bold text-slate-800 mb-2">{data.fullName}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-slate-500">Current Stock:</span>
            <span className={`font-mono font-bold ${isLowStock ? 'text-red-600' : 'text-indigo-600'}`}>
              {data.stock} units
            </span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-slate-500">Minimum Req:</span>
            <span className="font-mono text-slate-700">{data.min} units</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            {isLowStock ? (
              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} /> CRITICAL: Buy {data.min - data.stock} more
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck size={12} /> Healthy Stock Level
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ─── KPI CARD (stable) ───────────────────────────────
const KPICard: React.FC<{ title: string; value: any; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => {
  const gradients: any = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    indigo: 'from-indigo-500 to-indigo-600',
    rose: 'from-rose-500 to-rose-600',
  };

  const bgGradients: any = {
    blue: 'from-blue-50 to-white',
    emerald: 'from-emerald-50 to-white',
    indigo: 'from-indigo-50 to-white',
    rose: 'from-rose-50 to-white',
  };

  const textColors: any = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
    rose: 'text-rose-600'
  };

  return (
    <div className={`relative p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group bg-gradient-to-br ${bgGradients[color] || 'from-white to-slate-50'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradients[color]} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} />
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-500 font-semibold mb-1">{title}</p>
        <h3 className={`text-3xl font-extrabold ${textColors[color]} tracking-tight`}>{value}</h3>
      </div>
    </div>
  );
};

// ─── QUICK ADD MODAL ─────────────────────────────────
type QuickAddTab = 'product' | 'order';

const QuickAddModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { products, addProduct, restockProduct } = useData();
  const [tab, setTab] = useState<QuickAddTab>('product');

  // Product form
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('');
  const [manufacturer, setManufacturer] = useState('');

  // Order form
  const [orderProductId, setOrderProductId] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Get unique categories from existing products
  const existingCategories = Array.from(new Set(products.map(p => p.category))).sort();

  const resetProductForm = () => {
    setProductName('');
    setCategory('');
    setCustomCategory('');
    setPrice('');
    setStockQuantity('');
    setMinStockLevel('');
    setManufacturer('');
    setSuccessMsg('');
  };

  const resetOrderForm = () => {
    setOrderProductId('');
    setOrderQty('');
    setOrderNote('');
    setSuccessMsg('');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalCategory = category === '__custom__' ? customCategory : category;

    await addProduct({
      name: productName,
      category: finalCategory,
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity),
      minStockLevel: parseInt(minStockLevel),
      manufacturer: manufacturer,
    });

    setSuccessMsg(`✅ "${productName}" added to ${finalCategory}!`);
    setIsSubmitting(false);

    // Reset form after a delay
    setTimeout(() => {
      resetProductForm();
    }, 1500);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const product = products.find(p => p.id === orderProductId);
    await restockProduct(orderProductId, parseInt(orderQty));

    setSuccessMsg(`✅ Order placed! ${orderQty} units of "${product?.name}" restocked from manufacturer.`);
    setIsSubmitting(false);

    setTimeout(() => {
      resetOrderForm();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Quick Add</h2>
              <p className="text-xs text-slate-500">Add products or place manufacturer orders</p>
            </div>
          </div>
          <button onClick={() => { onClose(); resetProductForm(); resetOrderForm(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setTab('product'); setSuccessMsg(''); }}
            className={`flex-1 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2 ${tab === 'product'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            <Package size={16} />
            New Product
          </button>
          <button
            onClick={() => { setTab('order'); setSuccessMsg(''); }}
            className={`flex-1 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2 ${tab === 'order'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            <Factory size={16} />
            Order from Manufacturer
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">

          {/* Success message */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm p-4 rounded-xl mb-5 font-semibold animate-in fade-in duration-200">
              {successMsg}
            </div>
          )}

          {/* ═══ NEW PRODUCT TAB ═══ */}
          {tab === 'product' && (
            <form onSubmit={handleAddProduct} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5"><Layers size={12} /> Category</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select a category...</option>
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">+ Create New Category</option>
                </select>
              </div>

              {/* Custom Category Input */}
              {category === '__custom__' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5"><Tag size={12} /> New Category Name</span>
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="e.g. Stationery, Sports Equipment..."
                    required
                  />
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="e.g. Samsung Galaxy Buds Pro"
                  required
                />
              </div>

              {/* Price + Stock Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="999"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Stock</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="50"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Min Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Minimum Stock Level</label>
                <input
                  type="number"
                  value={minStockLevel}
                  onChange={e => setMinStockLevel(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="10"
                  min="0"
                  required
                />
              </div>

              {/* Manufacturer */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5"><Factory size={12} /> Manufacturer</span>
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={e => setManufacturer(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="e.g. Samsung Electronics, Nike India..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Plus size={18} /> Add Product</>
                )}
              </button>
            </form>
          )}

          {/* ═══ ORDER FROM MANUFACTURER TAB ═══ */}
          {tab === 'order' && (
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
                <ShoppingCart size={14} />
                Place a restock order to replenish inventory from the manufacturer.
              </div>

              {/* Select Product */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Product to Restock</label>
                <select
                  value={orderProductId}
                  onChange={e => setOrderProductId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">Choose a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Stock: {p.stockQuantity} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Show selected product info */}
              {orderProductId && (() => {
                const selectedProduct = products.find(p => p.id === orderProductId);
                if (!selectedProduct) return null;
                const isLow = selectedProduct.stockQuantity < selectedProduct.minStockLevel;
                return (
                  <div className={`p-4 rounded-xl border ${isLow ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'} animate-in fade-in duration-200`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-800">{selectedProduct.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isLow ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-400">Current</p>
                        <p className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-700'}`}>{selectedProduct.stockQuantity}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Min Level</p>
                        <p className="font-bold text-slate-700">{selectedProduct.minStockLevel}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Manufacturer</p>
                        <p className="font-bold text-slate-700 truncate">{selectedProduct.manufacturer}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Order Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Quantity</label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={e => setOrderQty(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="e.g. 100"
                  min="1"
                  required
                />
              </div>

              {/* Order Note */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Note (optional)</label>
                <textarea
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
                  placeholder="e.g. Urgent restock for upcoming Diwali sale..."
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !orderProductId}
                className="w-full mt-2 bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Factory size={18} /> Place Restock Order</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};


// ─── MAIN DASHBOARD COMPONENT ────────────────────────

const Dashboard: React.FC = () => {
  const { products, sales, predictions } = useData();
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Stats
  const totalStock = products.reduce((acc, p) => acc + p.stockQuantity, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.price), 0);
  const lowStockCount = products.filter(p => p.stockQuantity < p.minStockLevel).length;
  const totalSales = sales.reduce((acc, s) => acc + s.totalPrice, 0);

  // Prepare Chart Data
  const chartData = products
    .filter(p => filter === 'all' || (filter === 'low' && p.stockQuantity < p.minStockLevel))
    .map(p => ({
      name: p.name.split(' ')[0],
      fullName: p.name,
      stock: p.stockQuantity,
      min: p.minStockLevel,
      manufacturer: p.manufacturer
    }));

  // Use 10 most recent sales for velocity, reversed for chronological chart (old→new)
  const salesTrendData = sales.slice(0, 10).reverse().map((s) => ({
    name: new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    amount: s.totalPrice,
    product: s.productName
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Intro Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Real-time insights into your inventory health, sales velocity, and AI-driven stock predictions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Quick Add
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Products"
          value={products.length}
          icon={Package}
          color="blue"
        />
        <KPICard
          title="Inventory Value"
          value={`₹${(totalValue / 1000).toFixed(1)}k`}
          icon={DollarSign}
          color="emerald"
        />
        <KPICard
          title="Total Revenue"
          value={`₹${(totalSales / 1000).toFixed(1)}k`}
          icon={TrendingUp}
          color="indigo"
        />
        <KPICard
          title="Low Stock Alerts"
          value={lowStockCount}
          icon={AlertTriangle}
          color={lowStockCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-8">

        {/* Left Column: Charts (60% on XL screens) */}
        <div className="xl:col-span-6 space-y-8">

          {/* Inventory Bar Chart */}
          <div className="bg-gradient-to-br from-white to-slate-50/50 p-8 rounded-[2rem] shadow-lg border border-slate-200 relative overflow-hidden">
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl -z-10"></div>
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Package size={20} className="text-indigo-600" />
                  Stock Distribution
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Live visualization of current inventory vs minimum levels.</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl shadow-inner">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setFilter('low')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'low' ? 'bg-white shadow-md text-rose-600' : 'text-slate-500 hover:text-rose-600'}`}
                >
                  Low Stock
                </button>
              </div>
            </div>

            <div className="h-[380px] w-full">{chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    barGap={0}
                    barSize={40}
                    margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                      fontWeight={500}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      width={40}
                    />
                    <ReTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
                    <Bar
                      dataKey="stock"
                      radius={[12, 12, 12, 12]}
                      animationDuration={1500}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.stock < entry.min ? '#fb7185' : '#6366f1'}
                          fillOpacity={entry.stock < entry.min ? 1 : 0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Package size={40} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No products yet</p>
                    <p className="text-xs mt-1">Add products using Quick Add to see stock distribution</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sales Area Chart */}
          <div className="bg-gradient-to-br from-white to-emerald-50/30 p-8 rounded-[2rem] shadow-lg border border-slate-200 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/50 to-green-100/50 rounded-full blur-[100px] -z-10"></div>

            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-600" />
                  Sales Velocity
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Transaction value trends over last 10 sales.</p>
              </div>
            </div>
            <div className="h-[280px] w-full">{salesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesTrendData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      width={40}
                    />
                    <ReTooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                      itemStyle={{ color: '#059669', fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <TrendingUp size={40} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No sales recorded yet</p>
                    <p className="text-xs mt-1">Sales chart will appear after transactions are made</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Predictions (40% on XL screens) */}
        <div className="xl:col-span-4">
          <div className="bg-gradient-to-br from-white via-white to-indigo-50/30 p-6 rounded-[2rem] shadow-lg border border-slate-200 sticky top-4 max-h-[calc(100vh-120px)] flex flex-col relative overflow-hidden">
            {/* Decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            {/* Animated background decoration */}
            <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-2xl"></div>
            <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl"></div>

            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3.5 rounded-2xl text-white shadow-xl shadow-indigo-200">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">AI Forecasts</h2>
                <p className="text-xs text-slate-500 font-semibold">Advanced Predictive Analytics</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
              {predictions.map((pred) => (
                <div key={pred.productId} className="group relative p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-sm mb-1">{pred.productName}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider ${
                          pred.status === 'Critical' ? 'bg-rose-100 text-rose-600' :
                          pred.status === 'Low' ? 'bg-amber-100 text-amber-600' :
                          pred.status === 'Overstocked' ? 'bg-blue-100 text-blue-600' :
                          'bg-emerald-100 text-emerald-600'
                        }`}>
                          {pred.status}
                        </span>
                        {pred.trend && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-0.5 ${
                            pred.trend === 'increasing' ? 'bg-purple-50 text-purple-600' :
                            pred.trend === 'decreasing' ? 'bg-cyan-50 text-cyan-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {pred.trend === 'increasing' ? '↗' : pred.trend === 'decreasing' ? '↘' : '→'} {pred.trend}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4 bg-white rounded-xl p-3 border border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Stock Runway</p>
                      <p className="text-lg font-bold text-slate-700 flex items-baseline gap-1">
                        {pred.daysRemaining} <span className="text-[10px] text-slate-400 font-normal">days</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Burn Rate</p>
                      <p className="text-lg font-bold text-slate-700 flex items-baseline gap-1">
                        {pred.avgDailyUsage} <span className="text-[10px] text-slate-400 font-normal">/day</span>
                      </p>
                    </div>
                  </div>

                  {/* Advanced AI Metrics */}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-indigo-50/50 rounded-lg p-2 border border-indigo-100/50">
                      <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Reorder Point</p>
                      <p className="text-sm font-bold text-indigo-700">{pred.reorderPoint} units</p>
                    </div>
                    <div className="bg-purple-50/50 rounded-lg p-2 border border-purple-100/50">
                      <p className="text-[9px] text-purple-600 font-bold uppercase tracking-wider mb-0.5">Accuracy</p>
                      <p className="text-sm font-bold text-purple-700">{pred.forecastAccuracy}</p>
                    </div>
                  </div>

                  {/* Stock Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Stock Level</span>
                      <span className="text-[9px] text-slate-600 font-mono font-bold">{pred.currentStock}/{pred.minStockLevel}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          pred.currentStock < pred.minStockLevel * 0.5 ? 'bg-rose-500' :
                          pred.currentStock < pred.minStockLevel ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (pred.currentStock / pred.minStockLevel) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Alert */}
                  {pred.status === 'Critical' && (
                    <div className="mt-3 text-xs text-white font-semibold flex items-center justify-between gap-2 bg-gradient-to-r from-rose-500 to-rose-600 p-3 rounded-xl shadow-lg shadow-rose-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} fill="white" />
                        <span>Order {pred.recommendedOrderQty} units now</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{pred.priority}</span>
                    </div>
                  )}
                  
                  {pred.status === 'Low' && pred.recommendedOrderQty > 0 && (
                    <div className="mt-3 text-xs text-amber-800 font-medium flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                      <span>Recommend ordering {pred.recommendedOrderQty} units</span>
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{pred.priority}</span>
                    </div>
                  )}

                  {pred.status === 'Healthy' && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                  )}

                  {/* Confidence Badge */}
                  <div className="absolute bottom-3 right-3">
                    <div className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      pred.confidence === 'High' ? 'bg-green-100 text-green-700' :
                      pred.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {pred.confidence} AI
                    </div>
                  </div>
                </div>
              ))}
              {predictions.length === 0 && (
                <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                  <Box size={40} className="mb-2 opacity-50" />
                  <span>Gathering data points...</span>
                  <p className="text-xs mt-1">Predictions appear after sales/usage history builds up</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 relative z-10">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">AI Engine Active</span>
                </div>
                <button className="font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider transition-colors">
                  View Full Analytics →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
};

export default Dashboard;