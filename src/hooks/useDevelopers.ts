import { useState, useEffect } from 'react';
import { Developer } from '../types';
import { developerService } from '../services/developerService';
import { useAuth } from '../components/auth/AuthProvider';
import toast from 'react-hot-toast';

export const useDevelopers = () => {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setDevelopers([]);
      setLoading(false);
      return;
    }

    const fetchDevelopers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await developerService.getDevelopers();
        setDevelopers(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch developers';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDevelopers();

    // Subscribe to real-time updates
    const subscription = developerService.subscribeToDevelopers((updatedDevelopers) => {
      setDevelopers(updatedDevelopers);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const createDeveloper = async (developer: Omit<Developer, 'id'>) => {
    try {
      const newDeveloper = await developerService.createDeveloper(developer);
      setDevelopers(prev => [newDeveloper, ...prev]);
      toast.success(`Developer "${developer.name}" added successfully!`);
      return newDeveloper;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create developer';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateDeveloper = async (id: string, updates: Partial<Developer>) => {
    try {
      const updatedDeveloper = await developerService.updateDeveloper(id, updates);
      setDevelopers(prev => 
        prev.map(dev => dev.id === id ? updatedDeveloper : dev)
      );
      toast.success('Developer updated successfully!');
      return updatedDeveloper;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update developer';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updatePerformanceMetrics = async (
    developerId: string, 
    metrics: {
      velocity?: number;
      codeQuality?: number;
      collaboration?: number;
      commitFrequency?: number;
    }
  ) => {
    try {
      const updatedDeveloper = await developerService.updatePerformanceMetrics(developerId, metrics);
      setDevelopers(prev => 
        prev.map(dev => dev.id === developerId ? updatedDeveloper : dev)
      );
      toast.success('Performance metrics updated successfully!');
      return updatedDeveloper;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update performance metrics';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateSkills = async (
    developerId: string, 
    skills: {
      strengths: string[];
      preferredTasks: string[];
    }
  ) => {
    try {
      const updatedDeveloper = await developerService.updateSkills(developerId, skills);
      setDevelopers(prev => 
        prev.map(dev => dev.id === developerId ? updatedDeveloper : dev)
      );
      toast.success('Skills updated successfully!');
      return updatedDeveloper;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update skills';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deactivateDeveloper = async (id: string) => {
    try {
      await developerService.deactivateDeveloper(id);
      setDevelopers(prev => prev.filter(dev => dev.id !== id));
      toast.success('Developer deactivated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate developer';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getTeamCapacity = async () => {
    try {
      return await developerService.getTeamCapacity();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate team capacity';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getDevelopersBySkill = async (skill: string) => {
    try {
      return await developerService.getDevelopersBySkill(skill);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch developers by skill';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getAvailableDevelopers = async () => {
    try {
      return await developerService.getAvailableDevelopers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch available developers';
      toast.error(errorMessage);
      throw err;
    }
  };

  const recordSprintPerformance = async (
    developerId: string,
    sprintId: string,
    metrics: {
      tasksCompleted: number;
      storyPointsCompleted: number;
      hoursLogged: number;
      codeQualityScore?: number;
      collaborationScore?: number;
    }
  ) => {
    try {
      await developerService.recordSprintPerformance(developerId, sprintId, metrics);
      toast.success('Sprint performance recorded successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record sprint performance';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getPerformanceHistory = async (developerId: string, limit?: number) => {
    try {
      return await developerService.getPerformanceHistory(developerId, limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch performance history';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    developers,
    loading,
    error,
    createDeveloper,
    updateDeveloper,
    updatePerformanceMetrics,
    updateSkills,
    deactivateDeveloper,
    getTeamCapacity,
    getDevelopersBySkill,
    getAvailableDevelopers,
    recordSprintPerformance,
    getPerformanceHistory,
    refetch: () => {
      if (user) {
        developerService.getDevelopers().then(setDevelopers).catch(console.error);
      }
    },
  };
};