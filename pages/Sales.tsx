import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { DollarSign, ShoppingCart, Calendar, CheckCircle2, User, MapPin, CreditCard, ChevronRight, Package, Receipt, ScanBarcode, Keyboard, AlertCircle } from 'lucide-react';
import { Product } from '../types';

const Sales: React.FC = () => {
  const { products, recordSale, sales } = useData();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Scanner State
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const scanInputRef = React.useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const totalPrice = selectedProduct ? selectedProduct.price * quantity : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductId) {
      await recordSale(selectedProductId, quantity, customerName, customerAddress);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);

      // Reset form
      setQuantity(1);
      setSelectedProductId('');
      setCustomerName('');
      setCustomerAddress('');
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError('');
    if (!scanInput.trim()) return;

    // Simulate scanning a barcode or product ID/Name
    const product = products.find(p => p.id === scanInput.trim() || p.name.toLowerCase() === scanInput.trim().toLowerCase());

    if (!product) {
      setScanError('Product not found in inventory!');
      setTimeout(() => setScanError(''), 3000);
      setScanInput('');
      return;
    }

    if (product.stockQuantity <= 0) {
      setScanError(`Out of stock! (${product.name})`);
      setTimeout(() => setScanError(''), 3000);
      setScanInput('');
      return;
    }

    await recordSale(product.id, 1, 'POS Scanner', 'In-Store Checkout');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
    setScanInput('');
    // Keep focus for next scan
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-140px)]">

      {/* POS Checkout Card */}
      <div className="lg:col-span-4 h-full">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 h-full flex flex-col relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-violet-500"></div>

          <div className="mb-6 flex-shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Checkout</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">New Transaction Entry</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMode('scan')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'scan' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ScanBarcode size={14} /> Scan
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Keyboard size={14} /> Manual
              </button>
            </div>
          </div>

          {mode === 'manual' ? (
            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
              {/* Product Selection */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Item Details</label>
                <div className="space-y-4">
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium appearance-none transition-all"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">Select Product...</option>
                      {products.filter(p => p.stockQuantity > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{p.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        required
                        type="number"
                        min="1"
                        max={selectedProduct ? selectedProduct.stockQuantity : 100}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-bold"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        placeholder="Qty"
                      />
                    </div>
                    {selectedProduct && (
                      <div className="flex flex-col items-end min-w-[80px]">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Stock</span>
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{selectedProduct.stockQuantity}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Customer Info</label>
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required
                      type="text"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent hover:bg-white hover:border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <textarea
                      required
                      rows={2}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent hover:bg-white hover:border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium resize-none transition-all"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Billing Address"
                    />
                  </div>
                </div>
              </div>

              {/* Total & Action */}
              <div className="mt-auto pt-6 border-t border-slate-50">
                <div className="flex justify-between items-center mb-6 px-2">
                  <span className="text-slate-500 font-medium">Total Payable</span>
                  <div className="text-right">
                    <span className="block text-3xl font-extrabold text-slate-800 tracking-tight">₹{totalPrice.toLocaleString()}</span>
                    <span className="text-xs text-slate-400">Incl. of all taxes</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedProductId}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-xl shadow-slate-200 hover:shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  <span>Process Payment</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleScanSubmit} className="flex-1 flex flex-col justify-center pb-12">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative overflow-hidden group">
                  <div className="absolute inset-0 border-4 border-transparent group-hover:border-indigo-200 rounded-full transition-all"></div>
                  <ScanBarcode size={40} className="relative z-10" />
                  <div className="absolute inset-x-0 h-0.5 bg-indigo-400/50 -top-full animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Scanner Mode Active</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-[200px] mx-auto">Scan barcode or enter Product ID/Name to instantly record a sale.</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <input
                    ref={scanInputRef}
                    autoFocus
                    required
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="w-full text-center text-xl font-mono tracking-widest pl-4 pr-12 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-slate-800 transition-all placeholder:text-slate-300 placeholder:tracking-normal"
                    placeholder="Scan Barcode..."
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {scanInput ? (
                      <button type="submit" className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors">
                        <ChevronRight size={18} />
                      </button>
                    ) : (
                      <Keyboard size={24} className="text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                    )}
                  </div>
                </div>

                {scanError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-semibold p-4 rounded-xl flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={16} />
                    {scanError}
                  </div>
                )}
              </div>
            </form>
          )}

          {isSuccess && (
            <div className="absolute inset-0 bg-white backdrop-blur-sm z-10 flex items-center justify-center rounded-[2rem]">
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-emerald-100 flex flex-col items-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Transaction Complete</h3>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="lg:col-span-8 h-full overflow-hidden">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-full flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Recent Sales
              </h3>
              <p className="text-sm text-slate-400 mt-1">Real-time transaction log</p>
            </div>
            <button className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
              <Receipt size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="p-5 pl-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider rounded-l-xl">Timestamp</th>
                  <th className="p-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Product Info</th>
                  <th className="p-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="p-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Qty</th>
                  <th className="p-5 pr-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right rounded-r-xl">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...sales].reverse().map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="text-sm font-bold text-slate-700">
                        {new Date(sale.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-5 font-medium text-slate-700">
                      <span className="font-bold">{sale.productName}</span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {sale.customerName ? sale.customerName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{sale.customerName || 'Walk-in Guest'}</div>
                          <div className="text-[10px] text-slate-400 max-w-[150px] truncate font-medium" title={sale.customerAddress}>
                            {sale.customerAddress || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right font-mono text-slate-600 font-bold">{sale.quantity}</td>
                    <td className="p-5 pr-6 text-right">
                      <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-sm border border-emerald-100">
                        +₹{sale.totalPrice.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={5} className="p-16 text-center text-slate-400">No sales recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Sales;