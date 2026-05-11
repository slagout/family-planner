CREATE TABLE IF NOT EXISTS chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id),
  child_id UUID REFERENCES children(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) NOT NULL DEFAULT 'once' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once')),
  reward_points INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
  due_date TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chores_parent_user_id ON chores(parent_user_id);
CREATE INDEX idx_chores_child_id ON chores(child_id);
CREATE INDEX idx_chores_status ON chores(status);

CREATE OR REPLACE FUNCTION prevent_chore_immutable_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id OR OLD.parent_user_id IS DISTINCT FROM NEW.parent_user_id OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable fields on chores table';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chores_immutable_fields
BEFORE UPDATE ON chores
FOR EACH ROW EXECUTE FUNCTION prevent_chore_immutable_update();
