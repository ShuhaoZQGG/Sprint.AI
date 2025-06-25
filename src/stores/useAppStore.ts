import { create } from 'zustand';
import { Repository, Task, Sprint, Developer } from '../types';
import { GeneratedDocumentation } from '../services/docGenerator';

interface AppState {
  // Repository state
  currentRepository: Repository | null;
  
  // Task state (keeping mock data for now)
  tasks: Task[];
  
  // Sprint state (keeping mock data for now)
  sprints: Sprint[];
  currentSprint: Sprint | null;
  
  // Documentation state
  generatedDocs: Map<string, GeneratedDocumentation>;
  
  // Developer state (mock data)
  developers: Developer[];
  
  // UI state
  sidebarOpen: boolean;
  overlayOpen: boolean;
  currentView: 'dashboard' | 'tasks' | 'docs' | 'profile' | 'sprints';
  
  // Real-time collaboration state
  onlineUsers: Map<string, { id: string; name: string; avatar?: string; lastSeen: Date }>;
  
  // Actions
  setCurrentRepository: (repo: Repository | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setOverlayOpen: (open: boolean) => void;
  setCurrentView: (view: AppState['currentView']) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addGeneratedDoc: (repoId: string, doc: GeneratedDocumentation) => void;
  updateGeneratedDoc: (repoId: string, doc: GeneratedDocumentation) => void;
  getGeneratedDoc: (repoId: string) => GeneratedDocumentation | null;
  
  // Real-time collaboration actions
  addOnlineUser: (user: { id: string; name: string; avatar?: string }) => void;
  removeOnlineUser: (userId: string) => void;
  updateUserPresence: (userId: string, lastSeen: Date) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentRepository: null,
  
  tasks: [
    {
      id: '1',
      title: 'Implement AI Overlay Command Palette',
      description: 'Create the Ctrl+. overlay for contextual AI assistance',
      type: 'feature',
      priority: 'high',
      status: 'in-progress',
      estimatedEffort: 16,
      actualEffort: 12,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
    },
    {
      id: '2',
      title: 'Fix sprint planning auto-assignment',
      description: 'Tasks are not being assigned based on developer velocity',
      type: 'bug',
      priority: 'medium',
      status: 'todo',
      estimatedEffort: 4,
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date(),
    },
    {
      id: '3',
      title: 'Add GitHub API integration',
      description: 'Connect to GitHub API for repository analysis',
      type: 'feature',
      priority: 'high',
      status: 'review',
      estimatedEffort: 20,
      actualEffort: 18,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date(),
    },
  ],
  
  sprints: [
    {
      id: '1',
      name: 'Sprint 1 - Core Foundation',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-29'),
      status: 'active',
      tasks: [],
      capacity: 120,
      burndown: [],
    },
  ],
  currentSprint: null,
  
  generatedDocs: new Map(),
  
  developers: [
    {
      id: '1',
      name: 'Alex Chen',
      email: 'alex@company.com',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150',
      profile: {
        velocity: 8,
        strengths: ['Frontend', 'React', 'TypeScript'],
        preferredTasks: ['feature', 'bug'],
        commitFrequency: 12,
        codeQuality: 9,
        collaboration: 8,
      },
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@company.com',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150',
      profile: {
        velocity: 10,
        strengths: ['Backend', 'Python', 'DevOps'],
        preferredTasks: ['feature', 'devops'],
        commitFrequency: 15,
        codeQuality: 9,
        collaboration: 9,
      },
    },
    {
      id: '3',
      name: 'Mike Rodriguez',
      email: 'mike@company.com',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?w=150',
      profile: {
        velocity: 6,
        strengths: ['Testing', 'QA', 'Documentation'],
        preferredTasks: ['test', 'docs', 'bug'],
        commitFrequency: 8,
        codeQuality: 8,
        collaboration: 10,
      },
    },
  ],
  
  sidebarOpen: true,
  overlayOpen: false,
  currentView: 'dashboard',
  
  onlineUsers: new Map(),
  
  // Actions
  setCurrentRepository: (repo) => set({ currentRepository: repo }),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setOverlayOpen: (open) => set({ overlayOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(task => task.id === id ? { ...task, ...updates } : task)
  })),
  
  addGeneratedDoc: (repoId, doc) => set((state) => ({
    generatedDocs: new Map(state.generatedDocs.set(repoId, doc))
  })),
  
  updateGeneratedDoc: (repoId, doc) => set((state) => ({
    generatedDocs: new Map(state.generatedDocs.set(repoId, doc))
  })),
  
  getGeneratedDoc: (repoId) => {
    return get().generatedDocs.get(repoId) || null;
  },
  
  // Real-time collaboration actions
  addOnlineUser: (user) => set((state) => ({
    onlineUsers: new Map(state.onlineUsers.set(user.id, {
      ...user,
      lastSeen: new Date(),
    }))
  })),
  
  removeOnlineUser: (userId) => set((state) => {
    const newMap = new Map(state.onlineUsers);
    newMap.delete(userId);
    return { onlineUsers: newMap };
  }),
  
  updateUserPresence: (userId, lastSeen) => set((state) => {
    const user = state.onlineUsers.get(userId);
    if (user) {
      return {
        onlineUsers: new Map(state.onlineUsers.set(userId, {
          ...user,
          lastSeen,
        }))
      };
    }
    return state;
  }),
}));