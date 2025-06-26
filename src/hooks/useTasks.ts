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
        console.log('📋 Fetching tasks for user:', user.email);
        setLoading(true);
        setError(null);
        
        const data = await taskService.getTasks();
        console.log('✅ Tasks fetched:', data.length);
        setTasks(data);
      } catch (err) {
        console.error('❌ Error fetching tasks:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
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
    const timeoutId = setTimeout(fetchTasks, 100);
    
    return () => clearTimeout(timeoutId);
  }, [user, session]);

  const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('➕ Creating task:', task.title);
      const newTask = await taskService.createTask(task);
      setTasks(prev => [newTask, ...prev]);
      toast.success(`Task "${task.title}" created successfully!`);
      return newTask;
    } catch (err) {
      console.error('❌ Error creating task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      console.log('📝 Updating task:', id);
      const updatedTask = await taskService.updateTask(id, updates);
      setTasks(prev => 
        prev.map(task => task.id === id ? updatedTask : task)
      );
      toast.success('Task updated successfully!');
      return updatedTask;
    } catch (err) {
      console.error('❌ Error updating task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      console.log('🔄 Updating task status:', id, status);
      const updatedTask = await taskService.updateTaskStatus(id, status);
      setTasks(prev => 
        prev.map(task => task.id === id ? updatedTask : task)
      );
      return updatedTask;
    } catch (err) {
      console.error('❌ Error updating task status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task status';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      console.log('🗑️ Deleting task:', id);
      await taskService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success('Task deleted successfully!');
    } catch (err) {
      console.error('❌ Error deleting task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      toast.error(errorMessage);
      throw err;
    }
  };

  const assignTask = async (taskId: string, developerId: string) => {
    try {
      console.log('👤 Assigning task:', taskId, 'to:', developerId);
      const updatedTask = await taskService.assignTask(taskId, developerId);
      setTasks(prev => 
        prev.map(task => task.id === taskId ? updatedTask : task)
      );
      toast.success('Task assigned successfully!');
      return updatedTask;
    } catch (err) {
      console.error('❌ Error assigning task:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign task';
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
        taskService.getTasks()
          .then(setTasks)
          .catch(err => {
            console.error('❌ Error refetching tasks:', err);
            setError(err instanceof Error ? err.message : 'Failed to refetch tasks');
          });
      }
    },
  };
};