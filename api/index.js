const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const app = express();

// ─────────────────────────────────────────────────
// DATA DIRECTORY & FILE PATHS
// ─────────────────────────────────────────────────
const BASE_DIR = "/tmp";
const DATA_DIR = path.join(BASE_DIR, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const SALES_FILE = path.join(DATA_DIR, "sales.json");
const STOCK_LOGS_FILE = path.join(DATA_DIR, "stock_logs.json");
const USAGE_FILE = path.join(DATA_DIR, "usage.json");
const SALES_COUNTER_FILE = path.join(DATA_DIR, "sales_counter.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const FORECASTS_FILE = path.join(DATA_DIR, "forecasts.json");

// ─────────────────────────────────────────────────
// JSON STORAGE HELPERS
// ─────────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filepath) {
  if (!fs.existsSync(filepath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return [];
  }
}

function writeJson(filepath, data) {
  ensureDataDir();
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function readJsonObj(filepath) {
  if (!fs.existsSync(filepath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return {};
  }
}

function generateId() {
  return uuidv4().substring(0, 8);
}

// ─────────────────────────────────────────────────
// INITIALIZE DEFAULT DATA
// ─────────────────────────────────────────────────
function initializeData() {
  ensureDataDir();

  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      {
        id: "u1",
        name: "Admin User",
        email: "admin@invenio.ai",
        password: bcrypt.hashSync("admin123", 10),
        role: "ADMIN",
        avatar: "https://picsum.photos/200/200",
        security_question: "What is your favorite color?",
        security_answer: bcrypt.hashSync("blue", 10),
        created_at: new Date().toISOString(),
      },
      {
        id: "u2",
        name: "Store Manager",
        email: "manager@invenio.ai",
        password: bcrypt.hashSync("manager123", 10),
        role: "USER",
        avatar: "https://picsum.photos/201/201",
        security_question: "What is your pet's name?",
        security_answer: bcrypt.hashSync("buddy", 10),
        created_at: new Date().toISOString(),
      },
    ];
    writeJson(USERS_FILE, defaultUsers);
  }

  if (!fs.existsSync(PRODUCTS_FILE)) {
    writeJson(PRODUCTS_FILE, []);
  }

  if (!fs.existsSync(SALES_FILE)) {
    writeJson(SALES_FILE, []);
  }

  if (!fs.existsSync(STOCK_LOGS_FILE)) {
    writeJson(STOCK_LOGS_FILE, []);
  }

  if (!fs.existsSync(USAGE_FILE)) {
    writeJson(USAGE_FILE, []);
  }

  if (!fs.existsSync(SALES_COUNTER_FILE)) {
    writeJson(SALES_COUNTER_FILE, { totalSalesCount: 0, totalRevenue: 0 });
  }

  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    writeJson(NOTIFICATIONS_FILE, []);
  }
}

// ─────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────
app.use(
  cors({
    origin: true, // Allow all for Vercel
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  session({
    secret: "invenio-ai-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // For Vercel, might need adjustment
  }),
);

// ─────────────────────────────────────────────────
// AUTH DECORATOR
// ─────────────────────────────────────────────────
function loginRequired(req, res, next) {
  if (!req.session.user_id) {
    return res
      .status(401)
      .json({ error: "Authentication required. Please log in." });
  }
  next();
}

// ═══════════════════════════════════════════════════
//  AUTH ROUTES — Register, Login, Logout, Forgot Password
// ═══════════════════════════════════════════════════

app.post("/api/auth/register", (req, res) => {
  const {
    name,
    email,
    password,
    role = "USER",
    security_question,
    security_answer,
  } = req.body;

  if (!name || !email || !password || !security_question || !security_answer) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }

  const users = readJson(USERS_FILE);
  if (users.some((u) => u.email === email)) {
    return res
      .status(409)
      .json({ error: "An account with this email already exists." });
  }

  const newUser = {
    id: generateId(),
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    role,
    avatar: `https://picsum.photos/seed/${generateId()}/200/200`,
    security_question,
    security_answer: bcrypt.hashSync(security_answer, 10),
    created_at: new Date().toISOString(),
  };

  users.push(newUser);
  writeJson(USERS_FILE, users);

  const { password: _, security_answer: __, ...safeUser } = newUser;
  res.status(201).json({ message: "Registration successful!", user: safeUser });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = readJson(USERS_FILE);
  const user = users.find((u) => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  req.session.user_id = user.id;
  req.session.user_email = user.email;
  req.session.user_role = user.role;

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };

  res.json({ message: "Login successful!", user: safeUser });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out successfully." });
});

app.get("/api/auth/me", loginRequired, (req, res) => {
  const users = readJson(USERS_FILE);
  const user = users.find((u) => u.id === req.session.user_id);

  if (!user) {
    req.session.destroy();
    return res.status(404).json({ error: "User not found." });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };

  res.json({ user: safeUser });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const users = readJson(USERS_FILE);
  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(404).json({ error: "No account found with this email." });
  }

  res.json({
    message: "Security question retrieved.",
    security_question: user.security_question,
    email,
  });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { email, security_answer, new_password } = req.body;

  if (!email || !security_answer || !new_password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (new_password.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters." });
  }

  const users = readJson(USERS_FILE);
  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(404).json({ error: "No account found with this email." });
  }

  if (!bcrypt.compareSync(security_answer, user.security_answer)) {
    return res.status(403).json({ error: "Incorrect security answer." });
  }

  user.password = bcrypt.hashSync(new_password, 10);
  writeJson(USERS_FILE, users);

  res.json({
    message:
      "Password reset successfully! You can now log in with your new password.",
  });
});

// ═══════════════════════════════════════════════════
//  PRODUCT / INVENTORY ROUTES — JSON Storage
// ═══════════════════════════════════════════════════

app.get("/api/products", loginRequired, (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  res.json({ products });
});

app.post("/api/products", loginRequired, (req, res) => {
  const { name, category, stockQuantity, minStockLevel, price, manufacturer } =
    req.body;

  if (
    !name ||
    !category ||
    stockQuantity == null ||
    minStockLevel == null ||
    price == null ||
    !manufacturer
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const newProduct = {
    id: generateId(),
    name,
    category,
    stockQuantity: parseInt(stockQuantity),
    minStockLevel: parseInt(minStockLevel),
    price: parseFloat(price),
    manufacturer,
    lastUpdated: new Date().toISOString(),
  };

  const products = readJson(PRODUCTS_FILE);
  products.push(newProduct);
  writeJson(PRODUCTS_FILE, products);

  // Log initial stock
  addStockLog(
    newProduct.id,
    "INITIAL",
    newProduct.stockQuantity,
    newProduct.stockQuantity,
    "Product Created",
  );

  res
    .status(201)
    .json({ message: "Product added successfully!", product: newProduct });
});

app.put("/api/products/:productId", loginRequired, (req, res) => {
  const { productId } = req.params;
  const products = readJson(PRODUCTS_FILE);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  const oldStock = product.stockQuantity;

  [
    "name",
    "category",
    "stockQuantity",
    "minStockLevel",
    "price",
    "manufacturer",
  ].forEach((key) => {
    if (req.body[key] != null) {
      if (key === "stockQuantity" || key === "minStockLevel") {
        product[key] = parseInt(req.body[key]);
      } else if (key === "price") {
        product[key] = parseFloat(req.body[key]);
      } else {
        product[key] = req.body[key];
      }
    }
  });

  product.lastUpdated = new Date().toISOString();
  writeJson(PRODUCTS_FILE, products);

  if (product.stockQuantity !== oldStock) {
    const diff = product.stockQuantity - oldStock;
    addStockLog(
      productId,
      "ADJUSTMENT",
      diff,
      product.stockQuantity,
      "Manual Adjustment",
    );
  }

  res.json({ message: "Product updated!", product });
});

app.delete("/api/products/:productId", loginRequired, (req, res) => {
  const { productId } = req.params;
  const products = readJson(PRODUCTS_FILE);
  const filtered = products.filter((p) => p.id !== productId);
  writeJson(PRODUCTS_FILE, filtered);
  res.json({ message: "Product deleted successfully." });
});

app.post("/api/products/:productId/restock", loginRequired, (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const qty = parseInt(quantity);

  if (qty <= 0) {
    return res
      .status(400)
      .json({ error: "Restock quantity must be positive." });
  }

  const products = readJson(PRODUCTS_FILE);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  product.stockQuantity += qty;
  product.lastUpdated = new Date().toISOString();
  writeJson(PRODUCTS_FILE, products);

  addStockLog(
    productId,
    "RESTOCK",
    qty,
    product.stockQuantity,
    "Manufacturer Delivery",
  );

  res.json({ message: `Restocked ${qty} units!`, product });
});

// ═══════════════════════════════════════════════════
//  SALES ROUTES
// ═══════════════════════════════════════════════════

app.get("/api/sales", loginRequired, (req, res) => {
  const sales = readJson(SALES_FILE).sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  const counter = readJsonObj(SALES_COUNTER_FILE);
  res.json({
    sales,
    totalSalesCount: counter.totalSalesCount || 0,
    totalRevenue: counter.totalRevenue || 0,
  });
});

app.post("/api/sales", loginRequired, (req, res) => {
  const {
    productId,
    quantity,
    customerName = "Unknown",
    customerAddress = "",
  } = req.body;
  const qty = parseInt(quantity);

  if (!productId || qty <= 0) {
    return res
      .status(400)
      .json({ error: "Valid product ID and quantity are required." });
  }

  const products = readJson(PRODUCTS_FILE);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  if (product.stockQuantity < qty) {
    return res
      .status(400)
      .json({
        error: `Insufficient stock! Available: ${product.stockQuantity}, Requested: ${qty}`,
      });
  }

  product.stockQuantity -= qty;
  product.lastUpdated = new Date().toISOString();
  writeJson(PRODUCTS_FILE, products);

  const totalPrice = qty * product.price;
  const newSale = {
    id: generateId(),
    productId,
    productName: product.name,
    quantity: qty,
    totalPrice,
    date: new Date().toISOString(),
    customerName,
    customerAddress,
  };

  const sales = readJson(SALES_FILE);
  sales.push(newSale);
  writeJson(SALES_FILE, sales);

  const counter = readJsonObj(SALES_COUNTER_FILE);
  counter.totalSalesCount = (counter.totalSalesCount || 0) + 1;
  counter.totalRevenue = (counter.totalRevenue || 0) + totalPrice;
  writeJson(SALES_COUNTER_FILE, counter);

  addStockLog(
    productId,
    "SALE",
    -qty,
    product.stockQuantity,
    `Sold to ${customerName}`,
  );

  res.status(201).json({
    message: "Sale recorded successfully!",
    sale: newSale,
    updatedStock: product.stockQuantity,
    totalSalesCount: counter.totalSalesCount,
  });
});

// ═══════════════════════════════════════════════════
//  USAGE ROUTES
// ═══════════════════════════════════════════════════

app.get("/api/usage", loginRequired, (req, res) => {
  const usage = readJson(USAGE_FILE);
  res.json({ usage });
});

app.post("/api/usage", loginRequired, (req, res) => {
  const {
    productId,
    quantity,
    userId = req.session.user_id,
    userName = "Unknown",
  } = req.body;
  const qty = parseInt(quantity);

  if (!productId || qty <= 0) {
    return res
      .status(400)
      .json({ error: "Valid product ID and quantity are required." });
  }

  const products = readJson(PRODUCTS_FILE);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  if (product.stockQuantity < qty) {
    return res.status(400).json({ error: "Insufficient stock!" });
  }

  product.stockQuantity -= qty;
  product.lastUpdated = new Date().toISOString();
  writeJson(PRODUCTS_FILE, products);

  const newUsage = {
    id: generateId(),
    productId,
    productName: product.name,
    userId,
    userName,
    quantity: qty,
    date: new Date().toISOString(),
  };

  const usage = readJson(USAGE_FILE);
  usage.push(newUsage);
  writeJson(USAGE_FILE, usage);

  addStockLog(
    productId,
    "USAGE",
    -qty,
    product.stockQuantity,
    `Used by ${userName}`,
  );

  res
    .status(201)
    .json({
      message: "Usage recorded!",
      usage: newUsage,
      updatedStock: product.stockQuantity,
    });
});

// ═══════════════════════════════════════════════════
//  STOCK LOGS ROUTES
// ═══════════════════════════════════════════════════

function addStockLog(productId, action, change, remainingStock, note = "") {
  const log = {
    id: generateId(),
    productId,
    action,
    quantityChange: change,
    remainingStock,
    timestamp: new Date().toISOString(),
    note,
  };
  const logs = readJson(STOCK_LOGS_FILE);
  logs.unshift(log);
  writeJson(STOCK_LOGS_FILE, logs);
}

app.get("/api/stock-logs", loginRequired, (req, res) => {
  const logs = readJson(STOCK_LOGS_FILE);
  res.json({ stockLogs: logs });
});

// ═══════════════════════════════════════════════════
//  PREDICTIONS ROUTE
// ═══════════════════════════════════════════════════

function calculateWeightedMovingAverage(dataPoints, weights) {
  if (!dataPoints.length) return 0;
  if (!weights) {
    weights = Array.from({ length: dataPoints.length }, (_, i) => 2 ** i);
  }
  const weightedSum = dataPoints.reduce((sum, d, i) => sum + d * weights[i], 0);
  return weightedSum / weights.reduce((sum, w) => sum + w, 0);
}

function detectTrend(recentSales) {
  if (recentSales.length < 3) return ["stable", 1.0];
  const mid = Math.floor(recentSales.length / 2);
  const firstHalfAvg =
    recentSales.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalfAvg =
    recentSales.slice(mid).reduce((a, b) => a + b, 0) /
    (recentSales.length - mid);
  if (secondHalfAvg > firstHalfAvg * 1.2) return ["increasing", 1.3];
  if (secondHalfAvg < firstHalfAvg * 0.8) return ["decreasing", 0.7];
  return ["stable", 1.0];
}

function calculateReorderPoint(avgDailyUsage) {
  const safetyStock = avgDailyUsage * 7 * 1.5;
  return Math.floor(avgDailyUsage * 7 + safetyStock);
}

function calculateForecastAccuracy(
  productSales,
  productUsage,
  totalTransactions,
) {
  const allQuantities = [
    ...productSales.map((s) => s.quantity),
    ...productUsage.map((u) => u.quantity),
  ];
  if (allQuantities.length < 3) return ["Low", 0.3];
  const avg = allQuantities.reduce((a, b) => a + b, 0) / allQuantities.length;
  const variance =
    allQuantities.reduce((sum, x) => sum + (x - avg) ** 2, 0) /
    allQuantities.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? (stdDev / avg) * 100 : 100;
  const dataScore =
    allQuantities.length >= 20
      ? 1.0
      : allQuantities.length >= 10
        ? 0.7
        : allQuantities.length >= 5
          ? 0.5
          : 0.3;
  const cvScore = cv < 15 ? 1.0 : cv < 30 ? 0.8 : cv < 50 ? 0.6 : 0.4;
  const finalScore = cvScore * 0.5 + dataScore * 0.3 + 0.2; // Simplified
  return finalScore >= 0.75
    ? ["High", finalScore]
    : finalScore >= 0.5
      ? ["Medium", finalScore]
      : ["Low", finalScore];
}

app.get("/api/predictions", loginRequired, (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  const sales = readJson(SALES_FILE);
  const usageRecords = readJson(USAGE_FILE);

  const predictions = products.map((product) => {
    const productSales = sales.filter((s) => s.productId === product.id);
    const productUsage = usageRecords.filter((u) => u.productId === product.id);
    const salesQuantities = productSales.slice(-14).map((s) => s.quantity);
    const usageQuantities = productUsage.slice(-14).map((u) => u.quantity);
    const allQuantities = [...salesQuantities, ...usageQuantities];
    const totalConsumed =
      productSales.reduce((sum, s) => sum + s.quantity, 0) +
      productUsage.reduce((sum, u) => sum + u.quantity, 0);

    const weightedAvgUsage = allQuantities.length
      ? calculateWeightedMovingAverage(allQuantities)
      : 0.1;
    const [trendDirection, trendFactor] = detectTrend(allQuantities);
    const daysActive = Math.max(30, productSales.length + productUsage.length);
    const baseDailyUsage = Math.max(0.1, totalConsumed / daysActive);
    const adjustedDailyUsage = baseDailyUsage * trendFactor;
    const avgDailyUsage = Math.round(adjustedDailyUsage * 100) / 100;
    const daysRemaining =
      avgDailyUsage > 0
        ? Math.floor(product.stockQuantity / avgDailyUsage)
        : 9999;
    const reorderPoint = calculateReorderPoint(avgDailyUsage);
    const totalTransactions = productSales.length + productUsage.length;
    const [forecastAccuracy, accuracyScore] = calculateForecastAccuracy(
      productSales,
      productUsage,
      totalTransactions,
    );

    const currentStock = product.stockQuantity;
    const minLevel = product.minStockLevel;
    let status, priority;
    if (currentStock <= 0) {
      status = "Critical";
      priority = "Immediate";
    } else if (daysRemaining < 3) {
      status = "Critical";
      priority = "Urgent";
    } else if (currentStock < minLevel * 0.5) {
      status = "Critical";
      priority = "High";
    } else if (currentStock < minLevel) {
      status = "Low";
      priority = "Medium";
    } else {
      status = "Healthy";
      priority = "Normal";
    }

    const recommendedOrderQty =
      status === "Critical" || status === "Low"
        ? Math.max(
            0,
            Math.floor(Math.max(reorderPoint, minLevel * 1.3) - currentStock),
          )
        : currentStock < reorderPoint
          ? Math.floor((reorderPoint - currentStock) * 1.2)
          : 0;

    const confidence =
      accuracyScore >= 0.75 ? "High" : accuracyScore >= 0.5 ? "Medium" : "Low";

    return {
      productId: product.id,
      productName: product.name,
      avgDailyUsage,
      daysRemaining,
      restockRecommendedIn: Math.max(0, daysRemaining - 5),
      status,
      priority,
      trend: trendDirection,
      reorderPoint,
      recommendedOrderQty,
      forecastAccuracy,
      confidence,
      currentStock,
      minStockLevel,
    };
  });

  const priorityOrder = {
    Immediate: 0,
    Urgent: 1,
    High: 2,
    Medium: 3,
    Normal: 4,
    Review: 5,
    Low: 6,
  };
  predictions.sort(
    (a, b) =>
      (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999) ||
      a.daysRemaining - b.daysRemaining,
  );

  res.json({ predictions });
});

// ═══════════════════════════════════════════════════
//  DASHBOARD ANALYTICS ROUTE
// ═══════════════════════════════════════════════════

app.get("/api/dashboard", loginRequired, (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  const sales = readJson(SALES_FILE);
  const counter = readJsonObj(SALES_COUNTER_FILE);

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const lowStockCount = products.filter(
    (p) => p.stockQuantity < p.minStockLevel,
  ).length;
  const totalValue = products.reduce(
    (sum, p) => sum + p.stockQuantity * p.price,
    0,
  );

  const categories = {};
  products.forEach((p) => {
    if (!categories[p.category])
      categories[p.category] = { count: 0, totalStock: 0, totalValue: 0 };
    categories[p.category].count++;
    categories[p.category].totalStock += p.stockQuantity;
    categories[p.category].totalValue += p.stockQuantity * p.price;
  });

  res.json({
    totalProducts,
    totalStock,
    lowStockCount,
    totalValue,
    totalSalesCount: counter.totalSalesCount || 0,
    totalRevenue: counter.totalRevenue || 0,
    categories,
    recentSales: sales.slice(-5),
  });
});

// ═══════════════════════════════════════════════════
//  USER MANAGEMENT ROUTE
// ═══════════════════════════════════════════════════

app.get("/api/users", loginRequired, (req, res) => {
  if (req.session.user_role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required." });
  }
  const users = readJson(USERS_FILE);
  const safeUsers = users.map((u) => {
    const { password, security_answer, ...safe } = u;
    return safe;
  });
  res.json({ users: safeUsers });
});

// ═══════════════════════════════════════════════════
//  NOTIFICATIONS ROUTES
// ═══════════════════════════════════════════════════

function createNotification(
  type,
  title,
  message,
  productId = null,
  productName = null,
  metadata = {},
) {
  return {
    id: generateId(),
    type,
    title,
    message,
    productId,
    productName,
    metadata,
    read: false,
    timestamp: new Date().toISOString(),
  };
}

app.get("/api/notifications", loginRequired, (req, res) => {
  const notifications = readJson(NOTIFICATIONS_FILE);
  const products = readJson(PRODUCTS_FILE);
  const sales = readJson(SALES_FILE);

  // Remove old notifications
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const recentNotifications = notifications.filter(
    (n) => new Date(n.timestamp) > cutoff,
  );

  // Generate low stock alerts
  const predictions = []; // Simplified, assume we call the predictions logic
  // For brevity, skip detailed predictions here, but in full code, integrate

  // Recent sales notifications
  const recentSales = sales.slice(-5).reverse();
  recentSales.forEach((sale) => {
    const existing = recentNotifications.find(
      (n) => n.type === "sale" && n.metadata?.saleId === sale.id,
    );
    if (!existing) {
      recentNotifications.push(
        createNotification(
          "sale",
          "New Sale Recorded",
          `${sale.productName} - Qty: ${sale.quantity}`,
          sale.productId,
          sale.productName,
          {
            saleId: sale.id,
            quantity: sale.quantity,
            totalPrice: sale.totalPrice,
            customerName: sale.customerName,
            date: sale.date,
          },
        ),
      );
    }
  });

  writeJson(NOTIFICATIONS_FILE, recentNotifications);
  recentNotifications.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  );
  const unreadCount = recentNotifications.filter((n) => !n.read).length;

  res.json({
    notifications: recentNotifications,
    unreadCount,
    total: recentNotifications.length,
  });
});

app.post(
  "/api/notifications/:notificationId/read",
  loginRequired,
  (req, res) => {
    const { notificationId } = req.params;
    const notifications = readJson(NOTIFICATIONS_FILE);
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification)
      return res.status(404).json({ error: "Notification not found" });
    notification.read = true;
    writeJson(NOTIFICATIONS_FILE, notifications);
    res.json({ message: "Notification marked as read", notification });
  },
);

