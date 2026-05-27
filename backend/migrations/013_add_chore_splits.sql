-- Migration 013: Add group chore support (shared chore splitting)
-- Adds group-assignment fields to chores and a chore_assignments join table.

-- Add group chore columns to existing chores table
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS assigned_to_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS split_type        VARCHAR(20) NOT NULL DEFAULT 'equal'
    CHECK (split_type IN ('equal', 'weighted'));

-- Per-child assignment tracking for group chores.
-- Also usable for single-child chores (mirrors chores.child_id) if desired.
CREATE TABLE IF NOT EXISTS chore_assignments (
  chore_id              UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  child_id              UUID NOT NULL REFERENCES children(id),
  weight                INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0),
  completed_at          TIMESTAMPTZ,               -- NULL = not yet completed by this child
  completed_by_user_id  UUID REFERENCES users(id), -- who clicked "Done" for this child
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chore_id, child_id)
);

CREATE INDEX idx_chore_assignments_chore_id  ON chore_assignments(chore_id);
CREATE INDEX idx_chore_assignments_child_id  ON chore_assignments(child_id);
CREATE INDEX idx_chore_assignments_pending   ON chore_assignments(chore_id) WHERE completed_at IS NULL;

-- Add group_completion_id to chore_completions so we can link all per-child rows
-- that were created when the last assignee finished.
ALTER TABLE chore_completions
  ADD COLUMN IF NOT EXISTS group_completion_id UUID; -- shared UUID across a collaborative batch

CREATE INDEX idx_chore_completions_group_id ON chore_completions(group_completion_id)
  WHERE group_completion_id IS NOT NULL;
