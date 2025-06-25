import { useState, useEffect } from 'react';
import { Sprint } from '../types';
import { sprintService } from '../services/sprintService';
import { useAuth } from './useSupabase';
import toast from 'react-hot-toast';

export const useSprints = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSprints([]);
      setActiveSprint(null);
      setLoading(false);
      return;
    }

    const fetchSprints = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sprintsData, activeSprintData] = await Promise.all([
          sprintService.getSprints(),
          sprintService.getActiveSprint(),
        ]);
        setSprints(sprintsData);
        setActiveSprint(activeSprintData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sprints';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();

    // Subscribe to real-time updates
    const subscription = sprintService.subscribeToSprints((updatedSprints) => {
      setSprints(updatedSprints);
      // Update active sprint if it exists in the updated list
      const activeSprintInList = updatedSprints.find(s => s.status === 'active');
      setActiveSprint(activeSprintInList || null);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const createSprint = async (sprint: Omit<Sprint, 'id' | 'tasks' | 'burndown'>) => {
    try {
      const newSprint = await sprintService.createSprint(sprint);
      setSprints(prev => [newSprint, ...prev]);
      toast.success(`Sprint "${sprint.name}" created successfully!`);
      return newSprint;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sprint';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateSprint = async (id: string, updates: Partial<Sprint>) => {
    try {
      const updatedSprint = await sprintService.updateSprint(id, updates);
      setSprints(prev => 
        prev.map(sprint => sprint.id === id ? updatedSprint : sprint)
      );
      
      // Update active sprint if it's the one being updated
      if (activeSprint?.id === id) {
        setActiveSprint(updatedSprint);
      }
      
      toast.success('Sprint updated successfully!');
      return updatedSprint;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sprint';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteSprint = async (id: string) => {
    try {
      await sprintService.deleteSprint(id);
      setSprints(prev => prev.filter(sprint => sprint.id !== id));
      
      // Clear active sprint if it's the one being deleted
      if (activeSprint?.id === id) {
        setActiveSprint(null);
      }
      
      toast.success('Sprint deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete sprint';
      toast.error(errorMessage);
      throw err;
    }
  };

  const addTaskToSprint = async (sprintId: string, taskId: string) => {
    try {
      await sprintService.addTaskToSprint(sprintId, taskId);
      
      // Refresh the specific sprint
      const updatedSprint = await sprintService.getSprint(sprintId);
      if (updatedSprint) {
        setSprints(prev => 
          prev.map(sprint => sprint.id === sprintId ? updatedSprint : sprint)
        );
        
        if (activeSprint?.id === sprintId) {
          setActiveSprint(updatedSprint);
        }
      }
      
      toast.success('Task added to sprint successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add task to sprint';
      toast.error(errorMessage);
      throw err;
    }
  };

  const removeTaskFromSprint = async (sprintId: string, taskId: string) => {
    try {
      await sprintService.removeTaskFromSprint(sprintId, taskId);
      
      // Refresh the specific sprint
      const updatedSprint = await sprintService.getSprint(sprintId);
      if (updatedSprint) {
        setSprints(prev => 
          prev.map(sprint => sprint.id === sprintId ? updatedSprint : sprint)
        );
        
        if (activeSprint?.id === sprintId) {
          setActiveSprint(updatedSprint);
        }
      }
      
      toast.success('Task removed from sprint successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove task from sprint';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    sprints,
    activeSprint,
    loading,
    error,
    createSprint,
    updateSprint,
    deleteSprint,
    addTaskToSprint,
    removeTaskFromSprint,
    refetch: () => {
      if (user) {
        Promise.all([
          sprintService.getSprints(),
          sprintService.getActiveSprint(),
        ]).then(([sprintsData, activeSprintData]) => {
          setSprints(sprintsData);
          setActiveSprint(activeSprintData);
        }).catch(console.error);
      }
    },
  };
};