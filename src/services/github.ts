import { Octokit } from '@octokit/rest';
import { 
  GitHubRepository, 
  GitHubCommit, 
  GitHubFile, 
  GitHubContributor, 
  GitHubLanguages,
  RepositoryAnalysis,
  FileStructure
} from '../types/github';

class GitHubService {
  private octokit: Octokit;

  constructor() {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    this.octokit = new Octokit({
      auth: token,
    });
  }

  /**
   * Search for repositories by query
   */
  async searchRepositories(query: string, limit: number = 10): Promise<GitHubRepository[]> {
    try {
      const response = await this.octokit.rest.search.repos({
        q: query,
        sort: 'updated',
        order: 'desc',
        per_page: limit,
      });

      return response.data.items;
    } catch (error) {
      console.error('Error searching repositories:', error);
      throw new Error('Failed to search repositories');
    }
  }

  /**
   * Get repository details by owner and repo name
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching repository:', error);
      throw new Error('Failed to fetch repository details');
    }
  }

  /**
   * Get repository file structure
   */
  async getRepositoryStructure(owner: string, repo: string, path: string = ''): Promise<FileStructure[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      const contents = Array.isArray(response.data) ? response.data : [response.data];
      
      const structure: FileStructure[] = [];

      for (const item of contents) {
        if ('type' in item) {
          const fileStructure: FileStructure = {
            name: item.name,
            path: item.path,
            type: item.type === 'dir' ? 'directory' : 'file',
            size: item.size,
            language: this.getLanguageFromExtension(item.name),
            isImportant: this.isImportantFile(item.name, item.path),
          };

          // Recursively get directory contents for important directories
          if (item.type === 'dir' && this.isImportantDirectory(item.name)) {
            try {
              fileStructure.children = await this.getRepositoryStructure(owner, repo, item.path);
            } catch (error) {
              console.warn(`Failed to fetch contents of directory: ${item.path}`);
              fileStructure.children = [];
            }
          }

          structure.push(fileStructure);
        }
      }

      return structure.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error fetching repository structure:', error);
      throw new Error('Failed to fetch repository structure');
    }
  }

  /**
   * Get recent commits for a repository
   */
  async getRecentCommits(owner: string, repo: string, limit: number = 50): Promise<GitHubCommit[]> {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: limit,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching commits:', error);
      throw new Error('Failed to fetch repository commits');
    }
  }

  /**
   * Get repository contributors
   */
  async getContributors(owner: string, repo: string): Promise<GitHubContributor[]> {
    try {
      const response = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 100,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching contributors:', error);
      throw new Error('Failed to fetch repository contributors');
    }
  }

  /**
   * Get repository languages
   */
  async getLanguages(owner: string, repo: string): Promise<GitHubLanguages> {
    try {
      const response = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching languages:', error);
      throw new Error('Failed to fetch repository languages');
    }
  }

  /**
   * Get file content
   */
  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(response.data) || response.data.type !== 'file') {
        throw new Error('Path does not point to a file');
      }

      if (response.data.content) {
        return atob(response.data.content);
      }

      throw new Error('File content not available');
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw new Error('Failed to fetch file content');
    }
  }

  /**
   * Perform comprehensive repository analysis
   */
  async analyzeRepository(owner: string, repo: string): Promise<RepositoryAnalysis> {
    try {
      const [repository, structure, contributors, languages, recentCommits] = await Promise.all([
        this.getRepository(owner, repo),
        this.getRepositoryStructure(owner, repo),
        this.getContributors(owner, repo),
        this.getLanguages(owner, repo),
        this.getRecentCommits(owner, repo, 100),
      ]);

      // Calculate summary statistics
      const totalFiles = this.countFiles(structure);
      const primaryLanguage = this.getPrimaryLanguage(languages);
      const commitFrequency = this.calculateCommitFrequency(recentCommits);

      const summary = {
        totalFiles,
        totalLines: 0, // Would need to analyze file contents
        primaryLanguage,
        lastActivity: repository.pushed_at,
        commitFrequency,
      };

      return {
        repository,
        structure,
        contributors,
        languages,
        recentCommits: recentCommits.slice(0, 20), // Limit to recent 20
        summary,
      };
    } catch (error) {
      console.error('Error analyzing repository:', error);
      throw new Error('Failed to analyze repository');
    }
  }

  /**
   * Parse repository URL to extract owner and repo name
   */
  parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
      /^([^\/]+)\/([^\/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        };
      }
    }

    return null;
  }

  // Helper methods
  private getLanguageFromExtension(filename: string): string | undefined {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'vue': 'Vue',
      'svelte': 'Svelte',
      'md': 'Markdown',
      'json': 'JSON',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'sql': 'SQL',
      'sh': 'Shell',
      'bash': 'Bash',
      'dockerfile': 'Docker',
    };

    return extension ? languageMap[extension] : undefined;
  }

  private isImportantFile(filename: string, path: string): boolean {
    const importantFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'requirements.txt',
      'Pipfile',
      'Gemfile',
      'pom.xml',
      'build.gradle',
      'Cargo.toml',
      'go.mod',
      'composer.json',
      'README.md',
      'LICENSE',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      '.gitignore',
      'Dockerfile',
      'docker-compose.yml',
      'tsconfig.json',
      'webpack.config.js',
      'vite.config.js',
      'next.config.js',
      'tailwind.config.js',
    ];

    return importantFiles.includes(filename.toLowerCase()) || 
           path.includes('src/') || 
           path.includes('lib/') ||
           path.includes('components/');
  }

  private isImportantDirectory(dirname: string): boolean {
    const importantDirs = [
      'src',
      'lib',
      'components',
      'pages',
      'app',
      'api',
      'utils',
      'hooks',
      'services',
      'types',
      'styles',
      'public',
      'assets',
      'config',
      'tests',
      '__tests__',
      'spec',
    ];

    return importantDirs.includes(dirname.toLowerCase());
  }

  private countFiles(structure: FileStructure[]): number {
    let count = 0;
    for (const item of structure) {
      if (item.type === 'file') {
        count++;
      } else if (item.children) {
        count += this.countFiles(item.children);
      }
    }
    return count;
  }

  private getPrimaryLanguage(languages: GitHubLanguages): string {
    const entries = Object.entries(languages);
    if (entries.length === 0) return 'Unknown';
    
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private calculateCommitFrequency(commits: GitHubCommit[]): number {
    if (commits.length === 0) return 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentCommits = commits.filter(commit => 
      new Date(commit.commit.author.date) > thirtyDaysAgo
    );

    return Math.round(recentCommits.length / 4.3); // Average per week
  }
}

export const githubService = new GitHubService();