export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
  minStockLevel: number;
  price: number;
  manufacturer: string;
  lastUpdated: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  date: string;
  customerName: string;
  customerAddress: string;
}

export interface Usage {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  quantity: number;
  date: string;
}

export interface StockPrediction {
  productId: string;
  productName: string;
  avgDailyUsage: number;
  daysRemaining: number;
  restockRecommendedIn: number; // days
  status: 'Critical' | 'Low' | 'Healthy' | 'Overstocked';
  priority: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  reorderPoint: number;
  recommendedOrderQty: number;
  forecastAccuracy: 'High' | 'Medium' | 'Low';
  confidence: 'High' | 'Medium' | 'Low';
  currentStock: number;
  minStockLevel: number;
}

export interface StockLog {
  id: string;
  productId: string;
  action: 'INITIAL' | 'SALE' | 'USAGE' | 'RESTOCK' | 'ADJUSTMENT';
  quantityChange: number;
  remainingStock: number;
  timestamp: string;
  note?: string;
}