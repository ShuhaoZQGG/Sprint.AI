import { groqService, DocumentationSection } from './groq';
import { RepositoryAnalysis } from '../types/github';
import { Repository } from '../types';
import { documentationService } from './documentationService';
import toast from 'react-hot-toast';

export interface GeneratedDocumentation {
  id: string;
  repositoryId: string;
  sections: DocumentationSection[];
  generatedAt: Date;
  lastUpdated: Date;
  status: 'generating' | 'completed' | 'error';
  error?: string;
}

export interface DocumentationGenerationProgress {
  step: string;
  progress: number; // 0-100
  message: string;
}

class DocumentationGenerator {
  private activeGenerations = new Map<string, boolean>();

  /**
   * Generate comprehensive documentation for a repository
   */
  async generateDocumentation(
    repository: Repository,
    analysis: RepositoryAnalysis,
    onProgress?: (progress: DocumentationGenerationProgress) => void
  ): Promise<GeneratedDocumentation> {
    const docId = `doc-${repository.id}-${Date.now()}`;
    
    if (this.activeGenerations.has(repository.id)) {
      throw new Error('Documentation generation already in progress for this repository');
    }

    this.activeGenerations.set(repository.id, true);

    try {
      onProgress?.({
        step: 'initialization',
        progress: 0,
        message: 'Initializing documentation generation...',
      });

      // Check if AI service is available
      if (!groqService.isAvailable()) {
        throw new Error('AI service is not available. Please check your Groq API key configuration.');
      }

      onProgress?.({
        step: 'analysis',
        progress: 10,
        message: 'Analyzing repository structure...',
      });

      // Validate analysis data
      if (!analysis.structure || analysis.structure.size === 0) {
        throw new Error('Repository structure analysis is incomplete');
      }

      onProgress?.({
        step: 'generation',
        progress: 25,
        message: 'Generating documentation sections...',
      });

      // Generate documentation sections
      const sections = await groqService.generateDocumentation(analysis);

      onProgress?.({
        step: 'processing',
        progress: 80,
        message: 'Processing and formatting documentation...',
      });

      // Post-process sections
      const processedSections = this.postProcessSections(sections, repository);

      onProgress?.({
        step: 'completion',
        progress: 100,
        message: 'Documentation generation completed!',
      });

      const documentation: GeneratedDocumentation = {
        id: docId,
        repositoryId: repository.id,
        sections: processedSections,
        generatedAt: new Date(),
        lastUpdated: new Date(),
        status: 'completed',
      };

      // Store documentation in database
      try {
        await documentationService.storeDocumentation(repository.id, documentation);
        toast.success(`Documentation generated and saved for ${repository.name}!`);
      } catch (storeError) {
        console.warn('Failed to store documentation in database:', storeError);
        toast.success(`Documentation generated successfully for ${repository.name}!`);
      }

      return documentation;

    } catch (error) {
      console.error('Documentation generation error:', error);
      
      const errorDoc: GeneratedDocumentation = {
        id: docId,
        repositoryId: repository.id,
        sections: [],
        generatedAt: new Date(),
        lastUpdated: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      toast.error(`Failed to generate documentation: ${errorDoc.error}`);
      return errorDoc;

    } finally {
      this.activeGenerations.delete(repository.id);
    }
  }

  /**
   * Update existing documentation with new repository changes
   */
  async updateDocumentation(
    existingDoc: GeneratedDocumentation,
    repository: Repository,
    analysis: RepositoryAnalysis,
    sectionsToUpdate?: string[]
  ): Promise<GeneratedDocumentation> {
    try {
      if (!groqService.isAvailable()) {
        throw new Error('AI service is not available');
      }

      const sectionsToGenerate = sectionsToUpdate || ['overview'];
      const newSections = await groqService.generateDocumentation(analysis);
      
      // Update only specified sections or add new ones
      const updatedSections = existingDoc.sections.map(section => {
        const newSection = newSections.find(ns => ns.id === section.id);
        if (newSection && sectionsToGenerate.includes(section.id)) {
          return newSection;
        }
        return section;
      });

      // Add any new sections that didn't exist before
      newSections.forEach(newSection => {
        if (!existingDoc.sections.find(s => s.id === newSection.id)) {
          updatedSections.push(newSection);
        }
      });

      const updatedDoc: GeneratedDocumentation = {
        ...existingDoc,
        sections: this.postProcessSections(updatedSections, repository),
        lastUpdated: new Date(),
        status: 'completed',
        error: undefined,
      };

      // Update in database
      try {
        await documentationService.updateDocumentation(existingDoc.id, updatedDoc);
        toast.success('Documentation updated and saved successfully!');
      } catch (updateError) {
        console.warn('Failed to update documentation in database:', updateError);
        toast.success('Documentation updated successfully!');
      }

      return updatedDoc;

    } catch (error) {
      console.error('Documentation update error:', error);
      toast.error(`Failed to update documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Generate documentation for a specific section only
   */
  async generateSection(
    repository: Repository,
    analysis: RepositoryAnalysis,
    sectionType: DocumentationSection['type']
  ): Promise<DocumentationSection> {
    try {
      if (!groqService.isAvailable()) {
        throw new Error('AI service is not available');
      }

      const allSections = await groqService.generateDocumentation(analysis);
      const section = allSections.find(s => s.type === sectionType);
      
      if (!section) {
        throw new Error(`Section type '${sectionType}' not found`);
      }

      return this.postProcessSection(section, repository);

    } catch (error) {
      console.error('Section generation error:', error);
      throw error;
    }
  }

  /**
   * Export documentation in different formats
   */
  exportDocumentation(
    documentation: GeneratedDocumentation,
    format: 'markdown' | 'html' | 'json' = 'markdown'
  ): string {
    switch (format) {
      case 'markdown':
        return this.exportAsMarkdown(documentation);
      case 'html':
        return this.exportAsHTML(documentation);
      case 'json':
        return JSON.stringify(documentation, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Check if documentation needs updating based on repository changes
   */
  needsUpdate(
    documentation: GeneratedDocumentation,
    repository: Repository
  ): boolean {
    const docAge = Date.now() - documentation.lastUpdated.getTime();
    const repoLastUpdate = repository.lastUpdated.getTime();
    
    // Update if doc is older than repository or if it's been more than 7 days
    return repoLastUpdate > documentation.lastUpdated.getTime() || 
           docAge > 7 * 24 * 60 * 60 * 1000;
  }

  // Private helper methods
  private postProcessSections(
    sections: DocumentationSection[],
    repository: Repository
  ): DocumentationSection[] {
    return sections.map(section => this.postProcessSection(section, repository));
  }

  private postProcessSection(
    section: DocumentationSection,
    repository: Repository
  ): DocumentationSection {
    // Clean up content
    let content = section.content;
    
    // Replace placeholder repository name
    content = content.replace(/\{repositoryName\}/g, repository.name);
    
    // Add repository-specific links and references
    content = this.addRepositoryLinks(content, repository);
    
    // Format code blocks properly
    content = this.formatCodeBlocks(content);
    
    return {
      ...section,
      content,
      wordCount: this.countWords(content),
    };
  }

  private addRepositoryLinks(content: string, repository: Repository): string {
    // Add GitHub repository link
    if (repository.url) {
      content = content.replace(
        /## Getting Started/g,
        `## Getting Started\n\n🔗 **Repository**: [${repository.name}](${repository.url})\n`
      );
    }
    
    return content;
  }

  private formatCodeBlocks(content: string): string {
    // Ensure proper code block formatting
    return content.replace(/```(\w+)?\n/g, (match, lang) => {
      return `\`\`\`${lang || ''}\n`;
    });
  }

