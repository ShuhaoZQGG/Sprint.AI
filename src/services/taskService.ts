import { supabase, getCurrentUserTeamId, handleSupabaseError } from './supabase';
import { Task, TaskType, Priority, TaskStatus } from '../types';
import { Database } from '../types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export class TaskService {
  /**
   * Get all tasks for the current user's team
   */
  async getTasks(): Promise<Task[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_developer:developers(id, name, email, avatar_url),
          repository:repositories(id, name, url),
          business_spec:business_specs(id, title)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_developer:developers(id, name, email, avatar_url),
          repository:repositories(id, name, url),
          business_spec:business_specs(id, title)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToTask(data);
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const taskData: TaskInsert = {
        team_id: teamId,
        created_by: user.id,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: task.status,
        estimated_effort: task.estimatedEffort,
        actual_effort: task.actualEffort || 0,
        story_points: 0,
        tags: [],
        dependencies: [],
        acceptance_criteria: [],
        assigned_to: task.assignee?.id || null,
        repository_id: null, // Will be set when linking to repository
        business_spec_id: null, // Will be set when linking to business spec
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select(`
          *,
          assigned_developer:developers(id, name, email, avatar_url),
          repository:repositories(id, name, url),
          business_spec:business_specs(id, title)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToTask(data);
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const updateData: TaskUpdate = {};

      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.type) updateData.type = updates.type;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.status) updateData.status = updates.status;
      if (updates.estimatedEffort !== undefined) updateData.estimated_effort = updates.estimatedEffort;
      if (updates.actualEffort !== undefined) updateData.actual_effort = updates.actualEffort;
      if (updates.assignee) updateData.assigned_to = updates.assignee.id;
      if (updates.assignee === null) updateData.assigned_to = null;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          assigned_developer:developers(id, name, email, avatar_url),
          repository:repositories(id, name, url),
          business_spec:business_specs(id, title)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToTask(data);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update task status (for drag and drop)
   */
  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.updateTask(id, { status });
  }

  /**
   * Assign task to developer
   */
  async assignTask(taskId: string, developerId: string | null): Promise<Task> {
    try {
      // First update the task
      const task = await this.updateTask(taskId, { 
        assignee: developerId ? { id: developerId } as any : null 
      });

      // Record the assignment in task_assignments table
      if (developerId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('task_assignments')
            .insert({
              task_id: taskId,
              assigned_to: developerId,
              assigned_by: user.id,
              reason: 'Manual assignment',
            });
        }
      }

      return task;
    } catch (error) {
      console.error('Error assigning task:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_developer:developers(id, name, email, avatar_url),
          repository:repositories(id, name, url),
          business_spec:business_specs(id, title)
        `)
        .eq('team_id', teamId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Search tasks
   */
  async searchTasks(query: string): Promise<Task[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_developer:developers(id, name, email, avatar_url),
          repository:repositories(id, name, url),
          business_spec:business_specs(id, title)
        `)
        .eq('team_id', teamId)
        .textSearch('title', query)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToTask);
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Subscribe to task changes
   */
  subscribeToTasks(callback: (tasks: Task[]) => void) {
    return supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        async () => {
          // Refetch all tasks when any change occurs
          try {
            const tasks = await this.getTasks();
            callback(tasks);
          } catch (error) {
            console.error('Error in task subscription:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Map database row to Task type
   */
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type as TaskType,
      priority: row.priority as Priority,
      status: row.status as TaskStatus,
      estimatedEffort: row.estimated_effort,
      actualEffort: row.actual_effort,
      assignee: row.assigned_developer ? {
        id: row.assigned_developer.id,
        name: row.assigned_developer.name,
        email: row.assigned_developer.email,
        avatar: row.assigned_developer.avatar_url || '',
        profile: {
          velocity: 0,
          strengths: [],
          preferredTasks: [],
          commitFrequency: 0,
          codeQuality: 5,
          collaboration: 5,
        },
      } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const taskService = new TaskService();