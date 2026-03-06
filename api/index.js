/**
 * server.js — Invenio AI Inventory Management
 * Node.js / Express backend — MongoDB Atlas storage
 * Port: 5000
 */

"use strict";

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
require("dotenv").config();

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const app = express();
const PORT = 5000;

// ─────────────────────────────────────────────────
// MONGODB CONNECTION
// ─────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

let isConnected = false;
const connectDB = async () => {
  if (isConnected || mongoose.connections[0].readyState) return;
  try {
    await mongoose.connect(MONGO_URI, { family: 4 });
    isConnected = true;
    console.log("  [mongo] Connected to MongoDB Atlas");
  } catch (err) {
    console.error("  [mongo] Connection error:", err.message);
  }
};

// ─────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────
app.use(async (req, res, next) => {
  if (!MONGO_URI) {
    return res.status(500).json({
      error: "Environment Variable 'MONGO_URI' is missing in Vercel. Please add it to Settings > Environment Variables."
    });
  }
  await connectDB();
  next();
});
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  }),
);

const MongoStore = require("connect-mongo");
app.use(express.json());

const sessionOpts = {
  secret: "invenio-ai-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
};

if (MONGO_URI) {
  sessionOpts.store = MongoStore.create({ mongoUrl: MONGO_URI });
}

app.use(session(sessionOpts));

// ─────────────────────────────────────────────────
// MONGOOSE SCHEMAS
// ─────────────────────────────────────────────────
const schemaOpts = { strict: false, versionKey: false };

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, unique: true },
  },
  schemaOpts,
);

const ProductSchema = new mongoose.Schema(
  { id: { type: String, required: true, unique: true } },
  schemaOpts,
);

const SaleSchema = new mongoose.Schema(
  { id: { type: String, required: true, unique: true } },
  schemaOpts,
);

const StockLogSchema = new mongoose.Schema(
  { id: { type: String, required: true, unique: true } },
  schemaOpts,
);

const UsageSchema = new mongoose.Schema(
  { id: { type: String, required: true, unique: true } },
  schemaOpts,
);

const SalesCounterSchema = new mongoose.Schema(
  {
    totalSalesCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  schemaOpts,
);

const NotificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  schemaOpts,
);

const ForecastDataSchema = new mongoose.Schema(
  { products: [mongoose.Schema.Types.Mixed] },
  schemaOpts,
);

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 },
  },
  schemaOpts,
);

const User = mongoose.model("User", UserSchema);
const Product = mongoose.model("Product", ProductSchema);
const Sale = mongoose.model("Sale", SaleSchema);
const StockLog = mongoose.model("StockLog", StockLogSchema);
const Usage = mongoose.model("Usage", UsageSchema);
const SalesCounter = mongoose.model("SalesCounter", SalesCounterSchema);
const Notification = mongoose.model("Notification", NotificationSchema);
const ForecastData = mongoose.model("ForecastData", ForecastDataSchema);
const Otp = mongoose.model("Otp", OtpSchema);

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
/** Strip internal MongoDB fields from a lean document or array */
function clean(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc))
    return doc.map((d) => {
      const o = { ...d };
      delete o._id;
      delete o.__v;
      return o;
    });
  const o = { ...doc };
  delete o._id;
  delete o.__v;
  return o;
}

/** Generate a short 8-char id */
function generateId() {
  return uuidv4().replace(/-/g, "").slice(0, 8);
}

