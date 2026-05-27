-- Migration 014: Reward redemption workflow (pending → approved → fulfilled / cancelled)
-- The existing reward_redemptions table is a finalized-only log.
-- This migration adds a redemption_requests table that tracks the full lifecycle.

CREATE TABLE IF NOT EXISTS redemption_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES children(id),
  reward_id       UUID NOT NULL REFERENCES rewards(id),
  points_spent    INTEGER NOT NULL CHECK (points_spent > 0),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  fulfilled_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT
);

CREATE INDEX idx_redemption_requests_child_id  ON redemption_requests(child_id);
CREATE INDEX idx_redemption_requests_status    ON redemption_requests(status);
CREATE INDEX idx_redemption_requests_reward_id ON redemption_requests(reward_id);

-- Prevent points_spent from ever being changed (other status fields are mutable)
CREATE OR REPLACE FUNCTION prevent_redemption_points_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.points_spent IS DISTINCT FROM NEW.points_spent THEN
    RAISE EXCEPTION 'points_spent on redemption_requests is immutable once set.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER redemption_requests_lock_points
BEFORE UPDATE ON redemption_requests
FOR EACH ROW EXECUTE FUNCTION prevent_redemption_points_change();

-- Prevent deletes to maintain full audit trail
CREATE OR REPLACE FUNCTION prevent_redemption_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'redemption_requests rows cannot be deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER redemption_requests_no_delete
BEFORE DELETE ON redemption_requests
FOR EACH ROW EXECUTE FUNCTION prevent_redemption_delete();
