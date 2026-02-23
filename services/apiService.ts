/**
 * Invenio AI — API Service
 * Communicates with Flask backend (JSON-based storage)
 */

const API_BASE = '/api';

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    ...options,
    credentials: 'include', // Send cookies for session auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// ─── AUTH API ───────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    security_question: string;
    security_answer: string;
    otp: string;
  }) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  sendOtp: (email: string) =>
    apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' }),

  getCurrentUser: () =>
    apiRequest('/auth/me'),

  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, security_answer: string, new_password: string) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, security_answer, new_password }),
    }),
};

// ─── PRODUCTS API ───────────────────────────────
export const productsAPI = {
  getAll: () => apiRequest('/products'),

  add: (product: {
    name: string;
    category: string;
    stockQuantity: number;
    minStockLevel: number;
    price: number;
    manufacturer: string;
  }) =>
    apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  update: (id: string, updates: Record<string, any>) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  delete: (id: string) =>
    apiRequest(`/products/${id}`, { method: 'DELETE' }),

  restock: (id: string, quantity: number) =>
    apiRequest(`/products/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    }),
};

// ─── SALES API ──────────────────────────────────
export const salesAPI = {
  getAll: () => apiRequest('/sales'),

  record: (sale: {
    productId: string;
    quantity: number;
    customerName: string;
    customerAddress: string;
  }) =>
    apiRequest('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    }),

  getStats: () => apiRequest('/sales/stats'),
};

// ─── USAGE API ──────────────────────────────────
export const usageAPI = {
  getAll: () => apiRequest('/usage'),

  record: (usage: {
    productId: string;
    quantity: number;
    userId?: string;
    userName: string;
  }) =>
    apiRequest('/usage', {
      method: 'POST',
      body: JSON.stringify(usage),
    }),
};

// ─── STOCK LOGS API ─────────────────────────────
export const stockLogsAPI = {
  getAll: () => apiRequest('/stock-logs'),
};

// ─── PREDICTIONS API ────────────────────────────
export const predictionsAPI = {
  getAll: () => apiRequest('/predictions'),
};

// ─── DASHBOARD API ──────────────────────────────
export const dashboardAPI = {
  getData: () => apiRequest('/dashboard'),
};

// ─── USERS API ──────────────────────────────────
export const usersAPI = {
  getAll: () => apiRequest('/users'),
};
// ─── FORECAST API ─────────────────────────────────────────
type Horizon = '30d' | '60d' | '90d';
export const forecastAPI = {
  /** All products, all horizons (no daily breakdown) */
  getAll: () => apiRequest('/forecasts'),
  /** All products filtered to one horizon */
  getByHorizon: (horizon: Horizon) => apiRequest(`/forecasts?horizon=${horizon}`),
  /** One product, all horizons */
  getProduct: (productId: string) => apiRequest(`/forecasts?productId=${productId}`),
  /** Day-by-day breakdown for one product */
  getDaily: (productId: string, horizon: Horizon) =>
    apiRequest(`/forecasts/${productId}/daily?horizon=${horizon}`),
};