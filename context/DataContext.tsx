import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren, useCallback } from 'react';
import { Product, Sale, Usage, StockPrediction, StockLog } from '../types';
import { productsAPI, salesAPI, usageAPI, stockLogsAPI, predictionsAPI } from '../services/apiService';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  sales: Sale[];
  usage: Usage[];
  stockLogs: StockLog[];
  predictions: StockPrediction[];
  totalSalesCount: number;
  totalRevenue: number;
  addProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  recordSale: (productId: string, quantity: number, customerName: string, customerAddress: string) => Promise<void>;
  recordUsage: (productId: string, quantity: number, userId: string, userName: string) => Promise<void>;
  restockProduct: (productId: string, quantity: number) => Promise<void>;
  refreshPredictions: () => void;
  refreshData: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load all data from Flask backend (JSON storage)
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [productsRes, salesRes, usageRes, logsRes, predictionsRes] = await Promise.all([
        productsAPI.getAll(),
        salesAPI.getAll(),
        usageAPI.getAll(),
        stockLogsAPI.getAll(),
        predictionsAPI.getAll(),
      ]);

      setProducts(productsRes.products || []);
      setSales(salesRes.sales || []);
      setTotalSalesCount(salesRes.totalSalesCount || 0);
      setTotalRevenue(salesRes.totalRevenue || 0);
      setUsage(usageRes.usage || []);
      setStockLogs(logsRes.stockLogs || []);
      setPredictions(predictionsRes.predictions || []);
    } catch (err) {
      console.error('Failed to load data from backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const addProduct = async (newProductData: Omit<Product, 'id' | 'lastUpdated'>) => {
    try {
      await productsAPI.add(newProductData);
      await loadAllData(); // Refresh from JSON storage
    } catch (err: any) {
      alert(err.message || 'Failed to add product');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await productsAPI.update(id, updates);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsAPI.delete(id);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const recordSale = async (productId: string, quantity: number, customerName: string, customerAddress: string) => {
    try {
      const result = await salesAPI.record({ productId, quantity, customerName, customerAddress });
      // Update local state immediately for responsiveness
      setTotalSalesCount(result.totalSalesCount);
      await loadAllData(); // Then refresh everything from JSON storage
    } catch (err: any) {
      alert(err.message || 'Failed to record sale');
    }
  };

  const recordUsage = async (productId: string, quantity: number, userId: string, userName: string) => {
    try {
      await usageAPI.record({ productId, quantity, userId, userName });
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to record usage');
    }
  };

  const restockProduct = async (productId: string, quantity: number) => {
    try {
      await productsAPI.restock(productId, quantity);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to restock');
    }
  };

  const refreshPredictions = () => {
    loadAllData();
  };

  return (
    <DataContext.Provider value={{
      products,
      sales,
      usage,
      stockLogs,
      predictions,
      totalSalesCount,
      totalRevenue,
      addProduct,
      updateProduct,
      deleteProduct,
      recordSale,
      recordUsage,
      restockProduct,
      refreshPredictions,
      refreshData: loadAllData,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};