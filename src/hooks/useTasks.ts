import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';
import { taskService } from '../services/taskService';
import { useAuth } from './useSupabase';
import toast from 'react-hot-toast';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await taskService.getTasks();
        setTasks(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Subscribe to real-time updates
    const subscription = taskService.subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTask = await taskService.createTask(task);
      setTasks(prev => [newTask, ...prev]);
      toast.success(`Task "${task.title}" created successfully!`);
      return newTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await taskService.updateTask(id, updates);
      setTasks(prev => 
        prev.map(task => task.id === id ? updatedTask : task)
      );
      toast.success('Task updated successfully!');
      return updatedTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await taskService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success('Task deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      // Optimistic update
      setTasks(prev => 
        prev.map(task => task.id === id ? { ...task, status } : task)
      );

      const updatedTask = await taskService.updateTaskStatus(id, status);
      
      // Update with server response
      setTasks(prev => 
        prev.map(task => task.id === id ? updatedTask : task)
      );

      return updatedTask;
    } catch (err) {
      // Revert optimistic update on error
      const originalTasks = await taskService.getTasks();
      setTasks(originalTasks);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task status';
      toast.error(errorMessage);
      throw err;
    }
  };

  const assignTask = async (taskId: string, developerId: string | null) => {
    try {
      const updatedTask = await taskService.assignTask(taskId, developerId);
      setTasks(prev => 
        prev.map(task => task.id === taskId ? updatedTask : task)
      );
      toast.success(developerId ? 'Task assigned successfully!' : 'Task unassigned successfully!');
      return updatedTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const searchTasks = async (query: string) => {
    try {
      const results = await taskService.searchTasks(query);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search tasks';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    assignTask,
    searchTasks,
    refetch: () => {
      if (user) {
        taskService.getTasks().then(setTasks).catch(console.error);
      }
    },
  };
};