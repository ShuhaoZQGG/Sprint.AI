/*
  # Sample Data for Sprint.AI Platform

  1. Sample Data
    - Sample team and user profiles
    - Connected repositories
    - Business specifications
    - Tasks and sprints
    - Generated documentation
    - Performance metrics

  2. Notes
    - Uses placeholder UUIDs for consistency
    - Creates profiles first to satisfy foreign key constraints
    - All data is linked properly through foreign keys
    - Includes realistic sample content for testing
*/

-- First, we need to create auth users (this would normally be done through Supabase Auth)
-- For development, we'll create placeholder profiles that can be linked to real auth users later

-- Insert sample team first
INSERT INTO teams (id, name, description, created_by) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Sprint.AI Development Team', 'Core development team for Sprint.AI platform', null)
ON CONFLICT (id) DO NOTHING;

-- Insert sample profiles (these represent the auth.users entries)
-- Note: In production, these would be created automatically when users sign up
INSERT INTO profiles (id, email, full_name, avatar_url, github_username, team_id, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440010', 'alex@company.com', 'Alex Chen', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150', 'alexchen', '550e8400-e29b-41d4-a716-446655440000', 'developer'),
  ('550e8400-e29b-41d4-a716-446655440011', 'sarah@company.com', 'Sarah Johnson', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150', 'sarahjohnson', '550e8400-e29b-41d4-a716-446655440000', 'manager'),
  ('550e8400-e29b-41d4-a716-446655440012', 'mike@company.com', 'Mike Rodriguez', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?w=150', 'mikerodriguez', '550e8400-e29b-41d4-a716-446655440000', 'developer')
ON CONFLICT (id) DO NOTHING;

-- Update team created_by to point to Sarah (manager)
UPDATE teams 
SET created_by = '550e8400-e29b-41d4-a716-446655440011' 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert sample repositories
INSERT INTO repositories (id, team_id, name, url, description, language, stars, forks, last_updated) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'sprint-ai', 'https://github.com/example/sprint-ai', 'AI-native development platform', 'TypeScript', 128, 15, now()),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'api-gateway', 'https://github.com/example/api-gateway', 'Microservices API gateway', 'Python', 45, 8, now()),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'mobile-app', 'https://github.com/example/mobile-app', 'React Native mobile application', 'JavaScript', 89, 12, now())
ON CONFLICT (id) DO NOTHING;

-- Insert sample developers (now that profiles exist)
INSERT INTO developers (id, team_id, profile_id, name, email, avatar_url, velocity, strengths, preferred_tasks, commit_frequency, code_quality, collaboration) VALUES 
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 'Alex Chen', 'alex@company.com', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150', 8, ARRAY['Frontend', 'React', 'TypeScript'], ARRAY['feature', 'bug'], 12, 9, 8),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'Sarah Johnson', 'sarah@company.com', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150', 10, ARRAY['Backend', 'Python', 'DevOps'], ARRAY['feature', 'devops'], 15, 9, 9),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440012', 'Mike Rodriguez', 'mike@company.com', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?w=150', 6, ARRAY['Testing', 'QA', 'Documentation'], ARRAY['test', 'docs', 'bug'], 8, 8, 10)
ON CONFLICT (id) DO NOTHING;

-- Insert sample business specifications
INSERT INTO business_specs (id, team_id, created_by, title, description, acceptance_criteria, priority, status) VALUES 
  ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'AI-Powered Code Documentation', 'Automatically generate and maintain living documentation from codebase analysis', ARRAY['Parse GitHub repository structure', 'Generate comprehensive documentation using AI', 'Auto-update docs on PR merges', 'Support multiple programming languages'], 'high', 'approved'),
  ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'Real-time Collaboration Features', 'Enable real-time collaboration for task management and documentation editing', ARRAY['Live task updates across users', 'Real-time document editing', 'Presence indicators', 'Conflict resolution'], 'medium', 'draft'),
  ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 'Advanced Sprint Analytics', 'Comprehensive sprint analytics with burndown charts and velocity tracking', ARRAY['Burndown chart visualization', 'Velocity trend analysis', 'Team performance metrics', 'Predictive sprint planning'], 'medium', 'review')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (id, team_id, business_spec_id, repository_id, created_by, assigned_to, title, description, type, priority, status, estimated_effort, story_points) VALUES 
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440020', 'Implement AI Overlay Command Palette', 'Create the Ctrl+. overlay for contextual AI assistance', 'feature', 'high', 'in-progress', 16, 8),
  ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', null, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'Fix sprint planning auto-assignment', 'Tasks are not being assigned based on developer velocity', 'bug', 'medium', 'todo', 4, 2),
  ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440020', 'Add GitHub API integration', 'Connect to GitHub API for repository analysis', 'feature', 'high', 'review', 20, 13),
  ('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440011', null, 'Implement real-time task updates', 'Add WebSocket support for live task status updates', 'feature', 'medium', 'backlog', 12, 5),
  ('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440022', 'Create burndown chart component', 'Build interactive burndown chart for sprint tracking', 'feature', 'medium', 'backlog', 8, 3)
