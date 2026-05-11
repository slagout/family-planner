-- Children table: immutable creation, soft-delete only
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  allergies TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_children_parent_user_id ON children(parent_user_id);

-- Prevent hard deletes and updates to immutable fields
CREATE OR REPLACE FUNCTION prevent_children_immutable_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id OR OLD.parent_user_id IS DISTINCT FROM NEW.parent_user_id OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable fields on children table';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER children_immutable_fields
BEFORE UPDATE ON children
FOR EACH ROW EXECUTE FUNCTION prevent_children_immutable_update();

CREATE OR REPLACE FUNCTION prevent_children_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed on children table. Use is_active=false instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER children_no_delete
BEFORE DELETE ON children
FOR EACH ROW EXECUTE FUNCTION prevent_children_delete();
