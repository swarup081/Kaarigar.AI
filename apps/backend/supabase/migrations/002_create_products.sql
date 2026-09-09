-- ============================================
-- Migration 002: Create products table
-- ============================================

CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artisan_id UUID REFERENCES artisans(id) ON DELETE CASCADE,

    -- Multilingual content
    title_regional TEXT,
    title_english TEXT,
    title_hindi TEXT,
    description_regional TEXT,
    description_english TEXT,
    description_hindi TEXT,
    bullet_features JSONB DEFAULT '{}',

    -- Product attributes
    category TEXT,
    sub_category TEXT,
    material TEXT,
    technique TEXT,
    colors TEXT[],
    dimensions JSONB,
    weight_grams INTEGER,

    -- Heritage
    heritage_story JSONB DEFAULT '{}',
    gi_tag TEXT,
    region_of_origin TEXT,

    -- Pricing
    raw_material_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    labor_hours DECIMAL(5,2),
    overhead_cost DECIMAL(10,2),
    floor_price DECIMAL(10,2),
    suggested_price_min DECIMAL(10,2),
    suggested_price_max DECIMAL(10,2),
    suggested_price_recommended DECIMAL(10,2),
    final_price DECIMAL(10,2),
    pricing_reasoning JSONB DEFAULT '{}',
    currency TEXT DEFAULT 'INR',

    -- Media
    original_images TEXT[],
    enhanced_images TEXT[],
    voice_note_url TEXT,
    voice_transcript TEXT,

    -- Status
    status TEXT DEFAULT 'draft',
    ai_processing_status JSONB DEFAULT '{}',

    -- Publishing
    published_channels JSONB DEFAULT '[]',
    storefront_url TEXT,
    ondc_item_id TEXT,
    ondc_status TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    device_id TEXT
);

-- Indexes
CREATE INDEX idx_products_artisan ON products(artisan_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_own_data" ON products
    FOR ALL USING (
        artisan_id IN (
            SELECT id FROM artisans
            WHERE firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "products_public_read" ON products
    FOR SELECT USING (status = 'published');

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
