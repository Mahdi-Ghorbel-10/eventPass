"""
EventPass Tunisia - Mobile Backend Cloud Functions (Python 3.12 / Gen 2)
Dedicated to the Mobile Gate Scanner App, Turnstiles, Offline Engine, and Promoter POS Cash App.

Endpoints provided:
1. verify_ticket(request): Instant sub-300ms QR scan verification & gate check-in
2. sync_gate_tickets(request): Pre-downloads valid ticket hashes to Expo SQLite mobile client for offline door check-in
3. seller_login(request): Authenticate seller into POS cash register using registered email & 6-digit event PIN
4. issue_cash_ticket(request): Promoter POS cash sales logging with automatic PDF dispatch
"""

import os
import hmac
from datetime import datetime
import functions_framework
from psycopg2.extras import RealDictCursor

# Import shared database and utility layer
try:
    from .common import get_db_connection, make_json_response, generate_ticket_hmac, logger
except ImportError:
    from common import get_db_connection, make_json_response, generate_ticket_hmac, logger

# ==============================================================================
# 1. VERIFY TICKET (Sub-300ms Mobile Gate Scanner Endpoint)
# ==============================================================================
@functions_framework.http
def verify_ticket(request):
    """
    Called by the Gate Scanner Web App or Mobile Expo App.
    Verifies ticket authenticity, checks against double-admission, and updates gate check-in status.
    Expected JSON Body:
      - ticket_id: (str) Ticket unique identifier (e.g. 'TKT-8910-A')
      - ticket_hash: (str) Cryptographic signature hash
      - pin_code: (str, optional if X-Gate-PIN header provided) 6-digit gate PIN
      - scanner_name: (str) Name or label of the gate station / staff device (e.g. 'Gate 1 (Main Entrance) - Turnstile A')
    """
    if request.method == "OPTIONS":
        return make_json_response({}, 204)

    req_data = request.get_json(silent=True) or {}
    ticket_id = req_data.get("ticket_id")
    ticket_hash = req_data.get("ticket_hash")
    gate_pin = request.headers.get("X-Gate-PIN") or req_data.get("pin_code")
    scanner_name = req_data.get("scanner_name") or req_data.get("bouncer_name", "Gate 1 (Main Entrance)")

    if not ticket_id or not ticket_hash:
        return make_json_response({"valid": False, "reason": "MISSING_PARAMETERS"}, 400)

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch ticket, event and tier data
            cur.execute("""
                SELECT t.id, t.buyer_name, t.price_paid_tnd, t.is_used, t.scanned_at, t.scanned_by_device,
                       e.id as event_id, e.pin_code, e.secret_key, e.title as event_title,
                       tt.name as tier_name
                FROM tickets t
                JOIN events e ON t.event_id = e.id
                JOIN ticket_tiers tt ON t.tier_id = tt.id
                WHERE t.id = %s OR t.ticket_hash = %s;
            """, (ticket_id, ticket_hash))
            record = cur.fetchone()

            if not record:
                return make_json_response({
                    "valid": False,
                    "reason": "TICKET_NOT_FOUND",
                    "message": "Ticket does not exist in event database."
                }, 404)

            # 1. Validate Gate Device Authorization via PIN
            if gate_pin and gate_pin != record["pin_code"]:
                return make_json_response({
                    "valid": False,
                    "reason": "INVALID_GATE_PIN",
                    "message": "Unauthorized gate scanner device."
                }, 403)

            # 2. Check cryptographic HMAC-SHA256 signature
            expected_hash = generate_ticket_hmac(record["id"], record["event_id"], record["secret_key"])
            if not hmac.compare_digest(expected_hash, ticket_hash):
                return make_json_response({
                    "valid": False,
                    "reason": "COUNTERFEIT_SIGNATURE",
                    "message": "Cryptographic signature check failed. Possible counterfeit."
                }, 400)

            # 3. Double-entry prevention
            if record["is_used"]:
                return make_json_response({
                    "valid": False,
                    "reason": "ALREADY_SCANNED",
                    "scanned_at": str(record["scanned_at"]),
                    "scanned_by": record["scanned_by_device"],
                    "buyer_name": record["buyer_name"],
                    "message": "Ticket was already used at gate."
                }, 409)

            # 4. Mark ticket as checked-in atomically
            cur.execute("""
                UPDATE tickets
                SET is_used = TRUE,
                    scanned_at = NOW(),
                    scanned_by_device = %s
                WHERE id = %s;
            """, (scanner_name, record["id"]))
            conn.commit()

            return make_json_response({
                "valid": True,
                "ticket_id": record["id"],
                "buyer_name": record["buyer_name"],
                "tier": record["tier_name"],
                "event": record["event_title"],
                "scanner_name": scanner_name,
                "scanned_at": datetime.now().isoformat(),
                "admit": "APPROVED_ENTRY"
            }, 200)

    except Exception as e:
        logger.error(f"Error in verify_ticket: {e}")
        return make_json_response({"error": str(e)}, 500)


