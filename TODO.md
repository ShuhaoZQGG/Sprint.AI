# Sprint.AI - Development Roadmap

## MCP Server/Client & AI Overlay Tool-Calling

### 1. Design MCP Architecture
- [ ] Create: src/mcp/server/index.ts
- [ ] Create: src/mcp/server/services/*.ts
- [ ] Create: src/mcp/client/index.ts
- [ ] Create: src/types/mcp.ts

### 2. Implement MCP Server
- [ ] Create: src/mcp/server/registry.ts
- [ ] Create: src/mcp/server/types.ts
- [ ] Modify: src/mcp/server/index.ts

### 3. Implement MCP Client
- [ ] Create: src/mcp/client/toolApi.ts
- [ ] Modify: src/mcp/client/index.ts

### 4. Integrate MCP Tool-Calling into AIOverlay
- [ ] Modify: src/components/overlay/AIOverlay.tsx
- [ ] Modify: src/services/quickActionHandler.ts
- [ ] Modify: src/services/nlpProcessor.ts

### 5. Implement Conversation Context Memory
- [ ] Create: src/services/contextMemory.ts
- [ ] Modify: src/components/overlay/AIOverlay.tsx
- [ ] Modify: src/services/nlpProcessor.ts

### 6. Update Types and Documentation
- [ ] Modify: src/types/index.ts
- [ ] Modify: TODO.md

### 7. Update .bolt/ignore
- [ ] Modify: .bolt/ignore (add all unrelated files)

## MCP Server Integration Plan

### 1. Services to Expose via MCP
- [ ] Expose docGenerator (doc generation)
- [ ] Expose codebaseAnalyzer (code analysis)
- [ ] Expose prGenerator (PR/template generation)
- [ ] Expose taskService (task CRUD)
- [ ] Expose businessSpecService (spec CRUD)
- [ ] Expose repositoryService (repo info/connect)
- [ ] Expose developerService (developer info/assignment)
- [ ] Expose sprintService (sprint management)
- [ ] Expose sprintAutomation (sprint optimization)
- [ ] Expose teamOptimizer (workload/team analysis)
- [ ] Expose capacityPlanner (capacity analysis)
- [ ] Expose commitAnalyzer (commit/PR analysis)
- [ ] Expose documentationService (doc CRUD)
- [ ] Optionally: Expose nlpProcessor (AI query)
- [ ] Optionally: Expose groq (raw LLM)

### 2. Adjustments for MCP
- [ ] Refactor each service to export stateless, MCP-compatible functions
- [ ] Add metadata (name, description, params, returns) for each tool
- [ ] Wrap stateful/context-dependent logic to accept all context as arguments
- [ ] Avoid singleton usage in MCP-exposed functions
- [ ] Add/extend JSDoc or TypeScript types for tool schemas

### 3. MCP Server Registry
- [ ] Create src/mcp/server/registry.ts to register all tools/services
- [ ] Register each tool with id, handler, description, parameters, returns

### 4. Backward Compatibility
- [ ] Do not delete or break old service code
- [ ] Export MCP-compatible functions in addition to legacy exports
- [ ] Mark legacy exports as deprecated in comments if needed

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

**Sprint.AI now features a fully functional AI Assistant with comprehensive quick actions integration! 🎉**