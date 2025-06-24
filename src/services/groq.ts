import Groq from 'groq-sdk';
import { AI_CONFIG, PROMPT_TEMPLATES } from '../config/ai';
import { RepositoryAnalysis } from '../types/github';
import { CodebaseStructure, Task, BusinessSpec } from '../types';
import toast from 'react-hot-toast';

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  type: 'overview' | 'api' | 'components' | 'architecture' | 'setup' | 'custom';
  lastGenerated: Date;
  wordCount: number;
}

export interface TaskGenerationRequest {
  businessSpec: BusinessSpec;
  codebaseContext: CodebaseStructure;
  teamSkills: string[];
}

export interface TaskGenerationResponse {
  tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[];
  reasoning: string;
  confidence: number;
}

class GroqService {
  private client: Groq;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor() {
    if (!AI_CONFIG.groq.apiKey) {
      console.warn('Groq API key not found. AI features will be disabled.');
      return;
    }

    this.client = new Groq({
      apiKey: AI_CONFIG.groq.apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, API calls should go through your backend
    });
  }

  /**
   * Check if API is available and configured
   */
  isAvailable(): boolean {
    return !!this.client && !!AI_CONFIG.groq.apiKey;
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter every minute
    if (timeSinceReset > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= AI_CONFIG.rateLimits.requestsPerMinute) {
      toast.error('Rate limit exceeded. Please wait a moment before trying again.');
      return false;
    }
    
    return true;
  }

