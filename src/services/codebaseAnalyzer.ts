import { FileStructure, RepositoryAnalysis } from '../types/github';
import { CodebaseStructure, Module, Service, Dependency } from '../types';
import { githubService } from './github';

export interface CodebaseContext {
  relevantModules: Module[];
  affectedFiles: string[];
  dependencies: Dependency[];
  architecture: {
    patterns: string[];
    layers: string[];
    frameworks: string[];
  };
  complexity: {
    estimatedEffort: number;
    riskLevel: 'low' | 'medium' | 'high';
    dependencies: string[];
  };
}

export class CodebaseAnalyzer {
  /**
   * Analyze repository structure and generate codebase intelligence
   */
  async analyzeCodebase(owner: string, repo: string): Promise<CodebaseStructure> {
    try {
      const analysis = await githubService.analyzeRepository(owner, repo);
      
      const modules = await this.extractModules([analysis.structure], owner, repo);
      const services = this.identifyServices([analysis.structure], modules);
      const dependencies = await this.extractDependencies([analysis.structure], owner, repo);
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
   * Analyze codebase context for a specific task or feature
   */
  async analyzeTaskContext(
    codebase: CodebaseStructure,
    taskDescription: string,
    taskType: string
  ): Promise<CodebaseContext> {
    try {
      // Identify relevant modules based on task description
      const relevantModules = this.findRelevantModules(codebase.modules, taskDescription, taskType);
      
      // Extract affected files
      const affectedFiles = this.identifyAffectedFiles(relevantModules, taskDescription, taskType);
      
      // Analyze dependencies
      const relevantDependencies = this.findRelevantDependencies(codebase.dependencies, taskDescription);
      
      // Analyze architecture patterns
      const architecture = this.analyzeArchitecturePatterns(codebase, relevantModules);
      
      // Estimate complexity
      const complexity = this.estimateTaskComplexity(relevantModules, affectedFiles, taskType);

      return {
        relevantModules,
        affectedFiles,
        dependencies: relevantDependencies,
        architecture,
        complexity,
      };
    } catch (error) {
      console.error('Error analyzing task context:', error);
      throw new Error('Failed to analyze task context');
    }
  }

  /**
   * Find modules relevant to a task based on description and type
   */
  private findRelevantModules(modules: Module[], taskDescription: string, taskType: string): Module[] {
    const keywords = this.extractKeywords(taskDescription);
    const relevantModules: Module[] = [];

    modules.forEach(module => {
      let relevanceScore = 0;

      // Check module name and path for keywords
      keywords.forEach(keyword => {
        if (module.name.toLowerCase().includes(keyword.toLowerCase())) {
          relevanceScore += 3;
        }
        if (module.path.toLowerCase().includes(keyword.toLowerCase())) {
          relevanceScore += 2;
        }
        if (module.description.toLowerCase().includes(keyword.toLowerCase())) {
          relevanceScore += 1;
        }
      });

      // Boost score based on task type and module type alignment
      if (this.isModuleTypeRelevant(module.type, taskType)) {
        relevanceScore += 2;
      }

      // Include modules with relevance score above threshold
      if (relevanceScore >= 2) {
        relevantModules.push(module);
      }
    });

    // Sort by relevance and return top modules
    return relevantModules.sort((a, b) => {
      const scoreA = this.calculateModuleRelevance(a, keywords, taskType);
      const scoreB = this.calculateModuleRelevance(b, keywords, taskType);
      return scoreB - scoreA;
    }).slice(0, 10);
  }

  /**
   * Identify files that will likely be affected by the task
   */
  private identifyAffectedFiles(modules: Module[], taskDescription: string, taskType: string): string[] {
    const affectedFiles: string[] = [];

    modules.forEach(module => {
      affectedFiles.push(module.path);

      // Add related files based on task type
      if (taskType === 'feature') {
        // For features, include test files and related components
        const testFile = this.getTestFilePath(module.path);
        if (testFile) affectedFiles.push(testFile);
        
        const storyFile = this.getStoryFilePath(module.path);
        if (storyFile) affectedFiles.push(storyFile);
      } else if (taskType === 'bug') {
        // For bugs, focus on the specific module and its tests
        const testFile = this.getTestFilePath(module.path);
        if (testFile) affectedFiles.push(testFile);
      } else if (taskType === 'docs') {
        // For documentation, include README and doc files
        affectedFiles.push('README.md');
        affectedFiles.push(`docs/${module.name}.md`);
      }
    });

    return [...new Set(affectedFiles)]; // Remove duplicates
  }

  /**
   * Find dependencies relevant to the task
   */
  private findRelevantDependencies(dependencies: Dependency[], taskDescription: string): Dependency[] {
    const keywords = this.extractKeywords(taskDescription);
    
    return dependencies.filter(dep => {
      return keywords.some(keyword => 
        dep.name.toLowerCase().includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Analyze architecture patterns in the codebase
   */
  private analyzeArchitecturePatterns(codebase: CodebaseStructure, relevantModules: Module[]): CodebaseContext['architecture'] {
    const patterns: string[] = [];
    const layers: string[] = [];
    const frameworks: string[] = [];

    // Detect common patterns
    if (relevantModules.some(m => m.type === 'component')) {
      patterns.push('Component-based Architecture');
    }
    if (relevantModules.some(m => m.type === 'service')) {
      patterns.push('Service Layer Pattern');
    }
    if (codebase.modules.some(m => m.path.includes('store') || m.path.includes('redux'))) {
      patterns.push('State Management Pattern');
    }

    // Detect layers
    const layerPaths = ['components', 'services', 'utils', 'hooks', 'stores'];
    layerPaths.forEach(layer => {
      if (codebase.modules.some(m => m.path.includes(layer))) {
        layers.push(layer);
      }
    });

    // Detect frameworks from dependencies
    const frameworkDeps = ['react', 'vue', 'angular', 'express', 'fastapi', 'django'];
    frameworkDeps.forEach(framework => {
      if (codebase.dependencies.some(d => d.name.includes(framework))) {
        frameworks.push(framework);
      }
    });

    return { patterns, layers, frameworks };
  }

  /**
   * Estimate task complexity based on codebase analysis
   */
  private estimateTaskComplexity(
    modules: Module[], 
    affectedFiles: string[], 
    taskType: string
  ): CodebaseContext['complexity'] {
    let estimatedEffort = 4; // Base effort in hours
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const dependencies: string[] = [];

    // Adjust effort based on number of affected modules
    estimatedEffort += modules.length * 2;

    // Adjust based on task type
    const taskTypeMultipliers = {
      feature: 1.5,
      bug: 0.8,
      refactor: 1.2,
      docs: 0.5,
      test: 0.7,
      devops: 1.3,
    };
    estimatedEffort *= taskTypeMultipliers[taskType as keyof typeof taskTypeMultipliers] || 1;

    // Assess risk level
    if (modules.length > 5) {
      riskLevel = 'high';
      estimatedEffort *= 1.3;
    } else if (modules.length > 2) {
      riskLevel = 'medium';
      estimatedEffort *= 1.1;
    }

    // Check for complex dependencies
    modules.forEach(module => {
      if (module.dependencies.length > 3) {
        riskLevel = 'medium';
        dependencies.push(...module.dependencies);
      }
    });

    // Cap effort at reasonable maximum
    estimatedEffort = Math.min(estimatedEffort, 40);

    return {
      estimatedEffort: Math.round(estimatedEffort),
      riskLevel,
      dependencies: [...new Set(dependencies)],
    };
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
  private extractKeywords(text: string): string[] {
    // Extract meaningful keywords from task description
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Filter out common words
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    
    return words.filter(word => !stopWords.includes(word));
  }

  private isModuleTypeRelevant(moduleType: Module['type'], taskType: string): boolean {
    const relevanceMap = {
      feature: ['component', 'service'],
      bug: ['component', 'service', 'utility'],
      refactor: ['component', 'service', 'utility'],
      docs: ['component', 'service'],
      test: ['component', 'service'],
      devops: ['config', 'utility'],
    };
    
    return relevanceMap[taskType as keyof typeof relevanceMap]?.includes(moduleType) || false;
  }

  private calculateModuleRelevance(module: Module, keywords: string[], taskType: string): number {
    let score = 0;
    
    keywords.forEach(keyword => {
      if (module.name.toLowerCase().includes(keyword)) score += 3;
      if (module.path.toLowerCase().includes(keyword)) score += 2;
      if (module.description.toLowerCase().includes(keyword)) score += 1;
    });
    
    if (this.isModuleTypeRelevant(module.type, taskType)) score += 2;
    
    return score;
  }

  private getTestFilePath(modulePath: string): string | null {
    const pathParts = modulePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Common test file patterns
    const testPatterns = [
      `${nameWithoutExt}.test.ts`,
      `${nameWithoutExt}.test.js`,
      `${nameWithoutExt}.spec.ts`,
      `${nameWithoutExt}.spec.js`,
      `__tests__/${nameWithoutExt}.test.ts`,
    ];
    
    return testPatterns[0]; // Return first pattern for simplicity
  }

  private getStoryFilePath(modulePath: string): string | null {
    const pathParts = modulePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    if (modulePath.includes('components/')) {
      return `${nameWithoutExt}.stories.tsx`;
    }
    
    return null;
  }

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