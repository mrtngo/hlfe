-- Price Alert State Table
-- Stores the last alerted price for each tracked asset

CREATE TABLE IF NOT EXISTS price_alert_state (
    symbol TEXT PRIMARY KEY,
    last_alert_price NUMERIC NOT NULL,
    last_alert_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with some starting prices (will be updated on first alert)
INSERT INTO price_alert_state (symbol, last_alert_price) VALUES
    ('BTC', 100000),
    ('ETH', 3000),
    ('GC', 2700)
ON CONFLICT (symbol) DO NOTHING;

-- Enable RLS
ALTER TABLE price_alert_state ENABLE ROW LEVEL SECURITY;

-- Allow the service to read and update
CREATE POLICY "Allow public read" ON price_alert_state FOR SELECT USING (true);
CREATE POLICY "Allow service update" ON price_alert_state FOR UPDATE USING (true);
CREATE POLICY "Allow service insert" ON price_alert_state FOR INSERT WITH CHECK (true);