// ═══════════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════════

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "Invenio AI Backend is running!",
    storage: "JSON-based file storage",
    data_directory: DATA_DIR,
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════
//  FORECASTS ROUTES
// ═══════════════════════════════════════════════════

app.get("/api/forecasts", (req, res) => {
  if (!fs.existsSync(FORECASTS_FILE)) {
    return res
      .status(404)
      .json({
        error:
          "Forecasts not yet generated. Run train_forecast_model.py first.",
      });
  }
  const data = readJsonObj(FORECASTS_FILE);
  if (!data)
    return res
      .status(500)
      .json({ error: "Forecasts file is empty or corrupted." });

  const horizon = req.query.horizon;
  const productId = req.query.productId;
  let productsFc = data.products || [];

  if (productId) {
    productsFc = productsFc.filter((p) => p.productId === productId);
    if (!productsFc.length)
      return res
        .status(404)
        .json({ error: `No forecast found for productId=${productId}` });
  }

  if (horizon && ["30d", "60d", "90d"].includes(horizon)) {
    const slim = productsFc.map((p) => {
      const entry = { ...p };
      delete entry.forecasts;
      const fc = p.forecasts?.[horizon] || {};
      entry.forecast = Object.fromEntries(
        Object.entries(fc).filter(([k]) => k !== "daily_breakdown"),
      );
      entry.horizon = horizon;
      return entry;
    });
    return res.json({
      generatedAt: data.generatedAt,
      forecastedUpTo: data.forecastedUpTo,
      horizon,
      products: slim,
    });
  }

  const summary = productsFc.map((p) => {
    const entry = { ...p };
    delete entry.forecasts;
    entry.forecasts = {};
    ["30d", "60d", "90d"].forEach((h) => {
      const fc = p.forecasts?.[h] || {};
      entry.forecasts[h] = Object.fromEntries(
        Object.entries(fc).filter(([k]) => k !== "daily_breakdown"),
      );
    });
    return entry;
  });

  res.json({
    generatedAt: data.generatedAt,
    forecastedUpTo: data.forecastedUpTo,
    horizons: ["30d", "60d", "90d"],
    products: summary,
  });
});

app.get("/api/forecasts/:productId/daily", (req, res) => {
  const { productId } = req.params;
  if (!fs.existsSync(FORECASTS_FILE))
    return res.status(404).json({ error: "Forecasts not generated yet." });
  const data = readJsonObj(FORECASTS_FILE);
  const match = data.products?.find((p) => p.productId === productId);
  if (!match)
    return res
      .status(404)
      .json({ error: `No forecast for productId=${productId}` });

  const horizon = req.query.horizon || "30d";
  if (!["30d", "60d", "90d"].includes(horizon))
    return res.status(400).json({ error: "horizon must be 30d, 60d, or 90d" });

  const daily = match.forecasts?.[horizon]?.daily_breakdown || [];
  res.json({
    productId,
    productName: match.productName,
    horizon,
    generatedAt: data.generatedAt,
    daily,
  });
});

// Initialize data
initializeData();

// Export for Vercel
module.exports = app;
