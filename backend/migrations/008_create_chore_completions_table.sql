-- Append-only chore completions log (no UPDATE, no DELETE)
CREATE TABLE IF NOT EXISTS chore_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id),
  child_id UUID NOT NULL REFERENCES children(id),
  completed_by_user_id UUID NOT NULL REFERENCES users(id),
  approved_by_user_id UUID REFERENCES users(id),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chore_completions_chore_id ON chore_completions(chore_id);
CREATE INDEX idx_chore_completions_child_id ON chore_completions(child_id);

CREATE OR REPLACE FUNCTION prevent_chore_completions_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'chore_completions is append-only. No updates or deletes are permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chore_completions_no_update
BEFORE UPDATE ON chore_completions
FOR EACH ROW EXECUTE FUNCTION prevent_chore_completions_mutation();

CREATE TRIGGER chore_completions_no_delete
BEFORE DELETE ON chore_completions
FOR EACH ROW EXECUTE FUNCTION prevent_chore_completions_mutation();
