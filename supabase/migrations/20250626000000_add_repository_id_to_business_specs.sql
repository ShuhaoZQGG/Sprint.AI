-- Add repository_id column to business_specs (nullable, FK to repositories)
ALTER TABLE business_specs
ADD COLUMN repository_id uuid REFERENCES repositories(id) ON DELETE SET NULL;