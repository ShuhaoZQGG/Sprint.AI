import { supabase, getCurrentUserTeamId, handleSupabaseError } from './supabase';
import { Developer, DeveloperProfile } from '../types';
import { Database } from '../types/database';

type DeveloperRow = Database['public']['Tables']['developers']['Row'];
type DeveloperInsert = Database['public']['Tables']['developers']['Insert'];
type DeveloperUpdate = Database['public']['Tables']['developers']['Update'];

export class DeveloperService {
  /**
   * Get all developers for the current user's team
   */
  async getDevelopers(): Promise<Developer[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('developers')
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToDeveloper);
    } catch (error) {
      console.error('Error fetching developers:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get a specific developer by ID
   */
  async getDeveloper(id: string): Promise<Developer | null> {
    try {
      const { data, error } = await supabase
        .from('developers')
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToDeveloper(data);
    } catch (error) {
      console.error('Error fetching developer:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get developer by profile ID
   */
  async getDeveloperByProfileId(profileId: string): Promise<Developer | null> {
    try {
      const { data, error } = await supabase
        .from('developers')
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .eq('profile_id', profileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToDeveloper(data);
    } catch (error) {
      console.error('Error fetching developer by profile ID:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Create a new developer profile
   */
  async createDeveloper(developer: Omit<Developer, 'id'>): Promise<Developer> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const developerData: DeveloperInsert = {
        team_id: teamId,
        profile_id: developer.profile?.id || null,
        name: developer.name,
        email: developer.email,
        avatar_url: developer.avatar,
        github_username: null,
        velocity: developer.profile.velocity,
        strengths: developer.profile.strengths,
        preferred_tasks: developer.profile.preferredTasks,
        commit_frequency: developer.profile.commitFrequency,
        code_quality: developer.profile.codeQuality,
        collaboration: developer.profile.collaboration,
        availability_hours: 40,
        timezone: 'UTC',
        is_active: true,
      };

      const { data, error } = await supabase
        .from('developers')
        .insert(developerData)
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToDeveloper(data);
    } catch (error) {
      console.error('Error creating developer:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update an existing developer profile
   */
  async updateDeveloper(id: string, updates: Partial<Developer>): Promise<Developer> {
    try {
      const updateData: DeveloperUpdate = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.email) updateData.email = updates.email;
      if (updates.avatar) updateData.avatar_url = updates.avatar;
      
      if (updates.profile) {
        if (updates.profile.velocity !== undefined) updateData.velocity = updates.profile.velocity;
        if (updates.profile.strengths) updateData.strengths = updates.profile.strengths;
        if (updates.profile.preferredTasks) updateData.preferred_tasks = updates.profile.preferredTasks;
        if (updates.profile.commitFrequency !== undefined) updateData.commit_frequency = updates.profile.commitFrequency;
        if (updates.profile.codeQuality !== undefined) updateData.code_quality = updates.profile.codeQuality;
        if (updates.profile.collaboration !== undefined) updateData.collaboration = updates.profile.collaboration;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('developers')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToDeveloper(data);
    } catch (error) {
      console.error('Error updating developer:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update developer performance metrics
   */
  async updatePerformanceMetrics(
    developerId: string, 
    metrics: {
      velocity?: number;
      codeQuality?: number;
      collaboration?: number;
      commitFrequency?: number;
    }
  ): Promise<Developer> {
    try {
      const updateData: DeveloperUpdate = {};

      if (metrics.velocity !== undefined) updateData.velocity = metrics.velocity;
      if (metrics.codeQuality !== undefined) updateData.code_quality = metrics.codeQuality;
      if (metrics.collaboration !== undefined) updateData.collaboration = metrics.collaboration;
      if (metrics.commitFrequency !== undefined) updateData.commit_frequency = metrics.commitFrequency;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('developers')
        .update(updateData)
        .eq('id', developerId)
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToDeveloper(data);
    } catch (error) {
      console.error('Error updating performance metrics:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update developer skills and strengths
   */
  async updateSkills(
    developerId: string, 
    skills: {
      strengths: string[];
      preferredTasks: string[];
    }
  ): Promise<Developer> {
    try {
      const updateData: DeveloperUpdate = {
        strengths: skills.strengths,
        preferred_tasks: skills.preferredTasks,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('developers')
        .update(updateData)
        .eq('id', developerId)
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToDeveloper(data);
    } catch (error) {
      console.error('Error updating developer skills:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Deactivate a developer (soft delete)
   */
  async deactivateDeveloper(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('developers')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating developer:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get team capacity (total velocity)
   */
  async getTeamCapacity(): Promise<number> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('developers')
        .select('velocity')
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (error) throw error;

      return data.reduce((total, dev) => total + (dev.velocity || 0), 0);
    } catch (error) {
      console.error('Error calculating team capacity:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get developers by skill
   */
  async getDevelopersBySkill(skill: string): Promise<Developer[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('developers')
        .select(`
          *,
          profile:profiles!developers_profile_id_fkey(id, full_name, email, avatar_url, github_username)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .contains('strengths', [skill]);

      if (error) throw error;

      return data.map(this.mapRowToDeveloper);
    } catch (error) {
      console.error('Error fetching developers by skill:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get available developers (not overloaded)
   */
  async getAvailableDevelopers(): Promise<Developer[]> {
    try {
      const developers = await this.getDevelopers();
      
      // For now, return all active developers
      // In the future, this could check current task assignments and capacity
      return developers.filter(dev => dev.profile.velocity > 0);
    } catch (error) {
      console.error('Error fetching available developers:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Record performance metrics for a sprint
   */
  async recordSprintPerformance(
    developerId: string,
    sprintId: string,
    metrics: {
      tasksCompleted: number;
      storyPointsCompleted: number;
      hoursLogged: number;
      codeQualityScore?: number;
      collaborationScore?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          developer_id: developerId,
          sprint_id: sprintId,
          tasks_completed: metrics.tasksCompleted,
          story_points_completed: metrics.storyPointsCompleted,
          hours_logged: metrics.hoursLogged,
          code_quality_score: metrics.codeQualityScore || 5,
          collaboration_score: metrics.collaborationScore || 5,
          velocity: Math.round(metrics.storyPointsCompleted / (metrics.hoursLogged / 8) || 0),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording sprint performance:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get performance history for a developer
   */
  async getPerformanceHistory(developerId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select(`
          *,
          sprint:sprints(id, name, start_date, end_date)
        `)
        .eq('developer_id', developerId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching performance history:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Subscribe to developer changes
   */
  subscribeToDevelopers(callback: (developers: Developer[]) => void) {
    return supabase
      .channel('developers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'developers',
        },
        async () => {
          try {
            const developers = await this.getDevelopers();
            callback(developers);
          } catch (error) {
            console.error('Error in developer subscription:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Map database row to Developer type
   */
  private mapRowToDeveloper(row: any): Developer {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url || '',
      profile: {
        velocity: row.velocity || 0,
        strengths: row.strengths || [],
        preferredTasks: row.preferred_tasks || [],
        commitFrequency: row.commit_frequency || 0,
        codeQuality: row.code_quality || 5,
        collaboration: row.collaboration || 5,
      },
    };
  }
}

export const developerService = new DeveloperService();