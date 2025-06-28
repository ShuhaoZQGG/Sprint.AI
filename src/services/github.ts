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
import toast from 'react-hot-toast';

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

      return response.data.items
        .filter(item => item.owner && item.owner.login && item.owner.avatar_url && item.owner.html_url)
        .map(item => ({
          ...item,
          owner: {
            login: item.owner!.login,
            avatar_url: item.owner!.avatar_url,
            html_url: item.owner!.html_url,
          },
        })) as GitHubRepository[];
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

      return response.data.map(commit => ({
        ...commit,
        commit: {
          ...commit.commit,
          author: commit.commit.author ? {
            name: commit.commit.author.name || '',
            email: commit.commit.author.email || '',
            date: commit.commit.author.date || '',
          } : { name: '', email: '', date: '' },
        },
      })) as GitHubCommit[];
    } catch (error) {
      console.error('Error fetching commits:', error);
      throw new Error('Failed to fetch repository commits');
    }
  }

  /**
   * Get commits with additional parameters
   */
  async getCommits(
    repositoryId: string, 
    options: {
      since?: string;
      until?: string;
      author?: string;
      path?: string;
    } = {}
  ): Promise<GitHubCommit[]> {
    try {
      // For now, we'll use a mock implementation since we don't have the actual repo details
      // In a real implementation, you'd parse the repository ID to get owner/repo
      const response = await this.octokit.rest.repos.listCommits({
        owner: 'example', // This would be parsed from repositoryId
        repo: 'repo', // This would be parsed from repositoryId
        since: options.since,
        until: options.until,
        author: options.author,
        path: options.path,
        per_page: 100,
      });

      return response.data.map(commit => ({
        ...commit,
        commit: {
          ...commit.commit,
          author: commit.commit.author ? {
            name: commit.commit.author.name || '',
            email: commit.commit.author.email || '',
            date: commit.commit.author.date || '',
          } : { name: '', email: '', date: '' },
        },
      })) as GitHubCommit[];
    } catch (error) {
      console.error('Error fetching commits with options:', error);
      throw new Error('Failed to fetch commits');
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

      return response.data
        .filter(contributor => typeof contributor.login === 'string')
        .map(contributor => ({
          ...contributor,
          login: contributor.login || '',
        })) as GitHubContributor[];
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
   * Helper to get the OAuth token for a repository (by repo id or url)
   * Returns the token from localStorage if available, otherwise undefined.
   */
  getRepoOAuthToken(repoUrlOrId: string): string | undefined {
    // Try by repo id
    let token = localStorage.getItem(`github_oauth_token_${repoUrlOrId}`);
    if (token) return token;
    // Try by repo url
    token = localStorage.getItem(`github_oauth_token_${btoa(repoUrlOrId)}`);
    return token || undefined;
  }

  /**
   * Create a new branch
   */
  async createBranch(owner: string, repo: string, branchName: string, fromBranch: string = 'main'): Promise<void> {
    try {
      // Get the OAuth token for this repo
      const repoKey = `${owner}/${repo}`;
      const token = this.getRepoOAuthToken(repoKey) || import.meta.env.VITE_GITHUB_TOKEN;
      // Get the SHA of the source branch
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (error: any) {
      if (error.status === 403) {
        toast.error('GitHub token does not have write access. Please re-authorize with the repo scope and ensure you have write access to this repository.');
      }
      console.error('Error creating branch:', error);
      throw new Error('Failed to create branch');
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<{ prUrl: string; prNumber: number }> {
    try {
      const repoKey = `${owner}/${repo}`;
      const token = this.getRepoOAuthToken(repoKey) || import.meta.env.VITE_GITHUB_TOKEN;
      const response = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return {
        prUrl: response.data.html_url,
        prNumber: response.data.number,
      };
    } catch (error) {
      console.error('Error creating pull request:', error);
      throw new Error('Failed to create pull request');
    }
  }

  /**
   * Create or update file content
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch?: string
  ): Promise<void> {
    try {
      let sha: string | undefined;
      const repoKey = `${owner}/${repo}`;
      const token = this.getRepoOAuthToken(repoKey) || import.meta.env.VITE_GITHUB_TOKEN;
      try {
        const { data: fileData } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!Array.isArray(fileData) && fileData.type === 'file') {
          sha = fileData.sha;
        }
      } catch (error) {
        // File doesn't exist, that's okay
      }
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: btoa(content),
        sha,
        branch,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (error) {
      console.error('Error creating/updating file:', error);
      throw new Error('Failed to create or update file');
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

      let structureArr = Array.isArray(structure) ? structure : [structure];
      const rootStructure: FileStructure = {
        name: repository.name,
        path: '',
        type: 'directory',
        children: structureArr,
      };
      return {
        repository,
        structure: [rootStructure],
        contributors,
        languages,
        recentCommits: recentCommits.slice(0, 20),
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

/**
 * Generate the GitHub App OAuth URL for user access token flow
 */
export function getGitHubAppOAuthUrl(clientId: string, redirectUri: string, state: string) {
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}

/**
 * Exchange code for a GitHub App user access token (user-to-server)
 * See: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
 * This should be called from your backend for security.
 */
export async function exchangeOAuthCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || 'Failed to exchange code for token');
  }
  return data.access_token; // This is a user access token (starts with ghu_)
}