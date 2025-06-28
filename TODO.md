# Sprint.AI - Development Roadmap

## 🧹 MCP-Only AI Processing Migration

### 1. Remove Legacy AI Processing Logic
- [x] Remove all Groq/legacy NLP logic from `src/services/nlpProcessor.ts`
- [x] Remove fallback/dual-mode logic from `src/components/overlay/AIOverlay.tsx`
- [x] Remove legacy quick action logic from `src/services/quickActionHandler.ts` and related files

### 2. Refactor nlpProcessor to MCP-Only
- [x] Refactor `src/services/nlpProcessor.ts` to only support MCP-based processing
- [x] Remove all intent/entity extraction and legacy response generation
- [x] Ensure all AI queries are routed through MCP

### 3. Refactor AIOverlay to Use Only MCP
- [x] Remove "standard" mode and related UI from `src/components/overlay/AIOverlay.tsx`
- [x] Remove all non-MCP quick action logic and UI
- [x] Simplify state/UI to only show MCP-based flows, tools, and results

### 4. Fully Integrate MCP into AI Overlay
- [ ] Ensure all tool suggestions in the overlay are sourced from MCP tool registry (`src/mcp/server/registry.ts`)
- [ ] Ensure all tool executions are routed through MCP client (`src/mcp/client/toolApi.ts`)
- [ ] Ensure all conversation history and tool results are managed via MCP and context memory
- [ ] Refactor overlay UI to display MCP tool feedback, errors, and results in a user-friendly way
- [ ] Remove any remaining legacy or partial integrations in overlay logic
- [ ] Add robust error handling and user feedback for MCP tool execution failures
- [ ] Add loading and execution state indicators for MCP tool calls
- [ ] Add tests for MCP tool suggestion, execution, and result display in overlay

### 5. Update/Remove Unused Types, Hooks, and Services
- [ ] Remove unused types/interfaces from `src/types/`
- [ ] Remove or update hooks/services no longer needed (e.g., `quickActionService`)
- [ ] Update or remove tests for legacy logic

### 6. MCP Tool Registry and Client/Server Robustness
- [ ] Audit and update `src/mcp/server/registry.ts` to ensure all tools are properly registered and described
- [ ] Audit and update `src/mcp/client/toolApi.ts` and `src/mcp/client/index.ts` for robust tool execution and error handling
- [ ] Add or update tests for MCP tool registration, execution, and feedback

### 7. Testing and Documentation
- [ ] Update/add tests for MCP-only flows
- [ ] Update documentation to reflect MCP-only architecture

## 🧠 Enhance MCP Reasoning & Tool Orchestration

### 8. Expand Tool Coverage and Intelligent Orchestration
- [ ] Incorporate more tools from all service modules (`src/services/*`) into MCP tool registry (`src/mcp/server/registry.ts` and `src/mcp/server/index.ts`)
- [ ] Update MCP tool schemas to cover all available actions (e.g., repository listing, task creation, etc.)
- [ ] Refactor MCP server/client to support multi-step tool orchestration (e.g., if a required parameter is missing, call a tool to fetch or create it, then proceed)
- [ ] Implement reasoning logic in MCP to:
    - Detect missing parameters and resolve them by calling prerequisite tools (e.g., fetch repositories if repositoryId is missing)
    - Chain tool calls (e.g., create a task before generating a PR template)
    - Select the most relevant entity (e.g., repository or task) based on user input/context
- [ ] Add robust error handling and fallback strategies for tool orchestration
- [ ] Update tool documentation to reflect new orchestration capabilities
- [ ] Add tests for multi-step tool orchestration, error recovery, and reasoning

#### Main files to modify:
- `src/mcp/server/index.ts` (tool orchestration, reasoning logic)
- `src/mcp/server/registry.ts` (register more tools from all services)
- `src/services/*` (ensure all service tools are exportable and have clear schemas)
- `src/mcp/client/toolApi.ts`, `src/mcp/client/index.ts` (client-side orchestration support)
- `src/types/mcp.ts` (update types for multi-step tool calls if needed)
- (Optional) `src/mcp/server/orchestrator.ts` (new file for orchestration logic, if separation is desired)
- (Optional) New/updated tests: `src/mcp/server/index.test.ts`, `src/mcp/server/orchestrator.test.ts`

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

1. 🧹 MCP-Only AI Processing Migration
2. **Testing & Quality** - Reliability
3. **Production Readiness** - Launch preparation
4. **Technical Debt** - Maintenance

**Sprint.AI is moving to a fully MCP-powered AI Assistant with robust tool-calling, conversation memory, and a modern, maintainable overlay UI! 🎉**