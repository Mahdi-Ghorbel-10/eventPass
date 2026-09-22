"""
EventPass Tunisia - Shared Cloud Functions Utilities & Database Layer
Shared between web_backend.py and mobile_backend.py
"""

import os
import hmac
import hashlib
import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eventpass_cloud_functions")

def get_db_connection():
    """
    Connects to Cloud SQL PostgreSQL using Unix domain socket when running in
    GCP Cloud Run / Functions, or TCP host fallback for local testing.
    """
    db_user = os.environ.get("DB_USER", "eventpass_app")
    db_pass = os.environ.get("DB_PASSWORD", "dev_secret_pass")
    db_name = os.environ.get("DB_NAME", "eventpass_prod")
    instance_connection_name = os.environ.get("INSTANCE_CONNECTION_NAME")

    if instance_connection_name:
        unix_socket = f"/cloudsql/{instance_connection_name}"
        return psycopg2.connect(
            user=db_user,
            password=db_pass,
            dbname=db_name,
            host=unix_socket
        )
    else:
        return psycopg2.connect(
            user=db_user,
            password=db_pass,
            dbname=db_name,
            host=os.environ.get("DB_HOST", "127.0.0.1"),
            port=int(os.environ.get("DB_PORT", 5432))
        )

def make_json_response(data, status_code=200):
    """Formats JSON HTTP response with permissive CORS for Web and Mobile clients."""
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gate-PIN, X-Signature-SHA256"
    }
    return (json.dumps(data, default=str), status_code, headers)

def generate_ticket_hmac(ticket_id: str, event_id: str, secret_key: str) -> str:
    """Computes a deterministic cryptographic HMAC-SHA256 signature for ticket verification."""
    payload = f"{ticket_id}:{event_id}:{secret_key}"
    sig = hmac.new(secret_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{ticket_id}:{sig[:16]}"
