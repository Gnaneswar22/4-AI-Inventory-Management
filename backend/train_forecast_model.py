"""
train_forecast_model.py  (v2 — NumPy-only, no sklearn workers)
===============================================================
• Reads sales data
• Trains per-product Ridge Regression (closed-form, no multiprocessing)
• Forecasts next 30 / 60 / 90 days
• Saves → data/forecasts.json  and  models/<pid>.npz

Run:  python train_forecast_model.py
"""

import json, os, math, sys
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np

# Force UTF-8 stdout/stderr on Windows so product names with unicode don't crash
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── paths ──────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
DATA_DIR       = os.path.join(BASE_DIR, "data")
MODELS_DIR     = os.path.join(BASE_DIR, "models")
SALES_FILE     = os.path.join(DATA_DIR, "sales.json")
PRODUCTS_FILE  = os.path.join(DATA_DIR, "products.json")
FORECASTS_FILE = os.path.join(DATA_DIR, "forecasts.json")

os.makedirs(MODELS_DIR, exist_ok=True)

def jload(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def jsave(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

# ── load ───────────────────────────────────────────────────────────────────
print("Loading data ...", flush=True)
products  = jload(PRODUCTS_FILE)
sales_raw = jload(SALES_FILE)
PROD_MAP  = {p["id"]: p for p in products}
print(f"  {len(products)} products, {len(sales_raw):,} sales records", flush=True)

daily_sales: dict = defaultdict(lambda: defaultdict(int))
for rec in sales_raw:
    daily_sales[rec["productId"]][rec["date"][:10]] += rec["quantity"]

# ── feature building ───────────────────────────────────────────────────────
def build_row(d: datetime, hist: list, i: int) -> list:
    dow, mon, doy = d.weekday(), d.month, d.timetuple().tm_yday
    row = [
        math.sin(2*math.pi*dow/7),  math.cos(2*math.pi*dow/7),
        math.sin(2*math.pi*mon/12), math.cos(2*math.pi*mon/12),
        math.sin(2*math.pi*doy/365),
        1 if dow >= 5 else 0,
        1 if d.day == 1 else 0,
        1 if d.day >= 28 else 0,
    ]
    for lag in [1, 3, 7, 14, 30]:
        row.append(hist[i - lag] if i >= lag else 0.0)
    for win in [7, 14, 30]:
        sl = hist[max(0, i-win):i]
        row.append(float(np.mean(sl)) if sl else 0.0)
    return row

def ridge_fit(X, y, alpha=0.5):
    Xb = np.column_stack([np.ones(len(X)), X])
    A  = Xb.T @ Xb + alpha * np.eye(Xb.shape[1])
    A[0, 0] -= alpha
    return np.linalg.solve(A, Xb.T @ y)

def ridge_predict(w, X):
    return np.column_stack([np.ones(len(X)), X]) @ w

# ── main ───────────────────────────────────────────────────────────────────
TODAY    = datetime(2026, 2, 21)
HORIZONS = {"30d": 30, "60d": 60, "90d": 90}

print("\nTraining models ...", flush=True)
all_forecasts, models_saved = [], 0

for prod in products:
    pid, pname = prod["id"], prod["name"]
    dm = daily_sales.get(pid, {})
    if not dm:
        continue

    min_d  = datetime.strptime(min(dm), "%Y-%m-%d")
    max_d  = datetime.strptime(max(dm), "%Y-%m-%d")
    dates  = [min_d + timedelta(days=k) for k in range((max_d - min_d).days + 1)]
    qty    = [float(dm.get(d.strftime("%Y-%m-%d"), 0)) for d in dates]

    if len(dates) < 60:
        continue

    X_rows = [build_row(dates[i], qty, i) for i in range(len(dates))]
    X = np.array(X_rows); y = np.array(qty)

    split = int(len(X) * 0.85)
    w = ridge_fit(X[:split], y[:split])
    y_hat = ridge_predict(w, X[split:])
    mae  = float(np.mean(np.abs(y[split:] - y_hat)))
    rmse = float(math.sqrt(np.mean((y[split:] - y_hat)**2)))
    print(f"  [OK] {pname[:40]:40s}  MAE={mae:.2f}  RMSE={rmse:.2f}", flush=True)

    np.savez(os.path.join(MODELS_DIR, f"{pid}.npz"), w=w)
    models_saved += 1

    # forecast 90 days ahead
    hist = qty.copy()
    future_rows = []
    for ahead in range(1, 91):
        fd  = TODAY + timedelta(days=ahead)
        i   = len(hist)
        row = build_row(fd, hist, i)
        q   = max(0.0, float(ridge_predict(w, np.array([row]))[0]))
        hist.append(q)
        future_rows.append({"date": fd.strftime("%Y-%m-%d"),
                             "predicted_qty": round(q, 2)})

    hs = {}
    for key, days in HORIZONS.items():
        sub  = future_rows[:days]
        tot  = round(sum(r["predicted_qty"] for r in sub), 1)
        peak = max(sub, key=lambda r: r["predicted_qty"])
        low  = min(sub, key=lambda r: r["predicted_qty"])
        hs[key] = {"total_predicted_qty": tot,
                   "avg_daily_qty": round(tot/days, 2),
                   "peak_date": peak["date"], "peak_qty": round(peak["predicted_qty"],1),
                   "low_date":  low["date"],  "low_qty":  round(low["predicted_qty"],1),
                   "daily_breakdown": sub}

    recent30  = float(np.sum(qty[-30:])) if len(qty) >= 30 else float(np.sum(qty))
    fc30      = hs["30d"]["total_predicted_qty"]
    trend_pct = round(((fc30 - recent30) / max(recent30, 1)) * 100, 1)
    restock   = max(0, int(fc30 * 1.25) - prod["stockQuantity"])

    all_forecasts.append({
        "productId": pid, "productName": pname, "category": prod["category"],
        "currentStock": prod["stockQuantity"], "minStockLevel": prod["minStockLevel"],
        "price": prod["price"],
        "modelMAE": round(mae,3), "modelRMSE": round(rmse,3),
        "trendPercent": trend_pct, "restockSuggested": restock,
        "generatedAt": TODAY.isoformat(), "forecasts": hs,
    })

jsave(FORECASTS_FILE, {"generatedAt": TODAY.isoformat(),
                       "forecastedUpTo": (TODAY + timedelta(days=90)).strftime("%Y-%m-%d"),
                       "horizons": ["30d","60d","90d"], "products": all_forecasts})

print(f"\n[DONE] forecasts.json saved ({len(all_forecasts)} products)", flush=True)
print(f"[DONE] {models_saved} model files in models/", flush=True)

print("\n--- Top-10 by 30d demand ---", flush=True)
for fc in sorted(all_forecasts, key=lambda x: x["forecasts"]["30d"]["total_predicted_qty"], reverse=True)[:10]:
    print(f"  {fc['productName'][:38]:<38}  30d={fc['forecasts']['30d']['total_predicted_qty']:>6.0f}"
          f"  60d={fc['forecasts']['60d']['total_predicted_qty']:>6.0f}"
          f"  90d={fc['forecasts']['90d']['total_predicted_qty']:>6.0f}"
          f"  trend={fc['trendPercent']:+.1f}%", flush=True)
print("Done!", flush=True)

