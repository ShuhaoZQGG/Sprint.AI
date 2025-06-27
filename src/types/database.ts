import { CodebaseStructure } from ".";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          github_username: string | null;
          team_id: string | null;
          role: 'admin' | 'manager' | 'developer';
          preferences: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          github_username?: string | null;
          team_id?: string | null;
          role?: 'admin' | 'manager' | 'developer';
          preferences?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          github_username?: string | null;
          team_id?: string | null;
          role?: 'admin' | 'manager' | 'developer';
          preferences?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          settings: Record<string, any>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          settings?: Record<string, any>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          settings?: Record<string, any>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      repositories: {
        Row: {
          id: string;
          team_id: string;
          github_id: number | null;
          name: string;
          full_name: string | null;
          url: string;
          description: string | null;
          language: string | null;
          stars: number;
          forks: number;
          is_private: boolean;
          default_branch: string;
          last_updated: string | null;
          last_analyzed: string | null;
          structure: CodebaseStructure;
          analysis_summary: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          github_id?: number | null;
          name: string;
          full_name?: string | null;
          url: string;
          description?: string | null;
          language?: string | null;
          stars?: number;
          forks?: number;
          is_private?: boolean;
          default_branch?: string;
          last_updated?: string | null;
          last_analyzed?: string | null;
          structure?: Record<string, any> | null;
          analysis_summary?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          github_id?: number | null;
          name?: string;
          full_name?: string | null;
          url?: string;
          description?: string | null;
          language?: string | null;
          stars?: number;
          forks?: number;
          is_private?: boolean;
          default_branch?: string;
          last_updated?: string | null;
          last_analyzed?: string | null;
          structure?: Record<string, any> | null;
          analysis_summary?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      developers: {
        Row: {
          id: string;
          team_id: string;
          profile_id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          github_username: string | null;
          velocity: number;
          strengths: string[];
          preferred_tasks: string[];
          commit_frequency: number;
          code_quality: number;
          collaboration: number;
          availability_hours: number;
          timezone: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          profile_id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          github_username?: string | null;
          velocity?: number;
          strengths?: string[];
          preferred_tasks?: string[];
          commit_frequency?: number;
          code_quality?: number;
          collaboration?: number;
          availability_hours?: number;
          timezone?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          profile_id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          github_username?: string | null;
          velocity?: number;
          strengths?: string[];
          preferred_tasks?: string[];
          commit_frequency?: number;
          code_quality?: number;
          collaboration?: number;
          availability_hours?: number;
          timezone?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_specs: {
        Row: {
          id: string;
          team_id: string;
          created_by: string | null;
          title: string;
          description: string;
          acceptance_criteria: string[];
          technical_requirements: string[];
          priority: 'low' | 'medium' | 'high' | 'critical';
          status: 'draft' | 'review' | 'approved' | 'implemented';
          estimated_effort: number | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          created_by?: string | null;
          title: string;
          description: string;
          acceptance_criteria?: string[];
          technical_requirements?: string[];
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'draft' | 'review' | 'approved' | 'implemented';
          estimated_effort?: number | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          created_by?: string | null;
          title?: string;
          description?: string;
          acceptance_criteria?: string[];
          technical_requirements?: string[];
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'draft' | 'review' | 'approved' | 'implemented';
          estimated_effort?: number | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          team_id: string;
          business_spec_id: string | null;
          repository_id: string | null;
          created_by: string | null;
          assigned_to: string | null;
          title: string;
          description: string;
          type: 'feature' | 'bug' | 'refactor' | 'docs' | 'test' | 'devops';
          priority: 'low' | 'medium' | 'high' | 'critical';
          status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
          estimated_effort: number;
          actual_effort: number;
          story_points: number;
          tags: string[];
          dependencies: string[];
          acceptance_criteria: string[];
          technical_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          business_spec_id?: string | null;
          repository_id?: string | null;
          created_by?: string | null;
          assigned_to?: string | null;
          title: string;
          description: string;
          type?: 'feature' | 'bug' | 'refactor' | 'docs' | 'test' | 'devops';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
          estimated_effort?: number;
          actual_effort?: number;
          story_points?: number;
          tags?: string[];
          dependencies?: string[];
          acceptance_criteria?: string[];
          technical_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          business_spec_id?: string | null;
          repository_id?: string | null;
          created_by?: string | null;
          assigned_to?: string | null;
          title?: string;
          description?: string;
          type?: 'feature' | 'bug' | 'refactor' | 'docs' | 'test' | 'devops';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
          estimated_effort?: number;
          actual_effort?: number;
          story_points?: number;
          tags?: string[];
          dependencies?: string[];
          acceptance_criteria?: string[];
          technical_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sprints: {
        Row: {
          id: string;
          team_id: string;
          created_by: string | null;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          status: 'planning' | 'active' | 'completed' | 'cancelled';
          capacity_hours: number;
          velocity_target: number;
          actual_velocity: number;
          burndown_data: Record<string, any>[];
          retrospective_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          created_by?: string | null;
          name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          status?: 'planning' | 'active' | 'completed' | 'cancelled';
          capacity_hours?: number;
          velocity_target?: number;
          actual_velocity?: number;
          burndown_data?: Record<string, any>[];
          retrospective_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          created_by?: string | null;
          name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          status?: 'planning' | 'active' | 'completed' | 'cancelled';
          capacity_hours?: number;
          velocity_target?: number;
          actual_velocity?: number;
          burndown_data?: Record<string, any>[];
          retrospective_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sprint_tasks: {
        Row: {
          id: string;
          sprint_id: string;
          task_id: string;
          added_at: string;
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          sprint_id: string;
          task_id: string;
          added_at?: string;
          removed_at?: string | null;
        };
        Update: {
          id?: string;
          sprint_id?: string;
          task_id?: string;
          added_at?: string;
          removed_at?: string | null;
        };
      };
      generated_docs: {
        Row: {
          id: string;
          team_id: string;
          repository_id: string;
          created_by: string | null;
          title: string;
          sections: Record<string, any>[];
          status: 'generating' | 'completed' | 'error';
          generation_metadata: Record<string, any>;
          export_formats: string[];
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          repository_id: string;
          created_by?: string | null;
          title: string;
          sections?: Record<string, any>[];
          status?: 'generating' | 'completed' | 'error';
          generation_metadata?: Record<string, any>;
          export_formats?: string[];
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          repository_id?: string;
          created_by?: string | null;
          title?: string;
          sections?: Record<string, any>[];
          status?: 'generating' | 'completed' | 'error';
          generation_metadata?: Record<string, any>;
          export_formats?: string[];
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      pr_templates: {
        Row: {
          id: string;
          team_id: string;
          task_id: string;
          repository_id: string;
          created_by: string | null;
          branch_name: string;
          title: string;
          description: string;
          commit_message: string;
          file_scaffolds: Record<string, any>[];
          github_pr_url: string | null;
          status: 'draft' | 'created' | 'merged';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          task_id: string;
          repository_id: string;
          created_by?: string | null;
          branch_name: string;
          title: string;
          description: string;
          commit_message: string;
          file_scaffolds?: Record<string, any>[];
          github_pr_url?: string | null;
          status?: 'draft' | 'created' | 'merged';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          task_id?: string;
          repository_id?: string;
          created_by?: string | null;
          branch_name?: string;
          title?: string;
          description?: string;
          commit_message?: string;
          file_scaffolds?: Record<string, any>[];
          github_pr_url?: string | null;
          status?: 'draft' | 'created' | 'merged';
          created_at?: string;
          updated_at?: string;
        };
      };
      task_assignments: {
        Row: {
          id: string;
          task_id: string;
          assigned_to: string;
          assigned_by: string | null;
          assigned_at: string;
          unassigned_at: string | null;
          reason: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          assigned_to: string;
          assigned_by?: string | null;
          assigned_at?: string;
          unassigned_at?: string | null;
          reason?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          assigned_to?: string;
          assigned_by?: string | null;
          assigned_at?: string;
          unassigned_at?: string | null;
          reason?: string | null;
        };
      };
      performance_metrics: {
        Row: {
          id: string;
          developer_id: string;
          sprint_id: string;
          tasks_completed: number;
          story_points_completed: number;
          hours_logged: number;
          code_quality_score: number;
          collaboration_score: number;
          velocity: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          developer_id: string;
          sprint_id: string;
          tasks_completed?: number;
          story_points_completed?: number;
          hours_logged?: number;
          code_quality_score?: number;
          collaboration_score?: number;
          velocity?: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          developer_id?: string;
          sprint_id?: string;
          tasks_completed?: number;
          story_points_completed?: number;
          hours_logged?: number;
          code_quality_score?: number;
          collaboration_score?: number;
          velocity?: number;
          recorded_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}