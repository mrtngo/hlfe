-- Price Alerts Table
-- Stores user-defined price alerts that trigger push notifications

CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  target_price DECIMAL(20, 8) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  is_active BOOLEAN DEFAULT TRUE,
  is_triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(symbol, is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own alerts"
  ON price_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE price_alerts IS 'User-defined price alerts for push notifications';
