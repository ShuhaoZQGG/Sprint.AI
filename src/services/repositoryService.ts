import { supabase, getCurrentUserTeamId, handleSupabaseError } from './supabase';
import { Repository, CodebaseStructure } from '../types';
import { Database } from '../types/database';
import { RepositoryAnalysis } from '../types/github';

type RepositoryRow = Database['public']['Tables']['repositories']['Row'];
type RepositoryInsert = Database['public']['Tables']['repositories']['Insert'];
type RepositoryUpdate = Database['public']['Tables']['repositories']['Update'];

export class RepositoryService {
  /**
   * Get all repositories for the current user's team
   */
  async getRepositories(userId?: string): Promise<Repository[]> {
    try {
      const teamId = await getCurrentUserTeamId(userId);
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToRepository);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get a specific repository by ID
   */
  async getRepository(id: string): Promise<Repository | null> {
    try {
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToRepository(data);
    } catch (error) {
      console.error('Error fetching repository:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Add a new repository
   */
  async addRepository(repository: Omit<Repository, 'id'>): Promise<Repository> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const repositoryData: RepositoryInsert = {
        team_id: teamId,
        name: repository.name,
        url: repository.url,
        description: repository.description,
        language: repository.language,
        stars: repository.stars,
        forks: 0,
        last_updated: repository.lastUpdated?.toISOString(),
        structure: repository.structure
      };

      const { data, error } = await supabase
        .from('repositories')
        .insert(repositoryData)
        .select()
        .single();

      if (error) throw error;

      return this.mapRowToRepository(data);
    } catch (error) {
      console.error('Error adding repository:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update an existing repository
   */
  async updateRepository(id: string, updates: Partial<Repository>): Promise<Repository> {
    try {
      const updateData: RepositoryUpdate = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.language) updateData.language = updates.language;
      if (updates.stars !== undefined) updateData.stars = updates.stars;
      if (updates.lastUpdated) updateData.last_updated = updates.lastUpdated.toISOString();
      if (updates.structure) updateData.structure = this.serializeStructure(updates.structure);

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('repositories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return this.mapRowToRepository(data);
    } catch (error) {
      console.error('Error updating repository:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Delete a repository
   */
  async deleteRepository(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting repository:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Store repository analysis results
   */
  async storeAnalysis(repositoryId: string, analysis: RepositoryAnalysis): Promise<void> {
    try {
      const analysisData = {
        last_analyzed: new Date().toISOString(),
        analysis_summary: {
          totalFiles: analysis.summary.totalFiles,
          primaryLanguage: analysis.summary.primaryLanguage,
          lastActivity: analysis.summary.lastActivity,
          commitFrequency: analysis.summary.commitFrequency,
          contributors: analysis.contributors.length,
          languages: analysis.languages,
        },
        github_id: analysis.repository.id,
        full_name: analysis.repository.full_name,
        forks: analysis.repository.forks_count,
        is_private: analysis.repository.private || false,
        default_branch: analysis.repository.default_branch,
      };

      const { error } = await supabase
        .from('repositories')
        .update(analysisData)
        .eq('id', repositoryId);

      if (error) throw error;
    } catch (error) {
      console.error('Error storing analysis:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get repositories that need analysis update
   */
  async getRepositoriesNeedingAnalysis(): Promise<Repository[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      // Get repositories that haven't been analyzed in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('team_id', teamId)
        .or(`last_analyzed.is.null,last_analyzed.lt.${oneDayAgo}`)
        .order('last_updated', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToRepository);
    } catch (error) {
      console.error('Error fetching repositories needing analysis:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Subscribe to repository changes
   */
  subscribeToRepositories(userId: string, callback: (repositories: Repository[]) => void) {
    return supabase
      .channel('repositories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repositories',
        },
        async () => {
          // Refetch all repositories when any change occurs
          try {
            const repositories = await this.getRepositories();
            callback(repositories);
          } catch (error) {
            console.error('Error in repository subscription:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Map database row to Repository type
   */
  private mapRowToRepository(row: RepositoryRow): Repository {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      description: row.description || '',
      language: row.language || 'Unknown',
      stars: row.stars,
      lastUpdated: new Date(row.last_updated || row.updated_at),
      structure: row.structure
    };
  }

  /**
   * Serialize codebase structure for database storage
   */
  private serializeStructure(structure: CodebaseStructure): Record<string, any> {
    return {
      modules: structure.modules,
      services: structure.services,
      dependencies: structure.dependencies,
      summary: structure.summary,
    };
  }

  /**
   * Deserialize codebase structure from database
   */
  private deserializeStructure(data: Record<string, any>): CodebaseStructure {
    return {
      modules: data.modules || [],
      services: data.services || [],
      dependencies: data.dependencies || [],
      summary: data.summary || '',
    };
  }
}

export const repositoryService = new RepositoryService();