  private exportAsMarkdown(documentation: GeneratedDocumentation): string {
    const sections = documentation.sections
      .sort((a, b) => this.getSectionOrder(a.type) - this.getSectionOrder(b.type));
    
    let markdown = `# Documentation\n\n`;
    markdown += `*Generated on ${documentation.generatedAt.toLocaleDateString()}*\n\n`;
    markdown += `---\n\n`;
    
    sections.forEach(section => {
      markdown += `# ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
      markdown += `---\n\n`;
    });
    
    return markdown;
  }

  private exportAsHTML(documentation: GeneratedDocumentation): string {
    const sections = documentation.sections
      .sort((a, b) => this.getSectionOrder(a.type) - this.getSectionOrder(b.type));
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Documentation</h1>
    <p><em>Generated on ${documentation.generatedAt.toLocaleDateString()}</em></p>
    <hr>
`;
    
    sections.forEach(section => {
      html += `    <section>
        <h2>${section.title}</h2>
        ${this.markdownToHTML(section.content)}
    </section>
    <hr>
`;
    });
    
    html += `</body>
</html>`;
    
    return html;
  }

  private markdownToHTML(markdown: string): string {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/`([^`]*)`/gim, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');
  }

  private getSectionOrder(type: DocumentationSection['type']): number {
    const order = {
      'overview': 1,
      'architecture': 2,
      'api': 3,
      'components': 4,
      'setup': 5,
      'custom': 6,
    };
    return order[type] || 999;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

export const docGenerator = new DocumentationGenerator();