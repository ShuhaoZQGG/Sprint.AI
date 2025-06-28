import { groqService } from './groq';
import { prGenerator } from './prGenerator';
import { codebaseAnalyzer } from './codebaseAnalyzer';
import { nlpProcessor } from './nlpProcessor';
import { repositoryService } from './repositoryService';
import { commitAnalyzer } from './commitAnalyzer';
import { docGenerator } from './docGenerator';
import { documentationService } from './documentationService';
import { businessSpecService } from './businessSpecService';
import { teamOptimizer } from './teamOptimizer';
import { sprintService } from './sprintService';
import { capacityPlanner } from './capacityPlanner';
import { developerService } from './developerService';
import { taskService } from './taskService';
import { sprintAutomation } from './sprintAutomation';
import { githubService } from './github';
import { Repository, Task, BusinessSpec, Developer } from '../types';
import toast from 'react-hot-toast';

export interface QuickActionContext {
  repositories: Repository[];
  currentRepository?: Repository;
  developers: Developer[];
  tasks: Task[];
  businessSpecs: BusinessSpec[];
}

export interface QuickActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface QuickActionHandler {
  id: string;
  title: string;
  description: string;
  category: 'generation' | 'analysis' | 'automation' | 'management';
  handler: (parameters: any, context: QuickActionContext) => Promise<QuickActionResult>;
  requiredParameters?: string[];
  optionalParameters?: string[];
}

class QuickActionService {
  private handlers: Map<string, QuickActionHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // Task Generation Actions
    this.registerHandler({
      id: 'generate-tasks-from-specs',
      title: 'Generate Tasks from Business Specs',
      description: 'Convert business specifications into technical tasks',
      category: 'generation',
      handler: this.handleGenerateTasksFromSpecs.bind(this),
      optionalParameters: ['specId'],
    });

    this.registerHandler({
      id: 'create-business-spec',
      title: 'Create Business Specification',
      description: 'Create a new business specification',
      category: 'generation',
      handler: this.handleCreateBusinessSpec.bind(this),
      requiredParameters: ['title', 'description'],
      optionalParameters: ['acceptanceCriteria', 'technicalRequirements'],
    });

    // Documentation Actions
    this.registerHandler({
      id: 'generate-documentation',
      title: 'Generate Documentation',
      description: 'Generate comprehensive documentation for repository',
      category: 'generation',
      handler: this.handleGenerateDocumentation.bind(this),
      requiredParameters: ['repositoryId'],
    });

    this.registerHandler({
      id: 'update-documentation',
      title: 'Update Documentation',
      description: 'Update existing documentation with latest changes',
      category: 'generation',
      handler: this.handleUpdateDocumentation.bind(this),
      requiredParameters: ['repositoryId'],
      optionalParameters: ['sections'],
    });

    // PR Generation Actions
    this.registerHandler({
      id: 'generate-pr-template',
      title: 'Generate PR Template',
      description: 'Create PR template with scaffolds for task',
      category: 'generation',
      handler: this.handleGeneratePRTemplate.bind(this),
      requiredParameters: ['taskId'],
      optionalParameters: ['includeScaffolds'],
    });

    this.registerHandler({
      id: 'create-feature-pr',
      title: 'Create Feature PR',
      description: 'Generate PR template for new feature',
      category: 'generation',
      handler: this.handleCreateFeaturePR.bind(this),
      requiredParameters: ['title', 'description'],
      optionalParameters: ['repositoryId'],
    });

    // Analysis Actions
    this.registerHandler({
      id: 'analyze-repository',
      title: 'Analyze Repository',
      description: 'Perform comprehensive repository analysis',
      category: 'analysis',
      handler: this.handleAnalyzeRepository.bind(this),
      requiredParameters: ['repositoryId'],
    });

    this.registerHandler({
      id: 'analyze-team-performance',
      title: 'Analyze Team Performance',
      description: 'Generate team performance insights and recommendations',
      category: 'analysis',
      handler: this.handleAnalyzeTeamPerformance.bind(this),
    });

    this.registerHandler({
      id: 'analyze-sprint-capacity',
      title: 'Analyze Sprint Capacity',
      description: 'Calculate team capacity and sprint recommendations',
      category: 'analysis',
      handler: this.handleAnalyzeSprintCapacity.bind(this),
      optionalParameters: ['sprintId'],
    });

