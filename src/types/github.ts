export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GitHubContributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface GitHubLanguages {
  [language: string]: number;
}

export interface RepositoryAnalysis {
  repository: GitHubRepository;
  structure: FileStructure;
  contributors: GitHubContributor[];
  languages: GitHubLanguages;
  recentCommits: GitHubCommit[];
  summary: {
    totalFiles: number;
    totalLines: number;
    primaryLanguage: string;
    lastActivity: string;
    commitFrequency: number;
  };
}

export interface FileStructure {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileStructure[];
  language?: string;
  isImportant?: boolean;
}