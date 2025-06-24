import { create } from 'zustand';
import { Repository, Developer, Task, Sprint, BusinessSpec } from '../types';

interface AppState {
  // Repository state
  repositories: Repository[];
  currentRepository: Repository | null;
  
  // Developer state
  developers: Developer[];
  
  // Task state
  tasks: Task[];
  
  // Sprint state
  sprints: Sprint[];
  currentSprint: Sprint | null;
  
  // Business specs
  businessSpecs: BusinessSpec[];
  
  // UI state
  sidebarOpen: boolean;
  overlayOpen: boolean;
  currentView: 'dashboard' | 'tasks' | 'docs' | 'profile' | 'sprints';
  
  // Actions
  setCurrentRepository: (repo: Repository | null) => void;
  addRepository: (repo: Repository) => void;
  updateRepository: (id: string, updates: Partial<Repository>) => void;
  removeRepository: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setOverlayOpen: (open: boolean) => void;
  setCurrentView: (view: AppState['currentView']) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addBusinessSpec: (spec: BusinessSpec) => void;
  updateBusinessSpec: (id: string, updates: Partial<BusinessSpec>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  repositories: [
    {
      id: '1',
      name: 'sprint-ai',
      url: 'https://github.com/example/sprint-ai',
      description: 'AI-native development platform',
      language: 'TypeScript',
      stars: 128,
      lastUpdated: new Date(),
    },
    {
      id: '2',
      name: 'api-gateway',
      url: 'https://github.com/example/api-gateway',
      description: 'Microservices API gateway',
      language: 'Python',
      stars: 45,
      lastUpdated: new Date(),
    }
  ],
  currentRepository: null,
  
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
  
  businessSpecs: [
    {
      id: '1',
      title: 'AI-Powered Code Documentation',
      description: 'Automatically generate and maintain living documentation from codebase analysis',
      acceptanceCriteria: [
        'Parse GitHub repository structure',
        'Generate comprehensive documentation using AI',
        'Auto-update docs on PR merges',
        'Support multiple programming languages',
      ],
      lastUpdated: new Date(),
    },
  ],
  
  sidebarOpen: true,
  overlayOpen: false,
  currentView: 'dashboard',
  
  // Actions
  setCurrentRepository: (repo) => set({ currentRepository: repo }),
  
  addRepository: (repo) => set((state) => ({ 
    repositories: [...state.repositories, repo] 
  })),
  
  updateRepository: (id, updates) => set((state) => ({
    repositories: state.repositories.map(repo => 
      repo.id === id ? { ...repo, ...updates } : repo
    )
  })),
  
  removeRepository: (id) => set((state) => ({
    repositories: state.repositories.filter(repo => repo.id !== id),
    currentRepository: state.currentRepository?.id === id ? null : state.currentRepository,
  })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setOverlayOpen: (open) => set({ overlayOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(task => task.id === id ? { ...task, ...updates } : task)
  })),
  
  addBusinessSpec: (spec) => set((state) => ({ 
    businessSpecs: [...state.businessSpecs, spec] 
  })),
  
  updateBusinessSpec: (id, updates) => set((state) => ({
    businessSpecs: state.businessSpecs.map(spec => 
      spec.id === id ? { ...spec, ...updates } : spec
    )
  })),
}));