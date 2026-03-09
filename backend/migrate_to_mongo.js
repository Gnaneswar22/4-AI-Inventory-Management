/**
 * migrate_to_mongo.js
 * One-time migration: reads all JSON data files and seeds MongoDB Atlas.
 * Run once: node migrate_to_mongo.js
 * Safe to re-run — skips collections that already have data.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://harshitindigibilli:qjwfbUuhtE6Pcn32@cluster0.hvxvofb.mongodb.net/stocksense?retryWrites=true&w=majority&appName=Cluster0';
const DATA_DIR = path.join(__dirname, 'data');

// ─── helpers ───────────────────────────────────────
function readJson(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return null; }
}

function readJsonObj(file) {
  const data = readJson(file);
  return (data && !Array.isArray(data)) ? data : null;
}

function isWerkzeugHash(h) {
  return typeof h === 'string' && (h.startsWith('scrypt:') || h.startsWith('pbkdf2:'));
}

const DEFAULT_CREDS = {
  'admin@stocksense.ai': { password: 'admin123', security_answer: 'blue' },
  'manager@stocksense.ai': { password: 'manager123', security_answer: 'buddy' },
};

// ─── lean Mongoose schemas (no _id exposure) ──────
const opts = { strict: false, versionKey: false };

const UserSchema = new mongoose.Schema({ id: { type: String, unique: true } }, opts);
const ProductSchema = new mongoose.Schema({ id: { type: String, unique: true } }, opts);
const SaleSchema = new mongoose.Schema({ id: { type: String, unique: true } }, opts);
const StockLogSchema = new mongoose.Schema({ id: { type: String, unique: true } }, opts);
const UsageSchema = new mongoose.Schema({ id: { type: String, unique: true } }, opts);
const SalesCounterSchema = new mongoose.Schema({}, opts);
const NotificationSchema = new mongoose.Schema({ id: { type: String, unique: true } }, opts);
const ForecastDataSchema = new mongoose.Schema({}, opts);

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Sale = mongoose.model('Sale', SaleSchema);
const StockLog = mongoose.model('StockLog', StockLogSchema);
const Usage = mongoose.model('Usage', UsageSchema);
const SalesCounter = mongoose.model('SalesCounter', SalesCounterSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const ForecastData = mongoose.model('ForecastData', ForecastDataSchema);

// ─── main migration ────────────────────────────────
async function migrate() {
  console.log('\n======================================================');
  console.log('  StockSense MongoDB Migration');
  console.log('======================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('[mongo] Connected to Atlas\n');

  // ── USERS ──────────────────────────────────────
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log(`[users] Skipped — already has ${existingUsers} documents`);
  } else {
    const users = readJson('users.json') || [];
    for (const u of users) {
      if (isWerkzeugHash(u.password)) {
        const cred = DEFAULT_CREDS[u.email];
        if (cred) {
          u.password = bcrypt.hashSync(cred.password, 10);
          u.security_answer = bcrypt.hashSync(cred.security_answer, 10);
          console.log(`  [users] Re-hashed Werkzeug → bcrypt: ${u.email}`);
        } else {
          u.password = bcrypt.hashSync('changeme123', 10);
          u.needs_password_reset = true;
          console.log(`  [users] Reset unknown account to changeme123: ${u.email}`);
        }
      }
    }
    if (users.length > 0) {
      await User.insertMany(users, { ordered: false });
      console.log(`[users] Inserted ${users.length} users`);
    } else {
      console.log('[users] No users.json found — skipping');
    }
  }

  // ── PRODUCTS ───────────────────────────────────
  const existingProducts = await Product.countDocuments();
  if (existingProducts > 0) {
    console.log(`[products] Skipped — already has ${existingProducts} documents`);
  } else {
    const products = readJson('products.json') || [];
    if (products.length > 0) {
      await Product.insertMany(products, { ordered: false });
      console.log(`[products] Inserted ${products.length} products`);
    } else {
      console.log('[products] No products.json found — skipping');
    }
  }

  // ── SALES ──────────────────────────────────────
  const existingSales = await Sale.countDocuments();
  if (existingSales > 0) {
    console.log(`[sales] Skipped — already has ${existingSales} documents`);
  } else {
    let sales = readJson('sales.json') || [];
    if (sales.length > 0) {
      // Deduplicate by id (keep last occurrence)
      const seen = new Map();
      for (const s of sales) seen.set(s.id, s);
      sales = [...seen.values()];
      // Insert in batches of 1000, ignoring duplicates
      const BATCH = 1000;
      let inserted = 0;
      for (let i = 0; i < sales.length; i += BATCH) {
        try {
          await Sale.insertMany(sales.slice(i, i + BATCH), { ordered: false });
        } catch (e) {
          if (!e.code || e.code !== 11000) throw e; // rethrow non-duplicate errors
        }
        inserted += Math.min(BATCH, sales.length - i);
        process.stdout.write(`\r[sales] Inserted ${inserted}/${sales.length}...`);
      }
      const finalCount = await Sale.countDocuments();
      console.log(`\n[sales] Done — ${finalCount} records in DB`);
    } else {
      console.log('[sales] No sales.json found — skipping');
    }
  }

  // ── STOCK LOGS ─────────────────────────────────
  const existingLogs = await StockLog.countDocuments();
  if (existingLogs > 0) {
    console.log(`[stock_logs] Skipped — already has ${existingLogs} documents`);
  } else {
    let logs = readJson('stock_logs.json') || [];
    if (logs.length > 0) {
      // Deduplicate by id
      const seen = new Map();
      for (const l of logs) seen.set(l.id, l);
      logs = [...seen.values()];
      const BATCH = 1000;
      let inserted = 0;
      for (let i = 0; i < logs.length; i += BATCH) {
        try {
          await StockLog.insertMany(logs.slice(i, i + BATCH), { ordered: false });
        } catch (e) {
          if (!e.code || e.code !== 11000) throw e;
        }
        inserted += Math.min(BATCH, logs.length - i);
        process.stdout.write(`\r[stock_logs] Inserted ${inserted}/${logs.length}...`);
      }
      const finalCount = await StockLog.countDocuments();
      console.log(`\n[stock_logs] Done — ${finalCount} records in DB`);
    } else {
      console.log('[stock_logs] No stock_logs.json found — skipping');
    }
  }

  // ── USAGE ──────────────────────────────────────
  const existingUsage = await Usage.countDocuments();
  if (existingUsage > 0) {
    console.log(`[usage] Skipped — already has ${existingUsage} documents`);
  } else {
    const usage = readJson('usage.json') || [];
    if (usage.length > 0) {
      await Usage.insertMany(usage, { ordered: false });
      console.log(`[usage] Inserted ${usage.length} records`);
    } else {
      console.log('[usage] No usage.json found — skipping');
    }
  }

  // ── SALES COUNTER ──────────────────────────────
  const existingCounter = await SalesCounter.countDocuments();
  if (existingCounter > 0) {
    console.log(`[sales_counter] Skipped — already exists`);
  } else {
    const counter = readJsonObj('sales_counter.json') || { totalSalesCount: 0, totalRevenue: 0 };
    await SalesCounter.create(counter);
    console.log(`[sales_counter] Inserted — count: ${counter.totalSalesCount}, revenue: ${counter.totalRevenue}`);
  }

  // ── NOTIFICATIONS ──────────────────────────────
  const existingNotifs = await Notification.countDocuments();
  if (existingNotifs > 0) {
    console.log(`[notifications] Skipped — already has ${existingNotifs} documents`);
  } else {
    const notifs = readJson('notifications.json') || [];
    if (notifs.length > 0) {
      await Notification.insertMany(notifs, { ordered: false });
      console.log(`[notifications] Inserted ${notifs.length} records`);
    } else {
      console.log('[notifications] No notifications.json — starting fresh');
    }
  }

  // ── FORECASTS ──────────────────────────────────
  const existingForecasts = await ForecastData.countDocuments();
  if (existingForecasts > 0) {
    console.log(`[forecasts] Skipped — already exists`);
  } else {
    const forecasts = readJsonObj('forecasts.json');
    if (forecasts) {
      await ForecastData.create(forecasts);
      const count = (forecasts.products || []).length;
      console.log(`[forecasts] Inserted forecast data for ${count} products`);
    } else {
      console.log('[forecasts] No forecasts.json found — skipping');
    }
  }

  // ── Summary ────────────────────────────────────
  console.log('\n======================================================');
  console.log('  Migration Summary');
  console.log('======================================================');
  const counts = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Sale.countDocuments(),
    StockLog.countDocuments(),
    Usage.countDocuments(),
    Notification.countDocuments(),
    ForecastData.countDocuments(),
  ]);
  const labels = ['users', 'products', 'sales', 'stock_logs', 'usage', 'notifications', 'forecasts'];
  labels.forEach((l, i) => console.log(`  ${l.padEnd(20)} ${counts[i].toLocaleString()} documents`));
  console.log('======================================================');
  console.log('  Migration complete!\n');

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
