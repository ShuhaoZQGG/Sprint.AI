import { supabase, getCurrentUserTeamId, handleSupabaseError } from './supabase';
import { BusinessSpec } from '../types';
import { Database } from '../types/database';

type BusinessSpecRow = Database['public']['Tables']['business_specs']['Row'];
type BusinessSpecInsert = Database['public']['Tables']['business_specs']['Insert'];
type BusinessSpecUpdate = Database['public']['Tables']['business_specs']['Update'];

export class BusinessSpecService {
  /**
   * Get all business specifications for the current user's team
   */
  async getBusinessSpecs(): Promise<BusinessSpec[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('business_specs')
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToBusinessSpec);
    } catch (error) {
      console.error('Error fetching business specs:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get a specific business specification by ID
   */
  async getBusinessSpec(id: string): Promise<BusinessSpec | null> {
    try {
      const { data, error } = await supabase
        .from('business_specs')
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToBusinessSpec(data);
    } catch (error) {
      console.error('Error fetching business spec:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Create a new business specification
   */
  async createBusinessSpec(spec: Omit<BusinessSpec, 'id' | 'lastUpdated'>): Promise<BusinessSpec> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const specData: BusinessSpecInsert = {
        team_id: teamId,
        created_by: user.id,
        title: spec.title,
        description: spec.description,
        acceptance_criteria: spec.acceptanceCriteria.filter(c => c.trim()),
        technical_requirements: spec.technicalRequirements?.filter(r => r.trim()) || [],
        priority: 'medium',
        status: 'draft',
        estimated_effort: null,
        tags: [],
      };

      const { data, error } = await supabase
        .from('business_specs')
        .insert(specData)
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToBusinessSpec(data);
    } catch (error) {
      console.error('Error creating business spec:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update an existing business specification
   */
  async updateBusinessSpec(id: string, updates: Partial<BusinessSpec>): Promise<BusinessSpec> {
    try {
      const updateData: BusinessSpecUpdate = {};

      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.acceptanceCriteria) {
        updateData.acceptance_criteria = updates.acceptanceCriteria.filter(c => c.trim());
      }
      if (updates.technicalRequirements) {
        updateData.technical_requirements = updates.technicalRequirements.filter(r => r.trim());
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('business_specs')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToBusinessSpec(data);
    } catch (error) {
      console.error('Error updating business spec:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Delete a business specification
   */
  async deleteBusinessSpec(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('business_specs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting business spec:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update business spec status
   */
  async updateStatus(id: string, status: 'draft' | 'review' | 'approved' | 'implemented'): Promise<BusinessSpec> {
    try {
      const { data, error } = await supabase
        .from('business_specs')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToBusinessSpec(data);
    } catch (error) {
      console.error('Error updating business spec status:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update business spec priority
   */
  async updatePriority(id: string, priority: 'low' | 'medium' | 'high' | 'critical'): Promise<BusinessSpec> {
    try {
      const { data, error } = await supabase
        .from('business_specs')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToBusinessSpec(data);
    } catch (error) {
      console.error('Error updating business spec priority:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Search business specifications
   */
  async searchBusinessSpecs(query: string): Promise<BusinessSpec[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('business_specs')
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .eq('team_id', teamId)
        .textSearch('title', query)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToBusinessSpec);
    } catch (error) {
      console.error('Error searching business specs:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get business specs by status
   */
  async getBusinessSpecsByStatus(status: 'draft' | 'review' | 'approved' | 'implemented'): Promise<BusinessSpec[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('business_specs')
        .select(`
          *,
          creator:profiles!business_specs_created_by_fkey(id, full_name, email)
        `)
        .eq('team_id', teamId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToBusinessSpec);
    } catch (error) {
      console.error('Error fetching business specs by status:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get business specs that need review
   */
  async getBusinessSpecsNeedingReview(): Promise<BusinessSpec[]> {
    return this.getBusinessSpecsByStatus('review');
  }

  /**
   * Get approved business specs ready for implementation
   */
  async getApprovedBusinessSpecs(): Promise<BusinessSpec[]> {
    return this.getBusinessSpecsByStatus('approved');
  }

  /**
   * Subscribe to business spec changes
   */
  subscribeToBusinessSpecs(callback: (specs: BusinessSpec[]) => void) {
    return supabase
      .channel('business_specs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_specs',
        },
        async () => {
          try {
            const specs = await this.getBusinessSpecs();
            callback(specs);
          } catch (error) {
            console.error('Error in business spec subscription:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Map database row to BusinessSpec type
   */
  private mapRowToBusinessSpec(row: any): BusinessSpec {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      acceptanceCriteria: row.acceptance_criteria || [],
      technicalRequirements: row.technical_requirements || [],
      lastUpdated: new Date(row.updated_at),
      status: row.status,
      priority: row.priority,
      estimatedEffort: row.estimated_effort,
      tags: row.tags || [],
      createdBy: row.creator ? {
        id: row.creator.id,
        name: row.creator.full_name || row.creator.email,
        email: row.creator.email,
      } : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

export const businessSpecService = new BusinessSpecService();