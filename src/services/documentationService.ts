import { supabase, getCurrentUserTeamId, handleSupabaseError } from './supabase';
import { GeneratedDocumentation } from './docGenerator';
import { DocumentationSection } from './groq';
import { Database } from '../types/database';

type GeneratedDocRow = Database['public']['Tables']['generated_docs']['Row'];
type GeneratedDocInsert = Database['public']['Tables']['generated_docs']['Insert'];
type GeneratedDocUpdate = Database['public']['Tables']['generated_docs']['Update'];

export interface DocumentationVersion {
  id: string;
  version: number;
  title: string;
  sections: DocumentationSection[];
  createdAt: Date;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  changeLog?: string;
}

export interface DocumentationSearchResult {
  id: string;
  title: string;
  repositoryName: string;
  lastUpdated: Date;
  version: number;
  excerpt: string;
}

export class DocumentationService {
  /**
   * Get all documentation for the current user's team
   */
  async getDocumentation(): Promise<GeneratedDocumentation[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('generated_docs')
        .select(`
          *,
          repository:repositories(id, name, url),
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .eq('team_id', teamId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToDocumentation);
    } catch (error) {
      console.error('Error fetching documentation:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get documentation by repository ID
   */
  async getDocumentationByRepository(repositoryId: string): Promise<GeneratedDocumentation[]> {
    try {
      const { data, error } = await supabase
        .from('generated_docs')
        .select(`
          *,
          repository:repositories(id, name, url),
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .eq('repository_id', repositoryId)
        .order('version', { ascending: false });

      if (error) throw error;

      return data.map(this.mapRowToDocumentation);
    } catch (error) {
      console.error('Error fetching documentation by repository:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get specific documentation by ID
   */
  async getDocumentationById(id: string): Promise<GeneratedDocumentation | null> {
    try {
      const { data, error } = await supabase
        .from('generated_docs')
        .select(`
          *,
          repository:repositories(id, name, url),
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToDocumentation(data);
    } catch (error) {
      console.error('Error fetching documentation:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Store new documentation
   */
  async storeDocumentation(
    repositoryId: string,
    documentation: Omit<GeneratedDocumentation, 'id'>
  ): Promise<GeneratedDocumentation> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get the latest version for this repository
      const latestVersion = await this.getLatestVersion(repositoryId);

      const docData: GeneratedDocInsert = {
        team_id: teamId,
        repository_id: repositoryId,
        created_by: user.id,
        title: documentation.repositoryId, // Use repository name as title
        sections: documentation.sections.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          type: section.type,
          wordCount: section.wordCount,
          lastGenerated: section.lastGenerated.toISOString(),
        })),
        status: documentation.status,
        generation_metadata: {
          generatedAt: documentation.generatedAt.toISOString(),
          lastUpdated: documentation.lastUpdated.toISOString(),
          error: documentation.error,
        },
        export_formats: ['markdown', 'html', 'json'],
        version: latestVersion + 1,
      };

      const { data, error } = await supabase
        .from('generated_docs')
        .insert(docData)
        .select(`
          *,
          repository:repositories(id, name, url),
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToDocumentation(data);
    } catch (error) {
      console.error('Error storing documentation:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update existing documentation
   */
  async updateDocumentation(
    id: string,
    updates: Partial<GeneratedDocumentation>
  ): Promise<GeneratedDocumentation> {
    try {
      const updateData: GeneratedDocUpdate = {};

      if (updates.sections) {
        updateData.sections = updates.sections.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          type: section.type,
          wordCount: section.wordCount,
          lastGenerated: section.lastGenerated.toISOString(),
        }));
      }

      if (updates.status) updateData.status = updates.status;

      if (updates.generatedAt || updates.lastUpdated || updates.error) {
        updateData.generation_metadata = {
          generatedAt: updates.generatedAt?.toISOString(),
          lastUpdated: updates.lastUpdated?.toISOString(),
          error: updates.error,
        };
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('generated_docs')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          repository:repositories(id, name, url),
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToDocumentation(data);
    } catch (error) {
      console.error('Error updating documentation:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Delete documentation
   */
  async deleteDocumentation(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('generated_docs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting documentation:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get version history for a repository
   */
  async getVersionHistory(repositoryId: string): Promise<DocumentationVersion[]> {
    try {
      const { data, error } = await supabase
        .from('generated_docs')
        .select(`
          *,
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .eq('repository_id', repositoryId)
        .order('version', { ascending: false });

      if (error) throw error;

      return data.map(row => ({
        id: row.id,
        version: row.version,
        title: row.title,
        sections: this.deserializeSections(row.sections),
        createdAt: new Date(row.created_at),
        createdBy: row.creator ? {
          id: row.creator.id,
          name: row.creator.full_name || row.creator.email,
          email: row.creator.email,
        } : undefined,
        changeLog: row.generation_metadata?.changeLog,
      }));
    } catch (error) {
      console.error('Error fetching version history:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Search documentation
   */
  async searchDocumentation(query: string): Promise<DocumentationSearchResult[]> {
    try {
      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const { data, error } = await supabase
        .from('generated_docs')
        .select(`
          id,
          title,
          version,
          updated_at,
          sections,
          repository:repositories(name)
        `)
        .eq('team_id', teamId)
        .textSearch('title', query)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data.map(row => ({
        id: row.id,
        title: row.title,
        repositoryName: row.repository?.name || 'Unknown',
        lastUpdated: new Date(row.updated_at),
        version: row.version,
        excerpt: this.generateExcerpt(row.sections, query),
      }));
    } catch (error) {
      console.error('Error searching documentation:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get latest documentation for a repository
   */
  async getLatestDocumentation(repositoryId: string): Promise<GeneratedDocumentation | null> {
    try {
      const { data, error } = await supabase
        .from('generated_docs')
        .select(`
          *,
          repository:repositories(id, name, url),
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .eq('repository_id', repositoryId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapRowToDocumentation(data);
    } catch (error) {
      console.error('Error fetching latest documentation:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Create new version from existing documentation
   */
  async createNewVersion(
    originalId: string,
    changes: Partial<GeneratedDocumentation>,
    changeLog?: string
  ): Promise<GeneratedDocumentation> {
    try {
      const original = await this.getDocumentationById(originalId);
      if (!original) {
        throw new Error('Original documentation not found');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const teamId = await getCurrentUserTeamId();
      if (!teamId) {
        throw new Error('No team access');
      }

      const latestVersion = await this.getLatestVersion(original.repositoryId);

      const newDocData: GeneratedDocInsert = {
        team_id: teamId,
        repository_id: original.repositoryId,
        created_by: user.id,
        title: changes.repositoryId || original.repositoryId,
        sections: (changes.sections || original.sections).map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          type: section.type,
          wordCount: section.wordCount,
          lastGenerated: section.lastGenerated.toISOString(),
        })),
        status: changes.status || original.status,
        generation_metadata: {
          generatedAt: (changes.generatedAt || original.generatedAt).toISOString(),
          lastUpdated: new Date().toISOString(),
          error: changes.error || original.error,
          changeLog,
        },
        export_formats: ['markdown', 'html', 'json'],
        version: latestVersion + 1,
      };

      const { data, error } = await supabase
        .from('generated_docs')
        .insert(newDocData)
        .select(`
          *,
          repository:repositories(id, name, url),
          creator:profiles!generated_docs_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return this.mapRowToDocumentation(data);
    } catch (error) {
      console.error('Error creating new version:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Subscribe to documentation changes
   */
  subscribeToDocumentation(callback: (docs: GeneratedDocumentation[]) => void) {
    return supabase
      .channel('documentation_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_docs',
        },
        async () => {
          try {
            const docs = await this.getDocumentation();
            callback(docs);
          } catch (error) {
            console.error('Error in documentation subscription:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Get latest version number for a repository
   */
  private async getLatestVersion(repositoryId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('generated_docs')
        .select('version')
        .eq('repository_id', repositoryId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data?.version || 0;
    } catch (error) {
      console.error('Error getting latest version:', error);
      return 0;
    }
  }

  /**
   * Generate excerpt from sections for search results
   */
  private generateExcerpt(sections: any[], query: string): string {
    if (!sections || sections.length === 0) return '';

    // Find the first section that contains the query
    const matchingSection = sections.find(section => 
      section.content?.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingSection) {
      const content = matchingSection.content;
      const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(content.length, queryIndex + query.length + 50);
      return content.substring(start, end) + (end < content.length ? '...' : '');
    }

    // Fallback to first section content
    const firstSection = sections[0];
    return firstSection?.content?.substring(0, 150) + '...' || '';
  }

  /**
   * Deserialize sections from database format
   */
  private deserializeSections(sections: any[]): DocumentationSection[] {
    if (!sections || !Array.isArray(sections)) return [];

    return sections.map(section => ({
      id: section.id,
      title: section.title,
      content: section.content,
      type: section.type,
      wordCount: section.wordCount,
      lastGenerated: new Date(section.lastGenerated),
    }));
  }

  /**
   * Map database row to GeneratedDocumentation type
   */
  private mapRowToDocumentation(row: any): GeneratedDocumentation {
    const metadata = row.generation_metadata || {};
    
    return {
      id: row.id,
      repositoryId: row.repository_id,
      sections: this.deserializeSections(row.sections),
      generatedAt: new Date(metadata.generatedAt || row.created_at),
      lastUpdated: new Date(metadata.lastUpdated || row.updated_at),
      status: row.status,
      error: metadata.error,
    };
  }
}

export const documentationService = new DocumentationService();