// ─────────────────────────────────────────────────
// INITIALIZE DEFAULT DATA (runs after DB connects)
// ─────────────────────────────────────────────────
async function initializeData() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    try {
      try {
        const pData = require('./data/products.json');
        await Product.insertMany(pData);
        console.log("  [init] Products seeded.");
      } catch (e) {
        console.log("  [init] Skip products");
      }

      try {
        const sData = require('./data/sales.json');
        await Sale.insertMany(sData);
        console.log("  [init] Sales seeded.");
      } catch (e) {
        console.log("  [init] Skip sales");
      }

      try {
        const lData = require('./data/stock_logs.json');
        await StockLog.insertMany(lData);
        console.log("  [init] StockLogs seeded.");
      } catch (e) {
        console.log("  [init] Skip stock logs");
      }

      try {
        const uData = require('./data/usage.json');
        await Usage.insertMany(uData);
        console.log("  [init] Usage seeded.");
      } catch (e) {
        console.log("  [init] Skip usage");
      }

      await User.insertMany([
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
        }
      ]);
      console.log("  [init] Default admin created.");

      try {
        const fData = require('./data/forecasts.json');
        await ForecastData.create(fData);
        console.log("  [init] Forecasts seeded.");
      } catch (e) {
        console.log("  [init] Skip forecasts");
      }
    } catch (e) {
      console.log("  [init] Seeding error:", e.message);
    }
  }

  const counterCount = await SalesCounter.countDocuments();
  if (counterCount === 0) {
    try {
      try {
        const cData = require('./data/sales_counter.json');
        await SalesCounter.create(cData);
      } catch (e) {
        await SalesCounter.create({ totalSalesCount: 0, totalRevenue: 0 });
      }
      console.log("  [init] Sales counter initialized.");
    } catch (e) {
      console.log("  [init] Sales counter error:", e.message);
    }
  }
}


// ─────────────────────────────────────────────────
// STOCK-LOG HELPER
// ─────────────────────────────────────────────────
async function addStockLog(
  productId,
  action,
  change,
  remainingStock,
  note = "",
) {
  await StockLog.create({
    id: generateId(),
    productId,
    action,
    quantityChange: change,
    remainingStock,
    timestamp: new Date().toISOString(),
    note,
  });
}

// ─────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────────
function loginRequired(req, res, next) {
  if (!req.session.userId)
    return res
      .status(401)
      .json({ error: "Authentication required. Please log in." });
  next();
}

// ═══════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════

// POST /api/auth/send-otp
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email, type = "register" } = req.body;
    const eEmail = (email || "").trim().toLowerCase();
    if (!eEmail) return res.status(400).json({ error: "Email is required." });

    if (eEmail !== "gnanesh847@gmail.com") {
      return res.status(403).json({ error: "Access denied. Only authorized email allowed." });
    }

    const existing = await User.findOne({ email: eEmail }).lean();
    if (type === "register" && existing) return res.status(409).json({ error: "An account with this email already exists." });
    if (type === "login" && !existing) return res.status(404).json({ error: "No account found with this email." });

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email: eEmail });
    await Otp.create({ email: eEmail, otp: generatedOtp });

    const mailOptions = {
      from: `"Invenio AI" <${process.env.SMTP_USER}>`,
      to: eEmail,
      subject: "Invenio AI - Verification Code",
      text: `Your OTP is: ${generatedOtp}. It is valid for 5 minutes.`
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP sent successfully." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name = "",
      email = "",
      password = "",
      role = "USER",
      security_question = "",
      security_answer = "",
      otp = "",
    } = req.body;

    const eName = name.trim();
    const eEmail = email.trim().toLowerCase();
    const eSQ = security_question.trim();
    const eSA = security_answer.trim().toLowerCase();
    const eOtp = otp.trim();

    if (eEmail !== "gnanesh847@gmail.com") {
      return res.status(403).json({ error: "Access denied. Only authorized email allowed." });
    }

    if (!eName || !eEmail || !password || !eOtp)
      return res
        .status(400)
        .json({ error: "Name, email, password, and OTP are required." });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    if (!eSQ || !eSA)
      return res.status(400).json({
        error:
          "Security question and answer are required for password recovery.",
      });

    const existing = await User.findOne({ email: eEmail }).lean();
    if (existing)
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });

    const otpRecord = await Otp.findOne({ email: eEmail }).sort({ createdAt: -1 });
    if (!otpRecord) return res.status(400).json({ error: "OTP expired or not requested." });
    if (otpRecord.otp !== eOtp) return res.status(400).json({ error: "Invalid OTP." });

    const newUser = {
      id: generateId(),
      name: eName,
      email: eEmail,
      password: bcrypt.hashSync(password, 10),
      role,
      avatar: `https://picsum.photos/seed/${generateId()}/200/200`,
      security_question: eSQ,
      security_answer: bcrypt.hashSync(eSA, 10),
      created_at: new Date().toISOString(),
    };

    await User.create(newUser);
    await Otp.deleteMany({ email: eEmail });
    const { password: _p, security_answer: _sa, ...safeUser } = newUser;
    return res
      .status(201)
      .json({ message: "Registration successful!", user: safeUser });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email = "", password = "", otp = "" } = req.body;
    const eEmail = email.trim().toLowerCase();
    const eOtp = otp.trim();

    if (eEmail !== "gnanesh847@gmail.com") {
      return res.status(403).json({ error: "Access denied. Only authorized email allowed." });
    }

    if (!eEmail || !password || !eOtp)
      return res
        .status(400)
        .json({ error: "Email, password, and OTP are required." });

    const user = await User.findOne({ email: eEmail }).lean();
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: "Invalid email or password." });

    const otpRecord = await Otp.findOne({ email: eEmail }).sort({ createdAt: -1 });
    if (!otpRecord) return res.status(400).json({ error: "OTP expired or not requested." });
    if (otpRecord.otp !== eOtp) return res.status(400).json({ error: "Invalid OTP." });

    await Otp.deleteMany({ email: eEmail });

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    return res.status(200).json({
      message: "Login successful!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  return res.status(200).json({ message: "Logged out successfully." });
});

