/*
  # Row Level Security (RLS) Policies

  1. Security Setup
    - Enable RLS on all tables
    - Create policies for team-based data isolation
    - User-specific access controls
    - Admin and manager permissions

  2. Policy Types
    - SELECT: Read access based on team membership
    - INSERT: Create access with proper team assignment
    - UPDATE: Modify access for team members and creators
    - DELETE: Delete access for admins and creators
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's team ID
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  	coalesce(
		nullif(current_setting('request.jwt.claim.sub', true), ''),
		(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
	)::uuid
$$;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Teams policies
CREATE POLICY "Team members can read their team" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create teams" ON teams
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team admins can update their team" ON teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Repositories policies
CREATE POLICY "Team members can read team repositories" ON repositories
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert repositories" ON repositories
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can update team repositories" ON repositories
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team admins can delete repositories" ON repositories
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Developers policies
CREATE POLICY "Team members can read team developers" ON developers
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can read own developer profile" ON developers
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update own developer profile" ON developers
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Team admins can manage developers" ON developers
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Business specs policies
CREATE POLICY "Team members can read team business specs" ON business_specs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create business specs" ON business_specs
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Creators and admins can update business specs" ON business_specs
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Creators and admins can delete business specs" ON business_specs
  FOR DELETE USING (
    created_by = auth.uid() OR 
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Tasks policies
CREATE POLICY "Team members can read team tasks" ON tasks
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update tasks" ON tasks
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete tasks" ON tasks
  FOR DELETE USING (
    created_by = auth.uid() OR 
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Sprints policies
CREATE POLICY "Team members can read team sprints" ON sprints
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create sprints" ON sprints
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update sprints" ON sprints
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete sprints" ON sprints
  FOR DELETE USING (
    created_by = auth.uid() OR 
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Sprint tasks policies
CREATE POLICY "Team members can read sprint tasks" ON sprint_tasks
  FOR SELECT USING (
    sprint_id IN (
      SELECT id FROM sprints 
      WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can manage sprint tasks" ON sprint_tasks
  FOR ALL USING (
    sprint_id IN (
      SELECT id FROM sprints 
      WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Generated docs policies
CREATE POLICY "Team members can read team docs" ON generated_docs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create docs" ON generated_docs
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update docs" ON generated_docs
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete docs" ON generated_docs
  FOR DELETE USING (
    created_by = auth.uid() OR 
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- PR templates policies
CREATE POLICY "Team members can read team PR templates" ON pr_templates
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create PR templates" ON pr_templates
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update PR templates" ON pr_templates
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete PR templates" ON pr_templates
  FOR DELETE USING (
    created_by = auth.uid() OR 
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Task assignments policies
CREATE POLICY "Team members can read task assignments" ON task_assignments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create task assignments" ON task_assignments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    ) AND assigned_by = auth.uid()
  );

-- Performance metrics policies
CREATE POLICY "Team members can read team performance metrics" ON performance_metrics
  FOR SELECT USING (
    developer_id IN (
      SELECT id FROM developers 
      WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (
    developer_id IN (
      SELECT id FROM developers 
      WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );