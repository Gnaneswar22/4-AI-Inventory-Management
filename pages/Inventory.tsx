import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, MinusCircle, Search, Filter, RefreshCw, ShoppingCart, Truck, Check, History, ArrowRight, ArrowUp, ArrowDown, Package, MoreHorizontal, Settings2, DollarSign } from 'lucide-react';
import { Product } from '../types';

const Inventory: React.FC = () => {
  const { products, addProduct, deleteProduct, updateProduct, recordUsage, restockProduct, stockLogs } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form States
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', stockQuantity: 0, minStockLevel: 0, price: 0, manufacturer: ''
  });
  const [customCategory, setCustomCategory] = useState('');
  const [usageQty, setUsageQty] = useState(1);

  // Extract unique categories
  const existingCategories = Array.from(new Set(products.map(p => p.category)));
  const categories = ['All', ...existingCategories];

  const totalValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.price), 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle custom category
    const finalCategory = newProduct.category === '__custom__' ? customCategory : newProduct.category;
    
    await addProduct({
      ...newProduct,
      category: finalCategory
    });
    
    closeAddModal();
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewProduct({ name: '', category: '', stockQuantity: 0, minStockLevel: 0, price: 0, manufacturer: '' });
    setCustomCategory('');
  };

  const handleUseStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct && user) {
      await recordUsage(selectedProduct.id, usageQty, user.id, user.name);
      setIsUsageModalOpen(false);
      setUsageQty(1);
    }
  };

  const handleRestock = async (qty: number) => {
    if (selectedProduct) {
      await restockProduct(selectedProduct.id, qty);
      setIsRestockModalOpen(false);
    }
  };

  const getFilteredLogs = () => {
    if (!selectedProduct) return [];
    return stockLogs.filter(log => log.productId === selectedProduct.id);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Category Sidebar - Simplified & Clean */}
      <div className="w-56 flex-shrink-0 bg-white rounded-3xl shadow-sm border border-slate-100 p-5 hidden lg:flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</h3>
          <Settings2 size={16} className="text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" />
        </div>

        <div className="space-y-1.5 overflow-y-auto pr-1 scrollbar-hide flex-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 flex items-center justify-between group ${selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <span>{cat}</span>
              {selectedCategory === cat && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        {/* Header & Controls - Optimized Space */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Management</h1>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {products.length} Products Active
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Moved Stock Value Widget Here */}
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-2 flex items-center gap-3 shadow-sm h-12">
              <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600">
                <DollarSign size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none mb-0.5">Total Value</p>
                <p className="text-sm font-bold text-slate-800 leading-none">₹{(totalValue / 1000).toFixed(1)}k</p>
              </div>
            </div>

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-slate-900 text-white px-5 h-12 rounded-2xl shadow-lg shadow-slate-200 hover:shadow-xl hover:bg-black transition-all duration-300 flex items-center gap-2 font-bold text-sm group"
              >
                <Plus size={18} />
                <span>New Product</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-1.5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search products, brands, SKU..."
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Mobile Category Dropdown */}
          <select
            className="lg:hidden bg-slate-50 border-none rounded-xl px-4 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 mr-1.5 text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Table Container - Maximized Width & Height */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative">
          <div className="overflow-auto flex-1 w-full">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="border-b border-slate-100">
                  <th className="p-4 pl-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Product Info</th>
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Manufacturer</th>
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Stock Level</th>
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Price</th>
                  <th className="p-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 pr-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <Package size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{product.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm font-medium">
                      {product.manufacturer || 'Unknown'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 w-28">
                        <div className="flex justify-between text-[10px] font-bold text-slate-600">
                          <span>{product.stockQuantity}</span>
                          <span className="text-slate-300">/ {product.minStockLevel * 2}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${product.stockQuantity < product.minStockLevel ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                            style={{ width: `${Math.min(100, (product.stockQuantity / (product.minStockLevel * 2)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700 text-sm">₹{product.price.toLocaleString()}</td>
                    <td className="p-4">
                      {product.stockQuantity <= product.minStockLevel ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Good
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedProduct(product); setIsHistoryModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="History"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => { setSelectedProduct(product); setIsRestockModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Restock"
                        >
                          <Truck size={16} />
                        </button>
                        <button
                          onClick={() => { setSelectedProduct(product); setIsUsageModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Record Usage"
                        >
                          <MinusCircle size={16} />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <Package size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium text-slate-400">No products found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Product Modal (Modernized) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={closeAddModal}></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">New Item</h2>
            <p className="text-slate-500 text-sm mb-8">Add a new SKU to the master catalog.</p>

            <form onSubmit={handleAddProduct} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Product Name</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all"
                    value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Nike Air Max" />
                </div>
                
                {/* Enhanced Category Selector */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all appearance-none cursor-pointer"
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    <option value="">Select a category...</option>
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">+ Create New Category</option>
                  </select>
                </div>

                {/* Custom Category Input (conditional) */}
                {newProduct.category === '__custom__' && (
                  <div className="col-span-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Category Name</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all"
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      placeholder="e.g. Electronics, Footwear, Apparel..."
                    />
                  </div>
                )}
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Manufacturer</label>
                  <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all"
                    value={newProduct.manufacturer} onChange={e => setNewProduct({ ...newProduct, manufacturer: e.target.value })} placeholder="e.g. Nike" />
                </div>
                <div></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock Qty</label>
                  <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all"
                    value={newProduct.stockQuantity} onChange={e => setNewProduct({ ...newProduct, stockQuantity: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Min Level</label>
                  <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all"
                    value={newProduct.minStockLevel} onChange={e => setNewProduct({ ...newProduct, minStockLevel: parseInt(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Price (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input required type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 font-medium transition-all"
                      value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeAddModal} className="flex-1 px-4 py-3.5 bg-slate-100 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Other modals (Usage, Restock, History) would follow similar styling updates... */}
      {/* Keeping existing functional logic for modals but assuming similar styling improvements applied */}

      {/* Usage Modal */}
      {isUsageModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setIsUsageModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Record Usage</h2>
            <p className="text-slate-500 text-sm mb-6">Updating stock for <span className="font-semibold text-indigo-600">{selectedProduct.name}</span></p>

            <form onSubmit={handleUseStock} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">Quantity Used</label>
                <div className="flex items-center gap-4 justify-center">
                  <button type="button" onClick={() => setUsageQty(Math.max(1, usageQty - 1))} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-xl transition-colors">-</button>
                  <input
                    required
                    type="number"
                    min="1"
                    max={selectedProduct.stockQuantity}
                    className="w-24 text-center bg-transparent border-none text-4xl font-bold text-slate-800 focus:ring-0 p-0"
                    value={usageQty}
                    onChange={e => setUsageQty(parseInt(e.target.value) || 0)}
                  />
                  <button type="button" onClick={() => setUsageQty(Math.min(selectedProduct.stockQuantity, usageQty + 1))} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-xl transition-colors">+</button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-4 font-medium">Available: {selectedProduct.stockQuantity}</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsUsageModalOpen(false)} className="flex-1 px-4 py-3.5 bg-slate-100 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Logic Modal */}
      {isRestockModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setIsRestockModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-50/50">
                <Truck size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Manufacturer Order</h2>
                <p className="text-sm text-slate-500 font-medium">Supplier: <span className="text-slate-700">{selectedProduct.manufacturer}</span></p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Stock</span>
                <span className="text-2xl font-bold text-slate-800">{selectedProduct.stockQuantity}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Min Level</span>
                <span className="text-2xl font-bold text-slate-800">{selectedProduct.minStockLevel}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleRestock(Math.max(0, selectedProduct.minStockLevel - selectedProduct.stockQuantity))}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group text-left"
              >
                <div>
                  <span className="block font-bold text-slate-800 text-sm">Minimum Restock</span>
                  <span className="text-xs text-slate-500">To reach safety level</span>
                </div>
                <span className="text-emerald-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm text-sm">
                  + {Math.max(0, selectedProduct.minStockLevel - selectedProduct.stockQuantity)}
                </span>
              </button>

              <button
                onClick={() => handleRestock(Math.max(0, (selectedProduct.minStockLevel * 2) - selectedProduct.stockQuantity))}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/10 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group text-left"
              >
                <div>
                  <span className="block font-bold text-slate-800 text-sm">Optimal Restock</span>
                  <span className="text-xs text-slate-500">To reach healthy buffer</span>
                </div>
                <span className="text-indigo-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm text-sm">
                  + {Math.max(0, (selectedProduct.minStockLevel * 2) - selectedProduct.stockQuantity)}
                </span>
              </button>
            </div>

            <button onClick={() => setIsRestockModalOpen(false)} className="w-full py-3.5 text-slate-500 font-bold hover:text-slate-800 transition-colors">
              Cancel Request
            </button>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {isHistoryModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setIsHistoryModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Stock History</h2>
                <p className="text-sm text-slate-500 font-medium">Audit trail for <span className="text-indigo-600">{selectedProduct.name}</span></p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <Check size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-8 flex-1 bg-slate-50/50 rounded-b-[2.5rem]">
              <div className="space-y-4">
                {getFilteredLogs().length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No stock history recorded yet.</div>
                ) : (
                  getFilteredLogs().map(log => (
                    <div key={log.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${log.action === 'RESTOCK' || log.action === 'INITIAL' ? 'bg-emerald-100 text-emerald-600' :
                            log.action === 'SALE' ? 'bg-indigo-100 text-indigo-600' :
                              'bg-amber-100 text-amber-600'
                          }`}>
                          {log.action === 'RESTOCK' || log.action === 'INITIAL' ? <ArrowUp size={20} /> :
                            log.action === 'SALE' ? <ShoppingCart size={20} /> : <ArrowDown size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-slate-800 text-sm">{log.action}</span>
                            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{new Date(log.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{log.note || 'No details provided'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold text-lg ${log.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                          Bal: {log.remainingStock}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;