// GET /api/auth/me
app.get("/api/auth/me", async (req, res) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: "Not authenticated." });

    const user = await User.findOne({ id: req.session.userId }).lean();
    if (!user) {
      req.session.destroy();
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email = "" } = req.body;
    const eEmail = email.trim().toLowerCase();
    if (!eEmail) return res.status(400).json({ error: "Email is required." });

    const user = await User.findOne({ email: eEmail }).lean();
    if (!user)
      return res
        .status(404)
        .json({ error: "No account found with this email." });

    return res.status(200).json({
      message: "Security question retrieved.",
      security_question: user.security_question,
      email: eEmail,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email = "", security_answer = "", new_password = "" } = req.body;
    const eEmail = email.trim().toLowerCase();
    const eSA = security_answer.trim().toLowerCase();

    if (!eEmail || !eSA || !new_password)
      return res.status(400).json({ error: "All fields are required." });
    if (new_password.length < 6)
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters." });

    const user = await User.findOne({ email: eEmail });
    if (!user)
      return res
        .status(404)
        .json({ error: "No account found with this email." });
    if (!bcrypt.compareSync(eSA, user.security_answer))
      return res.status(403).json({ error: "Incorrect security answer." });

    user.password = bcrypt.hashSync(new_password, 10);
    await user.save();

    return res.status(200).json({
      message:
        "Password reset successfully! You can now log in with your new password.",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  PRODUCT / INVENTORY ROUTES
// ═══════════════════════════════════════════════════

// GET /api/products
app.get("/api/products", loginRequired, async (req, res) => {
  try {
    const products = await Product.find().lean();
    return res.status(200).json({ products: clean(products) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products
app.post("/api/products", loginRequired, async (req, res) => {
  try {
    const data = req.body;
    for (const field of [
      "name",
      "category",
      "stockQuantity",
      "minStockLevel",
      "price",
      "manufacturer",
    ]) {
      if (data[field] === undefined || data[field] === "")
        return res.status(400).json({ error: `'${field}' is required.` });
    }

    const newProduct = {
      id: generateId(),
      name: data.name,
      category: data.category,
      stockQuantity: parseInt(data.stockQuantity),
      minStockLevel: parseInt(data.minStockLevel),
      price: parseFloat(data.price),
      manufacturer: data.manufacturer,
      lastUpdated: new Date().toISOString(),
    };

    await Product.create(newProduct);
    await addStockLog(
      newProduct.id,
      "INITIAL",
      newProduct.stockQuantity,
      newProduct.stockQuantity,
      "Product Created",
    );

    return res
      .status(201)
      .json({ message: "Product added successfully!", product: newProduct });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
app.put("/api/products/:id", loginRequired, async (req, res) => {
  try {
    const data = req.body;
    const product = await Product.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ error: "Product not found." });

    const oldStock = product.stockQuantity;

    for (const key of [
      "name",
      "category",
      "stockQuantity",
      "minStockLevel",
      "price",
      "manufacturer",
    ]) {
      if (key in data) {
        if (["stockQuantity", "minStockLevel"].includes(key))
          product[key] = parseInt(data[key]);
        else if (key === "price") product[key] = parseFloat(data[key]);
        else product[key] = data[key];
      }
    }
    product.lastUpdated = new Date().toISOString();
    await product.save();

    if (product.stockQuantity !== oldStock)
      await addStockLog(
        product.id,
        "ADJUSTMENT",
        product.stockQuantity - oldStock,
        product.stockQuantity,
        "Manual Adjustment",
      );

    const obj = product.toObject();
    delete obj._id;
    delete obj.__v;
    return res.status(200).json({ message: "Product updated!", product: obj });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
app.delete("/api/products/:id", loginRequired, async (req, res) => {
  try {
    await Product.deleteOne({ id: req.params.id });
    return res.status(200).json({ message: "Product deleted successfully." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/restock
app.post("/api/products/:id/restock", loginRequired, async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity || 0);
    if (quantity <= 0)
      return res
        .status(400)
        .json({ error: "Restock quantity must be positive." });

    const product = await Product.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ error: "Product not found." });

    product.stockQuantity += quantity;
    product.lastUpdated = new Date().toISOString();
    await product.save();

    await addStockLog(
      product.id,
      "RESTOCK",
      quantity,
      product.stockQuantity,
      "Manufacturer Delivery",
    );

    const obj = product.toObject();
    delete obj._id;
    delete obj.__v;
    return res
      .status(200)
      .json({ message: `Restocked ${quantity} units!`, product: obj });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  SALES ROUTES
// ═══════════════════════════════════════════════════

// GET /api/sales
app.get("/api/sales", loginRequired, async (req, res) => {
  try {
    const sales = await Sale.find().sort({ date: -1 }).lean();
    const counter = (await SalesCounter.findOne().lean()) || {
      totalSalesCount: 0,
      totalRevenue: 0,
    };
    return res.status(200).json({
      sales: clean(sales),
      totalSalesCount: counter.totalSalesCount ?? sales.length,
      totalRevenue: counter.totalRevenue ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sales
app.post("/api/sales", loginRequired, async (req, res) => {
  try {
    const {
      productId,
      quantity: rawQty,
      customerName = "Unknown",
      customerAddress = "",
    } = req.body;
    const quantity = parseInt(rawQty || 0);
    if (!productId || quantity <= 0)
      return res
        .status(400)
        .json({ error: "Valid product ID and quantity are required." });

    const product = await Product.findOne({ id: productId });
    if (!product) return res.status(404).json({ error: "Product not found." });
    if (product.stockQuantity < quantity)
      return res.status(400).json({
        error: `Insufficient stock! Available: ${product.stockQuantity}, Requested: ${quantity}`,
      });

    product.stockQuantity -= quantity;
    product.lastUpdated = new Date().toISOString();
    await product.save();

    const totalPrice = quantity * product.price;
    const newSale = {
      id: generateId(),
      productId,
      productName: product.name,
      quantity,
      totalPrice,
      date: new Date().toISOString(),
      customerName,
      customerAddress,
    };

    await Sale.create(newSale);

    const counter = await SalesCounter.findOneAndUpdate(
      {},
      { $inc: { totalSalesCount: 1, totalRevenue: totalPrice } },
      { upsert: true, new: true },
    ).lean();

    await addStockLog(
      productId,
      "SALE",
      -quantity,
      product.stockQuantity,
      `Sold to ${customerName}`,
    );

    return res.status(201).json({
      message: "Sale recorded successfully!",
      sale: newSale,
      updatedStock: product.stockQuantity,
      totalSalesCount: counter.totalSalesCount,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/stats
app.get("/api/sales/stats", loginRequired, async (req, res) => {
  try {
    const sales = await Sale.find().lean();
    const counter = (await SalesCounter.findOne().lean()) || {
      totalSalesCount: 0,
      totalRevenue: 0,
    };

    const productStats = {};
    for (const sale of sales) {
      const pid = sale.productId;
      if (!productStats[pid]) {
        productStats[pid] = {
          productId: pid,
          productName: sale.productName,
          totalQuantitySold: 0,
          totalRevenue: 0,
          saleCount: 0,
        };
      }
      productStats[pid].totalQuantitySold += sale.quantity;
      productStats[pid].totalRevenue += sale.totalPrice;
      productStats[pid].saleCount += 1;
    }

    return res.status(200).json({
      totalSalesCount: counter.totalSalesCount || 0,
      totalRevenue: counter.totalRevenue || 0,
      productStats: Object.values(productStats),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  USAGE ROUTES
// ═══════════════════════════════════════════════════

// GET /api/usage
app.get("/api/usage", loginRequired, async (req, res) => {
  try {
    const usage = await Usage.find().lean();
    return res.status(200).json({ usage: clean(usage) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/usage
app.post("/api/usage", loginRequired, async (req, res) => {
  try {
    const {
      productId,
      quantity: rawQty,
      userId,
      userName = "Unknown",
    } = req.body;
    const quantity = parseInt(rawQty || 0);
    const uId = userId || req.session.userId || "unknown";

    if (!productId || quantity <= 0)
      return res
        .status(400)
        .json({ error: "Valid product ID and quantity are required." });

    const product = await Product.findOne({ id: productId });
    if (!product) return res.status(404).json({ error: "Product not found." });
    if (product.stockQuantity < quantity)
      return res.status(400).json({ error: "Insufficient stock!" });

    product.stockQuantity -= quantity;
    product.lastUpdated = new Date().toISOString();
    await product.save();

    const newUsage = {
      id: generateId(),
      productId,
      productName: product.name,
      userId: uId,
      userName,
      quantity,
      date: new Date().toISOString(),
    };

    await Usage.create(newUsage);
    await addStockLog(
      productId,
      "USAGE",
      -quantity,
      product.stockQuantity,
      `Used by ${userName}`,
    );

    return res.status(201).json({
      message: "Usage recorded!",
      usage: newUsage,
      updatedStock: product.stockQuantity,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  STOCK LOGS
// ═══════════════════════════════════════════════════

// GET /api/stock-logs
app.get("/api/stock-logs", loginRequired, async (req, res) => {
  try {
    const stockLogs = await StockLog.find().sort({ timestamp: -1 }).lean();
    return res.status(200).json({ stockLogs: clean(stockLogs) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  PREDICTIONS — direct port of Flask algorithm
// ═══════════════════════════════════════════════════

function calculateWeightedMovingAverage(dataPoints, weights = null) {
  if (!dataPoints || dataPoints.length === 0) return 0;
  const w = weights || dataPoints.map((_, i) => Math.pow(2, i));
  const weightedSum = dataPoints.reduce((sum, d, i) => sum + d * w[i], 0);
  return weightedSum / w.reduce((a, b) => a + b, 0);
}

function detectTrend(recentSales) {
  if (!recentSales || recentSales.length < 3) return ["stable", 1.0];
  const mid = Math.floor(recentSales.length / 2);
  const firstHalfAvg =
    recentSales.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalfLen = recentSales.length - mid;
  const secondHalfAvg =
    recentSales.slice(mid).reduce((a, b) => a + b, 0) / secondHalfLen;
  if (secondHalfAvg > firstHalfAvg * 1.2) return ["increasing", 1.3];
  if (secondHalfAvg < firstHalfAvg * 0.8) return ["decreasing", 0.7];
  return ["stable", 1.0];
}

function calculateReorderPoint(
  avgDailyUsage,
  leadTimeDays = 7,
  safetyStockFactor = 1.5,
) {
  const safetyStock = avgDailyUsage * leadTimeDays * safetyStockFactor;
  return Math.floor(avgDailyUsage * leadTimeDays + safetyStock);
}

function calculateForecastAccuracy(productSales, productUsage) {
  const allQty = [
    ...productSales.map((s) => s.quantity),
    ...productUsage.map((u) => u.quantity),
  ];
  const total = allQty.length;
  if (total < 3) return ["Low", 0.3];

  const avg = allQty.reduce((a, b) => a + b, 0) / total;
  const variance = allQty.reduce((s, x) => s + Math.pow(x - avg, 2), 0) / total;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? (stdDev / avg) * 100 : 100;

  const dataScore =
    total >= 20 ? 1.0 : total >= 10 ? 0.7 : total >= 5 ? 0.5 : 0.3;

  let consistencyScore = 0.5;
  if (total >= 6) {
    const recent = allQty.slice(-3);
    const historical = allQty.slice(0, -3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const histAvg = historical.length
      ? historical.reduce((a, b) => a + b, 0) / historical.length
      : recentAvg;
    if (histAvg > 0) {
      const deviation = Math.abs(recentAvg - histAvg) / histAvg;
      consistencyScore = Math.max(0, 1 - deviation);
    }
  }

  const cvScore = cv < 15 ? 1.0 : cv < 30 ? 0.8 : cv < 50 ? 0.6 : 0.4;
  const finalScore = cvScore * 0.5 + dataScore * 0.3 + consistencyScore * 0.2;

  if (finalScore >= 0.75) return ["High", finalScore];
  if (finalScore >= 0.5) return ["Medium", finalScore];
  return ["Low", finalScore];
}

async function buildPredictions() {
  const products = await Product.find().lean();
  const sales = await Sale.find().lean();
  const usageRecords = await Usage.find().lean();
  const priorityOrder = {
    Immediate: 0,
    Urgent: 1,
    High: 2,
    Medium: 3,
    Normal: 4,
    Review: 5,
    Low: 6,
  };

  const predictions = products.map((product) => {
    const productSales = sales.filter((s) => s.productId === product.id);
    const productUsage = usageRecords.filter((u) => u.productId === product.id);
    const salesQty = productSales.slice(-14).map((s) => s.quantity);
    const usageQty = productUsage.slice(-14).map((u) => u.quantity);
    const allQty = [...salesQty, ...usageQty];

    const totalConsumed =
      productSales.reduce((s, x) => s + x.quantity, 0) +
      productUsage.reduce((s, x) => s + x.quantity, 0);

    const [trendDirection, trendFactor] = allQty.length
      ? detectTrend(allQty)
      : ["stable", 1.0];
    const daysActive = Math.max(30, productSales.length + productUsage.length);
    const adjustedDaily =
      Math.max(0.1, totalConsumed / daysActive) * trendFactor;
    const avgDailyUsage = Math.round(adjustedDaily * 100) / 100;

    const daysRemaining =
      avgDailyUsage > 0
        ? Math.floor(product.stockQuantity / avgDailyUsage)
        : 9999;
    const reorderPoint = calculateReorderPoint(avgDailyUsage);
    const [forecastAccuracy, accuracyScore] = calculateForecastAccuracy(
      productSales,
      productUsage,
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
    } else if (daysRemaining > 90) {
      status = "Overstocked";
      priority = "Review";
    } else if (currentStock > minLevel * 3) {
      status = "Overstocked";
      priority = "Low";
    } else {
      status = "Healthy";
      priority = "Normal";
    }

    let recommendedOrderQty = 0;
    if (["Critical", "Low"].includes(status)) {
      const targetStock = Math.max(reorderPoint, minLevel * 1.3);
      recommendedOrderQty = Math.max(0, Math.floor(targetStock - currentStock));
    } else if (currentStock < reorderPoint) {
      recommendedOrderQty = Math.floor((reorderPoint - currentStock) * 1.2);
    }

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
      minStockLevel: minLevel,
    };
  });

  predictions.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 999;
    const pb = priorityOrder[b.priority] ?? 999;
    return pa !== pb ? pa - pb : a.daysRemaining - b.daysRemaining;
  });

  return predictions;
}

// GET /api/predictions
app.get("/api/predictions", loginRequired, async (req, res) => {
  try {
    return res.status(200).json({ predictions: await buildPredictions() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════

// GET /api/dashboard
app.get("/api/dashboard", loginRequired, async (req, res) => {
  try {
    const products = await Product.find().lean();
    const sales = await Sale.find().sort({ date: -1 }).lean();
    const counter = (await SalesCounter.findOne().lean()) || {
      totalSalesCount: 0,
      totalRevenue: 0,
    };

    const totalProducts = products.length;
    const totalStock = products.reduce((s, p) => s + p.stockQuantity, 0);
    const lowStockCount = products.filter(
      (p) => p.stockQuantity < p.minStockLevel,
    ).length;
    const totalValue = products.reduce(
      (s, p) => s + p.stockQuantity * p.price,
      0,
    );

    const categories = {};
    for (const p of products) {
      if (!categories[p.category])
        categories[p.category] = { count: 0, totalStock: 0, totalValue: 0 };
      categories[p.category].count += 1;
      categories[p.category].totalStock += p.stockQuantity;
      categories[p.category].totalValue += p.stockQuantity * p.price;
    }

    return res.status(200).json({
      totalProducts,
      totalStock,
      lowStockCount,
      totalValue,
      totalSalesCount: counter.totalSalesCount || 0,
      totalRevenue: counter.totalRevenue || 0,
      categories,
      recentSales: clean(sales.slice(0, 5)),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  USERS (admin only)
// ═══════════════════════════════════════════════════

// GET /api/users
app.get("/api/users", loginRequired, async (req, res) => {
  try {
    if (req.session.userRole !== "ADMIN")
      return res.status(403).json({ error: "Admin access required." });

    const users = await User.find().lean();
    const safeUsers = users.map(
      ({ _id, __v, password, security_answer, ...safe }) => safe,
    );
    return res.status(200).json({ users: safeUsers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  NOTIFICATIONS
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

// GET /api/notifications
app.get("/api/notifications", loginRequired, async (req, res) => {
  try {
    // Purge notifications older than 7 days
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await Notification.deleteMany({ timestamp: { $lt: cutoff } });

    let notifs = await Notification.find().lean();

    const products = await Product.find().lean();
    const sales = await Sale.find().sort({ date: -1 }).lean();
    const predictions = await buildPredictions();

    const newNotifs = [];

    // Low-stock alerts
    for (const pred of predictions) {
      if (!["Critical", "Low"].includes(pred.status)) continue;
      const product = products.find((p) => p.id === pred.productId);
      if (!product) continue;

      const existing = notifs.find(
        (n) =>
          n.type === "low_stock" && n.productId === pred.productId && !n.read,
      );
      if (existing) continue;

      let optimalOrder = pred.recommendedOrderQty;
      const minOrder = Math.max(pred.minStockLevel - pred.currentStock, 0);
      if (optimalOrder === 0)
        optimalOrder = Math.max(minOrder, Math.floor(pred.reorderPoint * 1.2));

      newNotifs.push(
        createNotification(
          "low_stock",
          `${pred.status} Stock Alert`,
          `${pred.productName} needs restocking`,
          pred.productId,
          pred.productName,
          {
            status: pred.status,
            priority: pred.priority,
            currentStock: pred.currentStock,
            minStockLevel: pred.minStockLevel,
            daysRemaining: pred.daysRemaining,
            optimalOrder,
            minimumOrder: minOrder,
            reorderPoint: pred.reorderPoint,
            manufacturer: product.manufacturer || "Unknown",
          },
        ),
      );
    }

    // Recent sales notifications (last 5)
    for (const sale of sales.slice(0, 5)) {
      const existing = notifs.find(
        (n) => n.type === "sale" && n.metadata?.saleId === sale.id,
      );
      if (existing) continue;

      newNotifs.push(
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
            customerName: sale.customerName || "Unknown",
            date: sale.date,
          },
        ),
      );
    }

    if (newNotifs.length > 0) {
      await Notification.insertMany(newNotifs, { ordered: false });
      notifs = [...notifs, ...newNotifs];
    }

    const sorted = notifs.sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
    const unreadCount = sorted.filter((n) => !n.read).length;

    return res.status(200).json({
      notifications: clean(sorted),
      unreadCount,
      total: sorted.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read
app.post("/api/notifications/:id/read", loginRequired, async (req, res) => {
  try {
    const notif = await Notification.findOne({ id: req.params.id });
    if (!notif)
      return res.status(404).json({ error: "Notification not found" });

    notif.read = true;
    await notif.save();

    const obj = notif.toObject();
    delete obj._id;
    delete obj.__v;
    return res
      .status(200)
      .json({ message: "Notification marked as read", notification: obj });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/clear-all  ← must be BEFORE /:id/action
app.post("/api/notifications/clear-all", loginRequired, async (req, res) => {
  try {
    await Notification.deleteMany({ read: true });
    const remaining = await Notification.countDocuments();
    return res
      .status(200)
      .json({ message: "All read notifications cleared", remaining });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/action
app.post("/api/notifications/:id/action", loginRequired, async (req, res) => {
  try {
    const { action, quantity, orderType = "optimal" } = req.body;
    const notif = await Notification.findOne({ id: req.params.id });
    if (!notif)
      return res.status(404).json({ error: "Notification not found" });

    if (action === "order" && quantity) {
      const productId = notif.productId;
      const product = await Product.findOne({ id: productId });

      if (product) {
        product.stockQuantity += quantity;
        product.lastUpdated = new Date().toISOString();
        await product.save();

        await StockLog.create({
          id: generateId(),
          productId,
          productName: product.name,
          action: "restock",
          quantityChange: quantity,
          remainingStock: product.stockQuantity,
          timestamp: new Date().toISOString(),
          note: `Ordered via notification - ${orderType} order`,
        });
      }

      notif.read = true;
      notif.resolved = true;
      notif.resolvedAt = new Date().toISOString();

      const meta = notif.metadata ? { ...notif.metadata } : {};
      meta.orderPlaced = {
        quantity,
        type: orderType,
        timestamp: new Date().toISOString(),
      };
      notif.metadata = meta;
      notif.markModified("metadata");
      await notif.save();

      const obj = notif.toObject();
      delete obj._id;
      delete obj.__v;
      return res.status(200).json({
        message: `Order placed successfully for ${quantity} units`,
        notification: obj,
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════════

app.get("/api/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return res.status(200).json({
    status: "healthy",
    message: "Invenio AI Backend is running!",
    storage: "MongoDB Atlas",
    dbState: states[mongoose.connection.readyState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/secret-seed-database", async (req, res) => {
  try {
    await mongoose.connection.db.dropDatabase();
    await initializeData();
    res.json({ message: "Database dropped and re-seeded successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  DEMAND FORECASTING ENDPOINTS
// ═══════════════════════════════════════════════════

// GET /api/forecasts
app.get("/api/forecasts", async (req, res) => {
  try {
    const data = await ForecastData.findOne().lean();
    if (!data)
      return res.status(404).json({
        error:
          "Forecasts not yet generated. Run train_forecast_model.py first.",
      });

    delete data._id;
    delete data.__v;
    const { horizon = null, productId = null } = req.query;
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
        const entry = Object.fromEntries(
          Object.entries(p).filter(([k]) => k !== "forecasts"),
        );
        const fc = (p.forecasts || {})[horizon] || {};
        entry.forecast = Object.fromEntries(
          Object.entries(fc).filter(([k]) => k !== "daily_breakdown"),
        );
        entry.horizon = horizon;
        return entry;
      });
      return res.status(200).json({
        generatedAt: data.generatedAt,
        forecastedUpTo: data.forecastedUpTo,
        horizon,
        products: slim,
      });
    }

    const summary = productsFc.map((p) => {
      const entry = Object.fromEntries(
        Object.entries(p).filter(([k]) => k !== "forecasts"),
      );
      entry.forecasts = {};
      for (const h of ["30d", "60d", "90d"]) {
        const fc = (p.forecasts || {})[h] || {};
        entry.forecasts[h] = Object.fromEntries(
          Object.entries(fc).filter(([k]) => k !== "daily_breakdown"),
        );
      }
      return entry;
    });

    return res.status(200).json({
      generatedAt: data.generatedAt,
      forecastedUpTo: data.forecastedUpTo,
      horizons: data.horizons || ["30d", "60d", "90d"],
      products: summary,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/forecasts/:productId/daily
app.get("/api/forecasts/:productId/daily", async (req, res) => {
  try {
    const data = await ForecastData.findOne().lean();
    if (!data)
      return res.status(404).json({ error: "Forecasts not generated yet." });

    const productsFc = data.products || [];
    const match = productsFc.find((p) => p.productId === req.params.productId);
    if (!match)
      return res
        .status(404)
        .json({ error: `No forecast for productId=${req.params.productId}` });

    const horizon = req.query.horizon || "30d";
    if (!["30d", "60d", "90d"].includes(horizon))
      return res
        .status(400)
        .json({ error: "horizon must be 30d, 60d, or 90d" });

    const daily =
      ((match.forecasts || {})[horizon] || {}).daily_breakdown || [];

    return res.status(200).json({
      productId: req.params.productId,
      productName: match.productName,
      horizon,
      generatedAt: data.generatedAt,
      daily,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
//  START SERVER (only after DB is connected)
// ═══════════════════════════════════════════════════
mongoose.connection.once("open", async () => {
  await initializeData();
});

mongoose.connection.on("error", (err) => {
  console.error("[mongo] Runtime error:", err.message);
});

// Global Error Handler to catch crashes and return JSON
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "A server-side error occurred.",
    details: err.message
  });
});

module.exports = app;
