#!/usr/bin/env bash
# ==============================================================================
# Deploy EventPass Cloud Functions (2nd Gen on Cloud Run)
#
# Cleanly split into:
# PART A: WEB BACKEND (functions/web_backend.py)
#   1. create-event (Organizer multi-tier event & promoter provisioning)
#   2. create-seller (Promoter account registration for events)
#   3. create-checkout (Public Buyer Ticket Reservation Session)
#   4. payment-webhook (ClicToPay SMT, Konnect, Flouci callbacks)
#   5. add-tier (Add new ticket tier & set tickets count/capacity)
#   6. update-tier (Update tier pricing, badge, name, description & capacity)
#   7. update-tickets-number (Dedicated ticket capacity / stock count updater by tier)
#   8. delete-tier (Safe tier deletion with sold-ticket protection)
#
# PART B: MOBILE BACKEND (functions/mobile_backend.py)
#   9. verify-ticket (Sub-300ms Gate QR check-in & turnstiles)
#   10. sync-gate-tickets (Expo SQLite prefetch engine for offline admission)
#   11. seller-login (Promoter POS authentication via Email + Event PIN)
#   12. issue-cash-ticket (Promoter Paperless POS cash sales)
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo '')}"
REGION="${GCP_REGION:-europe-west1}"
INSTANCE_NAME="${DB_INSTANCE_NAME:-eventpass-db-pg16}"
DB_NAME="${DATABASE_NAME:-eventpass_prod}"
DB_USER="${DATABASE_USER:-eventpass_app}"

if [ -z "$PROJECT_ID" ]; then
  echo "  Error: GCP_PROJECT_ID is not set."
  exit 1
fi

CONNECTION_NAME=$(gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" --format="value(connectionName)")
echo "  Deploying Cloud Functions to $PROJECT_ID ($REGION)..."
echo "  Connecting to Cloud SQL instance: $CONNECTION_NAME"

# ==============================================================================
# PART A: WEB BACKEND FUNCTIONS (web_backend.py)
# ==============================================================================
echo ""
echo "=================================================="
echo "  DEPLOYING PART A: WEB BACKEND FUNCTIONS"
echo "=================================================="

# 1. Deploy create_event
echo ""
echo "Deploying web function: create_event (Organizer Event & Multi-Tier Setup)..."
gcloud functions deploy create-event \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=create_event \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 2. Deploy create_seller
echo ""
echo "Deploying web function: create_seller (Register Event Promoter Accounts)..."
gcloud functions deploy create-seller \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=create_seller \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 3. Deploy create_checkout
echo ""
echo "Deploying web function: create_checkout (Web Buyer Ticket Reservation)..."
gcloud functions deploy create-checkout \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=create_checkout \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest,TICKET_SECRET_KEY=EVENTPASS_HMAC_SECRET:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 4. Deploy payment_webhook
echo ""
echo "Deploying web function: payment_webhook (ClicToPay SMT, Konnect & Flouci)..."
gcloud functions deploy payment-webhook \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=payment_webhook \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest,TICKET_SECRET_KEY=EVENTPASS_HMAC_SECRET:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 5. Deploy add_tier
echo ""
echo "Deploying web function: add_tier (Organizer Add Ticket Tier & Inventory)..."
gcloud functions deploy add-tier \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=add_tier \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 6. Deploy update_tier
echo ""
echo "Deploying web function: update_tier (Update Tier Pricing, Badges & Ticket Capacity)..."
gcloud functions deploy update-tier \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=update_tier \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 7. Deploy update_tickets_number
echo ""
echo "Deploying web function: update_tickets_number (Dedicated Ticket Capacity / Stock Updater)..."
gcloud functions deploy update-tickets-number \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=update_tickets_number \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 8. Deploy delete_tier
echo ""
echo "Deploying web function: delete_tier (Safe Tier Deletion with Sold-Ticket Protection)..."
gcloud functions deploy delete-tier \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=delete_tier \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# ==============================================================================
# PART B: MOBILE BACKEND FUNCTIONS (mobile_backend.py)
# ==============================================================================
echo ""
echo "=================================================="
echo "  DEPLOYING PART B: MOBILE BACKEND FUNCTIONS"
echo "=================================================="

# 5. Deploy verify_ticket
echo ""
echo "Deploying mobile function: verify_ticket (Sub-300ms Gate Scanner & Turnstiles)..."
gcloud functions deploy verify-ticket \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=verify_ticket \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest,TICKET_SECRET_KEY=EVENTPASS_HMAC_SECRET:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 6. Deploy sync_gate_tickets
echo ""
echo "Deploying mobile function: sync_gate_tickets (Offline Expo SQLite Sync Engine)..."
gcloud functions deploy sync-gate-tickets \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=sync_gate_tickets \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest,TICKET_SECRET_KEY=EVENTPASS_HMAC_SECRET:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 7. Deploy seller_login
echo ""
echo "Deploying mobile function: seller_login (Promoter POS Email + PIN Auth)..."
gcloud functions deploy seller-login \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=seller_login \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

# 8. Deploy issue_cash_ticket
echo ""
echo "Deploying mobile function: issue_cash_ticket (Promoter POS Cash Sales)..."
gcloud functions deploy issue-cash-ticket \
  --gen2 \
  --runtime=python312 \
  --region="$REGION" \
  --source=./functions \
  --entry-point=issue_cash_ticket \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="DB_USER=$DB_USER,DB_NAME=$DB_NAME,INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
  --set-secrets="DB_PASSWORD=EVENTPASS_DB_PASSWORD:latest,TICKET_SECRET_KEY=EVENTPASS_HMAC_SECRET:latest" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --project="$PROJECT_ID"

echo ""
echo "  All 8 Cloud Run Functions (Web & Mobile Backends) deployed successfully!"
gcloud functions list --project="$PROJECT_ID" --region="$REGION"


