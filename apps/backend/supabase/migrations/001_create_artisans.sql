-- ============================================
-- Migration 001: Create artisans table
-- ============================================

CREATE TABLE artisans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firebase_uid TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    display_name TEXT,
    language_code TEXT DEFAULT 'hi',
    avatar_url TEXT,
    cluster_name TEXT,
    craft_type TEXT,
    gi_tag TEXT,
    region TEXT,
    state TEXT,
    pm_vishwakarma_id TEXT,
    storefront_slug TEXT UNIQUE,
    storefront_bio TEXT,
    whatsapp_number TEXT,
    ondc_seller_id TEXT,
    ondc_registered BOOLEAN DEFAULT FALSE,
    profile_completeness INTEGER DEFAULT 0,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE artisans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artisans_own_data" ON artisans
    FOR ALL USING (
        firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Public read for storefront
CREATE POLICY "artisans_public_storefront" ON artisans
    FOR SELECT USING (storefront_slug IS NOT NULL);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artisans_updated_at
    BEFORE UPDATE ON artisans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
