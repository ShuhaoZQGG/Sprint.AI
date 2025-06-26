import { useState, useEffect } from 'react';
import { Repository } from '../types';
import { repositoryService } from '../services/repositoryService';
import { useAuth } from '../components/auth/AuthProvider';
import { RepositoryAnalysis } from '../types/github';
import toast from 'react-hot-toast';

export const useRepositories = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  useEffect(() => {
    // Reset state when user changes
    if (!user || !session) {
      setRepositories([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRepositories = async () => {
      try {
        console.log('📁 Fetching repositories for user:', user.email);
        setLoading(true);
        setError(null);
        
        const data = await repositoryService.getRepositories();
        console.log('✅ Repositories fetched:', data.length);
        setRepositories(data);
      } catch (err) {
        console.error('❌ Error fetching repositories:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories';
        setError(errorMessage);
        
        // Don't show toast for auth-related errors
        if (!errorMessage.includes('JWT') && !errorMessage.includes('session')) {
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure auth is fully initialized
    const timeoutId = setTimeout(fetchRepositories, 100);
    
    return () => clearTimeout(timeoutId);
  }, [user, session]);

  const addRepository = async (repo: Omit<Repository, 'id'>) => {
    try {
      console.log('➕ Adding repository:', repo.name);
      const newRepo = await repositoryService.createRepository(repo);
      setRepositories(prev => [newRepo, ...prev]);
      toast.success(`Repository "${repo.name}" added successfully!`);
      return newRepo;
    } catch (err) {
      console.error('❌ Error adding repository:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateRepository = async (id: string, updates: Partial<Repository>) => {
    try {
      console.log('📝 Updating repository:', id);
      const updatedRepo = await repositoryService.updateRepository(id, updates);
      setRepositories(prev => 
        prev.map(repo => repo.id === id ? updatedRepo : repo)
      );
      toast.success('Repository updated successfully!');
      return updatedRepo;
    } catch (err) {
      console.error('❌ Error updating repository:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteRepository = async (id: string) => {
    try {
      console.log('🗑️ Deleting repository:', id);
      await repositoryService.deleteRepository(id);
      setRepositories(prev => prev.filter(repo => repo.id !== id));
      toast.success('Repository deleted successfully!');
    } catch (err) {
      console.error('❌ Error deleting repository:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const storeAnalysis = async (repositoryId: string, analysis: RepositoryAnalysis) => {
    try {
      console.log('💾 Storing analysis for repository:', repositoryId);
      await repositoryService.storeAnalysis(repositoryId, analysis);
      
      // Update the repository with analysis data
      setRepositories(prev => 
        prev.map(repo => 
          repo.id === repositoryId 
            ? { 
                ...repo, 
                lastAnalyzed: new Date(),
                structure: analysis.structure ? {
                  modules: analysis.structure.map(item => ({ name: item.name, type: item.type })),
                  services: [],
                  dependencies: Object.keys(analysis.languages || {}),
                  summary: analysis.summary?.primaryLanguage || 'Unknown'
                } : undefined
              }
            : repo
        )
      );
      
      console.log('✅ Analysis stored successfully');
    } catch (err) {
      console.error('❌ Error storing analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to store analysis';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getAnalysis = async (repositoryId: string) => {
    try {
      console.log('📊 Getting analysis for repository:', repositoryId);
      return await repositoryService.getAnalysis(repositoryId);
    } catch (err) {
      console.error('❌ Error getting analysis:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get analysis';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    repositories,
    loading,
    error,
    addRepository,
    updateRepository,
    deleteRepository,
    storeAnalysis,
    getAnalysis,
    refetch: () => {
      if (user && session) {
        repositoryService.getRepositories()
          .then(setRepositories)
          .catch(err => {
            console.error('❌ Error refetching repositories:', err);
            setError(err instanceof Error ? err.message : 'Failed to refetch repositories');
          });
      }
    },
  };
};