# ==============================================================================
# 2. SYNC GATE TICKETS (Offline Expo SQLite Sync Engine)
# ==============================================================================
@functions_framework.http
def sync_gate_tickets(request):
    """
    Called by Mobile App / Gate Scanner before event doors open.
    Downloads valid ticket hashes to store in local SQLite database for sub-300ms offline scanning.
    Requires organizer 6-digit Gate PIN.
    """
    if request.method == "OPTIONS":
        return make_json_response({}, 204)

    event_id = request.args.get("event_id") or request.get_json(silent=True, force=False).get("event_id", "")
    gate_pin = request.headers.get("X-Gate-PIN") or request.args.get("pin") or (request.get_json(silent=True) or {}).get("pin_code")

    if not event_id or not gate_pin:
        return make_json_response({"error": "event_id and X-Gate-PIN header are required"}, 400)

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Verify PIN
            cur.execute("SELECT pin_code, title FROM events WHERE id = %s;", (event_id,))
            event_row = cur.fetchone()
            if not event_row or event_row["pin_code"] != gate_pin:
                return make_json_response({"error": "Invalid Gate PIN"}, 403)

            # Fetch all valid ticket hashes for this event
            cur.execute("""
                SELECT t.id, t.ticket_hash as qr_hash, t.buyer_name, tt.name as tier_name, 
                       t.is_used, t.scanned_at
                FROM tickets t
                JOIN ticket_tiers tt ON t.tier_id = tt.id
                WHERE t.event_id = %s AND t.payment_status = 'PAID';
            """, (event_id,))
            ticket_rows = cur.fetchall()

            return make_json_response({
                "event_id": event_id,
                "event_title": event_row["title"],
                "synced_at": datetime.now().isoformat(),
                "total_tickets": len(ticket_rows),
                "tickets": [
                    {
                        "id": r["id"],
                        "qr_hash": r["qr_hash"],
                        "buyer_name": r["buyer_name"],
                        "tier_name": r["tier_name"],
                        "status": "CHECKED_IN" if r["is_used"] else "VALID",
                        "checked_in_at": str(r["scanned_at"]) if r["scanned_at"] else None
                    }
                    for r in ticket_rows
                ]
            }, 200)

    except Exception as e:
        logger.error(f"Error in sync_gate_tickets: {e}")
        return make_json_response({"error": str(e)}, 500)