    // Automation Actions
    this.registerHandler({
      id: 'auto-assign-tasks',
      title: 'Auto-assign Tasks',
      description: 'Automatically assign tasks based on capacity and skills',
      category: 'automation',
      handler: this.handleAutoAssignTasks.bind(this),
      optionalParameters: ['sprintId'],
    });

    this.registerHandler({
      id: 'create-optimized-sprint',
      title: 'Create Optimized Sprint',
      description: 'Create AI-optimized sprint with intelligent task selection',
      category: 'automation',
      handler: this.handleCreateOptimizedSprint.bind(this),
      requiredParameters: ['name', 'startDate', 'endDate'],
      optionalParameters: ['autoAssign', 'bufferPercentage'],
    });

    this.registerHandler({
      id: 'balance-workload',
      title: 'Balance Team Workload',
      description: 'Redistribute tasks to balance team workload',
      category: 'automation',
      handler: this.handleBalanceWorkload.bind(this),
      requiredParameters: ['sprintId'],
    });

    // Management Actions
    this.registerHandler({
      id: 'connect-repository',
      title: 'Connect Repository',
      description: 'Connect and analyze a new GitHub repository',
      category: 'management',
      handler: this.handleConnectRepository.bind(this),
      requiredParameters: ['url'],
      optionalParameters: ['analyze'],
    });

