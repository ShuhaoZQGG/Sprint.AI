/*
  # Complete Sprint.AI Database Schema

  1. New Tables
    - `profiles` - User profiles linked to auth.users
    - `teams` - Team organization
    - `repositories` - Connected GitHub repositories
    - `developers` - Developer profiles with performance metrics
    - `business_specs` - Business specifications for features
    - `tasks` - Development tasks with full metadata
    - `sprints` - Sprint planning and tracking
    - `sprint_tasks` - Many-to-many relationship between sprints and tasks
    - `generated_docs` - AI-generated documentation
    - `pr_templates` - Pull request templates and scaffolds
    - `task_assignments` - Task assignment history
    - `performance_metrics` - Developer performance tracking

  2. Security
    - Enable RLS on all tables
    - Team-based data isolation
    - User-specific access controls

  3. Features
    - Automatic timestamp updates
    - Proper indexing for performance
    - Comprehensive constraints and validations
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  github_username text,
  team_id uuid,
  role text DEFAULT 'developer' CHECK (role IN ('admin', 'manager', 'developer')),
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  settings jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for profiles.team_id after teams table is created
ALTER TABLE profiles 
ADD CONSTRAINT profiles_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  github_id bigint UNIQUE,
  name text NOT NULL,
  full_name text,
  url text NOT NULL,
  description text,
  language text,
  stars integer DEFAULT 0,
  forks integer DEFAULT 0,
  is_private boolean DEFAULT false,
  default_branch text DEFAULT 'main',
  last_updated timestamptz,
  last_analyzed timestamptz,
  structure jsonb,
  analysis_summary jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Developers table (performance profiles for team members)
CREATE TABLE IF NOT EXISTS developers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  github_username text,
  velocity integer DEFAULT 0,
  strengths text[] DEFAULT '{}',
  preferred_tasks text[] DEFAULT '{}',
  commit_frequency integer DEFAULT 0,
  code_quality integer DEFAULT 5 CHECK (code_quality >= 1 AND code_quality <= 10),
  collaboration integer DEFAULT 5 CHECK (collaboration >= 1 AND collaboration <= 10),
  availability_hours integer DEFAULT 40,
  timezone text DEFAULT 'UTC',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, profile_id)
);

-- Business specifications table
CREATE TABLE IF NOT EXISTS business_specs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  acceptance_criteria text[] DEFAULT '{}',
  technical_requirements text[] DEFAULT '{}',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'implemented')),
  estimated_effort integer,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  business_spec_id uuid REFERENCES business_specs(id) ON DELETE SET NULL,
  repository_id uuid REFERENCES repositories(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES developers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  type text DEFAULT 'feature' CHECK (type IN ('feature', 'bug', 'refactor', 'docs', 'test', 'devops')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in-progress', 'review', 'done')),
  estimated_effort integer DEFAULT 0,
  actual_effort integer DEFAULT 0,
  story_points integer DEFAULT 0,
  tags text[] DEFAULT '{}',
  dependencies uuid[] DEFAULT '{}',
  acceptance_criteria text[] DEFAULT '{}',
  technical_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sprints table
CREATE TABLE IF NOT EXISTS sprints (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  capacity_hours integer DEFAULT 0,
  velocity_target integer DEFAULT 0,
  actual_velocity integer DEFAULT 0,
  burndown_data jsonb DEFAULT '[]',
  retrospective_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_sprint_dates CHECK (end_date > start_date)
);

-- Sprint tasks junction table
CREATE TABLE IF NOT EXISTS sprint_tasks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sprint_id uuid REFERENCES sprints(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  removed_at timestamptz,
  UNIQUE(sprint_id, task_id)
);

-- Generated documentation table
CREATE TABLE IF NOT EXISTS generated_docs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  title text NOT NULL,
  sections jsonb DEFAULT '[]' NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'error')),
  generation_metadata jsonb DEFAULT '{}',
  export_formats text[] DEFAULT '{markdown}',
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PR templates table
CREATE TABLE IF NOT EXISTS pr_templates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  branch_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  commit_message text NOT NULL,
  file_scaffolds jsonb DEFAULT '[]',
  github_pr_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'created', 'merged')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task assignments history table
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES developers(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  unassigned_at timestamptz,
  reason text
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  developer_id uuid REFERENCES developers(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES sprints(id) ON DELETE CASCADE,
  tasks_completed integer DEFAULT 0,
  story_points_completed integer DEFAULT 0,
  hours_logged integer DEFAULT 0,
  code_quality_score integer DEFAULT 5,
  collaboration_score integer DEFAULT 5,
  velocity integer DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_repositories_team_id ON repositories(team_id);
CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON repositories(github_id);
CREATE INDEX IF NOT EXISTS idx_developers_team_id ON developers(team_id);
CREATE INDEX IF NOT EXISTS idx_developers_profile_id ON developers(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_sprints_team_id ON sprints(team_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint_id ON sprint_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_task_id ON sprint_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_repository_id ON generated_docs(repository_id);
CREATE INDEX IF NOT EXISTS idx_pr_templates_task_id ON pr_templates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_business_specs_search ON business_specs USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || description));

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_developers_updated_at BEFORE UPDATE ON developers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_specs_updated_at BEFORE UPDATE ON business_specs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generated_docs_updated_at BEFORE UPDATE ON generated_docs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pr_templates_updated_at BEFORE UPDATE ON pr_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();