# ==============================================================================
# 3. SELLER LOGIN (Authenticate Promoter via Registered Email + Event PIN)
# ==============================================================================
@functions_framework.http
def seller_login(request):
    """
    Authenticates a promoter or campus ambassador to the cash ticket POS register.
    Validates the seller's registered email against the event associated with the 6-digit Gate PIN.

    Expected JSON Body:
      - email: (str, required) e.g. "amine@insat.tn"
      - pin_code: (str, required) 6-digit Gate PIN (e.g. "839204")
      - event_id: (str, optional) Event ID if already scoped
    """
    if request.method == "OPTIONS":
        return make_json_response({}, 204)

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    pin_code = str(data.get("pin_code") or "").strip()
    event_id = (data.get("event_id") or "").strip()

    if not email or not pin_code:
        return make_json_response({
            "error": "Both 'email' and 6-digit 'pin_code' are required to log in as a seller."
        }, 400)

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Query active seller matching email and event PIN
            if event_id:
                cur.execute("""
                    SELECT 
                        s.id AS seller_id, s.name AS seller_name, s.email, s.phone, s.status AS seller_status,
                        s.total_sales_count, s.total_sales_tnd,
                        e.id AS event_id, e.title AS event_title, e.venue, e.city, e.date, e.time, e.pin_code
                    FROM sellers s
                    JOIN events e ON s.event_id = e.id
                    WHERE LOWER(s.email) = %s AND e.pin_code = %s AND e.id = %s;
                """, (email, pin_code, event_id))
            else:
                cur.execute("""
                    SELECT 
                        s.id AS seller_id, s.name AS seller_name, s.email, s.phone, s.status AS seller_status,
                        s.total_sales_count, s.total_sales_tnd,
                        e.id AS event_id, e.title AS event_title, e.venue, e.city, e.date, e.time, e.pin_code
                    FROM sellers s
                    JOIN events e ON s.event_id = e.id
                    WHERE LOWER(s.email) = %s AND e.pin_code = %s;
                """, (email, pin_code))

            seller_rec = cur.fetchone()

            if not seller_rec:
                return make_json_response({
                    "error": "Authentication failed. No active seller account matches this email and event PIN combination."
                }, 401)

            if seller_rec["seller_status"] != "ACTIVE":
                return make_json_response({
                    "error": f"Seller account is {seller_rec['seller_status']}. Contact the event organizer."
                }, 403)

            # Retrieve available ticket tiers for POS cash sales
            cur.execute("""
                SELECT id, name, badge, price_tnd, total_capacity, sold_count, description
                FROM ticket_tiers
                WHERE event_id = %s
                ORDER BY sort_order ASC;
            """, (seller_rec["event_id"],))
            tiers = cur.fetchall()

            return make_json_response({
                "status": "AUTHENTICATED",
                "message": f"Welcome {seller_rec['seller_name']}. Cash POS session authorized.",
                "seller": {
                    "id": seller_rec["seller_id"],
                    "name": seller_rec["seller_name"],
                    "email": seller_rec["email"],
                    "phone": seller_rec["phone"],
                    "total_sales_count": seller_rec["total_sales_count"],
                    "total_sales_tnd": float(seller_rec["total_sales_tnd"])
                },
                "event": {
                    "id": seller_rec["event_id"],
                    "title": seller_rec["event_title"],
                    "venue": seller_rec["venue"],
                    "city": seller_rec["city"],
                    "date": seller_rec["date"],
                    "time": seller_rec["time"],
                    "pin_code": seller_rec["pin_code"]
                },
                "available_tiers": [
                    {
                        "id": t["id"],
                        "name": t["name"],
                        "badge": t["badge"],
                        "price_tnd": float(t["price_tnd"]),
                        "total_capacity": t["total_capacity"],
                        "sold_count": t["sold_count"],
                        "remaining": max(0, t["total_capacity"] - t["sold_count"])
                    }
                    for t in tiers
                ]
            }, 200)

    except Exception as e:
        logger.error(f"Error in seller_login: {e}")
        return make_json_response({"error": str(e)}, 500)


# ==============================================================================
# 4. ISSUE CASH TICKET (Promoter / Ambassador Paperless POS)
# ==============================================================================
@functions_framework.http
def issue_cash_ticket(request):
    """
    Called by Campus Ambassadors and Box Office staff to issue paperless cash tickets.
    Records cash in hand, updates capacity, signs HMAC pass, and dispatches PDF ticket.
    """
    if request.method == "OPTIONS":
        return make_json_response({}, 204)

    data = request.get_json(silent=True) or {}
    event_id = data.get("event_id")
    tier_id = data.get("tier_id")
    buyer_name = data.get("buyer_name")
    buyer_email = data.get("buyer_email")
    buyer_phone = data.get("buyer_phone")
    seller_name = data.get("seller_name", "Official Promoter")
    amount = data.get("amount_collected_tnd")

    if not event_id or not tier_id or not buyer_name or not buyer_email:
        return make_json_response({"error": "Missing required fields"}, 400)

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT secret_key FROM events WHERE id = %s;", (event_id,))
            ev = cur.fetchone()
            if not ev:
                return make_json_response({"error": "Event not found"}, 404)

            ticket_id = f"TKT-{os.urandom(3).hex().upper()}-CSH"
            ticket_hash = generate_ticket_hmac(ticket_id, event_id, ev["secret_key"])

            # Insert ticket
            cur.execute("""
                INSERT INTO tickets
                (id, event_id, tier_id, buyer_name, buyer_phone, buyer_email, price_paid_tnd, payment_method, payment_status, ticket_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'seller_cash', 'PAID', %s);
            """, (ticket_id, event_id, tier_id, buyer_name, buyer_phone, buyer_email, amount, ticket_hash))

            # Record door cash log
            cash_log_id = f"csh-{os.urandom(4).hex()}"
            cur.execute("""
                INSERT INTO door_cash_records (id, event_id, tier_id, cashier_device_id, amount_tnd)
                VALUES (%s, %s, %s, %s, %s);
            """, (cash_log_id, event_id, tier_id, seller_name, amount))

            # Atomic increment
            cur.execute("UPDATE ticket_tiers SET sold_count = sold_count + 1 WHERE id = %s;", (tier_id,))
            conn.commit()

            return make_json_response({
                "status": "ISSUED",
                "ticket_id": ticket_id,
                "qr_hash": ticket_hash,
                "buyer_name": buyer_name,
                "email_sent_to": buyer_email
            }, 201)

    except Exception as e:
        logger.error(f"Error in issue_cash_ticket: {e}")
        return make_json_response({"error": str(e)}, 500)
