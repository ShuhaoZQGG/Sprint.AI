import { FileStructure, RepositoryAnalysis } from '../types/github';
import { CodebaseStructure, Module, Service, Dependency } from '../types';
import { githubService } from './github';

export class CodebaseAnalyzer {
  /**
   * Analyze repository structure and generate codebase intelligence
   */
  async analyzeCodebase(owner: string, repo: string): Promise<CodebaseStructure> {
    try {
      const analysis = await githubService.analyzeRepository(owner, repo);
      
      const modules = await this.extractModules(analysis.structure, owner, repo);
      const services = this.identifyServices(analysis.structure, modules);
      const dependencies = await this.extractDependencies(analysis.structure, owner, repo);
      const summary = this.generateSummary(analysis, modules, services);

      return {
        modules,
        services,
        dependencies,
        summary,
      };
    } catch (error) {
      console.error('Error analyzing codebase:', error);
      throw new Error('Failed to analyze codebase structure');
    }
  }

  /**
   * Extract modules from file structure
   */
  private async extractModules(
    structure: FileStructure[], 
    owner: string, 
    repo: string,
    basePath: string = ''
  ): Promise<Module[]> {
    const modules: Module[] = [];

    for (const item of structure) {
      if (item.type === 'file' && this.isModuleFile(item.name)) {
        const module: Module = {
          name: this.getModuleName(item.name, item.path),
          path: item.path,
          type: this.determineModuleType(item.path, item.name),
          description: await this.generateModuleDescription(item, owner, repo),
          dependencies: await this.extractModuleDependencies(item, owner, repo),
        };
        modules.push(module);
      } else if (item.type === 'directory' && item.children) {
        const childModules = await this.extractModules(item.children, owner, repo, item.path);
        modules.push(...childModules);
      }
    }

    return modules;
  }

  /**
   * Identify services from modules and structure
   */
  private identifyServices(structure: FileStructure[], modules: Module[]): Service[] {
    const services: Service[] = [];

    // Look for API endpoints
    const apiModules = modules.filter(m => 
      m.path.includes('api/') || 
      m.path.includes('routes/') ||
      m.path.includes('controllers/')
    );

    if (apiModules.length > 0) {
      services.push({
        name: 'API Service',
        type: 'api',
        description: 'REST API endpoints and controllers',
        endpoints: this.extractEndpoints(apiModules),
      });
    }

    // Look for database connections
    const dbModules = modules.filter(m => 
      m.name.toLowerCase().includes('db') ||
      m.name.toLowerCase().includes('database') ||
      m.dependencies.some(dep => this.isDatabaseDependency(dep))
    );

    if (dbModules.length > 0) {
      services.push({
        name: 'Database Service',
        type: 'database',
        description: 'Database connections and data access layer',
      });
    }

    // Look for authentication
    const authModules = modules.filter(m => 
      m.name.toLowerCase().includes('auth') ||
      m.path.includes('auth/') ||
      m.dependencies.some(dep => this.isAuthDependency(dep))
    );

    if (authModules.length > 0) {
      services.push({
        name: 'Authentication Service',
        type: 'auth',
        description: 'User authentication and authorization',
      });
    }

    // Look for external integrations
    const externalModules = modules.filter(m => 
      m.dependencies.some(dep => this.isExternalServiceDependency(dep))
    );

    if (externalModules.length > 0) {
      services.push({
        name: 'External Integrations',
        type: 'external',
        description: 'Third-party service integrations',
      });
    }

    return services;
  }