ON CONFLICT (id) DO NOTHING;

-- Insert sample sprint
INSERT INTO sprints (id, team_id, created_by, name, description, start_date, end_date, status, capacity_hours, velocity_target) VALUES 
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'Sprint 1 - Core Foundation', 'Initial sprint focusing on core platform features', '2024-01-15'::timestamptz, '2024-01-29'::timestamptz, 'active', 120, 25)
ON CONFLICT (id) DO NOTHING;

-- Link tasks to sprint
INSERT INTO sprint_tasks (sprint_id, task_id) VALUES 
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440040'),
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440041'),
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440042')
ON CONFLICT (sprint_id, task_id) DO NOTHING;

-- Insert sample generated documentation
INSERT INTO generated_docs (id, team_id, repository_id, created_by, title, sections, status, version) VALUES 
  ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'Sprint.AI Platform Documentation', 
   '[
     {
       "id": "overview",
       "title": "Project Overview",
       "type": "overview",
       "content": "Sprint.AI is an AI-native development platform that serves as a comprehensive replacement for Confluence, Jira, and GitHub PR automation. The platform streamlines planning, documentation, and code execution by combining codebase intelligence, AI-generated documentation, developer profiling, and autonomous sprint planning.",
       "wordCount": 250,
       "lastGenerated": "2024-01-15T10:00:00Z"
     },
     {
       "id": "api",
       "title": "API Documentation",
       "type": "api",
       "content": "## API Endpoints\n\n### Authentication\nAll API endpoints require authentication using JWT tokens.\n\n### Repositories\n- GET /api/repositories - List all repositories\n- POST /api/repositories - Connect new repository\n- GET /api/repositories/:id/analysis - Get repository analysis\n\n### Tasks\n- GET /api/tasks - List tasks with filtering\n- POST /api/tasks - Create new task\n- PUT /api/tasks/:id - Update task\n- DELETE /api/tasks/:id - Delete task",
       "wordCount": 450,
       "lastGenerated": "2024-01-15T10:00:00Z"
     }
   ]'::jsonb, 
   'completed', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert sample PR template
INSERT INTO pr_templates (id, team_id, task_id, repository_id, created_by, branch_name, title, description, commit_message, file_scaffolds, status) VALUES 
  ('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', 'feature/ai-overlay-command-palette', 'feat: implement AI overlay command palette', '## Summary\nImplements the Ctrl+. overlay for contextual AI assistance\n\n## Changes\n- Added AIOverlay component with keyboard shortcuts\n- Implemented natural language processing\n- Added contextual action suggestions\n\n## Testing\n- [ ] Manual testing completed\n- [ ] Unit tests added\n- [ ] Integration tests passing', 'feat: implement AI overlay command palette with contextual assistance', 
   '[
     {
       "path": "src/components/overlay/AIOverlay.tsx",
       "content": "import React from ''react'';\n\n// TODO: Implement AI overlay component\nexport const AIOverlay: React.FC = () => {\n  // TODO: Add keyboard shortcut handling\n  // TODO: Implement natural language processing\n  // TODO: Add contextual suggestions\n  \n  return (\n    <div>\n      {/* TODO: Implement overlay UI */}\n    </div>\n  );\n};",
       "todos": ["Add keyboard shortcut handling", "Implement natural language processing", "Add contextual suggestions", "Implement overlay UI"]
     }
   ]'::jsonb, 
   'draft')
ON CONFLICT (id) DO NOTHING;

-- Insert sample task assignments
INSERT INTO task_assignments (task_id, assigned_to, assigned_by, reason) VALUES 
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440011', 'Alex has strong frontend and React skills, perfect for UI component development'),
  ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'Sarah has backend expertise needed for sprint planning logic'),
  ('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440010', 'Mike''s testing background is ideal for chart component development')
ON CONFLICT DO NOTHING;

-- Insert sample performance metrics
INSERT INTO performance_metrics (developer_id, sprint_id, tasks_completed, story_points_completed, hours_logged, code_quality_score, collaboration_score, velocity) VALUES 
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440050', 3, 12, 32, 9, 8, 8),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440050', 4, 18, 38, 9, 9, 10),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440050', 2, 8, 28, 8, 10, 6)
ON CONFLICT DO NOTHING;

-- Note: This seed data creates a complete development environment with:
-- - A sample team with 3 developers (Alex, Sarah, Mike)
-- - 3 connected repositories (sprint-ai, api-gateway, mobile-app)
-- - 3 business specifications with different statuses
-- - 5 tasks with various types and assignments
-- - 1 active sprint with linked tasks
-- - Generated documentation for the main repository
-- - PR template with file scaffolds
-- - Task assignment history with reasoning
-- - Performance metrics for all developers