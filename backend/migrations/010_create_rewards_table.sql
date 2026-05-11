CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL CHECK (point_cost > 0),
  max_redemptions INTEGER,  -- NULL = unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id),
  child_id UUID NOT NULL REFERENCES children(id),
  approved_by_user_id UUID REFERENCES users(id),
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reward_redemptions_child_id ON reward_redemptions(child_id);

CREATE OR REPLACE FUNCTION prevent_reward_redemptions_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'reward_redemptions is append-only. No updates or deletes are permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reward_redemptions_no_update
BEFORE UPDATE ON reward_redemptions
FOR EACH ROW EXECUTE FUNCTION prevent_reward_redemptions_mutation();

CREATE TRIGGER reward_redemptions_no_delete
BEFORE DELETE ON reward_redemptions
FOR EACH ROW EXECUTE FUNCTION prevent_reward_redemptions_mutation();