  /**
   * Extract dependencies from package files
   */
  private async extractDependencies(
    structure: FileStructure[], 
    owner: string, 
    repo: string
  ): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];

    // Look for package.json
    const packageJson = this.findFile(structure, 'package.json');
    if (packageJson) {
      try {
        const content = await githubService.getFileContent(owner, repo, packageJson.path);
        const parsed = JSON.parse(content);
        
        if (parsed.dependencies) {
          Object.entries(parsed.dependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'production',
            });
          });
        }

        if (parsed.devDependencies) {
          Object.entries(parsed.devDependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'development',
            });
          });
        }
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    // Look for requirements.txt (Python)
    const requirementsTxt = this.findFile(structure, 'requirements.txt');
    if (requirementsTxt) {
      try {
        const content = await githubService.getFileContent(owner, repo, requirementsTxt.path);
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        lines.forEach(line => {
          const [name, version] = line.split('==');
          dependencies.push({
            name: name.trim(),
            version: version?.trim() || 'latest',
            type: 'production',
          });
        });
      } catch (error) {
        console.warn('Failed to parse requirements.txt:', error);
      }
    }

    return dependencies;
  }

  /**
   * Generate codebase summary
   */
  private generateSummary(
    analysis: RepositoryAnalysis, 
    modules: Module[], 
    services: Service[]
  ): string {
    const { repository, summary } = analysis;
    
    const parts = [
      `${repository.name} is a ${summary.primaryLanguage} project`,
      `with ${modules.length} modules and ${services.length} services.`,
    ];

    if (services.length > 0) {
      const serviceTypes = services.map(s => s.type).join(', ');
      parts.push(`It includes ${serviceTypes} functionality.`);
    }

    parts.push(`The project has ${summary.totalFiles} files and receives approximately ${summary.commitFrequency} commits per week.`);

    return parts.join(' ');
  }

  // Helper methods
  private isModuleFile(filename: string): boolean {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  private getModuleName(filename: string, path: string): string {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const pathParts = path.split('/');
    
    if (pathParts.length > 1) {
      return `${pathParts[pathParts.length - 2]}/${nameWithoutExt}`;
    }
    
    return nameWithoutExt;
  }

  private determineModuleType(path: string, filename: string): Module['type'] {
    if (path.includes('component') || filename.includes('Component')) {
      return 'component';
    }
    if (path.includes('service') || path.includes('api/')) {
      return 'service';
    }
    if (path.includes('util') || path.includes('helper')) {
      return 'utility';
    }
    if (path.includes('config') || filename.includes('config')) {
      return 'config';
    }
    return 'utility';
  }

  private async generateModuleDescription(
    file: FileStructure, 
    owner: string, 
    repo: string
  ): Promise<string> {
    // For now, generate a basic description based on file name and path
    // This could be enhanced with AI analysis of the actual file content
    const name = file.name.replace(/\.[^/.]+$/, '');
    const pathParts = file.path.split('/');
    
    if (pathParts.includes('components')) {
      return `React component for ${name} functionality`;
    }
    if (pathParts.includes('services')) {
      return `Service module for ${name} operations`;
    }
    if (pathParts.includes('utils')) {
      return `Utility functions for ${name}`;
    }
    if (pathParts.includes('hooks')) {
      return `Custom React hook for ${name}`;
    }
    
    return `Module handling ${name} functionality`;
  }

  private async extractModuleDependencies(
    file: FileStructure, 
    owner: string, 
    repo: string
  ): Promise<string[]> {
    try {
      const content = await githubService.getFileContent(owner, repo, file.path);
      const dependencies: string[] = [];

      // Extract import statements (JavaScript/TypeScript)
      const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const dep = match[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          dependencies.push(dep.split('/')[0]); // Get package name
        }
      }

      // Extract require statements
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const dep = match[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          dependencies.push(dep.split('/')[0]);
        }
      }

      return [...new Set(dependencies)]; // Remove duplicates
    } catch (error) {
      console.warn(`Failed to analyze dependencies for ${file.path}:`, error);
      return [];
    }
  }

  private extractEndpoints(apiModules: Module[]): string[] {
    // This is a simplified extraction - could be enhanced with actual code analysis
    const endpoints: string[] = [];
    
    apiModules.forEach(module => {
      const pathParts = module.path.split('/');
      const filename = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, '');
      
      if (filename !== 'index') {
        endpoints.push(`/${filename}`);
      }
    });

    return endpoints;
  }

  private findFile(structure: FileStructure[], filename: string): FileStructure | null {
    for (const item of structure) {
      if (item.type === 'file' && item.name === filename) {
        return item;
      }
      if (item.type === 'directory' && item.children) {
        const found = this.findFile(item.children, filename);
        if (found) return found;
      }
    }
    return null;
  }

  private isDatabaseDependency(dep: string): boolean {
    const dbDeps = ['mongoose', 'sequelize', 'prisma', 'typeorm', 'knex', 'pg', 'mysql', 'sqlite3'];
    return dbDeps.some(dbDep => dep.includes(dbDep));
  }

  private isAuthDependency(dep: string): boolean {
    const authDeps = ['passport', 'jsonwebtoken', 'bcrypt', 'auth0', 'firebase-auth'];
    return authDeps.some(authDep => dep.includes(authDep));
  }

  private isExternalServiceDependency(dep: string): boolean {
    const externalDeps = ['axios', 'fetch', 'stripe', 'twilio', 'sendgrid', 'aws-sdk'];
    return externalDeps.some(extDep => dep.includes(extDep));
  }
}

export const codebaseAnalyzer = new CodebaseAnalyzer();