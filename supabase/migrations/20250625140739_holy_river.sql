/*
  # Development Seed Data

  This file contains sample data for development and testing.
  Run this after setting up the initial schema.
*/

-- Insert sample team (you'll need to replace the UUIDs with actual user IDs from auth.users)
INSERT INTO teams (id, name, description, created_by) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Sprint.AI Development Team', 'Core development team for Sprint.AI platform', null)
ON CONFLICT (id) DO NOTHING;

-- Insert sample repositories
INSERT INTO repositories (id, team_id, name, url, description, language, stars, forks, last_updated) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'sprint-ai', 'https://github.com/example/sprint-ai', 'AI-native development platform', 'TypeScript', 128, 15, now()),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'api-gateway', 'https://github.com/example/api-gateway', 'Microservices API gateway', 'Python', 45, 8, now()),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'mobile-app', 'https://github.com/example/mobile-app', 'React Native mobile application', 'JavaScript', 89, 12, now())
ON CONFLICT (id) DO NOTHING;

-- Insert sample developers (these will need to be linked to actual user profiles)
INSERT INTO developers (id, team_id, profile_id, name, email, avatar_url, velocity, strengths, preferred_tasks, commit_frequency, code_quality, collaboration) VALUES 
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 'Alex Chen', 'alex@company.com', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150', 8, ARRAY['Frontend', 'React', 'TypeScript'], ARRAY['feature', 'bug'], 12, 9, 8),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'Sarah Johnson', 'sarah@company.com', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150', 10, ARRAY['Backend', 'Python', 'DevOps'], ARRAY['feature', 'devops'], 15, 9, 9),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440012', 'Mike Rodriguez', 'mike@company.com', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?w=150', 6, ARRAY['Testing', 'QA', 'Documentation'], ARRAY['test', 'docs', 'bug'], 8, 8, 10)
ON CONFLICT (id) DO NOTHING;

-- Insert sample business specifications
INSERT INTO business_specs (id, team_id, title, description, acceptance_criteria, priority, status) VALUES 
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'AI-Powered Code Documentation', 'Automatically generate and maintain living documentation from codebase analysis', ARRAY['Parse GitHub repository structure', 'Generate comprehensive documentation using AI', 'Auto-update docs on PR merges', 'Support multiple programming languages'], 'high', 'approved'),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'Real-time Collaboration Features', 'Enable real-time collaboration for task management and documentation editing', ARRAY['Live task updates across users', 'Real-time document editing', 'Presence indicators', 'Conflict resolution'], 'medium', 'draft'),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'Advanced Sprint Analytics', 'Comprehensive sprint analytics with burndown charts and velocity tracking', ARRAY['Burndown chart visualization', 'Velocity trend analysis', 'Team performance metrics', 'Predictive sprint planning'], 'medium', 'review')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (id, team_id, business_spec_id, repository_id, title, description, type, priority, status, estimated_effort, story_points) VALUES 
  ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 'Implement AI Overlay Command Palette', 'Create the Ctrl+. overlay for contextual AI assistance', 'feature', 'high', 'in-progress', 16, 8),
  ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', null, '550e8400-e29b-41d4-a716-446655440001', 'Fix sprint planning auto-assignment', 'Tasks are not being assigned based on developer velocity', 'bug', 'medium', 'todo', 4, 2),
  ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 'Add GitHub API integration', 'Connect to GitHub API for repository analysis', 'feature', 'high', 'review', 20, 13),
  ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'Implement real-time task updates', 'Add WebSocket support for live task status updates', 'feature', 'medium', 'backlog', 12, 5),
  ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440001', 'Create burndown chart component', 'Build interactive burndown chart for sprint tracking', 'feature', 'medium', 'backlog', 8, 3)
ON CONFLICT (id) DO NOTHING;

-- Insert sample sprint
INSERT INTO sprints (id, team_id, name, description, start_date, end_date, status, capacity_hours, velocity_target) VALUES 
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', 'Sprint 1 - Core Foundation', 'Initial sprint focusing on core platform features', '2024-01-15'::timestamptz, '2024-01-29'::timestamptz, 'active', 120, 25)
ON CONFLICT (id) DO NOTHING;

-- Link tasks to sprint
INSERT INTO sprint_tasks (sprint_id, task_id) VALUES 
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440030'),
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440031'),
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440032')
ON CONFLICT (sprint_id, task_id) DO NOTHING;

-- Insert sample generated documentation
INSERT INTO generated_docs (id, team_id, repository_id, title, sections, status, version) VALUES 
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Sprint.AI Platform Documentation', 
   '[
     {
       "id": "overview",
       "title": "Project Overview",
       "type": "overview",
       "content": "Sprint.AI is an AI-native development platform...",
       "wordCount": 250,
       "lastGenerated": "2024-01-15T10:00:00Z"
     },
     {
       "id": "api",
       "title": "API Documentation",
       "type": "api",
       "content": "## API Endpoints\n\n### Authentication\n...",
       "wordCount": 450,
       "lastGenerated": "2024-01-15T10:00:00Z"
     }
   ]'::jsonb, 
   'completed', 1)
ON CONFLICT (id) DO NOTHING;

-- Note: This seed data uses placeholder UUIDs. In a real setup, you would:
-- 1. Create actual user accounts through Supabase Auth
-- 2. Update the profile_id references in developers table
-- 3. Update created_by references to actual user IDs
-- 4. Ensure team_id references are consistent across all tables