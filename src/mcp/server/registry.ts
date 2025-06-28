import { MCPServerTool, MCPServerRegistry, MCPExecutionContext } from './types';
import { MCPServiceExport } from '../../types/mcp';

// Import all services for MCP exposure
import { docGenerator } from '../../services/docGenerator';
import { codebaseAnalyzer } from '../../services/codebaseAnalyzer';
import { prGenerator } from '../../services/prGenerator';
import { taskService } from '../../services/taskService';
import { businessSpecService } from '../../services/businessSpecService';
import { repositoryService } from '../../services/repositoryService';
import { developerService } from '../../services/developerService';
import { sprintService } from '../../services/sprintService';
import { sprintAutomation } from '../../services/sprintAutomation';
import { teamOptimizer } from '../../services/teamOptimizer';
import { capacityPlanner } from '../../services/capacityPlanner';
import { commitAnalyzer } from '../../services/commitAnalyzer';
import { documentationService } from '../../services/documentationService';
import { nlpProcessor } from '../../services/nlpProcessor';
import { groqService } from '../../services/groq';

class MCPRegistry {
  private registry: MCPServerRegistry;

  constructor() {
    this.registry = {
      tools: new Map(),
      categories: new Map(),
    };
    this.initializeTools();
  }

  private initializeTools() {
    // Documentation Generation Tools
    this.registerTool({
      id: 'generate-documentation',
      name: 'Generate Documentation',
      description: 'Generate comprehensive documentation for a repository using AI',
      parameters: {
        type: 'object',
        properties: {
          repositoryId: {
            type: 'string',
            description: 'ID of the repository to generate documentation for',
          },
          sections: {
            type: 'array',
            description: 'Specific sections to generate (optional)',
          },
        },
        required: ['repositoryId'],
      },
      returns: {
        type: 'object',
        description: 'Generated documentation with sections and metadata',
      },
      handler: async (params, context) => {
        const { repositoryId, sections } = params;
        const repository = context.repositories?.find((r: any) => r.id === repositoryId);
        
        if (!repository) {
          throw new Error('Repository not found');
        }

        // Mock analysis for documentation generation
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

        return await docGenerator.generateDocumentation(repository, mockAnalysis);
      },
      category: 'generation',
    });

    // Codebase Analysis Tools
    this.registerTool({
      id: 'analyze-codebase',
      name: 'Analyze Codebase',
      description: 'Perform comprehensive codebase analysis and generate insights',
      parameters: {
        type: 'object',
        properties: {
          repositoryId: {
            type: 'string',
            description: 'ID of the repository to analyze',
          },
          analysisType: {
            type: 'string',
            description: 'Type of analysis to perform',
            enum: ['structure', 'complexity', 'dependencies', 'all'],
          },
        },
        required: ['repositoryId'],
      },
      returns: {
        type: 'object',
        description: 'Codebase analysis results with metrics and insights',
      },
      handler: async (params, context) => {
        const { repositoryId, analysisType = 'all' } = params;
        const repository = context.repositories?.find((r: any) => r.id === repositoryId);
        
        if (!repository) {
          throw new Error('Repository not found');
        }

        if (!repository.structure) {
          throw new Error('Repository structure not available. Please analyze the repository first.');
        }

        return await codebaseAnalyzer.analyzeCodebase('owner', 'repo');
      },
      category: 'analysis',
    });

    // PR Generation Tools
    this.registerTool({
      id: 'generate-pr-template',
      name: 'Generate PR Template',
      description: 'Generate PR template with scaffolds and automation',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID of the task to generate PR for',
          },
          repositoryId: {
            type: 'string',
            description: 'ID of the target repository',
          },
          includeScaffolds: {
            type: 'boolean',
            description: 'Whether to include file scaffolds',
          },
        },
        required: ['taskId', 'repositoryId'],
      },
      returns: {
        type: 'object',
        description: 'Generated PR template with branch name, description, and scaffolds',
      },
      handler: async (params, context) => {
        const { taskId, repositoryId, includeScaffolds = true } = params;
        const task = context.tasks?.find((t: any) => t.id === taskId);
        const repository = context.repositories?.find((r: any) => r.id === repositoryId);
        
        if (!task) {
          throw new Error('Task not found');
        }
        if (!repository) {
          throw new Error('Repository not found');
        }

        const response = await prGenerator.generatePRTemplate({
          task,
          repository,
          includeScaffolds,
        });

        return response.template;
      },
      category: 'generation',
    });

    // Task Management Tools
    this.registerTool({
      id: 'create-task',
      name: 'Create Task',
      description: 'Create a new development task',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Task title',
          },
          description: {
            type: 'string',
            description: 'Task description',
          },
          type: {
            type: 'string',
            description: 'Task type',
            enum: ['feature', 'bug', 'refactor', 'docs', 'test', 'devops'],
          },
          priority: {
            type: 'string',
            description: 'Task priority',
            enum: ['low', 'medium', 'high', 'critical'],
          },
          estimatedEffort: {
            type: 'number',
            description: 'Estimated effort in hours',
          },
          assigneeId: {
            type: 'string',
            description: 'ID of the developer to assign to (optional)',
          },
        },
        required: ['title', 'description', 'type', 'priority'],
      },
      returns: {
        type: 'object',
        description: 'Created task object',
      },
      handler: async (params, context) => {
        const { assigneeId, ...taskData } = params;
        
        const task = {
          ...taskData,
          status: 'backlog' as const,
          assignee: assigneeId ? context.developers?.find((d: any) => d.id === assigneeId) : undefined,
        };

        return await taskService.createTask(task);
      },
      category: 'management',
    });

    // Business Spec Tools
    this.registerTool({
      id: 'create-business-spec',
      name: 'Create Business Specification',
      description: 'Create a new business specification',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Specification title',
          },
          description: {
            type: 'string',
            description: 'Specification description',
          },
          acceptanceCriteria: {
            type: 'array',
            description: 'List of acceptance criteria',
          },
          technicalRequirements: {
            type: 'array',
            description: 'List of technical requirements',
          },
          priority: {
            type: 'string',
            description: 'Specification priority',
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
        required: ['title', 'description'],
      },
      returns: {
        type: 'object',
        description: 'Created business specification',
      },
      handler: async (params, context) => {
        const spec = {
          ...params,
          acceptanceCriteria: params.acceptanceCriteria || [],
          technicalRequirements: params.technicalRequirements || [],
          status: 'draft' as const,
          priority: params.priority || 'medium',
          tags: ['mcp-generated'],
          createdAt: new Date(),
        };

        return await businessSpecService.createBusinessSpec(spec);
      },
      category: 'generation',
    });

    // Team Analysis Tools
    this.registerTool({
      id: 'analyze-team-performance',
      name: 'Analyze Team Performance',
      description: 'Analyze team performance and provide insights',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            description: 'Analysis timeframe',
            enum: ['week', 'month', 'quarter', 'year'],
          },
          includeRecommendations: {
            type: 'boolean',
            description: 'Whether to include improvement recommendations',
          },
        },
      },
      returns: {
        type: 'object',
        description: 'Team performance analysis with metrics and insights',
      },
      handler: async (params, context) => {
        const { timeframe = 'month', includeRecommendations = true } = params;
        
        if (!context.developers || context.developers.length === 0) {
          throw new Error('No team members found');
        }

        const analysis = await teamOptimizer.analyzeTeam(
          context.developers,
          context.tasks || [],
          ['React', 'TypeScript', 'Node.js', 'Python']
        );

        return {
          ...analysis,
          timeframe,
          timestamp: new Date(),
        };
      },
      category: 'analysis',
    });

    // Sprint Management Tools
    this.registerTool({
      id: 'create-optimized-sprint',
      name: 'Create Optimized Sprint',
      description: 'Create an AI-optimized sprint with intelligent task selection',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Sprint name',
          },
          startDate: {
            type: 'string',
            description: 'Sprint start date (ISO string)',
          },
          endDate: {
            type: 'string',
            description: 'Sprint end date (ISO string)',
          },
          autoAssign: {
            type: 'boolean',
            description: 'Whether to auto-assign tasks',
          },
          bufferPercentage: {
            type: 'number',
            description: 'Buffer percentage for capacity planning',
          },
        },
        required: ['name', 'startDate', 'endDate'],
      },
      returns: {
        type: 'object',
        description: 'Created sprint with optimization results',
      },
      handler: async (params, context) => {
        const { name, startDate, endDate, autoAssign = true, bufferPercentage = 20 } = params;
        
        const result = await sprintAutomation.createOptimizedSprint(
          name,
          new Date(startDate),
          new Date(endDate),
          {
            autoAssignTasks: autoAssign,
            bufferPercentage,
          }
        );

        return result;
      },
      category: 'automation',
    });

    // Capacity Planning Tools
    this.registerTool({
      id: 'analyze-sprint-capacity',
      name: 'Analyze Sprint Capacity',
      description: 'Analyze team capacity and sprint recommendations',
      parameters: {
        type: 'object',
        properties: {
          sprintId: {
            type: 'string',
            description: 'Sprint ID to analyze (optional)',
          },
          duration: {
            type: 'number',
            description: 'Sprint duration in days',
          },
          bufferPercentage: {
            type: 'number',
            description: 'Buffer percentage for capacity planning',
          },
        },
      },
      returns: {
        type: 'object',
        description: 'Capacity analysis with recommendations',
      },
      handler: async (params, context) => {
        const { sprintId, duration = 14, bufferPercentage = 20 } = params;
        
        const capacity = await capacityPlanner.calculateSprintCapacity(sprintId, {
          sprintDuration: duration,
          bufferPercentage,
          includeTimeOff: true,
          skillWeighting: true,
        });

        return capacity;
      },
      category: 'analysis',
    });

    // Repository Management Tools
    this.registerTool({
      id: 'connect-repository',
      name: 'Connect Repository',
      description: 'Connect and analyze a new GitHub repository',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'GitHub repository URL',
          },
          analyze: {
            type: 'boolean',
            description: 'Whether to perform initial analysis',
          },
        },
        required: ['url'],
      },
      returns: {
        type: 'object',
        description: 'Connected repository with analysis results',
      },
      handler: async (params, context) => {
        const { url, analyze = true } = params;
        
        // This would integrate with the actual GitHub service
        // For now, return a mock response
        return {
          success: true,
          message: `Repository ${url} connected successfully`,
          repository: {
            id: 'new-repo-id',
            name: 'connected-repo',
            url,
            analyzed: analyze,
          },
        };
      },
      category: 'management',
    });

    // NLP Query Tool
    this.registerTool({
      id: 'process-natural-language',
      name: 'Process Natural Language Query',
      description: 'Process natural language queries and extract intent',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query to process',
          },
          includeActions: {
            type: 'boolean',
            description: 'Whether to include suggested actions',
          },
        },
        required: ['query'],
      },
      returns: {
        type: 'object',
        description: 'Processed query with intent and suggested actions',
      },
      handler: async (params, context) => {
        const { query, includeActions = true } = params;
        
        const queryContext = {
          repositories: context.repositories || [],
          developers: context.developers || [],
          tasks: context.tasks || [],
          documentation: [],
          currentRepository: context.currentRepository,
          businessSpecs: context.businessSpecs || [],
        };

        return await nlpProcessor.processQuery(query, queryContext);
      },
      category: 'analysis',
    });

    // List repositories tool
    this.registerTool({
      id: 'list-repositories',
      name: 'List Repositories',
      description: 'List all repositories for the current team',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of repositories to return',
          },
        },
      },
      returns: {
        type: 'array',
        description: 'List of repositories',
      },
      handler: async (params, context) => {
        const { limit = 10 } = params;
        
        if (!context.repositories || context.repositories.length === 0) {
          return { repositories: [], message: 'No repositories found' };
        }
        
        return { 
          repositories: context.repositories.slice(0, limit),
          count: context.repositories.length
        };
      },
      category: 'management',
    });

    // List tasks tool
    this.registerTool({
      id: 'list-tasks',
      name: 'List Tasks',
      description: 'List tasks with optional filtering',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by task status',
            enum: ['backlog', 'todo', 'in-progress', 'review', 'done'],
          },
          assigneeId: {
            type: 'string',
            description: 'Filter by assignee ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of tasks to return',
          },
        },
      },
      returns: {
        type: 'array',
        description: 'List of tasks',
      },
      handler: async (params, context) => {
        const { status, assigneeId, limit = 10 } = params;
        
        if (!context.tasks || context.tasks.length === 0) {
          return { tasks: [], message: 'No tasks found' };
        }
        
        let filteredTasks = [...context.tasks];
        
        if (status) {
          filteredTasks = filteredTasks.filter(task => task.status === status);
        }
        
        if (assigneeId) {
          filteredTasks = filteredTasks.filter(task => task.assignee?.id === assigneeId);
        }
        
        return { 
          tasks: filteredTasks.slice(0, limit),
          count: filteredTasks.length
        };
      },
      category: 'management',
    });

    // List business specs tool
    this.registerTool({
      id: 'list-business-specs',
      name: 'List Business Specifications',
      description: 'List business specifications with optional filtering',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by specification status',
            enum: ['draft', 'review', 'approved', 'implemented'],
          },
          limit: {
            type: 'number',
            description: 'Maximum number of specifications to return',
          },
        },
      },
      returns: {
        type: 'array',
        description: 'List of business specifications',
      },
      handler: async (params, context) => {
        const { status, limit = 10 } = params;
        
        if (!context.businessSpecs || context.businessSpecs.length === 0) {
          return { specs: [], message: 'No business specifications found' };
        }
        
        let filteredSpecs = [...context.businessSpecs];
        
        if (status) {
          filteredSpecs = filteredSpecs.filter(spec => spec.status === status);
        }
        
        return { 
          specs: filteredSpecs.slice(0, limit),
          count: filteredSpecs.length
        };
      },
      category: 'management',
    });

    // Generate tasks from business spec
    this.registerTool({
      id: 'generate-tasks-from-specs',
      name: 'Generate Tasks from Business Specification',
      description: 'Generate technical tasks from a business specification',
      parameters: {
        type: 'object',
        properties: {
          specId: {
            type: 'string',
            description: 'ID of the business specification',
          },
        },
        required: ['specId'],
      },
      returns: {
        type: 'object',
        description: 'Generated tasks with reasoning',
      },
      handler: async (params, context) => {
        const { specId } = params;
        
        const spec = context.businessSpecs?.find((s: any) => s.id === specId);
        if (!spec) {
          throw new Error('Business specification not found');
        }
        
        // This would normally call the AI service to generate tasks
        // For now, return mock tasks
        return {
          tasks: [
            {
              title: `Implement ${spec.title}`,
              description: `Technical implementation for: ${spec.description}`,
              type: 'feature',
              priority: spec.priority || 'medium',
              status: 'backlog',
              estimatedEffort: 8,
            },
            {
              title: `Test ${spec.title}`,
              description: `Create comprehensive tests for ${spec.title}`,
              type: 'test',
              priority: spec.priority || 'medium',
              status: 'backlog',
              estimatedEffort: 4,
            },
          ],
          reasoning: 'Generated tasks based on business specification',
          confidence: 0.8,
        };
      },
      category: 'generation',
    });
  }

  private registerTool(tool: MCPServerTool) {
    this.registry.tools.set(tool.id, tool);
    
    if (!this.registry.categories.has(tool.category)) {
      this.registry.categories.set(tool.category, []);
    }
    this.registry.categories.get(tool.category)!.push(tool);
  }

  getTool(id: string): MCPServerTool | undefined {
    return this.registry.tools.get(id);
  }

  getAllTools(): MCPServerTool[] {
    return Array.from(this.registry.tools.values());
  }

  getToolsByCategory(category: string): MCPServerTool[] {
    return this.registry.categories.get(category) || [];
  }

  getToolSchema(id: string): any {
    const tool = this.getTool(id);
    if (!tool) return null;

    return {
      type: 'function',
      function: {
        name: tool.id,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  getAllToolSchemas(): any[] {
    return this.getAllTools().map(tool => this.getToolSchema(tool.id));
  }
}

export const mcpRegistry = new MCPRegistry();