import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { 
  Plus, 
  Filter, 
  Search, 
  BarChart3, 
  Calendar,
  Users,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import { Task, TaskStatus, TaskType, Priority } from '../../types';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../auth/AuthProvider';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useRepositories } from '../../hooks/useRepositories';
import { prGenerator } from '../../services/prGenerator';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { TaskDetails } from './TaskDetails';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const TASK_STATUSES: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

export const TasksView: React.FC = () => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const { developers } = useDevelopers();
  const { currentRepository } = useRepositories();
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string | 'all'>('all');

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Filter and organize tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || task.type === filterType;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || task.assignee?.id === filterAssignee;
      
      return matchesSearch && matchesType && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, filterType, filterPriority, filterAssignee]);

  const tasksByStatus = useMemo(() => {
    const grouped = TASK_STATUSES.reduce((acc, status) => {
      acc[status.id] = filteredTasks.filter(task => task.status === status.id);
      return acc;
    }, {} as Record<TaskStatus, Task[]>);
    
    return grouped;
  }, [filteredTasks]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task;
    
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTask = active.data.current?.task;
    const overColumn = over.data.current?.status;
    
    if (!activeTask || !overColumn) return;
    
    // Don't do anything if dropping in the same column
    if (activeTask.status === overColumn) return;
    
    // Update task status optimistically
    const updatedTask = { ...activeTask, status: overColumn as TaskStatus };
    
    // This is just for visual feedback during drag
    // The actual update happens in handleDragEnd
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    
    if (!over) return;
    
    const activeTask = active.data.current?.task;
    const overColumn = over.data.current?.status;
    
    if (!activeTask || !overColumn) return;
    
    // Don't update if dropping in the same column
    if (activeTask.status === overColumn) return;
    
    try {
      await updateTask(activeTask.id, { 
        status: overColumn as TaskStatus,
        updatedAt: new Date(),
      });
      
      toast.success(`Task moved to ${overColumn.replace('-', ' ')}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to move task');
    }
  };

  // Task management handlers
  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createTask(taskData);
      setShowTaskForm(false);
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingTask) return;
    
    try {
      await updateTask(editingTask.id, {
        ...taskData,
        updatedAt: new Date(),
      });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await deleteTask(taskId);
      toast.success('Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    setEditingTask(null);
    setShowTaskForm(true);
    // Pre-fill the status in the form
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterPriority('all');
    setFilterAssignee('all');
  };

  // PR Generation handler
  const handleGeneratePR = async (task: Task) => {
    if (!currentRepository) {
      toast.error('No repository selected');
      return;
    }
    try {
      const { template } = await prGenerator.generatePRTemplate({
        task: {
          ...task,
          id: (task as any).id || `temp-task`,
          createdAt: (task as any).createdAt || new Date(),
          updatedAt: (task as any).updatedAt || new Date(),
        },
        repository: currentRepository,
        includeScaffolds: true,
      });
      const { prUrl } = await prGenerator.submitPRToGitHub(template, currentRepository);
      toast.success((
        <span>
          PR created for "{task.title}" <a href={prUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary-400">View PR</a>
        </span>
      ));
    } catch (error) {
      console.error('Error generating PR:', error);
      toast.error('Failed to generate PR template or submit PR');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-dark-400">
            Manage your development tasks with AI-powered insights
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm">
            <BarChart3 size={16} className="mr-2" />
            Analytics
          </Button>
          <Button variant="ghost" size="sm">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowTaskForm(true)}>
            <Plus size={16} className="mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TaskType | 'all')}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Types</option>
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="refactor">Refactor</option>
              <option value="docs">Documentation</option>
              <option value="test">Testing</option>
              <option value="devops">DevOps</option>
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            
            {(searchQuery || filterType !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RefreshCw size={14} className="mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 h-full overflow-x-auto pb-6">
            {TASK_STATUSES.map((status) => (
              <KanbanColumn
                key={status.id}
                id={status.id}
                title={status.title}
                tasks={tasksByStatus[status.id] || []}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onViewTask={handleViewTask}
                onGeneratePR={handleGeneratePR}
              />
            ))}
          </div>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-3 scale-105">
                <TaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onView={() => {}}
                  isDragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        developers={developers}
      />

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetails
          isOpen={showTaskDetails}
          onClose={() => {
            setShowTaskDetails(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onGeneratePR={handleGeneratePR}
        />
      )}
    </div>
  );
};