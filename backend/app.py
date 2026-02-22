from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
import uuid
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = 'invenio-ai-secret-key-2024'
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"])

# ─────────────────────────────────────────────────
# DATA DIRECTORY & FILE PATHS
# ─────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
PRODUCTS_FILE = os.path.join(DATA_DIR, 'products.json')
SALES_FILE = os.path.join(DATA_DIR, 'sales.json')
STOCK_LOGS_FILE = os.path.join(DATA_DIR, 'stock_logs.json')
USAGE_FILE = os.path.join(DATA_DIR, 'usage.json')
SALES_COUNTER_FILE = os.path.join(DATA_DIR, 'sales_counter.json')
NOTIFICATIONS_FILE = os.path.join(DATA_DIR, 'notifications.json')
FORECASTS_FILE     = os.path.join(DATA_DIR, 'forecasts.json')


# ─────────────────────────────────────────────────
# JSON STORAGE HELPERS
# ─────────────────────────────────────────────────
def ensure_data_dir():
    """Create data directory if it doesn't exist."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)


def read_json(filepath):
    """Read data from a JSON file."""
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def write_json(filepath, data):
    """Write data to a JSON file."""
    ensure_data_dir()
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def read_json_obj(filepath):
    """Read a JSON object (dict) from file."""
    if not os.path.exists(filepath):
        return {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}


def generate_id():
    """Generate a unique ID."""
    return str(uuid.uuid4())[:8]


# ─────────────────────────────────────────────────
# INITIALIZE DEFAULT DATA
# ─────────────────────────────────────────────────
def initialize_data():
    """Set up default JSON files if they don't exist."""
    ensure_data_dir()

    # Initialize users with a default admin account
    if not os.path.exists(USERS_FILE):
        default_users = [
            {
                "id": "u1",
                "name": "Admin User",
                "email": "admin@invenio.ai",
                "password": generate_password_hash("admin123"),
                "role": "ADMIN",
                "avatar": "https://picsum.photos/200/200",
                "security_question": "What is your favorite color?",
                "security_answer": generate_password_hash("blue"),
                "created_at": datetime.now().isoformat()
            },
            {
                "id": "u2",
                "name": "Store Manager",
                "email": "manager@invenio.ai",
                "password": generate_password_hash("manager123"),
                "role": "USER",
                "avatar": "https://picsum.photos/201/201",
                "security_question": "What is your pet's name?",
                "security_answer": generate_password_hash("buddy"),
                "created_at": datetime.now().isoformat()
            }
        ]
        write_json(USERS_FILE, default_users)

    # Initialize products — starts EMPTY, all data will be real user-added data
    if not os.path.exists(PRODUCTS_FILE):
        write_json(PRODUCTS_FILE, [])

    # Initialize empty sales
    if not os.path.exists(SALES_FILE):
        write_json(SALES_FILE, [])

    # Initialize empty stock logs
    if not os.path.exists(STOCK_LOGS_FILE):
        write_json(STOCK_LOGS_FILE, [])

    # Initialize empty usage
    if not os.path.exists(USAGE_FILE):
        write_json(USAGE_FILE, [])

    # Initialize sales counter
    if not os.path.exists(SALES_COUNTER_FILE):
        write_json(SALES_COUNTER_FILE, {"totalSalesCount": 0, "totalRevenue": 0})
    
    # Initialize empty notifications
    if not os.path.exists(NOTIFICATIONS_FILE):
        write_json(NOTIFICATIONS_FILE, [])


# ─────────────────────────────────────────────────
# AUTH DECORATOR
# ─────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function


