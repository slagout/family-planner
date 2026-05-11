-- Append-only point ledger (immutable financial record)
CREATE TABLE IF NOT EXISTS point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  delta INTEGER NOT NULL,  -- positive=earned, negative=spent
  reason VARCHAR(200) NOT NULL,
  reference_type VARCHAR(50) CHECK (reference_type IN ('chore_completion', 'reward_redemption', 'adjustment', 'bonus')),
  reference_id UUID,       -- FK to chore_completions.id or rewards.id
  balance_after INTEGER NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_point_ledger_child_id ON point_ledger(child_id);
CREATE INDEX idx_point_ledger_created_at ON point_ledger(created_at DESC);

CREATE OR REPLACE FUNCTION prevent_point_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'point_ledger is append-only. No updates or deletes are permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER point_ledger_no_update
BEFORE UPDATE ON point_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_point_ledger_mutation();

CREATE TRIGGER point_ledger_no_delete
BEFORE DELETE ON point_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_point_ledger_mutation();