    this.registerHandler({
      id: 'update-developer-skills',
      title: 'Update Developer Skills',
      description: 'Update developer skills and preferences',
      category: 'management',
      handler: this.handleUpdateDeveloperSkills.bind(this),
      requiredParameters: ['developerId', 'skills'],
    });
  }

  registerHandler(handler: QuickActionHandler) {
    this.handlers.set(handler.id, handler);
  }

  getHandler(actionId: string): QuickActionHandler | undefined {
    return this.handlers.get(actionId);
  }

  getAllHandlers(): QuickActionHandler[] {
    return Array.from(this.handlers.values());
  }

  getHandlersByCategory(category: QuickActionHandler['category']): QuickActionHandler[] {
    return this.getAllHandlers().filter(handler => handler.category === category);
  }

  async executeAction(
    actionId: string, 
    parameters: any, 
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const handler = this.getHandler(actionId);
    
    if (!handler) {
      return {
        success: false,
        message: `Unknown action: ${actionId}`,
        error: 'Action not found',
      };
    }

    // Validate required parameters
    if (handler.requiredParameters) {
      for (const param of handler.requiredParameters) {
        if (!(param in parameters) || parameters[param] === undefined || parameters[param] === null) {
          return {
            success: false,
            message: `Missing required parameter: ${param}`,
            error: 'Invalid parameters',
          };
        }
      }
    }

    try {
      const result = await handler.handler(parameters, context);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const result = {
        success: false,
        message: `Failed to execute ${handler.title}: ${errorMessage}`,
        error: errorMessage,
      };
      
      toast.error(result.message);
      return result;
    }
  }

  // Handler implementations
  private async handleGenerateTasksFromSpecs(
    parameters: { specId?: string },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const specs = parameters.specId 
      ? context.businessSpecs.filter(spec => spec.id === parameters.specId)
      : context.businessSpecs.filter(spec => spec.status === 'approved');

    if (specs.length === 0) {
      return {
        success: false,
        message: 'No approved business specifications found',
        error: 'No specs available',
      };
    }

    let totalTasks = 0;
    for (const spec of specs) {
      try {
        const response = await nlpProcessor.generateTasksFromBusinessSpec({
          businessSpec: spec,
          teamSkills: context.developers.flatMap(dev => dev.profile.strengths),
          additionalContext: context.currentRepository?.name,
        });
        
        for (const taskData of response.tasks) {
          await taskService.createTask(taskData);
          totalTasks++;
        }
      } catch (error) {
        console.error(`Failed to generate tasks for spec ${spec.title}:`, error);
      }
    }

    return {
      success: true,
      message: `Generated ${totalTasks} tasks from ${specs.length} business specification(s)`,
      data: { tasksCreated: totalTasks, specsProcessed: specs.length },
    };
  }

  private async handleCreateBusinessSpec(
    parameters: { 
      title: string; 
      description: string; 
      acceptanceCriteria?: string[]; 
      technicalRequirements?: string[] 
    },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const spec = await businessSpecService.createBusinessSpec({
      title: parameters.title,
      description: parameters.description,
      acceptanceCriteria: parameters.acceptanceCriteria || [],
      technicalRequirements: parameters.technicalRequirements || [],
      status: 'draft',
      priority: 'medium',
      tags: ['ai-generated'],
      createdAt: new Date(),
    });

    return {
      success: true,
      message: `Created business specification: ${spec.title}`,
      data: spec,
    };
  }

  private async handleGenerateDocumentation(
    parameters: { repositoryId: string },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const repository = context.repositories.find(repo => repo.id === parameters.repositoryId);
    
    if (!repository) {
      return {
        success: false,
        message: 'Repository not found',
        error: 'Invalid repository ID',
      };
    }

    if (!repository.structure) {
      return {
        success: false,
        message: 'Repository structure not available. Please analyze the repository first.',
        error: 'Missing repository structure',
      };
    }

    // Mock repository analysis for documentation generation
    const mockAnalysis = {
      repository: {
        id: parseInt(repository.id),
        name: repository.name,
        full_name: repository.name,
        description: repository.description,
        html_url: repository.url,
        clone_url: repository.url,
        language: repository.language,
        stargazers_count: repository.stars,
        forks_count: 0,
        open_issues_count: 0,
        default_branch: 'main',
        created_at: new Date().toISOString(),
        updated_at: repository.lastUpdated.toISOString(),
        pushed_at: repository.lastUpdated.toISOString(),
        size: 1000,
        owner: {
          login: 'team',
          avatar_url: '',
          html_url: '',
        },
      },
      structure: [],
      contributors: [],
      languages: { [repository.language || 'JavaScript']: 1000 },
      recentCommits: [],
      summary: {
        totalFiles: 50,
        totalLines: 5000,
        primaryLanguage: repository.language || 'JavaScript',
        lastActivity: repository.lastUpdated.toISOString(),
        commitFrequency: 5,
      },
    };

    const documentation = await docGenerator.generateDocumentation(
      repository,
      mockAnalysis
    );

    return {
      success: true,
      message: `Generated documentation for ${repository.name}`,
      data: documentation,
    };
  }

  private async handleUpdateDocumentation(
    parameters: { repositoryId: string; sections?: string[] },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const repository = context.repositories.find(repo => repo.id === parameters.repositoryId);
    
    if (!repository) {
      return {
        success: false,
        message: 'Repository not found',
        error: 'Invalid repository ID',
      };
    }

    const existingDoc = await documentationService.getLatestDocumentation(parameters.repositoryId);
    
    if (!existingDoc) {
      return {
        success: false,
        message: 'No existing documentation found. Generate documentation first.',
        error: 'No documentation exists',
      };
    }

    // Mock update process
    const updatedDoc = await documentationService.updateDocumentation(existingDoc.id, {
      lastUpdated: new Date(),
      sections: existingDoc.sections.map(section => ({
        ...section,
        lastGenerated: new Date(),
      })),
    });

    return {
      success: true,
      message: `Updated documentation for ${repository.name}`,
      data: updatedDoc,
    };
  }

  private async handleGeneratePRTemplate(
    parameters: { taskId: string; includeScaffolds?: boolean },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const task = context.tasks.find(t => t.id === parameters.taskId);
    
    if (!task) {
      return {
        success: false,
        message: 'Task not found',
        error: 'Invalid task ID',
      };
    }

    const repository = context.currentRepository;
    
    if (!repository) {
      return {
        success: false,
        message: 'No repository selected',
        error: 'Repository required',
      };
    }

    const response = await prGenerator.generatePRTemplate({
      task,
      repository,
      includeScaffolds: parameters.includeScaffolds !== false,
    });

    return {
      success: true,
      message: `Generated PR template for task: ${task.title}`,
      data: response.template,
    };
  }

  private async handleCreateFeaturePR(
    parameters: { title: string; description: string; repositoryId?: string },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const repository = parameters.repositoryId 
      ? context.repositories.find(repo => repo.id === parameters.repositoryId)
      : context.currentRepository;
    
    if (!repository) {
      return {
        success: false,
        message: 'No repository specified',
        error: 'Repository required',
      };
    }

    // Create a temporary task for PR generation
    const tempTask = {
      id: 'temp-' + Date.now(),
      title: parameters.title,
      description: parameters.description,
      type: 'feature' as const,
      priority: 'medium' as const,
      status: 'backlog' as const,
      estimatedEffort: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await prGenerator.generatePRTemplate({
      task: tempTask,
      repository,
      includeScaffolds: true,
    });

    return {
      success: true,
      message: `Generated PR template for feature: ${parameters.title}`,
      data: response.template,
    };
  }

  private async handleAnalyzeRepository(
    parameters: { repositoryId: string },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const repository = context.repositories.find(repo => repo.id === parameters.repositoryId);
    
    if (!repository) {
      return {
        success: false,
        message: 'Repository not found',
        error: 'Invalid repository ID',
      };
    }

    const parsed = githubService.parseRepositoryUrl(repository.url);
    
    if (!parsed) {
      return {
        success: false,
        message: 'Invalid repository URL',
        error: 'Cannot parse repository URL',
      };
    }

    const analysis = await githubService.analyzeRepository(parsed.owner, parsed.repo);
    
    // Store analysis results
    await repositoryService.storeAnalysis(repository.id, analysis);

    return {
      success: true,
      message: `Analyzed repository: ${repository.name}`,
      data: analysis,
    };
  }

  private async handleAnalyzeTeamPerformance(
    parameters: {},
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    if (context.developers.length === 0) {
      return {
        success: false,
        message: 'No team members found',
        error: 'No developers available',
      };
    }

    const analysis = await teamOptimizer.analyzeTeam(
      context.developers,
      context.tasks,
      ['React', 'TypeScript', 'Node.js', 'Python'] // Mock project requirements
    );

    return {
      success: true,
      message: `Analyzed performance for ${context.developers.length} team members`,
      data: analysis,
    };
  }

  private async handleAnalyzeSprintCapacity(
    parameters: { sprintId?: string },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const capacity = await capacityPlanner.calculateSprintCapacity(parameters.sprintId);

    return {
      success: true,
      message: `Analyzed sprint capacity: ${capacity.sprintHealth} status`,
      data: capacity,
    };
  }

  private async handleAutoAssignTasks(
    parameters: { sprintId?: string },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    if (!parameters.sprintId) {
      return {
        success: false,
        message: 'Sprint ID required for auto-assignment',
        error: 'Missing sprint ID',
      };
    }

    const result = await capacityPlanner.autoAssignTasks(parameters.sprintId);

    return {
      success: true,
      message: `Auto-assigned ${result.assigned} tasks`,
      data: result,
    };
  }

  private async handleCreateOptimizedSprint(
    parameters: { 
      name: string; 
      startDate: string; 
      endDate: string; 
      autoAssign?: boolean; 
      bufferPercentage?: number 
    },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const result = await sprintAutomation.createOptimizedSprint(
      parameters.name,
      new Date(parameters.startDate),
      new Date(parameters.endDate),
      {
        autoAssignTasks: parameters.autoAssign !== false,
        bufferPercentage: parameters.bufferPercentage || 20,
      }
    );

    return {
      success: true,
      message: `Created optimized sprint: ${result.sprint.name} with ${result.assigned} assigned tasks`,
      data: result,
    };
  }

  private async handleBalanceWorkload(
    parameters: { sprintId: string },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const result = await sprintAutomation.balanceSprintWorkload(parameters.sprintId);

    return {
      success: true,
      message: `Rebalanced ${result.rebalanced} tasks across team members`,
      data: result,
    };
  }

  private async handleConnectRepository(
    parameters: { url: string; analyze?: boolean },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const parsed = githubService.parseRepositoryUrl(parameters.url);
    
    if (!parsed) {
      return {
        success: false,
        message: 'Invalid repository URL format',
        error: 'Cannot parse repository URL',
      };
    }

    try {
      const repoData = await githubService.getRepository(parsed.owner, parsed.repo);
      
      const repository = await repositoryService.addRepository({
        name: repoData.name,
        url: repoData.html_url,
        description: repoData.description || '',
        language: repoData.language || 'Unknown',
        stars: repoData.stargazers_count,
        lastUpdated: new Date(repoData.pushed_at),
      });

      if (parameters.analyze !== false) {
        const analysis = await githubService.analyzeRepository(parsed.owner, parsed.repo);
        await repositoryService.storeAnalysis(repository.id, analysis);
      }

      return {
        success: true,
        message: `Connected repository: ${repository.name}`,
        data: repository,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleUpdateDeveloperSkills(
    parameters: { developerId: string; skills: string[] },
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const developer = context.developers.find(dev => dev.id === parameters.developerId);
    
    if (!developer) {
      return {
        success: false,
        message: 'Developer not found',
        error: 'Invalid developer ID',
      };
    }

    const updatedDeveloper = await developerService.updateSkills(parameters.developerId, {
      strengths: parameters.skills,
      preferredTasks: developer.profile.preferredTasks,
    });

    return {
      success: true,
      message: `Updated skills for ${developer.name}`,
      data: updatedDeveloper,
    };
  }
}

export const quickActionService = new QuickActionService();