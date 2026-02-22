"""
generate_synthetic_data.py
===========================
Generates ~15 months of realistic synthetic sales, usage, and stock-log
records for all 22 products in the inventory system.

Run:  python generate_synthetic_data.py
"""

import json
import os
import uuid
import random
import math
from datetime import datetime, timedelta

# ── paths ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

PRODUCTS_FILE   = os.path.join(DATA_DIR, "products.json")
SALES_FILE      = os.path.join(DATA_DIR, "sales.json")
USAGE_FILE      = os.path.join(DATA_DIR, "usage.json")
STOCK_LOG_FILE  = os.path.join(DATA_DIR, "stock_logs.json")

# ── helper ─────────────────────────────────────────────────────────────────
def new_id():
    return str(uuid.uuid4())[:8]

def jload(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def jsave(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ── load products ──────────────────────────────────────────────────────────
products = jload(PRODUCTS_FILE)
PROD_MAP = {p["id"]: p for p in products}

# ── customer pool ──────────────────────────────────────────────────────────
CUSTOMERS = [
    ("Rajesh Kumar",       "345, MG Road, Delhi"),
    ("Priya Sharma",       "65, Lake View Colony, Chennai"),
    ("Arun Pillai",        "194, Nehru Nagar, Ahmedabad"),
    ("Sneha Das",          "447, Mall Road, Bangalore"),
    ("Rohit Verma",        "227, Gandhi Chowk, Indore"),
    ("Neha Gupta",         "199, Gandhi Chowk, Chandigarh"),
    ("Divya Rao",          "261, Ring Road, Indore"),
    ("Ankit Patel",        "374, MG Road, Bangalore"),
    ("Sanya Mehta",        "111, Ring Road, Mumbai"),
    ("Vikram Singh",       "202, Nehru Nagar, Nagpur"),
    ("Ritu Saxena",        "241, Mall Road, Jaipur"),
    ("Suresh Iyer",        "65, Civil Lines, Hyderabad"),
    ("Manish Agarwal",     "272, MG Road, Kolkata"),
    ("Deepak Tiwari",      "370, Lake View Colony, Kolkata"),
    ("Pooja Nair",         "126, Mall Road, Chennai"),
    ("Karthik Menon",      "491, MG Road, Nagpur"),
    ("Swathi Chakraborty", "240, Mall Road, Lucknow"),
    ("Arjun Reddy",        "88, Station Road, Hyderabad"),
    ("Meena Krishnan",     "55, Civil Lines, Pune"),
    ("Rahul Nair",         "310, Park Street, Kolkata"),
    ("Anjali Mishra",      "77, Gandhi Nagar, Jaipur"),
    ("Siddharth Roy",      "220, Lake View Colony, Bhopal"),
    ("Kavitha Suresh",     "105, Ring Road, Coimbatore"),
    ("Nikhil Joshi",       "432, MG Road, Pune"),
    ("Tanvi Bose",         "99, Nehru Nagar, Surat"),
    ("Gaurav Dixit",       "503, Civil Lines, Lucknow"),
]

# ── internal users ─────────────────────────────────────────────────────────
USERS = [
    ("fda460e6", "Admin User"),
    ("2e2e4c48", "Store Manager"),
    ("7902e604", "Warehouse Lead"),
]

USAGE_REASONS = [
    "Quality testing", "Exhibition", "Gifting", "Display sample",
    "Photo shoot sample", "Warehouse audit sample", "Return — damaged",
    "Staff training", "Marketing shoot", "Product demo",
]

RESTOCK_NOTES = [
    "Manufacturer Delivery", "Distributor Replenishment",
    "Emergency Restock", "Monthly Bulk Order", "Supplier Delivery",
    "Urgent Replenishment",
]

# ── per-product sales configuration ────────────────────────────────────────
# (base_daily_qty, qty_range, weekend_multiplier, festival_boost_months)
PRODUCT_SALES_CFG = {
    # Electronics
    "23d6913c": (2, (1, 4),  1.4, [10, 11, 12]),   # Samsung Buds Pro
    "34f46a00": (5, (2, 8),  1.3, [10, 11, 12]),   # boAt Airdopes 141
    "128b2df1": (1, (1, 3),  1.3, [10, 11, 12]),   # JBL Speaker
    "7fd8485c": (3, (1, 6),  1.2, [10, 11, 12]),   # Realme Power Bank
    # Shoes
    "03f15757": (2, (1, 4),  1.5, [1, 2, 10, 11]), # Nike Pegasus
    "2750d332": (1, (1, 3),  1.4, [1, 2, 10, 11]), # Adidas Ultraboost
    "75978dd0": (2, (1, 4),  1.5, [1, 2, 10, 11]), # Puma RS-X
    "bdab3bcb": (2, (1, 5),  1.5, [1, 2, 10, 11]), # Reebok Classic
    # Watches
    "7a05949f": (2, (1, 4),  1.3, [10, 11, 12, 2]),# Titan Neo
    "964341d5": (1, (1, 3),  1.2, [10, 11, 12]),   # Fossil Gen 6
    "47036afc": (2, (1, 4),  1.3, [10, 11, 12]),   # Casio G-Shock
    # Clothing
    "68228509": (4, (2, 7),  1.4, [10, 11, 3, 4]), # Levi's Jeans
    "a1295b93": (4, (2, 7),  1.4, [1, 2, 9, 10]),  # Allen Solly Shirt
    "06c18dc6": (6, (3, 10), 1.5, [3, 4, 10, 11]), # US Polo T-Shirt
    "a5966dc2": (1, (1, 3),  1.3, [10, 11, 12, 2]),# Raymond Blazer
    # Accessories
    "60ee9f39": (3, (1, 5),  1.3, [10, 11, 12]),   # LP Leather Belt
    "a05e96b5": (2, (1, 4),  1.3, [10, 11, 12, 2]),# Tommy Wallet
    "584396b5": (1, (1, 3),  1.4, [3, 4, 5, 6]),   # Ray-Ban Aviator
    # Books
    "95c2215b": (5, (2, 9),  1.2, [1, 6, 7]),      # Atomic Habits
    "1abfc76e": (4, (2, 7),  1.2, [1, 6, 7]),      # Psychology of Money
    "870e5336": (4, (2, 7),  1.2, [1, 6, 7]),      # Ikigai
    # Home & Kitchen
    "8494d92d": (5, (2, 9),  1.3, [10, 11, 12]),   # Milton Flask
    "7d9218a6": (2, (1, 5),  1.3, [10, 11, 12]),   # Prestige Fry Pan
    "954b6709": (3, (1, 6),  1.3, [10, 11, 12]),   # Pigeon Desk Lamp
}

# ── date range: Nov 2024 → Feb 21 2026 (15 months) ─────────────────────────
START_DATE = datetime(2024, 11, 1)
END_DATE   = datetime(2026, 2, 21)

def is_festival_period(dt, festival_months):
    """Return a boost multiplier if in a 'hot' month for this product."""
    if dt.month in festival_months:
        return 1.6
    return 1.0

def weekend_factor(dt, mult):
    if dt.weekday() >= 5:   # Sat=5, Sun=6
        return mult
    return 1.0

def seasonal_wave(dt):
    """Subtle sinusoidal seasonal component."""
    day_of_year = dt.timetuple().tm_yday
    return 1.0 + 0.15 * math.sin(2 * math.pi * day_of_year / 365)

# ── track running stock for each product ───────────────────────────────────
running_stock = {p["id"]: p["stockQuantity"] + random.randint(200, 400)
                 for p in products}

print("Generating synthetic data …")
print(f"  Date range : {START_DATE.date()} → {END_DATE.date()}")
print(f"  Products   : {len(products)}")

sales_records     = []
usage_records     = []
stock_log_records = []

current_date = START_DATE
while current_date <= END_DATE:
    # ── daily sales for each product ───────────────────────────────────────
    for prod in products:
        pid = prod["id"]
        cfg = PRODUCT_SALES_CFG.get(pid)
        if not cfg:
            continue

        base_qty, qty_range, wk_mult, fest_months = cfg

        # compute expected daily quantity using multiple factors
        factor = (
            weekend_factor(current_date, wk_mult) *
            is_festival_period(current_date, fest_months) *
            seasonal_wave(current_date)
        )
        expected_qty = base_qty * factor

        # decide how many individual sale transactions happen today (0–3)
        num_txns = random.choices([0, 1, 2, 3],
                                  weights=[30, 40, 20, 10])[0]

        for _ in range(num_txns):
            qty = max(1, int(random.gauss(expected_qty / max(num_txns, 1),
                                          0.8)))
            qty = min(qty, qty_range[1])
            qty = max(qty, qty_range[0])

            if running_stock[pid] < qty:
                # auto-restock before sale
                restock_qty = random.randint(30, 80)
                if running_stock[pid] <= 0:
                    running_stock[pid] = restock_qty
                else:
                    running_stock[pid] += restock_qty
                stock_log_records.append({
                    "id":             new_id(),
                    "productId":      pid,
                    "action":         "RESTOCK",
                    "quantityChange": restock_qty,
                    "remainingStock": running_stock[pid],
                    "timestamp":      current_date.isoformat(),
                    "note":           random.choice(RESTOCK_NOTES),
                })

            total_price = prod["price"] * qty
            cust_name, cust_addr = random.choice(CUSTOMERS)

            # add slight time variation within the day
            sale_time = current_date + timedelta(
                hours=random.randint(8, 21),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
            )

            sale = {
                "id":              new_id(),
                "productId":       pid,
                "productName":     prod["name"],
                "quantity":        qty,
                "totalPrice":      total_price,
                "date":            sale_time.isoformat(),
                "customerName":    cust_name,
                "customerAddress": cust_addr,
            }
            sales_records.append(sale)

            running_stock[pid] -= qty
            running_stock[pid] = max(running_stock[pid], 0)

            stock_log_records.append({
                "id":             new_id(),
                "productId":      pid,
                "action":         "SALE",
                "quantityChange": -qty,
                "remainingStock": running_stock[pid],
                "timestamp":      sale_time.isoformat(),
                "note":           f"Sold {qty} × {prod['name']} to {cust_name}",
            })

    # ── weekly restock check ───────────────────────────────────────────────
    if current_date.weekday() == 0:   # every Monday
        for prod in products:
            pid = prod["id"]
            min_level = prod["minStockLevel"]
            if running_stock[pid] < min_level * 1.5:
                restock_qty = random.randint(min_level * 2, min_level * 4)
                running_stock[pid] += restock_qty
                restock_time = current_date + timedelta(
                    hours=random.randint(7, 10),
                    minutes=random.randint(0, 59),
                )
                stock_log_records.append({
                    "id":             new_id(),
                    "productId":      pid,
                    "action":         "RESTOCK",
                    "quantityChange": restock_qty,
                    "remainingStock": running_stock[pid],
                    "timestamp":      restock_time.isoformat(),
                    "note":           random.choice(RESTOCK_NOTES),
                })

    # ── occasional internal usage (2–4 times per week total) ──────────────
    if random.random() < 0.4:   # ~40% chance each day = ~3 events/week
        prod = random.choice(products)
        pid  = prod["id"]
        qty  = random.randint(1, 3)
        uid, uname = random.choice(USERS)
        reason = random.choice(USAGE_REASONS)
        use_time = current_date + timedelta(
            hours=random.randint(9, 18),
            minutes=random.randint(0, 59),
        )
        usage_records.append({
            "id":          new_id(),
            "productId":   pid,
            "productName": prod["name"],
            "userId":      uid,
            "userName":    uname,
            "quantity":    qty,
            "reason":      reason,
            "date":        use_time.isoformat(),
        })
        if running_stock[pid] >= qty:
            running_stock[pid] -= qty
        stock_log_records.append({
            "id":             new_id(),
            "productId":      pid,
            "action":         "USAGE",
            "quantityChange": -qty,
            "remainingStock": max(running_stock[pid], 0),
            "timestamp":      use_time.isoformat(),
            "note":           f"Internal use: {reason} by {uname}",
        })

    current_date += timedelta(days=1)

# ── sort everything by date descending (newest first) ─────────────────────
sales_records.sort(    key=lambda x: x["date"],      reverse=True)
usage_records.sort(    key=lambda x: x["date"],      reverse=True)
stock_log_records.sort(key=lambda x: x["timestamp"], reverse=True)

# ── persist ────────────────────────────────────────────────────────────────
jsave(SALES_FILE,     sales_records)
jsave(USAGE_FILE,     usage_records)
jsave(STOCK_LOG_FILE, stock_log_records)

print(f"\n✔ Done!")
print(f"  Sales records     : {len(sales_records):,}")
print(f"  Usage records     : {len(usage_records):,}")
print(f"  Stock-log records : {len(stock_log_records):,}")
print(f"\nFiles written:")
print(f"  {SALES_FILE}")
print(f"  {USAGE_FILE}")
print(f"  {STOCK_LOG_FILE}")
