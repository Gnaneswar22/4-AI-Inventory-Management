"""
╔══════════════════════════════════════════════════════════════╗
║  INVENIO AI — SEED DATA GENERATOR                          ║
║                                                              ║
║  Run this script to populate the JSON storage with           ║
║  realistic sample data for products, sales, usage,           ║
║  stock logs, and users.                                      ║
║                                                              ║
║  Usage:                                                      ║
║      cd backend                                              ║
║      python seed_data.py                                     ║
║                                                              ║
║  This will create/overwrite data in backend/data/ folder.    ║
║  All data will be treated as REAL data by the app.           ║
╚══════════════════════════════════════════════════════════════╝
"""

import json
import os
import uuid
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# ─────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')

USERS_FILE = os.path.join(DATA_DIR, 'users.json')
PRODUCTS_FILE = os.path.join(DATA_DIR, 'products.json')
SALES_FILE = os.path.join(DATA_DIR, 'sales.json')
USAGE_FILE = os.path.join(DATA_DIR, 'usage.json')
STOCK_LOGS_FILE = os.path.join(DATA_DIR, 'stock_logs.json')
SALES_COUNTER_FILE = os.path.join(DATA_DIR, 'sales_counter.json')


def generate_id():
    return str(uuid.uuid4())[:8]


def write_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Written: {os.path.basename(filepath)} ({len(data) if isinstance(data, list) else 'object'} entries)")


def random_date(start_days_ago=90, end_days_ago=0):
    """Generate a random date between start_days_ago and end_days_ago."""
    start = datetime.now() - timedelta(days=start_days_ago)
    end = datetime.now() - timedelta(days=end_days_ago)
    delta = end - start
    random_days = random.randint(0, max(delta.days, 1))
    random_time = timedelta(
        hours=random.randint(8, 20),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59)
    )
    return (start + timedelta(days=random_days) + random_time).isoformat()


# ─────────────────────────────────────────────────
# 1. SEED USERS
# ─────────────────────────────────────────────────
def seed_users():
    print("\n👤 Seeding Users...")
    users = [
        {
            "id": generate_id(),
            "name": "Admin User",
            "email": "admin@invenio.ai",
            "password": generate_password_hash("admin123"),
            "role": "ADMIN",
            "avatar": "",
            "security_question": "What is your favorite color?",
            "security_answer": generate_password_hash("blue"),
            "created_at": (datetime.now() - timedelta(days=120)).isoformat()
        },
        {
            "id": generate_id(),
            "name": "Store Manager",
            "email": "manager@invenio.ai",
            "password": generate_password_hash("manager123"),
            "role": "USER",
            "avatar": "",
            "security_question": "What is your pet's name?",
            "security_answer": generate_password_hash("buddy"),
            "created_at": (datetime.now() - timedelta(days=90)).isoformat()
        },
        {
            "id": generate_id(),
            "name": "Warehouse Lead",
            "email": "warehouse@invenio.ai",
            "password": generate_password_hash("warehouse123"),
            "role": "USER",
            "avatar": "",
            "security_question": "What city were you born in?",
            "security_answer": generate_password_hash("mumbai"),
            "created_at": (datetime.now() - timedelta(days=60)).isoformat()
        }
    ]
    write_json(USERS_FILE, users)
    return users


