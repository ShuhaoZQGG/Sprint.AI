import { useState, useEffect } from 'react';
import { Repository } from '../types';
import { repositoryService } from '../services/repositoryService';
import { useAuth } from '../components/auth/AuthProvider';
import { useAppStore } from '../stores/useAppStore';
import toast from 'react-hot-toast';

export const useRepositories = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { currentRepository, setCurrentRepository } = useAppStore();

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
        setLoading(true);
        setError(null);
        
        // Small delay to ensure auth is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const data = await repositoryService.getRepositories();
        setRepositories(data);
        
        // Set current repository if not already set
        if (data.length > 0 && !currentRepository) {
          setCurrentRepository(data[0]);
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to fetch repositories';
        
        // Don't show toast for auth-related errors
        if (!errorMessage.includes('JWT') && !errorMessage.includes('session')) {
          console.error('Repository fetch error:', errorMessage);
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          console.log('Auth-related repository fetch error (ignored):', errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();

    // Subscribe to real-time updates
    const subscription = repositoryService.subscribeToRepositories(user.id, (updatedRepos) => {
      setRepositories(updatedRepos);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user, session, currentRepository, setCurrentRepository]); // Depend on both user and session

  const addRepository = async (repo: Omit<Repository, 'id' | 'lastUpdated'>) => {
    try {
      const newRepo = await repositoryService.addRepository(repo);
      setRepositories(prev => [newRepo, ...prev]);
      
      // Set as current repository if none is selected
      if (!currentRepository) {
        setCurrentRepository(newRepo);
      }
      
      toast.success(`Repository "${repo.name}" added successfully!`);
      return newRepo;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateRepository = async (id: string, updates: Partial<Repository>) => {
    try {
      const updatedRepo = await repositoryService.updateRepository(id, updates);
      setRepositories(prev => 
        prev.map(repo => repo.id === id ? updatedRepo : repo)
      );
      
      // Update current repository if it's the one being updated
      if (currentRepository?.id === id) {
        setCurrentRepository(updatedRepo);
      }
      
      toast.success('Repository updated successfully!');
      return updatedRepo;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const removeRepository = async (id: string) => {
    try {
      await repositoryService.deleteRepository(id);
      setRepositories(prev => prev.filter(repo => repo.id !== id));
      
      // Clear current repository if it's the one being removed
      if (currentRepository?.id === id) {
        setCurrentRepository(repositories.find(r => r.id !== id) || null);
      }
      
      toast.success('Repository removed successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to remove repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const storeAnalysis = async (repositoryId: string, analysis: any) => {
    try {
      await repositoryService.storeAnalysis(repositoryId, analysis);
      toast.success('Repository analysis stored successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to store analysis';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    repositories,
    currentRepository,
    loading,
    error,
    addRepository,
    updateRepository,
    removeRepository,
    storeAnalysis,
    setCurrentRepository,
    refetch: () => {
      if (user && session) {
        repositoryService.getRepositories().then(setRepositories).catch(console.error);
      }
    },
  };
};