# ═══════════════════════════════════════════════════
#  AUTH ROUTES — Register, Login, Logout, Forgot Password
# ═══════════════════════════════════════════════════

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user. Password is hashed before storing."""
    data = request.get_json()

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'USER')
    security_question = data.get('security_question', '').strip()
    security_answer = data.get('security_answer', '').strip().lower()

    # Validation
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    if not security_question or not security_answer:
        return jsonify({"error": "Security question and answer are required for password recovery."}), 400

    # Check if user already exists
    users = read_json(USERS_FILE)
    if any(u['email'] == email for u in users):
        return jsonify({"error": "An account with this email already exists."}), 409

    # Create new user with hashed password
    new_user = {
        "id": generate_id(),
        "name": name,
        "email": email,
        "password": generate_password_hash(password),
        "role": role,
        "avatar": f"https://picsum.photos/seed/{generate_id()}/200/200",
        "security_question": security_question,
        "security_answer": generate_password_hash(security_answer),
        "created_at": datetime.now().isoformat()
    }

    users.append(new_user)
    write_json(USERS_FILE, users)

    # Return user data without sensitive fields
    safe_user = {k: v for k, v in new_user.items() if k not in ('password', 'security_answer')}
    return jsonify({"message": "Registration successful!", "user": safe_user}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate user with email & password (checked against hashed password in JSON)."""
    data = request.get_json()

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    users = read_json(USERS_FILE)
    user = next((u for u in users if u['email'] == email), None)

    if not user or not check_password_hash(user['password'], password):
        return jsonify({"error": "Invalid email or password."}), 401

    # Set session
    session['user_id'] = user['id']
    session['user_email'] = user['email']
    session['user_role'] = user['role']

    # Return safe user data
    safe_user = {
        "id": user['id'],
        "name": user['name'],
        "email": user['email'],
        "role": user['role'],
        "avatar": user.get('avatar', '')
    }

    return jsonify({"message": "Login successful!", "user": safe_user}), 200


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Clear user session."""
    session.clear()
    return jsonify({"message": "Logged out successfully."}), 200


@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Get current logged-in user info."""
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated."}), 401

    users = read_json(USERS_FILE)
    user = next((u for u in users if u['id'] == session['user_id']), None)

    if not user:
        session.clear()
        return jsonify({"error": "User not found."}), 404

    safe_user = {
        "id": user['id'],
        "name": user['name'],
        "email": user['email'],
        "role": user['role'],
        "avatar": user.get('avatar', '')
    }

    return jsonify({"user": safe_user}), 200


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Step 1: Verify email and return security question."""
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    users = read_json(USERS_FILE)
    user = next((u for u in users if u['email'] == email), None)

    if not user:
        return jsonify({"error": "No account found with this email."}), 404

    return jsonify({
        "message": "Security question retrieved.",
        "security_question": user['security_question'],
        "email": email
    }), 200


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Step 2: Verify security answer and reset password."""
    data = request.get_json()

    email = data.get('email', '').strip().lower()
    security_answer = data.get('security_answer', '').strip().lower()
    new_password = data.get('new_password', '')

    if not email or not security_answer or not new_password:
        return jsonify({"error": "All fields are required."}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters."}), 400

    users = read_json(USERS_FILE)
    user = next((u for u in users if u['email'] == email), None)

    if not user:
        return jsonify({"error": "No account found with this email."}), 404

    if not check_password_hash(user['security_answer'], security_answer):
        return jsonify({"error": "Incorrect security answer."}), 403

    # Update password (hashed)
    user['password'] = generate_password_hash(new_password)
    write_json(USERS_FILE, users)

    return jsonify({"message": "Password reset successfully! You can now log in with your new password."}), 200


# ═══════════════════════════════════════════════════
#  PRODUCT / INVENTORY ROUTES — JSON Storage
# ═══════════════════════════════════════════════════

@app.route('/api/products', methods=['GET'])
@login_required
def get_products():
    """Get all products from JSON storage."""
    products = read_json(PRODUCTS_FILE)
    return jsonify({"products": products}), 200


@app.route('/api/products', methods=['POST'])
@login_required
def add_product():
    """Add a new product — stored in products.json."""
    data = request.get_json()

    required_fields = ['name', 'category', 'stockQuantity', 'minStockLevel', 'price', 'manufacturer']
    for field in required_fields:
        if field not in data or data[field] == '':
            return jsonify({"error": f"'{field}' is required."}), 400

    new_product = {
        "id": generate_id(),
        "name": data['name'],
        "category": data['category'],
        "stockQuantity": int(data['stockQuantity']),
        "minStockLevel": int(data['minStockLevel']),
        "price": float(data['price']),
        "manufacturer": data['manufacturer'],
        "lastUpdated": datetime.now().isoformat()
    }

    products = read_json(PRODUCTS_FILE)
    products.append(new_product)
    write_json(PRODUCTS_FILE, products)

    # Log the initial stock
    add_stock_log(new_product['id'], 'INITIAL', new_product['stockQuantity'], new_product['stockQuantity'], 'Product Created')

    return jsonify({"message": "Product added successfully!", "product": new_product}), 201


@app.route('/api/products/<product_id>', methods=['PUT'])
@login_required
def update_product(product_id):
    """Update an existing product in JSON storage."""
    data = request.get_json()
    products = read_json(PRODUCTS_FILE)

    product = next((p for p in products if p['id'] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    old_stock = product['stockQuantity']

    # Update fields
    for key in ['name', 'category', 'stockQuantity', 'minStockLevel', 'price', 'manufacturer']:
        if key in data:
            if key in ('stockQuantity', 'minStockLevel'):
                product[key] = int(data[key])
            elif key == 'price':
                product[key] = float(data[key])
            else:
                product[key] = data[key]

    product['lastUpdated'] = datetime.now().isoformat()
    write_json(PRODUCTS_FILE, products)

    # Log stock adjustment if quantity changed
    new_stock = product['stockQuantity']
    if new_stock != old_stock:
        diff = new_stock - old_stock
        add_stock_log(product_id, 'ADJUSTMENT', diff, new_stock, 'Manual Adjustment')

    return jsonify({"message": "Product updated!", "product": product}), 200


@app.route('/api/products/<product_id>', methods=['DELETE'])
@login_required
def delete_product(product_id):
    """Delete a product from JSON storage."""
    products = read_json(PRODUCTS_FILE)
    products = [p for p in products if p['id'] != product_id]
    write_json(PRODUCTS_FILE, products)
    return jsonify({"message": "Product deleted successfully."}), 200


@app.route('/api/products/<product_id>/restock', methods=['POST'])
@login_required
def restock_product(product_id):
    """Restock a product — adds quantity to existing stock."""
    data = request.get_json()
    quantity = int(data.get('quantity', 0))

    if quantity <= 0:
        return jsonify({"error": "Restock quantity must be positive."}), 400

    products = read_json(PRODUCTS_FILE)
    product = next((p for p in products if p['id'] == product_id), None)

    if not product:
        return jsonify({"error": "Product not found."}), 404

    product['stockQuantity'] += quantity
    product['lastUpdated'] = datetime.now().isoformat()
    write_json(PRODUCTS_FILE, products)

    add_stock_log(product_id, 'RESTOCK', quantity, product['stockQuantity'], 'Manufacturer Delivery')

    return jsonify({"message": f"Restocked {quantity} units!", "product": product}), 200


# ═══════════════════════════════════════════════════
#  SALES ROUTES — Dynamically Subtracts Stock & Counts Sales
# ═══════════════════════════════════════════════════

@app.route('/api/sales', methods=['GET'])
@login_required
def get_sales():
    """Get all sales from JSON storage with total count."""
    sales = read_json(SALES_FILE)
    # Ensure sorted by date (newest first) so frontend shows actual recent data
    sales.sort(key=lambda x: x.get('date', ''), reverse=True)
    counter = read_json_obj(SALES_COUNTER_FILE)
    return jsonify({
        "sales": sales,
        "totalSalesCount": counter.get("totalSalesCount", len(sales)),
        "totalRevenue": counter.get("totalRevenue", 0)
    }), 200


@app.route('/api/sales', methods=['POST'])
@login_required
def record_sale():
    """
    Record a new sale:
    1. Subtract quantity from product stock (in products.json)
    2. Add sale record to sales.json
    3. Increment sales counter in sales_counter.json
    4. Log stock change to stock_logs.json
    """
    data = request.get_json()

    product_id = data.get('productId')
    quantity = int(data.get('quantity', 0))
    customer_name = data.get('customerName', 'Unknown')
    customer_address = data.get('customerAddress', '')

    if not product_id or quantity <= 0:
        return jsonify({"error": "Valid product ID and quantity are required."}), 400

    # 1. Find and update product stock
    products = read_json(PRODUCTS_FILE)
    product = next((p for p in products if p['id'] == product_id), None)

    if not product:
        return jsonify({"error": "Product not found."}), 404

    if product['stockQuantity'] < quantity:
        return jsonify({"error": f"Insufficient stock! Available: {product['stockQuantity']}, Requested: {quantity}"}), 400

    # Subtract stock dynamically
    product['stockQuantity'] -= quantity
    product['lastUpdated'] = datetime.now().isoformat()
    write_json(PRODUCTS_FILE, products)

    # 2. Create sale record
    total_price = quantity * product['price']
    new_sale = {
        "id": generate_id(),
        "productId": product_id,
        "productName": product['name'],
        "quantity": quantity,
        "totalPrice": total_price,
        "date": datetime.now().isoformat(),
        "customerName": customer_name,
        "customerAddress": customer_address
    }

    sales = read_json(SALES_FILE)
    sales.append(new_sale)
    write_json(SALES_FILE, sales)

    # 3. Update sales counter
    counter = read_json_obj(SALES_COUNTER_FILE)
    counter['totalSalesCount'] = counter.get('totalSalesCount', 0) + 1
    counter['totalRevenue'] = counter.get('totalRevenue', 0) + total_price
    write_json(SALES_COUNTER_FILE, counter)

    # 4. Log stock change
    add_stock_log(product_id, 'SALE', -quantity, product['stockQuantity'], f'Sold to {customer_name}')

    return jsonify({
        "message": "Sale recorded successfully!",
        "sale": new_sale,
        "updatedStock": product['stockQuantity'],
        "totalSalesCount": counter['totalSalesCount']
    }), 201


@app.route('/api/sales/stats', methods=['GET'])
@login_required
def get_sales_stats():
    """Get sales statistics — how many items sold per product, total count, revenue."""
    sales = read_json(SALES_FILE)
    counter = read_json_obj(SALES_COUNTER_FILE)

    # Per-product sales stats
    product_stats = {}
    for sale in sales:
        pid = sale['productId']
        if pid not in product_stats:
            product_stats[pid] = {
                "productId": pid,
                "productName": sale['productName'],
                "totalQuantitySold": 0,
                "totalRevenue": 0,
                "saleCount": 0
            }
        product_stats[pid]['totalQuantitySold'] += sale['quantity']
        product_stats[pid]['totalRevenue'] += sale['totalPrice']
        product_stats[pid]['saleCount'] += 1

    return jsonify({
        "totalSalesCount": counter.get('totalSalesCount', 0),
        "totalRevenue": counter.get('totalRevenue', 0),
        "productStats": list(product_stats.values())
    }), 200


# ═══════════════════════════════════════════════════
#  USAGE ROUTES — Track Internal Usage
# ═══════════════════════════════════════════════════

@app.route('/api/usage', methods=['GET'])
@login_required
def get_usage():
    """Get all usage records from JSON storage."""
    usage_records = read_json(USAGE_FILE)
    return jsonify({"usage": usage_records}), 200


@app.route('/api/usage', methods=['POST'])
@login_required
def record_usage():
    """Record internal usage — subtracts from stock similar to sales."""
    data = request.get_json()

    product_id = data.get('productId')
    quantity = int(data.get('quantity', 0))
    user_id = data.get('userId', session.get('user_id', 'unknown'))
    user_name = data.get('userName', 'Unknown')

    if not product_id or quantity <= 0:
        return jsonify({"error": "Valid product ID and quantity are required."}), 400

    products = read_json(PRODUCTS_FILE)
    product = next((p for p in products if p['id'] == product_id), None)

    if not product:
        return jsonify({"error": "Product not found."}), 404

    if product['stockQuantity'] < quantity:
        return jsonify({"error": "Insufficient stock!"}), 400

    # Subtract stock
    product['stockQuantity'] -= quantity
    product['lastUpdated'] = datetime.now().isoformat()
    write_json(PRODUCTS_FILE, products)

    # Create usage record
    new_usage = {
        "id": generate_id(),
        "productId": product_id,
        "productName": product['name'],
        "userId": user_id,
        "userName": user_name,
        "quantity": quantity,
        "date": datetime.now().isoformat()
    }

    usage_records = read_json(USAGE_FILE)
    usage_records.append(new_usage)
    write_json(USAGE_FILE, usage_records)

    add_stock_log(product_id, 'USAGE', -quantity, product['stockQuantity'], f'Used by {user_name}')

    return jsonify({"message": "Usage recorded!", "usage": new_usage, "updatedStock": product['stockQuantity']}), 201


# ═══════════════════════════════════════════════════
#  STOCK LOGS ROUTES
# ═══════════════════════════════════════════════════

def add_stock_log(product_id, action, change, remaining_stock, note=''):
    """Helper: Add a stock log entry to stock_logs.json."""
    log = {
        "id": generate_id(),
        "productId": product_id,
        "action": action,
        "quantityChange": change,
        "remainingStock": remaining_stock,
        "timestamp": datetime.now().isoformat(),
        "note": note
    }
    logs = read_json(STOCK_LOGS_FILE)
    logs.insert(0, log)  # Newest first
    write_json(STOCK_LOGS_FILE, logs)


@app.route('/api/stock-logs', methods=['GET'])
@login_required
def get_stock_logs():
    """Get all stock log entries."""
    logs = read_json(STOCK_LOGS_FILE)
    return jsonify({"stockLogs": logs}), 200


# ═══════════════════════════════════════════════════
#  PREDICTIONS ROUTE — AI Stock Predictions
# ═══════════════════════════════════════════════════

def calculate_weighted_moving_average(data_points, weights=None):
    """Calculate weighted moving average for trend analysis."""
    if not data_points:
        return 0
    if weights is None:
        # Recent data weighted more heavily (exponential)
        weights = [2 ** i for i in range(len(data_points))]
    weighted_sum = sum(d * w for d, w in zip(data_points, weights))
    return weighted_sum / sum(weights)


def detect_trend(recent_sales):
    """Detect if demand is increasing, decreasing, or stable."""
    if len(recent_sales) < 3:
        return 'stable', 1.0
    
    # Split into two halves and compare
    mid = len(recent_sales) // 2
    first_half_avg = sum(recent_sales[:mid]) / mid if mid > 0 else 0
    second_half_avg = sum(recent_sales[mid:]) / (len(recent_sales) - mid) if len(recent_sales) - mid > 0 else 0
    
    if second_half_avg > first_half_avg * 1.2:
        return 'increasing', 1.3  # 30% increase factor
    elif second_half_avg < first_half_avg * 0.8:
        return 'decreasing', 0.7  # 30% decrease factor
    else:
        return 'stable', 1.0


def calculate_reorder_point(avg_daily_usage, lead_time_days=7, safety_stock_factor=1.5):
    """Calculate optimal reorder point using economic order quantity principles."""
    safety_stock = avg_daily_usage * lead_time_days * safety_stock_factor
    reorder_point = (avg_daily_usage * lead_time_days) + safety_stock
    return int(reorder_point)


def calculate_forecast_accuracy(product_sales, product_usage, total_transactions):
    """
    Calculate how predictable the product demand is using multiple metrics:
    - Coefficient of Variation (CV) for demand variability
    - Transaction frequency for data reliability
    - Consistency score for pattern stability
    """
    # Combine all consumption data
    all_quantities = (
        [s['quantity'] for s in product_sales] + 
        [u['quantity'] for u in product_usage]
    )
    
    total_data_points = len(all_quantities)
    
    # Insufficient data
    if total_data_points < 3:
        return 'Low', 0.3
    
    # Calculate statistical measures
    avg = sum(all_quantities) / total_data_points
    variance = sum((x - avg) ** 2 for x in all_quantities) / total_data_points
    std_dev = variance ** 0.5
    
    # Coefficient of variation (CV) - measures relative variability
    cv = (std_dev / avg * 100) if avg > 0 else 100
    
    # Data richness score (more data = higher confidence)
    if total_data_points >= 20:
        data_score = 1.0
    elif total_data_points >= 10:
        data_score = 0.7
    elif total_data_points >= 5:
        data_score = 0.5
    else:
        data_score = 0.3
    
    # Consistency check (recent vs historical)
    if total_data_points >= 6:
        recent = all_quantities[-3:]
        historical = all_quantities[:-3]
        recent_avg = sum(recent) / len(recent)
        hist_avg = sum(historical) / len(historical) if historical else recent_avg
        
        # Check if recent behavior matches historical (within 50% range)
        if hist_avg > 0:
            deviation = abs(recent_avg - hist_avg) / hist_avg
            consistency_score = max(0, 1 - deviation)
        else:
            consistency_score = 0.5
    else:
        consistency_score = 0.5  # Neutral when insufficient data
    
    # Combined accuracy calculation
    # CV < 15: Very stable, 15-30: Stable, 30-50: Moderate, >50: Variable
    if cv < 15:
        cv_score = 1.0
    elif cv < 30:
        cv_score = 0.8
    elif cv < 50:
        cv_score = 0.6
    else:
        cv_score = 0.4
    
    # Weighted final score
    final_score = (cv_score * 0.5) + (data_score * 0.3) + (consistency_score * 0.2)
    
    # Determine accuracy level
    if final_score >= 0.75:
        return 'High', final_score
    elif final_score >= 0.5:
        return 'Medium', final_score
    else:
        return 'Low', final_score


@app.route('/api/predictions', methods=['GET'])
@login_required
def get_predictions():
    """
    Advanced AI-driven stock predictions with:
    - Weighted moving averages
    - Trend detection (increasing/decreasing/stable demand)
    - Reorder point calculations
    - Forecast accuracy scoring
    - Seasonal adjustments
    - Safety stock recommendations

    """
    products = read_json(PRODUCTS_FILE)
    sales = read_json(SALES_FILE)
    usage_records = read_json(USAGE_FILE)

    predictions = []
    for product in products:
        # Get all consumption events (sales + usage)
        product_sales = [s for s in sales if s['productId'] == product['id']]
        product_usage = [u for u in usage_records if u['productId'] == product['id']]
        
        # Extract quantities for trend analysis
        sales_quantities = [s['quantity'] for s in product_sales[-14:]]  # Last 14 transactions
        usage_quantities = [u['quantity'] for u in product_usage[-14:]]
        all_quantities = sales_quantities + usage_quantities
        
        total_consumed = (
            sum(s['quantity'] for s in product_sales) +
            sum(u['quantity'] for u in product_usage)
        )

        # Enhanced calculation with weighted moving average
        if all_quantities:
            weighted_avg_usage = calculate_weighted_moving_average(all_quantities)
        else:
            weighted_avg_usage = 0.1
        
        # Detect demand trend
        trend_direction, trend_factor = detect_trend(all_quantities) if all_quantities else ('stable', 1.0)
        
        # Calculate days of activity (more accurate than fixed 30 days)
        days_active = 30  # Default assumption
        if product_sales or product_usage:
            # Could calculate from timestamps if available
            days_active = max(30, len(product_sales) + len(product_usage))
        
        # Adjusted daily usage with trend factor
        base_daily_usage = max(0.1, total_consumed / days_active)
        adjusted_daily_usage = base_daily_usage * trend_factor
        avg_daily_usage = round(adjusted_daily_usage, 2)
        
        # Calculate days remaining
        if avg_daily_usage > 0:
            days_remaining = int(product['stockQuantity'] / avg_daily_usage)
        else:
            days_remaining = 9999
        
        # Calculate optimal reorder point
        reorder_point = calculate_reorder_point(avg_daily_usage)
        
        # Forecast accuracy with improved calculation
        total_transactions = len(product_sales) + len(product_usage)
        forecast_accuracy, accuracy_score = calculate_forecast_accuracy(
            product_sales, 
            product_usage, 
            total_transactions
        )
        
        # Enhanced status determination
        current_stock = product['stockQuantity']
        min_level = product['minStockLevel']
        
        if current_stock <= 0:
            status = 'Critical'
            priority = 'Immediate'
        elif days_remaining < 3:
            status = 'Critical'
            priority = 'Urgent'
        elif current_stock < min_level * 0.5:
            status = 'Critical'
            priority = 'High'
        elif current_stock < min_level:
            status = 'Low'
            priority = 'Medium'
        elif days_remaining > 90:
            status = 'Overstocked'
            priority = 'Review'
        elif current_stock > min_level * 3:
            status = 'Overstocked'
            priority = 'Low'
        else:
            status = 'Healthy'
            priority = 'Normal'
        
        # Recommended order quantity - smart calculation based on status
        if status in ['Critical', 'Low']:
            # For critical/low stock, recommend bringing to optimal level
            target_stock = max(reorder_point, min_level * 1.3)  # 30% above min level
            recommended_order = max(0, int(target_stock - current_stock))
        elif current_stock < reorder_point:
            recommended_order = int((reorder_point - current_stock) * 1.2)  # 20% buffer
        else:
            recommended_order = 0
        
        # Confidence score based on accuracy calculation
        if accuracy_score >= 0.75:
            confidence = 'High'
        elif accuracy_score >= 0.5:
            confidence = 'Medium'
        else:
            confidence = 'Low'

        predictions.append({
            "productId": product['id'],
            "productName": product['name'],
            "avgDailyUsage": avg_daily_usage,
            "daysRemaining": days_remaining,
            "restockRecommendedIn": max(0, days_remaining - 5),
            "status": status,
            "priority": priority,
            "trend": trend_direction,
            "reorderPoint": reorder_point,
            "recommendedOrderQty": recommended_order,
            "forecastAccuracy": forecast_accuracy,
            "confidence": confidence,
            "currentStock": current_stock,
            "minStockLevel": min_level
        })

    # Sort by priority (Critical first, then by days remaining)
    priority_order = {'Immediate': 0, 'Urgent': 1, 'High': 2, 'Medium': 3, 'Normal': 4, 'Review': 5, 'Low': 6}
    predictions.sort(key=lambda x: (priority_order.get(x['priority'], 999), x['daysRemaining']))

    return jsonify({"predictions": predictions}), 200


# ═══════════════════════════════════════════════════
#  DASHBOARD ANALYTICS ROUTE
# ═══════════════════════════════════════════════════

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard():
    """Get dashboard overview data — all from JSON files."""
    products = read_json(PRODUCTS_FILE)
    sales = read_json(SALES_FILE)
    counter = read_json_obj(SALES_COUNTER_FILE)

    total_products = len(products)
    total_stock = sum(p['stockQuantity'] for p in products)
    low_stock_count = sum(1 for p in products if p['stockQuantity'] < p['minStockLevel'])
    total_value = sum(p['stockQuantity'] * p['price'] for p in products)

    # Category breakdown
    categories = {}
    for p in products:
        cat = p['category']
        if cat not in categories:
            categories[cat] = {"count": 0, "totalStock": 0, "totalValue": 0}
        categories[cat]['count'] += 1
        categories[cat]['totalStock'] += p['stockQuantity']
        categories[cat]['totalValue'] += p['stockQuantity'] * p['price']

    return jsonify({
        "totalProducts": total_products,
        "totalStock": total_stock,
        "lowStockCount": low_stock_count,
        "totalValue": total_value,
        "totalSalesCount": counter.get('totalSalesCount', 0),
        "totalRevenue": counter.get('totalRevenue', 0),
        "categories": categories,
        "recentSales": sales[-5:]  # Last 5 sales
    }), 200


# ═══════════════════════════════════════════════════
#  USER MANAGEMENT ROUTE (Admin only)
# ═══════════════════════════════════════════════════

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    """Get all users (without passwords). Admin only."""
    if session.get('user_role') != 'ADMIN':
        return jsonify({"error": "Admin access required."}), 403

    users = read_json(USERS_FILE)
    safe_users = [{k: v for k, v in u.items() if k not in ('password', 'security_answer')} for u in users]
    return jsonify({"users": safe_users}), 200


# ═══════════════════════════════════════════════════
#  NOTIFICATIONS ROUTES — Smart Notification System
# ═══════════════════════════════════════════════════

def create_notification(type, title, message, product_id=None, product_name=None, metadata=None):
    """Helper function to create a notification object."""
    return {
        "id": generate_id(),
        "type": type,  # 'low_stock', 'sale', 'alert'
        "title": title,
        "message": message,
        "productId": product_id,
        "productName": product_name,
        "metadata": metadata or {},
        "read": False,
        "timestamp": datetime.now().isoformat()
    }


@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """
    Generate and return all active notifications including:
    - Low stock alerts with optimal order recommendations
    - Recent sales notifications
    - Critical alerts
    """
    notifications = read_json(NOTIFICATIONS_FILE)
    products = read_json(PRODUCTS_FILE)
    sales = read_json(SALES_FILE)
    predictions_response = get_predictions()
    predictions_data = json.loads(predictions_response[0].data)
    predictions = predictions_data.get('predictions', [])
    
    # Remove old notifications (older than 7 days)
    cutoff_date = datetime.now()
    notifications = [n for n in notifications if 
                    (cutoff_date - datetime.fromisoformat(n['timestamp'])).days < 7]
    
    # Generate low stock alerts
    low_stock_alerts = []
    for pred in predictions:
        if pred['status'] in ['Critical', 'Low']:
            product = next((p for p in products if p['id'] == pred['productId']), None)
            if not product:
                continue
                
            # Check if notification already exists and is unread
            existing = next((n for n in notifications if 
                           n['type'] == 'low_stock' and 
                           n['productId'] == pred['productId'] and 
                           not n['read']), None)
            
            if not existing:
                # Calculate optimal and minimum order quantities
                optimal_order = pred['recommendedOrderQty']
                min_order = max(pred['minStockLevel'] - pred['currentStock'], 0)
                
                # Ensure we always have a meaningful optimal order for critical/low items
                if optimal_order == 0 and pred['status'] in ['Critical', 'Low']:
                    optimal_order = max(min_order, int(pred['reorderPoint'] * 1.2))
                
                notification = create_notification(
                    type='low_stock',
                    title=f"{pred['status']} Stock Alert",
                    message=f"{pred['productName']} needs restocking",
                    product_id=pred['productId'],
                    product_name=pred['productName'],
                    metadata={
                        'status': pred['status'],
                        'priority': pred['priority'],
                        'currentStock': pred['currentStock'],
                        'minStockLevel': pred['minStockLevel'],
                        'daysRemaining': pred['daysRemaining'],
                        'optimalOrder': optimal_order,
                        'minimumOrder': min_order,
                        'reorderPoint': pred['reorderPoint'],
                        'manufacturer': product.get('manufacturer', 'Unknown')
                    }
                )
                notifications.append(notification)
    
    # Generate recent sales notifications (last 5 sales, unread)
    recent_sales = sales[-5:]
    for sale in reversed(recent_sales):  # Most recent first
        # Check if we already have a notification for this sale
        existing = next((n for n in notifications if 
                       n['type'] == 'sale' and 
                       n.get('metadata', {}).get('saleId') == sale['id']), None)
        
        if not existing:
            notification = create_notification(
                type='sale',
                title='New Sale Recorded',
                message=f"{sale['productName']} - Qty: {sale['quantity']}",
                product_id=sale['productId'],
                product_name=sale['productName'],
                metadata={
                    'saleId': sale['id'],
                    'quantity': sale['quantity'],
                    'totalPrice': sale['totalPrice'],
                    'customerName': sale.get('customerName', 'Unknown'),
                    'date': sale['date']
                }
            )
            notifications.append(notification)
    
    # Save updated notifications
    write_json(NOTIFICATIONS_FILE, notifications)
    
    # Sort by timestamp (newest first)
    notifications.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Count unread
    unread_count = sum(1 for n in notifications if not n['read'])
    
    return jsonify({
        "notifications": notifications,
        "unreadCount": unread_count,
        "total": len(notifications)
    }), 200


@app.route('/api/notifications/<notification_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notification_id):
    """Mark a notification as read."""
    notifications = read_json(NOTIFICATIONS_FILE)
    
    notification = next((n for n in notifications if n['id'] == notification_id), None)
    if not notification:
        return jsonify({"error": "Notification not found"}), 404
    
    notification['read'] = True
    write_json(NOTIFICATIONS_FILE, notifications)
    
    return jsonify({"message": "Notification marked as read", "notification": notification}), 200


@app.route('/api/notifications/<notification_id>/action', methods=['POST'])
@login_required
def notification_action(notification_id):
    """
    Handle notification actions like ordering stock.
    Expects: { "action": "order", "quantity": 100, "orderType": "optimal" | "minimum" }
    """
    data = request.get_json()
    action = data.get('action')
    quantity = data.get('quantity')
    order_type = data.get('orderType', 'optimal')
    
    notifications = read_json(NOTIFICATIONS_FILE)
    notification = next((n for n in notifications if n['id'] == notification_id), None)
    
    if not notification:
        return jsonify({"error": "Notification not found"}), 404
    
    if action == 'order' and quantity:
        # Restock the product using the existing restock functionality
        product_id = notification['productId']
        products = read_json(PRODUCTS_FILE)
        product = next((p for p in products if p['id'] == product_id), None)
        
        if product:
            # Update stock quantity
            product['stockQuantity'] += quantity
            product['lastUpdated'] = datetime.now().isoformat()
            write_json(PRODUCTS_FILE, products)
            
            # Log the restock
            stock_logs = read_json(STOCK_LOGS_FILE)
            stock_logs.append({
                "id": generate_id(),
                "productId": product_id,
                "productName": product['name'],
                "action": "restock",
                "quantity": quantity,
                "timestamp": datetime.now().isoformat(),
                "note": f"Ordered via notification - {order_type} order"
            })
            write_json(STOCK_LOGS_FILE, stock_logs)
        
        # Mark notification as read and resolved
        notification['read'] = True
        notification['resolved'] = True
        notification['resolvedAt'] = datetime.now().isoformat()
        notification['metadata']['orderPlaced'] = {
            'quantity': quantity,
            'type': order_type,
            'timestamp': datetime.now().isoformat()
        }
        
        write_json(NOTIFICATIONS_FILE, notifications)
        
        return jsonify({
            "message": f"Order placed successfully for {quantity} units",
            "notification": notification
        }), 200
    
    return jsonify({"error": "Invalid action"}), 400


@app.route('/api/notifications/clear-all', methods=['POST'])
@login_required
def clear_all_notifications():
    """Clear all read notifications."""
    notifications = read_json(NOTIFICATIONS_FILE)
    
    # Keep only unread notifications
    unread_notifications = [n for n in notifications if not n['read']]
    
    write_json(NOTIFICATIONS_FILE, unread_notifications)
    
    return jsonify({
        "message": "All read notifications cleared",
        "remaining": len(unread_notifications)
    }), 200


# ═══════════════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════════════

@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check endpoint."""
    return jsonify({
        "status": "healthy",
        "message": "Invenio AI Backend is running!",
        "storage": "JSON-based file storage",
        "data_directory": DATA_DIR,
        "timestamp": datetime.now().isoformat()
    }), 200


# ═══════════════════════════════════════════════════
#  DEMAND FORECASTING ENDPOINTS
# ═══════════════════════════════════════════════════

@app.route('/api/forecasts', methods=['GET'])
def get_forecasts():
    """Return pre-computed ML demand forecasts for all products."""
    if not os.path.exists(FORECASTS_FILE):
        return jsonify({
            'error': 'Forecasts not yet generated. '
                     'Run train_forecast_model.py first.'
        }), 404

    data = read_json_obj(FORECASTS_FILE)   # full dict with metadata
    if not data:
        return jsonify({'error': 'Forecasts file is empty or corrupted.'}), 500

    horizon = request.args.get('horizon', None)   # ?horizon=30d / 60d / 90d
    product_id = request.args.get('productId', None)

    products_fc = data.get('products', [])

    # filter by product if requested
    if product_id:
        products_fc = [p for p in products_fc if p['productId'] == product_id]
        if not products_fc:
            return jsonify({'error': f'No forecast found for productId={product_id}'}), 404

    # trim to requested horizon only (strip heavy daily_breakdown)
    if horizon and horizon in ('30d', '60d', '90d'):
        slim = []
        for p in products_fc:
            entry = {k: v for k, v in p.items() if k != 'forecasts'}
            fc = p.get('forecasts', {}).get(horizon, {})
            # remove daily breakdown to keep response light by default
            entry['forecast'] = {k: v for k, v in fc.items()
                                  if k != 'daily_breakdown'}
            entry['horizon'] = horizon
            slim.append(entry)
        return jsonify({
            'generatedAt': data.get('generatedAt'),
            'forecastedUpTo': data.get('forecastedUpTo'),
            'horizon': horizon,
            'products': slim,
        }), 200

    # default: return summary for all horizons (no daily breakdown)
    summary = []
    for p in products_fc:
        entry = {k: v for k, v in p.items() if k != 'forecasts'}
        entry['forecasts'] = {}
        for h in ('30d', '60d', '90d'):
            fc = p.get('forecasts', {}).get(h, {})
            entry['forecasts'][h] = {
                k: v for k, v in fc.items() if k != 'daily_breakdown'
            }
        summary.append(entry)

    return jsonify({
        'generatedAt':    data.get('generatedAt'),
        'forecastedUpTo': data.get('forecastedUpTo'),
        'horizons':       data.get('horizons', ['30d', '60d', '90d']),
        'products':       summary,
    }), 200


@app.route('/api/forecasts/<product_id>/daily', methods=['GET'])
def get_forecast_daily(product_id):
    """Return day-by-day forecast for a specific product."""
    if not os.path.exists(FORECASTS_FILE):
        return jsonify({'error': 'Forecasts not generated yet.'}), 404

    data = read_json_obj(FORECASTS_FILE)
    products_fc = data.get('products', [])
    match = next((p for p in products_fc if p['productId'] == product_id), None)
    if not match:
        return jsonify({'error': f'No forecast for productId={product_id}'}), 404

    horizon = request.args.get('horizon', '30d')
    if horizon not in ('30d', '60d', '90d'):
        return jsonify({'error': 'horizon must be 30d, 60d, or 90d'}), 400

    daily = match.get('forecasts', {}).get(horizon, {}).get('daily_breakdown', [])
    return jsonify({
        'productId':   product_id,
        'productName': match.get('productName'),
        'horizon':     horizon,
        'generatedAt': data.get('generatedAt'),
        'daily':       daily,
    }), 200


# ═══════════════════════════════════════════════════
#  RUN APPLICATION
# ═══════════════════════════════════════════════════

if __name__ == '__main__':
    initialize_data()
    print("\n" + "=" * 50)
    print("  🚀 Invenio AI Backend Starting...")
    print(f"  📁 Data Directory: {DATA_DIR}")
    print(f"  📦 Storage: JSON-based file storage")
    print("=" * 50 + "\n")
    app.run(debug=True, port=5000)
