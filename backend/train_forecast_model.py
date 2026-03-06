"""
train_forecast_model.py  (v2 — NumPy-only, no sklearn workers)
===============================================================
• Reads sales data
• Trains per-product Ridge Regression (closed-form, no multiprocessing)
• Forecasts next 30 / 60 / 90 days
• Saves → data/forecasts.json  and  models/<pid>.npz

Run:  python train_forecast_model.py
"""


#based on criteria like seasons and time 

import os, math, sys
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np

# ── Major Festivals & Events (Month, Day) ──────────────────────────────────
FESTIVALS = [
    (1, 1),   # New Year's Day
    (1, 26),  # Republic Day (India)
    (2, 14),  # Valentine's Day
    (3, 8),   # Women's Day
    (3, 14),  # Holi (approximate mid-march placeholder for synthetic data)
    (8, 15),  # Independence Day (India)
    (10, 31), # Halloween
    (11, 1),  # Diwali (approximate early Nov placeholder)
    (11, 28), # Black Friday (approximate late Nov placeholder)
    (12, 25), # Christmas
    (12, 31), # New Year's Eve
]

def get_days_to_nearest_festival(d: datetime) -> int:
    """Returns the absolute number of days to the closest festival (0 if today is a festival)."""
    min_dist = 365
    for (f_month, f_day) in FESTIVALS:
        # Check this year
        try:
            f_date_this = datetime(d.year, f_month, f_day)
            dist_this = abs((f_date_this - d).days)
            min_dist = min(min_dist, dist_this)
        except ValueError:
            pass # Handle leap years if 2/29
        
        # Check next year (for events early next year when currently in Dec)
        try:
            f_date_next = datetime(d.year + 1, f_month, f_day)
            dist_next = abs((f_date_next - d).days)
            min_dist = min(min_dist, dist_next)
        except ValueError:
            pass
            
        # Check last year (for events late last year when currently in Jan)
        try:
            f_date_prev = datetime(d.year - 1, f_month, f_day)
            dist_prev = abs((d - f_date_prev).days)
            min_dist = min(min_dist, dist_prev)
        except ValueError:
            pass

    return min_dist

# Force UTF-8 stdout/stderr on Windows so product names with unicode don't crash
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── paths ──────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR     = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

import json

PRODUCTS_FILE = os.path.join(BASE_DIR, "data", "products.json")
SALES_FILE = os.path.join(BASE_DIR, "data", "sales.json")
FORECASTS_FILE = os.path.join(BASE_DIR, "data", "forecasts.json")

def read_json_list(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ── load ───────────────────────────────────────────────────────────────────
print("Loading data from JSON...", flush=True)
products  = read_json_list(PRODUCTS_FILE)
sales_raw = read_json_list(SALES_FILE)
PROD_MAP  = {p["id"]: p for p in products}
print(f"  {len(products)} products, {len(sales_raw):,} sales records", flush=True)

daily_sales: dict = defaultdict(lambda: defaultdict(int))
for rec in sales_raw:
    daily_sales[rec["productId"]][rec["date"][:10]] += rec["quantity"]

# ── feature building ───────────────────────────────────────────────────────
def build_row(d: datetime, hist: list, i: int) -> list:
    dow, mon, doy = d.weekday(), d.month, d.timetuple().tm_yday
    days_to_fest = get_days_to_nearest_festival(d)
    
    row = [
        math.sin(2*math.pi*dow/7),  math.cos(2*math.pi*dow/7),
        math.sin(2*math.pi*mon/12), math.cos(2*math.pi*mon/12),
        math.sin(2*math.pi*doy/365),
        1 if dow >= 5 else 0, # is weekend
        1 if d.day == 1 else 0, # is start of month
        1 if d.day >= 28 else 0, # is end of month
        # Festival features
        1 if days_to_fest == 0 else 0,           # is_festival_day
        1 if 0 < days_to_fest <= 3 else 0,       # 3 days around festival
        1 if 3 < days_to_fest <= 7 else 0,       # 1 week around festival
        math.exp(-days_to_fest / 3.0),           # Exponential decay proximity score
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
TODAY    = datetime.now()
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

    # --- Generate Insight Reason ---
    insight_parts = []
    
    # 1. Festival Check
    days_to_peak = (datetime.strptime(peak["date"], "%Y-%m-%d") - TODAY).days
    if 0 <= days_to_peak <= 30:
        for f_month, f_day in FESTIVALS:
            f_date = datetime(TODAY.year, f_month, f_day)
            if f_date < TODAY:
                f_date = datetime(TODAY.year + 1, f_month, f_day)
            if abs((f_date - datetime.strptime(peak["date"], "%Y-%m-%d")).days) <= 7:
                 insight_parts.append(f"A festival/event is approaching on {f_date.strftime('%b %d')}, causing a demand spike.")
                 break
                 
    # 2. Trend Check
    if trend_pct > 15:
         insight_parts.append(f"Recent sales are trending strongly upward (+{trend_pct}%).")
    elif trend_pct < -15:
         insight_parts.append(f"Demand is cooling down ({trend_pct}%).")
         
    # 3. Stock Check
    if restock > 0:
         insight_parts.append(f"Current stock ({prod['stockQuantity']}) cannot cover the anticipated 30-day demand + buffer.")
    elif prod["stockQuantity"] > fc30 * 3 and fc30 > 0:
         # Rough heuristic for overstock
         insight_parts.append(f"High overstock risk: Inventory ({prod['stockQuantity']}) far exceeds 90-day needs.")

    if not insight_parts:
         if fc30 > recent30:
             insight_parts.append("Demand is expected to remain stable with a slight increase.")
         else:
             insight_parts.append("Demand is expected to remain stable.")

    insight_reason = " ".join(insight_parts)

    all_forecasts.append({
        "productId": pid, "productName": pname, "category": prod["category"],
        "currentStock": prod["stockQuantity"], "minStockLevel": prod["minStockLevel"],
        "price": prod["price"],
        "modelMAE": round(mae,3), "modelRMSE": round(rmse,3),
        "trendPercent": trend_pct, "restockSuggested": restock,
        "insightReason": insight_reason,
        "generatedAt": TODAY.isoformat(), "forecasts": hs,
    })

forecast_doc = {
    "generatedAt": TODAY.isoformat(),
    "forecastedUpTo": (TODAY + timedelta(days=90)).strftime("%Y-%m-%d"),
    "horizons": ["30d","60d","90d"], "products": all_forecasts
}

write_json(FORECASTS_FILE, forecast_doc)

print(f"\n[DONE] Forecasts saved to {FORECASTS_FILE} ({len(all_forecasts)} products)", flush=True)
print(f"[DONE] {models_saved} model files in models/", flush=True)

print("\n--- Top-10 by 30d demand ---", flush=True)
for fc in sorted(all_forecasts, key=lambda x: x["forecasts"]["30d"]["total_predicted_qty"], reverse=True)[:10]:
    print(f"  {fc['productName'][:38]:<38}  30d={fc['forecasts']['30d']['total_predicted_qty']:>6.0f}"
          f"  60d={fc['forecasts']['60d']['total_predicted_qty']:>6.0f}"
          f"  90d={fc['forecasts']['90d']['total_predicted_qty']:>6.0f}"
          f"  trend={fc['trendPercent']:+.1f}%", flush=True)
print("Done!", flush=True)

