# Sprint.AI - Development Roadmap

## MCP Server/Client & AI Overlay Tool-Calling

### 1. Design MCP Architecture
**Status**: ✅ Completed  
**Priority**: High  
**Description**: Design the Model Context Protocol architecture for structured AI tool calling

#### Subtasks:
- [x] Create: src/mcp/server/index.ts
- [x] Create: src/mcp/server/services/*.ts
- [x] Create: src/mcp/client/index.ts
- [x] Create: src/types/mcp.ts

### 2. Implement MCP Server
**Status**: ✅ Completed  
**Priority**: High  
**Description**: Implement the MCP server with tool registry and execution

#### Subtasks:
- [x] Create: src/mcp/server/registry.ts
- [x] Create: src/mcp/server/types.ts
- [x] Modify: src/mcp/server/index.ts

### 3. Implement MCP Client
**Status**: ✅ Completed  
**Priority**: High  
**Description**: Implement the MCP client for tool calling and conversation management

#### Subtasks:
- [x] Create: src/mcp/client/toolApi.ts
- [x] Modify: src/mcp/client/index.ts

### 4. Integrate MCP Tool-Calling into AIOverlay
**Status**: ✅ Completed  
**Priority**: High  
**Description**: Enhance AIOverlay with MCP tool-calling capabilities

#### Subtasks:
- [x] Modify: src/components/overlay/AIOverlay.tsx
- [x] Modify: src/services/quickActionHandler.ts
- [x] Modify: src/services/nlpProcessor.ts

### 5. Implement Conversation Context Memory
**Status**: ✅ Completed  
**Priority**: Medium  
**Description**: Add conversation memory for context-aware AI interactions

#### Subtasks:
- [x] Create: src/services/contextMemory.ts
- [x] Modify: src/components/overlay/AIOverlay.tsx
- [x] Modify: src/services/nlpProcessor.ts

### 6. Update Types and Documentation
**Status**: ✅ Completed  
**Priority**: Low  
**Description**: Update types and documentation for MCP integration

#### Subtasks:
- [x] Modify: src/types/index.ts
- [x] Modify: TODO.md


## MCP Server Integration Plan

### 1. Services to Expose via MCP
**Status**: ✅ Completed  
**Priority**: High  
**Description**: Expose core services through MCP for AI tool calling

#### Subtasks:
- [x] Expose docGenerator (doc generation)
- [x] Expose codebaseAnalyzer (code analysis)
- [x] Expose prGenerator (PR/template generation)
- [x] Expose taskService (task CRUD)
- [x] Expose businessSpecService (spec CRUD)
- [x] Expose repositoryService (repo info/connect)
- [x] Expose developerService (developer info/assignment)
- [x] Expose sprintService (sprint management)
- [x] Expose sprintAutomation (sprint optimization)
- [x] Expose teamOptimizer (workload/team analysis)
- [x] Expose capacityPlanner (capacity analysis)
- [x] Expose commitAnalyzer (commit/PR analysis)
- [x] Expose documentationService (doc CRUD)
- [x] Expose nlpProcessor (AI query)
- [x] Expose groq (raw LLM)

### 2. Adjustments for MCP
**Status**: ✅ Completed  
**Priority**: Medium  
**Description**: Refactor services for MCP compatibility

#### Subtasks:
- [x] Refactor each service to export stateless, MCP-compatible functions
- [x] Add metadata (name, description, params, returns) for each tool
- [x] Wrap stateful/context-dependent logic to accept all context as arguments
- [x] Avoid singleton usage in MCP-exposed functions
- [x] Add/extend JSDoc or TypeScript types for tool schemas

### 3. MCP Server Registry
**Status**: ✅ Completed  
**Priority**: High  
**Description**: Create registry for all MCP tools and services

#### Subtasks:
- [x] Create src/mcp/server/registry.ts to register all tools/services
- [x] Register each tool with id, handler, description, parameters, returns

### 4. Backward Compatibility
**Status**: ✅ Completed  
**Priority**: Medium  
**Description**: Maintain backward compatibility with existing code

#### Subtasks:
- [x] Do not delete or break old service code
- [x] Export MCP-compatible functions in addition to legacy exports
- [x] Mark legacy exports as deprecated in comments if needed

## 🔍 Testing & Quality Assurance

### 17. Testing Infrastructure
**Status**: Not Started  
**Priority**: Medium  
**Description**: Comprehensive testing setup

#### Subtasks:
- [ ] **Unit Testing**
  - *Files to create*: `src/**/*.test.ts`, `jest.config.js`, `src/test-utils.ts`
  - *Files to modify*: `package.json` (add testing dependencies)
  - Component testing with React Testing Library
  - Service and utility function testing
  - Mock implementations for external APIs

- [ ] **Integration Testing**
  - *Files to create*: `cypress/integration/*.spec.ts`, `cypress.config.ts`
  - End-to-end testing with Cypress
  - API integration testing
  - User workflow testing

- [ ] **Performance Testing**
  - *Files to create*: `src/utils/performance.ts`, `lighthouse.config.js`
  - Performance monitoring and optimization
  - Bundle size analysis
  - Loading time optimization

## 🚀 Deployment & DevOps

### 18. Production Readiness
**Status**: Not Started  
**Priority**: Low  
**Description**: Prepare for production deployment

#### Subtasks:
- [ ] **Build Optimization**
  - *Files to modify*: `vite.config.ts`, `package.json`
  - Code splitting and lazy loading
  - Asset optimization and compression
  - Environment-specific configurations

- [ ] **Monitoring & Analytics**
  - *Files to create*: `src/services/analytics.ts`, `src/utils/errorTracking.ts`
  - Error tracking and reporting
  - User analytics and insights
  - Performance monitoring

- [ ] **Documentation & Deployment**
  - *Files to create*: `DEPLOYMENT.md`, `CONTRIBUTING.md`, `docker-compose.yml`
  - Deployment guides and scripts
  - Docker containerization
  - CI/CD pipeline setup

## 📋 Technical Debt & Refactoring

### 19. Code Quality Improvements
**Status**: Ongoing  
**Priority**: Low  
**Description**: Maintain and improve code quality

#### Subtasks:
- [ ] **Type Safety Improvements**
  - *Files to modify*: `src/types/index.ts`, various component files
  - Strengthen TypeScript types
  - Remove any types and improve type inference
  - Add runtime type validation

- [ ] **Performance Optimization**
  - *Files to modify*: Various component files
  - Implement React.memo and useMemo where appropriate
  - Optimize re-renders and state updates
  - Bundle size optimization

- [ ] **Code Organization**
  - *Files to modify*: Various files for restructuring
  - Improve file organization and naming
  - Extract reusable logic into custom hooks
  - Standardize coding patterns and conventions

---

## 🎯 Next Steps Priority Order

17. **Testing & Quality** - Reliability
18. **Production Readiness** - Launch preparation
19. **Technical Debt** - Maintenance

**Sprint.AI now features a fully functional AI Assistant with comprehensive quick actions integration and advanced MCP tool-calling capabilities! 🎉**