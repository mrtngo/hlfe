-- DCA Schedules Table
-- Stores user-defined recurring purchase schedules.
-- Execution path (server-side cron vs client polling vs push-to-confirm) is intentionally
-- not implemented yet — this migration only persists the schedules.

CREATE TABLE IF NOT EXISTS dca_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  market_symbol TEXT NOT NULL,
  amount_usd DECIMAL(20, 2) NOT NULL CHECK (amount_usd >= 10),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month SMALLINT CHECK (day_of_month BETWEEN 1 AND 28),
  hour_utc SMALLINT NOT NULL DEFAULT 12 CHECK (hour_utc BETWEEN 0 AND 23),
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'skipped')),
  last_run_error TEXT,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_spent_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dca_schedules_wallet ON dca_schedules(wallet_address);
CREATE INDEX IF NOT EXISTS idx_dca_schedules_active_due ON dca_schedules(next_run_at) WHERE is_active = TRUE;

ALTER TABLE dca_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage dca schedules"
  ON dca_schedules FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION dca_schedules_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dca_schedules_updated_at_trigger
  BEFORE UPDATE ON dca_schedules
  FOR EACH ROW
  EXECUTE FUNCTION dca_schedules_set_updated_at();

COMMENT ON TABLE dca_schedules IS 'User-defined recurring purchase schedules (DCA). Execution layer intentionally absent in this migration.';
