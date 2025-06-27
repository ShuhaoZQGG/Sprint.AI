import { useState, useEffect } from 'react';
import { BusinessSpec } from '../types';
import { businessSpecService } from '../services/businessSpecService';
import { nlpProcessor } from '../services/nlpProcessor';
import { useAuth } from '../components/auth/AuthProvider';
import toast from 'react-hot-toast';

export const useBusinessSpecs = () => {
  const [businessSpecs, setBusinessSpecs] = useState<BusinessSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setBusinessSpecs([]);
      setLoading(false);
      return;
    }

    const fetchBusinessSpecs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await businessSpecService.getBusinessSpecs();
        setBusinessSpecs(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch business specifications';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessSpecs();

    // Subscribe to real-time updates
    const subscription = businessSpecService.subscribeToBusinessSpecs((updatedSpecs) => {
      setBusinessSpecs(updatedSpecs);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const createBusinessSpec = async (spec: Omit<BusinessSpec, 'id' | 'lastUpdated'>) => {
    try {
      const newSpec = await businessSpecService.createBusinessSpec(spec);
      setBusinessSpecs(prev => [newSpec, ...prev]);
      toast.success(`Business specification "${spec.title}" created successfully!`);
      return newSpec;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create business specification';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateBusinessSpec = async (id: string, updates: Partial<BusinessSpec>) => {
    try {
      const updatedSpec = await businessSpecService.updateBusinessSpec(id, updates);
      setBusinessSpecs(prev => 
        prev.map(spec => spec.id === id ? updatedSpec : spec)
      );
      toast.success('Business specification updated successfully!');
      return updatedSpec;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update business specification';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteBusinessSpec = async (id: string) => {
    try {
      await businessSpecService.deleteBusinessSpec(id);
      setBusinessSpecs(prev => prev.filter(spec => spec.id !== id));
      toast.success('Business specification deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete business specification';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateStatus = async (id: string, status: 'draft' | 'review' | 'approved' | 'implemented') => {
    try {
      const updatedSpec = await businessSpecService.updateStatus(id, status);
      setBusinessSpecs(prev => 
        prev.map(spec => spec.id === id ? updatedSpec : spec)
      );
      toast.success(`Status updated to ${status}`);
      return updatedSpec;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updatePriority = async (id: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      const updatedSpec = await businessSpecService.updatePriority(id, priority);
      setBusinessSpecs(prev => 
        prev.map(spec => spec.id === id ? updatedSpec : spec)
      );
      toast.success(`Priority updated to ${priority}`);
      return updatedSpec;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update priority';
      toast.error(errorMessage);
      throw err;
    }
  };

  const generateTasksFromSpec = async (
    businessSpec: BusinessSpec,
    codebaseContext: any,
    teamSkills: string[]
  ) => {
    try {
      const result = await nlpProcessor.generateTasksFromBusinessSpec(
        businessSpec,
        codebaseContext,
        teamSkills
      );
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate tasks from business specification';
      toast.error(errorMessage);
      throw err;
    }
  };

  const searchBusinessSpecs = async (query: string) => {
    try {
      const results = await businessSpecService.searchBusinessSpecs(query);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search business specifications';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getSpecsByStatus = async (status: 'draft' | 'review' | 'approved' | 'implemented') => {
    try {
      const results = await businessSpecService.getBusinessSpecsByStatus(status);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch specifications by status';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    businessSpecs,
    loading,
    error,
    createBusinessSpec,
    updateBusinessSpec,
    deleteBusinessSpec,
    updateStatus,
    updatePriority,
    generateTasksFromSpec,
    searchBusinessSpecs,
    getSpecsByStatus,
    refetch: () => {
      if (user) {
        businessSpecService.getBusinessSpecs().then(setBusinessSpecs).catch(console.error);
      }
    },
  };
};