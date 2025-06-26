import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';
import { taskService } from '../services/taskService';
import { useAuth } from '../components/auth/AuthProvider';
import toast from 'react-hot-toast';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  useEffect(() => {
    // Reset state when user changes
    if (!user || !session) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Small delay to ensure auth is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const data = await taskService.getTasks();
        setTasks(data);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to fetch tasks';
        
        // Don't show toast for auth-related errors
        if (!errorMessage.includes('JWT') && !errorMessage.includes('session')) {
          console.error('Task fetch error:', errorMessage);
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          console.log('Auth-related task fetch error (ignored):', errorMessage);
        }
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
  }, [user, session]); // Depend on both user and session

  const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTask = await taskService.createTask(task);
      setTasks(prev => [newTask, ...prev]);
      toast.success(`Task "${task.title}" created successfully!`);
      return newTask;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create task';
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
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      const updatedTask = await taskService.updateTaskStatus(id, status);
      setTasks(prev => 
        prev.map(task => task.id === id ? updatedTask : task)
      );
      toast.success(`Task status updated to ${status}`);
      return updatedTask;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update task status';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await taskService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success('Task deleted successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const assignTask = async (taskId: string, developerId: string) => {
    try {
      const updatedTask = await taskService.assignTask(taskId, developerId);
      setTasks(prev => 
        prev.map(task => task.id === taskId ? updatedTask : task)
      );
      toast.success('Task assigned successfully!');
      return updatedTask;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to assign task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const getTasksByAssignee = (developerId: string) => {
    return tasks.filter(task => task.assignee?.id === developerId);
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    assignTask,
    getTasksByStatus,
    getTasksByAssignee,
    refetch: () => {
      if (user && session) {
        taskService.getTasks().then(setTasks).catch(console.error);
      }
    },
  };
};