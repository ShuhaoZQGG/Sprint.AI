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
        repository_id: spec.repositoryId || null,
        acceptance_criteria: spec.acceptanceCriteria.filter(c => c.trim()),
        technical_requirements: spec.technicalRequirements?.filter(r => r.trim()) || [],
        priority: spec.priority || 'medium',
        status: spec.status || 'draft',
        estimated_effort: spec.estimatedEffort || null,
        tags: spec.tags || [],
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
      throw new Error(handleSupabaseError(error).message);
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
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.status) updateData.status = updates.status;
      if (updates.estimatedEffort !== undefined) updateData.estimated_effort = updates.estimatedEffort;
      if (updates.tags) updateData.tags = updates.tags;

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
   * Generate business spec from documentation changes
   */
  async generateFromDocumentationChanges(
    title: string,
    oldContent: string,
    newContent: string,
    sectionTitle: string
  ): Promise<BusinessSpec> {
    try {
      // This would typically use AI to analyze the changes
      // For now, we'll create a basic spec from the changes
      const spec: Omit<BusinessSpec, 'id' | 'lastUpdated'> = {
        title: `Documentation Update: ${sectionTitle}`,
        description: `Business specification generated from documentation changes in ${sectionTitle}.\n\nChanges detected in documentation require implementation.`,
        acceptanceCriteria: [
          'Implement changes as described in updated documentation',
          'Ensure backward compatibility where possible',
          'Update related documentation and tests',
        ],
        technicalRequirements: [
          'Review documentation changes for technical implications',
          'Identify affected code modules and components',
          'Plan implementation approach',
        ],
        status: 'draft',
        priority: 'medium',
        tags: ['auto-generated', 'documentation', 'update'],
        createdAt: new Date(),
      };

      return this.createBusinessSpec(spec);
    } catch (error) {
      console.error('Error generating business spec from documentation:', error);
      throw error;
    }
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
      repositoryId: row.repository_id || null,
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