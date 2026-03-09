/**
 * StockSense Constants
 * 
 * All product data, user data, sales, and inventory data
 * is now stored dynamically in JSON files via the Flask backend.
 * No hardcoded mock data is used anywhere.
 * 
 * Data files location: backend/data/
 * - users.json       → Registered users (passwords hashed)
 * - products.json    → Product inventory (real data added by users)
 * - sales.json       → Sales records (dynamically subtracted from stock)
 * - usage.json       → Internal usage records
 * - stock_logs.json  → Stock change audit trail
 * - sales_counter.json → Total sales count & revenue
 */

// App-level constants (non-data)
export const APP_NAME = 'StockSense';
export const APP_VERSION = 'v2.4.0';
export const API_BASE_URL = 'http://localhost:5000/api';