  /**
   * Make a completion request to Groq
   */
  private async makeCompletion(prompt: string, maxTokens?: number): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Groq API is not available. Please check your API key configuration.');
    }

    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    try {
      this.requestCount++;
      
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical writer and software architect. Generate clear, comprehensive, and accurate documentation and technical specifications. Always format responses in clean Markdown unless specifically requested otherwise.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: AI_CONFIG.groq.model,
        max_tokens: maxTokens || AI_CONFIG.groq.maxTokens,
        temperature: AI_CONFIG.groq.temperature,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from AI service');
      }

      return content.trim();
    } catch (error) {
      console.error('Groq API error:', error);
      if (error instanceof Error) {
        throw new Error(`AI service error: ${error.message}`);
      }
      throw new Error('Unknown AI service error');
    }
  }

  /**
   * Generate comprehensive documentation from repository analysis
   */
  async generateDocumentation(analysis: RepositoryAnalysis): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];

    try {
      // Generate overview documentation
      const overviewPrompt = this.fillTemplate(PROMPT_TEMPLATES.generateOverview, {
        repositoryName: analysis.repository.name,
        repositoryDescription: analysis.repository.description || 'No description provided',
        primaryLanguage: analysis.summary.primaryLanguage,
        structureAnalysis: this.formatStructureForPrompt(analysis.structure),
        dependencies: this.formatDependenciesForPrompt(analysis.languages),
      });

      const overviewContent = await this.makeCompletion(overviewPrompt);
      sections.push({
        id: 'overview',
        title: 'Project Overview',
        content: overviewContent,
        type: 'overview',
        lastGenerated: new Date(),
        wordCount: this.countWords(overviewContent),
      });

      // Generate API documentation if API modules are detected
      const apiModules = this.extractApiModules(analysis.structure);
      if (apiModules.length > 0) {
        const apiPrompt = this.fillTemplate(PROMPT_TEMPLATES.generateApiDocs, {
          apiModules: JSON.stringify(apiModules, null, 2),
          services: JSON.stringify(this.extractServices(analysis.structure), null, 2),
          dependencies: JSON.stringify(analysis.languages, null, 2),
        });

        const apiContent = await this.makeCompletion(apiPrompt);
        sections.push({
          id: 'api',
          title: 'API Documentation',
          content: apiContent,
          type: 'api',
          lastGenerated: new Date(),
          wordCount: this.countWords(apiContent),
        });
      }

      // Generate component documentation for frontend projects
      const componentModules = this.extractComponentModules(analysis.structure);
      if (componentModules.length > 0) {
        const componentPrompt = this.fillTemplate(PROMPT_TEMPLATES.generateComponentDocs, {
          components: JSON.stringify(componentModules, null, 2),
          structure: JSON.stringify(analysis.structure.slice(0, 10), null, 2), // Limit structure size
        });

        const componentContent = await this.makeCompletion(componentPrompt);
        sections.push({
          id: 'components',
          title: 'Component Documentation',
          content: componentContent,
          type: 'components',
          lastGenerated: new Date(),
          wordCount: this.countWords(componentContent),
        });
      }

      // Generate architecture documentation
      const architectureContent = await this.generateArchitectureDoc(analysis);
      sections.push({
        id: 'architecture',
        title: 'Architecture Overview',
        content: architectureContent,
        type: 'architecture',
        lastGenerated: new Date(),
        wordCount: this.countWords(architectureContent),
      });

      return sections;
    } catch (error) {
      console.error('Error generating documentation:', error);
      throw error;
    }
  }

  /**
   * Generate tasks from business specification
   */
  async generateTasks(request: TaskGenerationRequest): Promise<TaskGenerationResponse> {
    try {
      const prompt = this.fillTemplate(PROMPT_TEMPLATES.generateTasks, {
        title: request.businessSpec.title,
        description: request.businessSpec.description,
        acceptanceCriteria: request.businessSpec.acceptanceCriteria.join('\n- '),
        codebaseContext: JSON.stringify(request.codebaseContext.summary, null, 2),
        teamSkills: request.teamSkills.join(', '),
      });

      const response = await this.makeCompletion(prompt, 2048);
      
      // Parse the JSON response
      try {
        const parsed = JSON.parse(response);
        
        if (!Array.isArray(parsed)) {
          throw new Error('Expected array of tasks');
        }

        const tasks = parsed.map((task: any) => ({
          title: task.title || 'Untitled Task',
          description: task.description || '',
          type: task.type || 'feature',
          priority: task.priority || 'medium',
          status: 'backlog' as const,
          estimatedEffort: Math.max(1, Math.min(40, task.estimatedEffort || 8)),
        }));

        return {
          tasks,
          reasoning: 'Tasks generated based on business specification and codebase analysis',
          confidence: 0.8,
        };
      } catch (parseError) {
        // If JSON parsing fails, create a single task from the response
        return {
          tasks: [{
            title: request.businessSpec.title,
            description: response,
            type: 'feature',
            priority: 'medium',
            status: 'backlog' as const,
            estimatedEffort: 8,
          }],
          reasoning: 'Generated single task due to parsing issues',
          confidence: 0.6,
        };
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      throw error;
    }
  }

  /**
   * Analyze code quality and provide insights
   */
  async analyzeCodeQuality(analysis: RepositoryAnalysis): Promise<string> {
    try {
      const prompt = this.fillTemplate(PROMPT_TEMPLATES.analyzeCodeQuality, {
        fileCount: analysis.summary.totalFiles.toString(),
        languages: Object.keys(analysis.languages).join(', '),
        dependencies: Object.keys(analysis.languages).length.toString(),
      });

      return await this.makeCompletion(prompt);
    } catch (error) {
      console.error('Error analyzing code quality:', error);
      throw error;
    }
  }

  /**
   * Generate architecture documentation
   */
  private async generateArchitectureDoc(analysis: RepositoryAnalysis): Promise<string> {
    const architecturePrompt = `
      Generate architecture documentation for the following project:
      
      Project: ${analysis.repository.name}
      Languages: ${Object.keys(analysis.languages).join(', ')}
      Total Files: ${analysis.summary.totalFiles}
      
      Key directories and files found:
      ${this.formatStructureForPrompt(analysis.structure.slice(0, 20))}
      
      Please generate:
      1. High-level architecture overview
      2. Key architectural patterns used
      3. Data flow and component relationships
      4. Deployment considerations
      5. Scalability and performance notes
      
      Format as clean Markdown.
    `;

    return await this.makeCompletion(architecturePrompt);
  }

  // Helper methods
  private fillTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return result;
  }

  private formatStructureForPrompt(structure: any[]): string {
    return structure
      .slice(0, 15) // Limit to prevent prompt overflow
      .map(item => `- ${item.path} (${item.type})`)
      .join('\n');
  }

  private formatDependenciesForPrompt(languages: Record<string, number>): string {
    return Object.entries(languages)
      .map(([lang, bytes]) => `- ${lang}: ${bytes} bytes`)
      .join('\n');
  }

  private extractApiModules(structure: any[]): any[] {
    return structure.filter(item => 
      item.path?.includes('api/') || 
      item.path?.includes('routes/') ||
      item.path?.includes('controllers/')
    );
  }

  private extractComponentModules(structure: any[]): any[] {
    return structure.filter(item => 
      item.path?.includes('components/') || 
      item.path?.includes('pages/') ||
      item.name?.includes('Component')
    );
  }

  private extractServices(structure: any[]): any[] {
    return structure.filter(item => 
      item.path?.includes('services/') || 
      item.path?.includes('lib/') ||
      item.path?.includes('utils/')
    );
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

export const groqService = new GroqService();