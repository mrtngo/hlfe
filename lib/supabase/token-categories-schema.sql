-- Token Categories System
-- This schema allows flexible categorization of tokens/assets

-- Categories table - predefined categories like L1, L2, Privacy, etc.
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color for UI, e.g., '#FFD60A'
    icon VARCHAR(50), -- Icon name or emoji
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assets table - stores info about each tradeable asset
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'BTC-USD', 'TSLA-USD'
    name VARCHAR(100) NOT NULL, -- e.g., 'BTC', 'TSLA'
    full_name VARCHAR(255), -- e.g., 'Bitcoin', 'Tesla Inc.'
    description TEXT,
    is_stock BOOLEAN DEFAULT false,
    is_crypto BOOLEAN DEFAULT true,
    market_cap NUMERIC,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asset Categories junction table - many-to-many relationship
CREATE TABLE IF NOT EXISTS public.asset_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(asset_id, category_id)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

-- Policies for public read access (everyone can view categories)
CREATE POLICY "Allow public read access to categories"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to assets"
    ON public.assets FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to asset_categories"
    ON public.asset_categories FOR SELECT
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON public.assets(symbol);
CREATE INDEX IF NOT EXISTS idx_assets_is_stock ON public.assets(is_stock);
CREATE INDEX IF NOT EXISTS idx_assets_is_crypto ON public.assets(is_crypto);
CREATE INDEX IF NOT EXISTS idx_asset_categories_asset_id ON public.asset_categories(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_category_id ON public.asset_categories(category_id);

-- Insert default categories
INSERT INTO public.categories (name, slug, description, color, icon, sort_order) VALUES
    ('Layer 1', 'layer-1', 'Layer 1 blockchains (Bitcoin, Ethereum, Solana, etc.)', '#FFD60A', '🔷', 1),
    ('Layer 2', 'layer-2', 'Layer 2 scaling solutions (Arbitrum, Optimism, etc.)', '#00D9FF', '⚡', 2),
    ('DeFi', 'defi', 'Decentralized Finance protocols', '#00FF00', '🏦', 3),
    ('Privacy', 'privacy', 'Privacy-focused coins (Monero, Zcash, etc.)', '#9400D3', '🔒', 4),
    ('Infrastructure', 'infrastructure', 'Blockchain infrastructure and tools', '#FF6B35', '🛠️', 5),
    ('Gaming', 'gaming', 'Gaming and metaverse tokens', '#FF1493', '🎮', 6),
    ('AI', 'ai', 'Artificial Intelligence tokens', '#7B68EE', '🤖', 7),
    ('Meme', 'meme', 'Meme coins', '#FFA500', '😂', 8),
    ('Stocks', 'stocks', 'Traditional stocks (via Trade.xyz)', '#4169E1', '📈', 9),
    ('Commodities', 'commodities', 'Commodity assets (Gold, Oil, etc.)', '#DAA520', '🛢️', 10),
    ('Forex', 'forex', 'Foreign exchange pairs', '#228B22', '💱', 11),
    ('NFT', 'nft', 'NFT-related tokens', '#FF69B4', '🖼️', 12),
    ('Storage', 'storage', 'Decentralized storage networks', '#8B4513', '💾', 13),
    ('Oracle', 'oracle', 'Oracle networks (Chainlink, Band, etc.)', '#DC143C', '🔮', 14),
    ('Interoperability', 'interoperability', 'Cross-chain and bridge protocols', '#00CED1', '🌉', 15)
ON CONFLICT (slug) DO NOTHING;

-- Function to get assets by category
CREATE OR REPLACE FUNCTION get_assets_by_category(category_slug TEXT)
RETURNS TABLE (
    id UUID,
    symbol VARCHAR,
    name VARCHAR,
    full_name VARCHAR,
    is_stock BOOLEAN,
    is_crypto BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.symbol,
        a.name,
        a.full_name,
        a.is_stock,
        a.is_crypto
    FROM assets a
    INNER JOIN asset_categories ac ON a.id = ac.asset_id
    INNER JOIN categories c ON ac.category_id = c.id
    WHERE c.slug = category_slug
    ORDER BY a.symbol;
END;
$$ LANGUAGE plpgsql;

-- Function to get all categories with asset counts
CREATE OR REPLACE FUNCTION get_categories_with_counts()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    slug VARCHAR,
    description TEXT,
    color VARCHAR,
    icon VARCHAR,
    asset_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.color,
        c.icon,
        COUNT(ac.asset_id) as asset_count
    FROM categories c
    LEFT JOIN asset_categories ac ON c.id = ac.category_id
    GROUP BY c.id, c.name, c.slug, c.description, c.color, c.icon, c.sort_order
    ORDER BY c.sort_order;
END;
$$ LANGUAGE plpgsql;
