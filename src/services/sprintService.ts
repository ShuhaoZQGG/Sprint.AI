import { supabase, getCurrentUserTeamId, handleSupabaseError } from './supabase';
import { Sprint, Task } from '../types';
import { Database } from '../types/database';

type SprintRow = Database['public']['Tables']['sprints']['Row'];
type SprintInsert = Database['public']['Tables']['sprints']['Insert'];
type SprintUpdate = Database['public']['Tables']['sprints']['Update'];

export class SprintService {
  /**
   * Get all sprints for the current user's team
   */
  async getSprints(): Promise<Sprint[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_tasks(
            task_id,
            added_at,
            removed_at,
            task:tasks(*)
          )
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToSprint);
    } catch (error) {
      console.error('Error fetching sprints:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get a specific sprint by ID
   */
  async getSprint(id: string): Promise<Sprint | null> {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_tasks(
            task_id,
            added_at,
            removed_at,
            task:tasks(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToSprint(data);
    } catch (error) {
      console.error('Error fetching sprint:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Create a new sprint
   */
  async createSprint(sprint: Omit<Sprint, 'id' | 'tasks' | 'burndown'>): Promise<Sprint> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const sprintData: SprintInsert = {
        team_id: teamId,
        created_by: user.id,
        name: sprint.name,
        start_date: sprint.startDate.toISOString(),
        end_date: sprint.endDate.toISOString(),
        status: sprint.status,
        capacity_hours: sprint.capacity,
        velocity_target: 0,
        actual_velocity: 0,
        burndown_data: [],
      };

      const { data, error } = await supabase
        .from('sprints')
        .insert(sprintData)
        .select(`
          *,
          sprint_tasks(
            task_id,
            added_at,
            removed_at,
            task:tasks(*)
          )
        `)
        .single();

      if (error) throw error;

      return this.mapRowToSprint(data);
    } catch (error) {
      console.error('Error creating sprint:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update an existing sprint
   */
  async updateSprint(id: string, updates: Partial<Sprint>): Promise<Sprint> {
    try {
      const updateData: SprintUpdate = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.startDate) updateData.start_date = updates.startDate.toISOString();
      if (updates.endDate) updateData.end_date = updates.endDate.toISOString();
      if (updates.status) updateData.status = updates.status;
      if (updates.capacity !== undefined) updateData.capacity_hours = updates.capacity;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('sprints')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          sprint_tasks(
            task_id,
            added_at,
            removed_at,
            task:tasks(*)
          )
        `)
        .single();

      if (error) throw error;

      return this.mapRowToSprint(data);
    } catch (error) {
      console.error('Error updating sprint:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Delete a sprint
   */
  async deleteSprint(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting sprint:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Add task to sprint
   */
  async addTaskToSprint(sprintId: string, taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sprint_tasks')
        .insert({
          sprint_id: sprintId,
          task_id: taskId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding task to sprint:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Remove task from sprint
   */
  async removeTaskFromSprint(sprintId: string, taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sprint_tasks')
        .update({ removed_at: new Date().toISOString() })
        .eq('sprint_id', sprintId)
        .eq('task_id', taskId)
        .is('removed_at', null);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing task from sprint:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get active sprint
   */
  async getActiveSprint(): Promise<Sprint | null> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_tasks(
            task_id,
            added_at,
            removed_at,
            task:tasks(*)
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToSprint(data);
    } catch (error) {
      console.error('Error fetching active sprint:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Subscribe to sprint changes
   */
  subscribeToSprints(callback: (sprints: Sprint[]) => void) {
    return supabase
      .channel('sprints_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sprints',
        },
        async () => {
          try {
            const sprints = await this.getSprints();
            callback(sprints);
          } catch (error) {
            console.error('Error in sprint subscription:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Map database row to Sprint type
   */
  private mapRowToSprint(row: any): Sprint {
    const activeTasks = row.sprint_tasks
      ?.filter((st: any) => !st.removed_at)
      ?.map((st: any) => ({
        id: st.task.id,
        title: st.task.title,
        description: st.task.description,
        type: st.task.type,
        priority: st.task.priority,
        status: st.task.status,
        estimatedEffort: st.task.estimated_effort,
        actualEffort: st.task.actual_effort,
        createdAt: new Date(st.task.created_at),
        updatedAt: new Date(st.task.updated_at),
      })) || [];

    return {
      id: row.id,
      name: row.name,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      status: row.status,
      tasks: activeTasks,
      capacity: row.capacity_hours,
      burndown: row.burndown_data || [],
    };
  }
}

export const sprintService = new SprintService();