import { useState, useEffect } from 'react';
import { Repository } from '../types';
import { repositoryService } from '../services/repositoryService';
import { useAuth } from './useSupabase';
import toast from 'react-hot-toast';

export const useRepositories = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setRepositories([]);
      setLoading(false);
      return;
    }

    const fetchRepositories = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await repositoryService.getRepositories();
        setRepositories(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();

    // Subscribe to real-time updates
    const subscription = repositoryService.subscribeToRepositories((updatedRepositories) => {
      setRepositories(updatedRepositories);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const addRepository = async (repository: Omit<Repository, 'id'>) => {
    try {
      const newRepository = await repositoryService.addRepository(repository);
      setRepositories(prev => [newRepository, ...prev]);
      toast.success(`Repository "${repository.name}" added successfully!`);
      return newRepository;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateRepository = async (id: string, updates: Partial<Repository>) => {
    try {
      const updatedRepository = await repositoryService.updateRepository(id, updates);
      setRepositories(prev => 
        prev.map(repo => repo.id === id ? updatedRepository : repo)
      );
      toast.success('Repository updated successfully!');
      return updatedRepository;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteRepository = async (id: string) => {
    try {
      await repositoryService.deleteRepository(id);
      setRepositories(prev => prev.filter(repo => repo.id !== id));
      toast.success('Repository deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete repository';
      toast.error(errorMessage);
      throw err;
    }
  };

  const storeAnalysis = async (repositoryId: string, analysis: any) => {
    try {
      await repositoryService.storeAnalysis(repositoryId, analysis);
      // Refresh the repository to get updated analysis data
      const updatedRepo = await repositoryService.getRepository(repositoryId);
      if (updatedRepo) {
        setRepositories(prev => 
          prev.map(repo => repo.id === repositoryId ? updatedRepo : repo)
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store analysis';
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
    refetch: () => {
      if (user) {
        repositoryService.getRepositories().then(setRepositories).catch(console.error);
      }
    },
  };
};