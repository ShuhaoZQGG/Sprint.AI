export interface Repository {
  id: string;
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  lastUpdated: Date;
  structure?: CodebaseStructure;
}

export interface CodebaseStructure {
  modules: Module[];
  services: Service[];
  dependencies: Dependency[];
  summary: string;
}

export interface Module {
  name: string;
  path: string;
  type: 'component' | 'service' | 'utility' | 'config';
  description: string;
  dependencies: string[];
}

export interface Service {
  name: string;
  type: 'api' | 'database' | 'auth' | 'external';
  description: string;
  endpoints?: string[];
}

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
}

export interface Developer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  profile: DeveloperProfile;
}

export interface DeveloperProfile {
  velocity: number; // tasks per sprint
  strengths: string[];
  preferredTasks: TaskType[];
  commitFrequency: number;
  codeQuality: number; // 1-10 scale
  collaboration: number; // 1-10 scale
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: Priority;
  status: TaskStatus;
  assignee?: Developer;
  estimatedEffort: number; // hours
  actualEffort?: number; // hours
  sprintId?: string;
  createdAt: Date;
  updatedAt: Date;
  prTemplate?: PRTemplate;
}

export type TaskType = 'feature' | 'bug' | 'refactor' | 'docs' | 'test' | 'devops';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export interface Sprint {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed';
  tasks: Task[];
  capacity: number; // total hours
  burndown: BurndownPoint[];
}

export interface BurndownPoint {
  date: Date;
  remaining: number;
  ideal: number;
}

export interface PRTemplate {
  branchName: string;
  title: string;
  description: string;
  fileScaffolds: FileScaffold[];
  commitMessage: string;
}

export interface FileScaffold {
  path: string;
  content: string;
  todos: string[];
}

export interface BusinessSpec {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  technicalRequirements?: string[];
  generatedTasks?: Task[];
  lastUpdated: Date;
  status?: 'draft' | 'review' | 'approved' | 'implemented';
  priority?: Priority;
  estimatedEffort?: number;
  tags?: string[];
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: Date;
}