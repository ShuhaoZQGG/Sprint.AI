/*
  # Row Level Security (RLS) Policies

  1. Security Overview
    - All tables have RLS enabled
    - Users can only access data from their team
    - Admins have broader access within their team
    - Public read access for certain data where appropriate

  2. Policy Structure
    - Team-based data isolation
    - Role-based access control
    - Secure defaults with explicit permissions
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

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Teams policies
CREATE POLICY "Team members can read their team"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team admins can update their team"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Authenticated users can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Repositories policies
CREATE POLICY "Team members can read team repositories"
  ON repositories
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert repositories"
  ON repositories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can update team repositories"
  ON repositories
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team admins can delete repositories"
  ON repositories
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Developers policies
CREATE POLICY "Team members can read team developers"
  ON developers
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can read own developer profile"
  ON developers
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Team admins can manage developers"
  ON developers
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can update own developer profile"
  ON developers
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Business specs policies
CREATE POLICY "Team members can read team business specs"
  ON business_specs
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create business specs"
  ON business_specs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Creators and admins can update business specs"
  ON business_specs
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid()) OR
    (team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ))
  );

CREATE POLICY "Creators and admins can delete business specs"
  ON business_specs
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid()) OR
    (team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ))
  );

-- Tasks policies
CREATE POLICY "Team members can read team tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid()) OR
    (team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ))
  );

-- Sprints policies
CREATE POLICY "Team members can read team sprints"
  ON sprints
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create sprints"
  ON sprints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update sprints"
  ON sprints
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete sprints"
  ON sprints
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid()) OR
    (team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ))
  );

-- Sprint tasks policies
CREATE POLICY "Team members can read sprint tasks"
  ON sprint_tasks
  FOR SELECT
  TO authenticated
  USING (
    sprint_id IN (
      SELECT id FROM sprints WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can manage sprint tasks"
  ON sprint_tasks
  FOR ALL
  TO authenticated
  USING (
    sprint_id IN (
      SELECT id FROM sprints WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Generated docs policies
CREATE POLICY "Team members can read team docs"
  ON generated_docs
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create docs"
  ON generated_docs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update docs"
  ON generated_docs
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete docs"
  ON generated_docs
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid()) OR
    (team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ))
  );

-- PR templates policies
CREATE POLICY "Team members can read team PR templates"
  ON pr_templates
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team members can create PR templates"
  ON pr_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update PR templates"
  ON pr_templates
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Creators and admins can delete PR templates"
  ON pr_templates
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid()) OR
    (team_id IN (
      SELECT team_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ))
  );

-- Task assignments policies
CREATE POLICY "Team members can read task assignments"
  ON task_assignments
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create task assignments"
  ON task_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    ) AND assigned_by = auth.uid()
  );

-- Performance metrics policies
CREATE POLICY "Team members can read team performance metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    developer_id IN (
      SELECT id FROM developers WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert performance metrics"
  ON performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    developer_id IN (
      SELECT id FROM developers WHERE team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
      )
    )
  );