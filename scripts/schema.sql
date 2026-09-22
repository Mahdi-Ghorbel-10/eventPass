-- ==============================================================================
-- EventPass Tunisia: Production Cloud SQL PostgreSQL Schema
-- Supports offline gate verification, HMAC-SHA256 signatures, Tunisian payment 
-- gateways (ClicToPay, Konnect, Flouci), ticket tiers, and cover image slider.
-- ==============================================================================

-- 1. Organizers & Promoters
CREATE TABLE IF NOT EXISTS organizers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    organizer_id VARCHAR(64) REFERENCES organizers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    slug VARCHAR(128) UNIQUE NOT NULL,
    category VARCHAR(64) DEFAULT 'Festival',
    date VARCHAR(64) NOT NULL,
    time VARCHAR(32) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    banner_url TEXT,
    cover_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    pin_code VARCHAR(6) NOT NULL, -- 6-Digit Gate PIN (e.g. '839204')
    secret_key VARCHAR(128) NOT NULL, -- Shared secret for HMAC-SHA256 offline tickets
    enabled_gateways TEXT[] DEFAULT ARRAY['CLICTOPAY', 'KONNECT', 'FLOUCI']::TEXT[],
    status VARCHAR(32) DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for public checkout slug lookup
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- 3. Ticket Tiers (Pricing, Inventory & Badges)
CREATE TABLE IF NOT EXISTS ticket_tiers (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL, -- e.g. 'Wave Pass', 'VIP Backstage'
    badge VARCHAR(64), -- e.g. 'Bestseller', 'VIP Access'
    price_tnd NUMERIC(10, 3) NOT NULL, -- Tunisian Dinar with millimes precision (e.g. 65.000)
    total_capacity INTEGER NOT NULL,
    sold_count INTEGER DEFAULT 0,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_capacity CHECK (sold_count <= total_capacity)
);

CREATE INDEX IF NOT EXISTS idx_tiers_event ON ticket_tiers(event_id);

-- 4. Purchased Tickets (QR codes, validation status & cryptographic signatures)
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tier_id VARCHAR(64) NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_phone VARCHAR(32) NOT NULL,
    buyer_email VARCHAR(255),
    price_paid_tnd NUMERIC(10, 3) NOT NULL,
    payment_method VARCHAR(32) NOT NULL, -- 'CLICTOPAY', 'KONNECT', 'FLOUCI', 'cash_door', 'seller_cash'
    payment_ref VARCHAR(128),
    payment_status VARCHAR(32) DEFAULT 'PAID', -- 'PENDING', 'PAID', 'REFUNDED'
    ticket_hash VARCHAR(128) NOT NULL, -- HMAC-SHA256 signature
    is_used BOOLEAN DEFAULT FALSE,
    scanned_at TIMESTAMP WITH TIME ZONE,
    scanned_by_device VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_hash ON tickets(ticket_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(event_id, is_used);

-- 5. Door Cash Desk Records (Offline Cashier Settlements)
CREATE TABLE IF NOT EXISTS door_cash_records (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tier_id VARCHAR(64) NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
    cashier_device_id VARCHAR(128) NOT NULL,
    amount_tnd NUMERIC(10, 3) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_door_cash_event ON door_cash_records(event_id);

-- 6. Gate Scanners & Devices Pairing Log
CREATE TABLE IF NOT EXISTS gate_devices (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    device_label VARCHAR(128) NOT NULL,
    paired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Event Sellers / Promoter Profiles (POS Cash Sales & Tracking)
CREATE TABLE IF NOT EXISTS sellers (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    status VARCHAR(32) DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED'
    total_sales_count INTEGER DEFAULT 0,
    total_sales_tnd NUMERIC(10, 3) DEFAULT 0.000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_seller_per_event UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_sellers_event ON sellers(event_id);
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);

