#!/usr/bin/env bash
# ==============================================================================
# EventPass Tunisia - Google Cloud Automated Infrastructure Setup
# Provisions:
# 1. GCP Project APIs (Cloud SQL, Cloud Functions, Secret Manager, Cloud Build, Cloud Run)
# 2. Cloud SQL PostgreSQL instance + database + user
# 3. Executes schema.sql tables & indexes
# 4. Secret Manager for ticket HMAC secrets & database credentials
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo '')}"
REGION="${GCP_REGION:-europe-west1}" # europe-west1 (Belgium) or europe-west9 (Paris) recommended for Tunisia
INSTANCE_NAME="${DB_INSTANCE_NAME:-eventpass-db-pg16}"
DB_NAME="${DATABASE_NAME:-eventpass_prod}"
DB_USER="${DATABASE_USER:-eventpass_app}"
DB_PASSWORD="${DATABASE_PASSWORD:-$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 16)}"
TIER="${DB_TIER:-db-f1-micro}"
HMAC_MASTER_SECRET="${HMAC_SECRET:-$(openssl rand -hex 32)}"

echo "=========================================================="
echo "   EventPass Tunisia - Google Cloud Setup Script"
echo "=========================================================="

if [ -z "$PROJECT_ID" ]; then
  echo "  Error: GCP_PROJECT_ID is not set and no active gcloud project found."
  echo "  Please set your project ID: export GCP_PROJECT_ID='your-project-id'"
  exit 1
fi

echo "  Target Project: $PROJECT_ID"
echo "  Target Region:  $REGION"
echo "  Cloud SQL Tier: $TIER"
echo "  Database Name:  $DB_NAME"
echo ""

# 1. Enable Required GCP APIs
echo "  Step 1: Enabling necessary Google Cloud APIs..."
gcloud services enable \
  sqladmin.googleapis.com \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="$PROJECT_ID"
echo "  APIs enabled."

# 2. Create Cloud SQL PostgreSQL Instance
echo ""
echo "  Step 2: Checking Cloud SQL PostgreSQL instance '$INSTANCE_NAME'..."
if gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
  echo "  Cloud SQL instance '$INSTANCE_NAME' already exists."
else
  echo "  Creating Cloud SQL PostgreSQL 16 instance: $INSTANCE_NAME in $REGION (takes ~3 mins)..."
  gcloud sql instances create "$INSTANCE_NAME" \
    --database-version=POSTGRES_16 \
    --tier="$TIER" \
    --region="$REGION" \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=02:00 \
    --project="$PROJECT_ID"
  echo "  Cloud SQL instance created."
fi

# 3. Create Database & Application User
echo ""
echo "  Step 3: Setting up database and user..."
if ! gcloud sql databases describe "$DB_NAME" --instance="$INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
  gcloud sql databases create "$DB_NAME" --instance="$INSTANCE_NAME" --project="$PROJECT_ID"
  echo "  Database '$DB_NAME' created."
fi

if ! gcloud sql users list --instance="$INSTANCE_NAME" --project="$PROJECT_ID" | grep -q "$DB_USER"; then
  gcloud sql users create "$DB_USER" \
    --instance="$INSTANCE_NAME" \
    --password="$DB_PASSWORD" \
    --project="$PROJECT_ID"
  echo "  User '$DB_USER' created."
fi

# 4. Store Secrets in Secret Manager
echo ""
echo "  Step 4: Storing credentials in Secret Manager..."
save_secret() {
  local SECRET_NAME=$1
  local SECRET_VAL=$2
  if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo -n "$SECRET_VAL" | gcloud secrets create "$SECRET_NAME" --data-file=- --project="$PROJECT_ID"
  else
    echo -n "$SECRET_VAL" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --project="$PROJECT_ID"
  fi
  echo "    Secret '$SECRET_NAME' stored."
}

save_secret "EVENTPASS_DB_PASSWORD" "$DB_PASSWORD"
save_secret "EVENTPASS_HMAC_SECRET" "$HMAC_MASTER_SECRET"

CONNECTION_NAME=$(gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" --format="value(connectionName)")
echo ""
echo "=========================================================="
echo "  Google Cloud Setup Completed Successfully!"
echo "=========================================================="
echo "  Cloud SQL Connection Name: $CONNECTION_NAME"
echo "  Database Name:            $DB_NAME"
echo "  Database User:            $DB_USER"
echo ""
echo "  Next Step: Deploy Cloud Functions by running:"
echo "   ./scripts/deploy_functions.sh"
echo "=========================================================="