# ─────────────────────────────────────────────────
# 2. SEED PRODUCTS
# ─────────────────────────────────────────────────
def seed_products():
    print("\n📦 Seeding Products...")
    
    products_data = [
        # Electronics
        {"name": "Samsung Galaxy Buds Pro", "category": "Electronics", "stock": 45, "min": 15, "price": 8999, "mfg": "Samsung Electronics"},
        {"name": "boAt Airdopes 141", "category": "Electronics", "stock": 120, "min": 40, "price": 1299, "mfg": "boAt Lifestyle"},
        {"name": "JBL Flip 6 Bluetooth Speaker", "category": "Electronics", "stock": 18, "min": 10, "price": 11999, "mfg": "HARMAN International"},
        {"name": "Realme Power Bank 20000mAh", "category": "Electronics", "stock": 65, "min": 25, "price": 1499, "mfg": "Realme India"},
        
        # Shoes
        {"name": "Nike Air Zoom Pegasus 40", "category": "Shoes", "stock": 22, "min": 20, "price": 11500, "mfg": "Nike India Pvt Ltd"},
        {"name": "Adidas Ultraboost Light", "category": "Shoes", "stock": 35, "min": 15, "price": 16000, "mfg": "Adidas India"},
        {"name": "Puma RS-X Reinvention", "category": "Shoes", "stock": 8, "min": 25, "price": 9999, "mfg": "Puma Sports India"},
        {"name": "Reebok Classic Leather", "category": "Shoes", "stock": 50, "min": 20, "price": 6499, "mfg": "Reebok India"},
        
        # Watches
        {"name": "Titan Neo Analog Watch", "category": "Watches", "stock": 30, "min": 10, "price": 4500, "mfg": "Titan Company"},
        {"name": "Fossil Gen 6 Smartwatch", "category": "Watches", "stock": 5, "min": 12, "price": 24000, "mfg": "Fossil India"},
        {"name": "Casio G-Shock GA-2100", "category": "Watches", "stock": 42, "min": 15, "price": 8995, "mfg": "Casio India"},
        
        # Clothing
        {"name": "Levi's 501 Original Jeans", "category": "Clothing", "stock": 75, "min": 30, "price": 3499, "mfg": "Levi Strauss India"},
        {"name": "Allen Solly Formal Shirt", "category": "Clothing", "stock": 90, "min": 35, "price": 1799, "mfg": "Aditya Birla Fashion"},
        {"name": "US Polo Assn T-Shirt", "category": "Clothing", "stock": 110, "min": 50, "price": 999, "mfg": "USPA India"},
        {"name": "Raymond Blazer Suit", "category": "Clothing", "stock": 12, "min": 8, "price": 14999, "mfg": "Raymond Group"},
        
        # Accessories
        {"name": "Louis Philippe Leather Belt", "category": "Accessories", "stock": 60, "min": 25, "price": 2499, "mfg": "Aditya Birla Fashion"},
        {"name": "Tommy Hilfiger Wallet", "category": "Accessories", "stock": 40, "min": 20, "price": 3200, "mfg": "Tommy Hilfiger India"},
        {"name": "Ray-Ban Aviator Sunglasses", "category": "Accessories", "stock": 15, "min": 10, "price": 7990, "mfg": "Luxottica India"},
        
        # Books
        {"name": "Atomic Habits — James Clear", "category": "Books", "stock": 150, "min": 50, "price": 550, "mfg": "Penguin Random House"},
        {"name": "Psychology of Money — Morgan Housel", "category": "Books", "stock": 85, "min": 30, "price": 399, "mfg": "Jaico Publishing"},
        {"name": "Ikigai — Héctor García", "category": "Books", "stock": 95, "min": 40, "price": 350, "mfg": "Penguin Books India"},
        
        # Home & Kitchen
        {"name": "Milton Thermosteel Flask 1L", "category": "Home & Kitchen", "stock": 200, "min": 80, "price": 799, "mfg": "Milton Industries"},
        {"name": "Prestige Omega Fry Pan", "category": "Home & Kitchen", "stock": 55, "min": 20, "price": 1599, "mfg": "TTK Prestige"},
        {"name": "Pigeon LED Desk Lamp", "category": "Home & Kitchen", "stock": 70, "min": 30, "price": 899, "mfg": "Stove Craft Ltd"},
    ]
    
    products = []
    for p in products_data:
        products.append({
            "id": generate_id(),
            "name": p["name"],
            "category": p["category"],
            "stockQuantity": p["stock"],
            "minStockLevel": p["min"],
            "price": p["price"],
            "manufacturer": p["mfg"],
            "lastUpdated": random_date(60, 0)
        })
    
    write_json(PRODUCTS_FILE, products)
    return products


# ─────────────────────────────────────────────────
# 3. SEED SALES
# ─────────────────────────────────────────────────
def seed_sales(products):
    print("\n💰 Seeding Sales...")
    
    customer_names = [
        "Rajesh Kumar", "Priya Sharma", "Ankit Patel", "Neha Gupta",
        "Vikram Singh", "Sanya Mehta", "Arjun Reddy", "Pooja Nair",
        "Rohit Verma", "Meera Joshi", "Suresh Iyer", "Divya Rao",
        "Karthik Menon", "Sneha Das", "Arun Pillai", "Lakshmi Bhat",
        "Deepak Tiwari", "Ritu Saxena", "Manish Agarwal", "Swathi Chakraborty"
    ]
    
    cities = [
        "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
        "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
        "Chandigarh", "Kochi", "Indore", "Nagpur", "Bhopal"
    ]
    
    sales = []
    total_revenue = 0
    
    # Generate 40-60 sales over the last 90 days
    num_sales = random.randint(40, 60)
    
    for i in range(num_sales):
        product = random.choice(products)
        quantity = random.randint(1, 5)
        total_price = product["price"] * quantity
        customer = random.choice(customer_names)
        city = random.choice(cities)
        
        sale = {
            "id": generate_id(),
            "productId": product["id"],
            "productName": product["name"],
            "quantity": quantity,
            "totalPrice": total_price,
            "date": random_date(90, 0),
            "customerName": customer,
            "customerAddress": f"{random.randint(1, 500)}, {random.choice(['MG Road', 'Station Road', 'Mall Road', 'Ring Road', 'Civil Lines', 'Nehru Nagar', 'Gandhi Chowk', 'Lake View Colony'])}, {city}"
        }
        sales.append(sale)
        total_revenue += total_price
    
    # Sort sales by date (newest first)
    sales.sort(key=lambda x: x["date"], reverse=True)
    
    write_json(SALES_FILE, sales)
    return sales, total_revenue


