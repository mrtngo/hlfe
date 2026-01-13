-- Seed popular crypto assets with their categories
-- This is a starting point - you can add more assets as needed

-- First, let's create a helper function to add assets with categories
CREATE OR REPLACE FUNCTION add_asset_with_categories(
    p_symbol VARCHAR,
    p_name VARCHAR,
    p_full_name VARCHAR,
    p_is_stock BOOLEAN,
    p_is_crypto BOOLEAN,
    p_category_slugs TEXT[]
) RETURNS void AS $$
DECLARE
    v_asset_id UUID;
    v_category_id UUID;
    v_slug TEXT;
BEGIN
    -- Insert or update asset
    INSERT INTO assets (symbol, name, full_name, is_stock, is_crypto)
    VALUES (p_symbol, p_name, p_full_name, p_is_stock, p_is_crypto)
    ON CONFLICT (symbol) DO UPDATE
    SET name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        is_stock = EXCLUDED.is_stock,
        is_crypto = EXCLUDED.is_crypto,
        updated_at = now()
    RETURNING id INTO v_asset_id;

    -- Add categories
    FOREACH v_slug IN ARRAY p_category_slugs
    LOOP
        SELECT id INTO v_category_id FROM categories WHERE slug = v_slug;
        IF v_category_id IS NOT NULL THEN
            INSERT INTO asset_categories (asset_id, category_id)
            VALUES (v_asset_id, v_category_id)
            ON CONFLICT (asset_id, category_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Seed Layer 1 Blockchains
SELECT add_asset_with_categories('BTC-USD', 'BTC', 'Bitcoin', false, true, ARRAY['layer-1']);
SELECT add_asset_with_categories('ETH-USD', 'ETH', 'Ethereum', false, true, ARRAY['layer-1', 'defi']);
SELECT add_asset_with_categories('SOL-USD', 'SOL', 'Solana', false, true, ARRAY['layer-1', 'defi']);
SELECT add_asset_with_categories('AVAX-USD', 'AVAX', 'Avalanche', false, true, ARRAY['layer-1', 'defi']);
SELECT add_asset_with_categories('DOT-USD', 'DOT', 'Polkadot', false, true, ARRAY['layer-1', 'interoperability']);
SELECT add_asset_with_categories('ATOM-USD', 'ATOM', 'Cosmos', false, true, ARRAY['layer-1', 'interoperability']);
SELECT add_asset_with_categories('ADA-USD', 'ADA', 'Cardano', false, true, ARRAY['layer-1']);
SELECT add_asset_with_categories('NEAR-USD', 'NEAR', 'NEAR Protocol', false, true, ARRAY['layer-1']);
SELECT add_asset_with_categories('SUI-USD', 'SUI', 'Sui', false, true, ARRAY['layer-1', 'defi']);
SELECT add_asset_with_categories('APT-USD', 'APT', 'Aptos', false, true, ARRAY['layer-1', 'defi']);

-- Layer 2 Solutions
SELECT add_asset_with_categories('ARB-USD', 'ARB', 'Arbitrum', false, true, ARRAY['layer-2', 'defi']);
SELECT add_asset_with_categories('OP-USD', 'OP', 'Optimism', false, true, ARRAY['layer-2', 'defi']);
SELECT add_asset_with_categories('MATIC-USD', 'MATIC', 'Polygon', false, true, ARRAY['layer-2', 'defi']);

-- DeFi Protocols
SELECT add_asset_with_categories('UNI-USD', 'UNI', 'Uniswap', false, true, ARRAY['defi']);
SELECT add_asset_with_categories('AAVE-USD', 'AAVE', 'Aave', false, true, ARRAY['defi']);
SELECT add_asset_with_categories('MKR-USD', 'MKR', 'Maker', false, true, ARRAY['defi']);
SELECT add_asset_with_categories('CRV-USD', 'CRV', 'Curve', false, true, ARRAY['defi']);
SELECT add_asset_with_categories('LDO-USD', 'LDO', 'Lido', false, true, ARRAY['defi']);

-- Privacy Coins
SELECT add_asset_with_categories('XMR-USD', 'XMR', 'Monero', false, true, ARRAY['privacy', 'layer-1']);
SELECT add_asset_with_categories('ZEC-USD', 'ZEC', 'Zcash', false, true, ARRAY['privacy', 'layer-1']);

-- Infrastructure
SELECT add_asset_with_categories('LINK-USD', 'LINK', 'Chainlink', false, true, ARRAY['infrastructure', 'oracle']);
SELECT add_asset_with_categories('GRT-USD', 'GRT', 'The Graph', false, true, ARRAY['infrastructure']);
SELECT add_asset_with_categories('FIL-USD', 'FIL', 'Filecoin', false, true, ARRAY['infrastructure', 'storage']);
SELECT add_asset_with_categories('AR-USD', 'AR', 'Arweave', false, true, ARRAY['infrastructure', 'storage']);

-- AI Tokens
SELECT add_asset_with_categories('FET-USD', 'FET', 'Fetch.ai', false, true, ARRAY['ai']);
SELECT add_asset_with_categories('RNDR-USD', 'RNDR', 'Render', false, true, ARRAY['ai', 'infrastructure']);

-- Gaming & Metaverse
SELECT add_asset_with_categories('AXS-USD', 'AXS', 'Axie Infinity', false, true, ARRAY['gaming', 'nft']);
SELECT add_asset_with_categories('SAND-USD', 'SAND', 'The Sandbox', false, true, ARRAY['gaming', 'nft']);
SELECT add_asset_with_categories('MANA-USD', 'MANA', 'Decentraland', false, true, ARRAY['gaming', 'nft']);
SELECT add_asset_with_categories('IMX-USD', 'IMX', 'Immutable X', false, true, ARRAY['gaming', 'nft', 'layer-2']);

-- Meme Coins
SELECT add_asset_with_categories('DOGE-USD', 'DOGE', 'Dogecoin', false, true, ARRAY['meme', 'layer-1']);
SELECT add_asset_with_categories('SHIB-USD', 'SHIB', 'Shiba Inu', false, true, ARRAY['meme']);
SELECT add_asset_with_categories('PEPE-USD', 'PEPE', 'Pepe', false, true, ARRAY['meme']);
SELECT add_asset_with_categories('WIF-USD', 'WIF', 'dogwifhat', false, true, ARRAY['meme']);

-- NFT Platforms
SELECT add_asset_with_categories('BLUR-USD', 'BLUR', 'Blur', false, true, ARRAY['nft', 'defi']);

-- Stocks (Trade.xyz)
SELECT add_asset_with_categories('TSLA-USD', 'TSLA', 'Tesla Inc.', true, false, ARRAY['stocks']);
SELECT add_asset_with_categories('NVDA-USD', 'NVDA', 'NVIDIA Corporation', true, false, ARRAY['stocks', 'ai']);
SELECT add_asset_with_categories('AAPL-USD', 'AAPL', 'Apple Inc.', true, false, ARRAY['stocks']);
SELECT add_asset_with_categories('MSFT-USD', 'MSFT', 'Microsoft Corporation', true, false, ARRAY['stocks', 'ai']);
SELECT add_asset_with_categories('GOOGL-USD', 'GOOGL', 'Alphabet Inc.', true, false, ARRAY['stocks', 'ai']);
SELECT add_asset_with_categories('AMZN-USD', 'AMZN', 'Amazon.com Inc.', true, false, ARRAY['stocks']);
SELECT add_asset_with_categories('META-USD', 'META', 'Meta Platforms Inc.', true, false, ARRAY['stocks', 'ai']);
SELECT add_asset_with_categories('COIN-USD', 'COIN', 'Coinbase Global Inc.', true, false, ARRAY['stocks']);

-- More popular cryptos
SELECT add_asset_with_categories('BNB-USD', 'BNB', 'BNB', false, true, ARRAY['layer-1', 'defi']);
SELECT add_asset_with_categories('XRP-USD', 'XRP', 'XRP', false, true, ARRAY['layer-1']);
SELECT add_asset_with_categories('LTC-USD', 'LTC', 'Litecoin', false, true, ARRAY['layer-1']);
SELECT add_asset_with_categories('TRX-USD', 'TRX', 'TRON', false, true, ARRAY['layer-1']);
SELECT add_asset_with_categories('TON-USD', 'TON', 'Toncoin', false, true, ARRAY['layer-1']);

-- Clean up helper function (optional)
-- DROP FUNCTION add_asset_with_categories(VARCHAR, VARCHAR, VARCHAR, BOOLEAN, BOOLEAN, TEXT[]);
