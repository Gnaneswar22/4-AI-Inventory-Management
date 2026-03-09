<div align="center">
<img width="1200" height="475" alt="StockSense Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🚀 StockSense: Intelligent Inventory Management

**Empowering businesses with AI-driven demand forecasting and seamless stock control.**

StockSense is a multi-layered enterprise solution that bridges the gap between traditional inventory tracking and predictive analytics. By leveraging Ridge Regression and sophisticated feature engineering, it anticipates demand spikes before they happen.

## ✨ Core Features

- **📊 Advanced Analytics**: Real-time sales tracking and demand visualization using Recharts.
- **🔮 AI-Powered Forecasting**: 30, 60, and 90-day predictions grounded in seasonal trends and festival cycles.
- **🔒 Secure Authentication**: Multi-factor OTP (One-Time Password) system with persistent session management.
- **📱 Premium Responsive UI**: A glassmorphism-inspired dashboard for a state-of-the-art user experience.
- **🛠 Dual-Backend Architecture**: High-performance Node.js API coupled with a Python Flask machine learning engine.

## 🏗 System Architecture

The project features a decoupled architecture:
1.  **Frontend**: React 19 + Vite + TypeScript.
2.  **API Backend**: Node.js + Express + MongoDB Atlas.
3.  **AI Engine**: Python (Flask, NumPy, Scikit-learn).

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- MongoDB Atlas Account (or local MongoDB)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python train_forecast_model.py  # Generate initial forecasts
```

### 2. API Setup
```bash
npm install
# Configure .env.local with MONGO_URI and SMTP credentials
npm run dev
```

## 📖 Documentation

For a deep dive into the technical details and academic-style documentation (perfect for a thesis), please refer to:
- **[Thesis Documentation Report](file:///c:/4-AI%20Inventory-Management/STOCKSENSE_THESIS_DOCUMENTATION.md)**
- **[Technical Architecture Guide](file:///c:/4-AI%20Inventory-Management/ARCHITECTURE_GUIDE.md)**

---

<div align="center">
Built with ❤️ for Modern Supply Chains
</div>
