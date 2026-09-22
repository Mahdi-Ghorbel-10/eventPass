"""
EventPass Tunisia - Google Cloud Run Functions (Python 3.12 / Gen 2)

This module acts as the unified gateway and backwards-compatible entrypoint,
cleanly splitting the architecture into two dedicated backend files:

1. Web Backend (functions/web_backend.py):
   - create_event: Organizer studio event creation with multi-tier ticket setup, payment gateways, and promoters
   - create_seller: Register promoter/seller profile for an event with email + event PIN credentials
   - create_checkout: Web buyer ticket reservation session initializer & tier capacity locking
   - payment_webhook: Webhook listener for ClicToPay (SMT), Konnect, and Flouci callbacks
   - add_tier: Add a new ticket tier & set its initial tickets number/capacity
   - update_tier: Update tier pricing, badge, name, description, and ticket inventory
   - update_tickets_number: Dedicated ticket capacity / stock count updater by tier
   - delete_tier: Safe tier deletion with sold-ticket protection and event integrity check

2. Mobile Backend (functions/mobile_backend.py):
   - verify_ticket: Sub-300ms QR scan verification & gate check-in for the Expo / Mobile Gate Scanner app & Turnstiles
   - sync_gate_tickets: Pre-downloads valid ticket hashes to Expo SQLite mobile client for offline door check-in
   - seller_login: Authenticate seller into POS cash register using registered email & 6-digit event PIN
   - issue_cash_ticket: Promoter POS cash sales logging with automatic PDF dispatch

3. Shared Database & Crypto Utilities (functions/common.py):
   - get_db_connection: Cloud SQL PostgreSQL connection pooling
   - make_json_response: Permissive CORS JSON HTTP response builder
   - generate_ticket_hmac: HMAC-SHA256 signature generator
"""

# Re-export shared utilities
try:
    from .common import get_db_connection, make_json_response, generate_ticket_hmac, logger
except ImportError:
    from common import get_db_connection, make_json_response, generate_ticket_hmac, logger

# Re-export Web Backend Cloud Functions
try:
    from .web_backend import (
        create_event,
        create_seller,
        create_checkout,
        payment_webhook,
        add_tier,
        update_tier,
        update_tickets_number,
        delete_tier,
    )
except ImportError:
    from web_backend import (
        create_event,
        create_seller,
        create_checkout,
        payment_webhook,
        add_tier,
        update_tier,
        update_tickets_number,
        delete_tier,
    )

# Re-export Mobile Backend Cloud Functions
try:
    from .mobile_backend import verify_ticket, sync_gate_tickets, seller_login, issue_cash_ticket
except ImportError:
    from mobile_backend import verify_ticket, sync_gate_tickets, seller_login, issue_cash_ticket

__all__ = [
    # Utilities
    "get_db_connection",
    "make_json_response",
    "generate_ticket_hmac",
    "logger",
    # Web Backend
    "create_event",
    "create_seller",
    "create_checkout",
    "payment_webhook",
    "add_tier",
    "update_tier",
    "update_tickets_number",
    "delete_tier",
    # Mobile Backend
    "verify_ticket",
    "sync_gate_tickets",
    "seller_login",
    "issue_cash_ticket",
]