# ─────────────────────────────────────────────────
# 4. SEED USAGE
# ─────────────────────────────────────────────────
def seed_usage(products, users):
    print("\n🔧 Seeding Usage Records...")
    
    usage_reasons = [
        "Quality testing", "Product demo", "Display sample",
        "Staff use", "Photo shoot sample", "Return — damaged",
        "Gifting", "Warehouse audit sample", "Exhibition"
    ]
    
    usages = []
    
    # Generate 15-30 usage records
    num_usage = random.randint(15, 30)
    
    for i in range(num_usage):
        product = random.choice(products)
        user = random.choice(users)
        quantity = random.randint(1, 3)
        
        usage = {
            "id": generate_id(),
            "productId": product["id"],
            "productName": product["name"],
            "userId": user["id"],
            "userName": user["name"],
            "quantity": quantity,
            "reason": random.choice(usage_reasons),
            "date": random_date(60, 0)
        }
        usages.append(usage)
    
    # Sort by date (newest first)
    usages.sort(key=lambda x: x["date"], reverse=True)
    
    write_json(USAGE_FILE, usages)
    return usages


# ─────────────────────────────────────────────────
# 5. SEED STOCK LOGS
# ─────────────────────────────────────────────────
def seed_stock_logs(products, sales, usages):
    print("\n📋 Seeding Stock Logs...")
    
    logs = []
    
    # Add INITIAL stock logs for all products
    for product in products:
        logs.append({
            "id": generate_id(),
            "productId": product["id"],
            "action": "INITIAL",
            "quantityChange": product["stockQuantity"],
            "remainingStock": product["stockQuantity"],
            "timestamp": random_date(90, 85),
            "note": f"Initial stock entry for {product['name']}"
        })
    
    # Add SALE logs matching sales records
    for sale in sales:
        product = next((p for p in products if p["id"] == sale["productId"]), None)
        if product:
            logs.append({
                "id": generate_id(),
                "productId": sale["productId"],
                "action": "SALE",
                "quantityChange": -sale["quantity"],
                "remainingStock": max(0, product["stockQuantity"] - sale["quantity"]),
                "timestamp": sale["date"],
                "note": f"Sold {sale['quantity']} × {sale['productName']} to {sale['customerName']}"
            })
    
    # Add USAGE logs matching usage records
    for usage in usages:
        product = next((p for p in products if p["id"] == usage["productId"]), None)
        if product:
            logs.append({
                "id": generate_id(),
                "productId": usage["productId"],
                "action": "USAGE",
                "quantityChange": -usage["quantity"],
                "remainingStock": max(0, product["stockQuantity"] - usage["quantity"]),
                "timestamp": usage["date"],
                "note": f"Internal use: {usage.get('reason', 'General')} by {usage['userName']}"
            })
    
    # Add some RESTOCK logs
    for _ in range(random.randint(5, 12)):
        product = random.choice(products)
        restock_qty = random.randint(20, 100)
        logs.append({
            "id": generate_id(),
            "productId": product["id"],
            "action": "RESTOCK",
            "quantityChange": restock_qty,
            "remainingStock": product["stockQuantity"] + restock_qty,
            "timestamp": random_date(60, 5),
            "note": f"Restocked {restock_qty} units of {product['name']}"
        })
    
    # Sort by timestamp (newest first)
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    write_json(STOCK_LOGS_FILE, logs)
    return logs


# ─────────────────────────────────────────────────
# 6. SEED SALES COUNTER
# ─────────────────────────────────────────────────
def seed_sales_counter(sales, total_revenue):
    print("\n📊 Seeding Sales Counter...")
    
    counter = {
        "totalSales": len(sales),
        "totalRevenue": total_revenue
    }
    write_json(SALES_COUNTER_FILE, counter)
    return counter


# ─────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  🚀 INVENIO AI — SEED DATA GENERATOR")
    print("=" * 60)
    
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"\n📁 Data directory: {DATA_DIR}")
    
    # Seed all data
    users = seed_users()
    products = seed_products()
    sales, total_revenue = seed_sales(products)
    usages = seed_usage(products, users)
    stock_logs = seed_stock_logs(products, sales, usages)
    sales_counter = seed_sales_counter(sales, total_revenue)
    
    # Summary
    print("\n" + "=" * 60)
    print("  ✅ SEED DATA GENERATION COMPLETE!")
    print("=" * 60)
    print(f"""
  📊 Summary:
  ─────────────────────────────────
  👤 Users:        {len(users)}
  📦 Products:     {len(products)}
  💰 Sales:        {len(sales)}
  🔧 Usage:        {len(usages)}
  📋 Stock Logs:   {len(stock_logs)}
  💵 Total Revenue: ₹{total_revenue:,.2f}
  ─────────────────────────────────
  
  🔑 Login Accounts:
     admin@invenio.ai    / admin123      (ADMIN)
     manager@invenio.ai  / manager123    (USER)
     warehouse@invenio.ai / warehouse123  (USER)
  
  📁 Data saved to: {DATA_DIR}
  
  Now start the backend:
     python app.py
""")


if __name__ == "__main__":
    main()
