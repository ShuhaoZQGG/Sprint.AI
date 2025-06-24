export const AI_CONFIG = {
  // Groq API Configuration
  groq: {
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama3-8b-8192', // Fast model for real-time responses
    maxTokens: 4096,
    temperature: 0.3, // Lower temperature for more consistent technical documentation
  },
  
  // Documentation generation settings
  documentation: {
    maxSectionLength: 2000,
    includeCodeExamples: true,
    generateDiagrams: false, // Can be enabled later with Mermaid.js
    autoUpdate: true,
  },
  
  // Task generation settings
  taskGeneration: {
    maxTasksPerSpec: 10,
    defaultEffortRange: [1, 40], // hours
    priorityWeights: {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
    },
  },
  
  // Rate limiting
  rateLimits: {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
  },
};

export const PROMPT_TEMPLATES = {
  // Documentation generation prompts
  generateOverview: `
    Analyze the following codebase structure and generate a comprehensive overview documentation.
    
    Repository: {repositoryName}
    Description: {repositoryDescription}
    Primary Language: {primaryLanguage}
    
    Structure Analysis:
    {structureAnalysis}
    
    Dependencies:
    {dependencies}
    
    Please generate:
    1. Project Overview (2-3 paragraphs)
    2. Architecture Summary
    3. Key Components and Services
    4. Technology Stack
    5. Getting Started Guide
    
    Format the response in clean Markdown with proper headings and structure.
  `,
  
  generateApiDocs: `
    Generate API documentation based on the following codebase analysis:
    
    API Modules:
    {apiModules}
    
    Services:
    {services}
    
    Dependencies:
    {dependencies}
    
    Please generate comprehensive API documentation including:
    1. API Overview
    2. Authentication (if applicable)
    3. Endpoints and Methods
    4. Request/Response Examples
    5. Error Handling
    
    Format as clean Markdown with code examples.
  `,
  
  generateComponentDocs: `
    Generate component documentation for the following React/Frontend components:
    
    Components:
    {components}
    
    Structure:
    {structure}
    
    Please generate:
    1. Component Overview
    2. Props and Interfaces
    3. Usage Examples
    4. Styling and Theming
    5. Best Practices
    
    Format as Markdown with TypeScript examples.
  `,
  
  // Task generation prompts
  generateTasks: `
    Convert the following business specification into actionable technical tasks:
    
    Business Specification:
    Title: {title}
    Description: {description}
    Acceptance Criteria: {acceptanceCriteria}
    
    Codebase Context:
    {codebaseContext}
    
    Team Skills: {teamSkills}
    
    Generate 3-8 specific, actionable tasks with:
    1. Clear title and description
    2. Task type (feature/bug/refactor/docs/test/devops)
    3. Priority level (low/medium/high/critical)
    4. Estimated effort in hours (1-40)
    5. Required skills/technologies
    6. Dependencies between tasks
    
    Format as JSON array of task objects.
  `,
  
  // Code analysis prompts
  analyzeCodeQuality: `
    Analyze the following code structure and provide quality insights:
    
    Files: {fileCount}
    Languages: {languages}
    Dependencies: {dependencies}
    
    Provide analysis on:
    1. Code organization and structure
    2. Potential technical debt
    3. Security considerations
    4. Performance optimization opportunities
    5. Testing coverage recommendations
    
    Format as structured Markdown report.
  `,
};