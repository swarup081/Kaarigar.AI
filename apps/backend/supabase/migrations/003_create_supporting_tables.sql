-- ============================================
-- Migration 003: Create supporting tables
-- ============================================

-- AI Processing Jobs
CREATE TABLE ai_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    ai_server_url TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_jobs_product ON ai_jobs(product_id);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);

-- Orders / Inquiries
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id),
    artisan_id UUID REFERENCES artisans(id),
    buyer_name TEXT,
    buyer_phone TEXT,
    buyer_email TEXT,
    channel_source TEXT,
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'inquiry',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_own_data" ON orders
    FOR ALL USING (
        artisan_id IN (
            SELECT id FROM artisans
            WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Publishing channels
CREATE TABLE channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artisan_id UUID REFERENCES artisans(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL,
    is_connected BOOLEAN DEFAULT FALSE,
    credentials JSONB,
    config JSONB,
    last_push_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_own_data" ON channels
    FOR ALL USING (
        artisan_id IN (
            SELECT id FROM artisans
            WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Pricing reference data (seeded, read by pricing engine)
CREATE TABLE price_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    sub_category TEXT,
    material TEXT,
    technique TEXT,
    region TEXT,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    price_median DECIMAL(10,2),
    source TEXT,
    sample_size INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Storefront visit tracking
CREATE TABLE storefront_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artisan_id UUID REFERENCES artisans(id),
    product_id UUID REFERENCES products(id),
    visitor_ip TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync outbox (server-side, for tracking client syncs)
CREATE TABLE sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);
