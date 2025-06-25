# Sprint.AI

An AI-native development platform that serves as a comprehensive replacement for Confluence, Jira, and GitHub PR automation. Sprint.AI streamlines planning, documentation, and code execution by combining codebase intelligence, AI-generated documentation, developer profiling, and autonomous sprint planning.

## 🎯 Vision

Purpose-built for async-first, fast-moving engineering teams, Sprint.AI eliminates the friction between business requirements and technical execution through intelligent automation and contextual AI assistance.

## ✨ Core Features

### 🧠 Codebase Intelligence & Living Documentation
- **Repository Analysis**: Parse GitHub repositories for structure, modules, and services
- **AI-Generated Documentation**: Automatically create and maintain comprehensive documentation
- **Living Docs**: Documentation that updates automatically on PR merges
- **Multi-language Support**: Support for various programming languages and frameworks
- **Multi-format Export**: Export documentation in Markdown, HTML, and JSON formats

### 👥 Developer Profiling & Intelligence
- **Velocity Tracking**: Analyze commit history and development patterns
- **Skill Assessment**: Build comprehensive developer strength profiles
- **Intelligent Assignment**: Auto-assign tasks based on developer capabilities and capacity
- **Performance Analytics**: Track code quality, collaboration, and productivity metrics

### 🎨 AI Command Palette (Ctrl + .)
- **Natural Language Processing**: Advanced query understanding with intent recognition
- **Contextual AI Assistant**: In-app overlay for instant AI assistance with conversation memory
- **Business-to-Technical Translation**: Convert business specs into actionable technical tasks
- **Smart Suggestions**: AI-powered recommendations based on project context
- **Real-time Processing**: Instant task generation and assignment with follow-up questions

### 🚀 Autonomous Sprint Planning
- **Capacity-Based Planning**: Automatic sprint planning based on team velocity
- **Intelligent Distribution**: Smart task assignment across team members
- **Real-time Updates**: Live sprint board with automatic progress tracking
- **Burndown Analytics**: Comprehensive sprint performance metrics

### 🔧 PR Simulation Engine
- **Auto-generated Templates**: Branch names, commit messages, and PR descriptions
- **Code Scaffolding**: File-level scaffolds and TODO generation
- **Integration Ready**: Seamless GitHub integration for PR automation

### 📝 Business Specification Management
- **Rich Spec Editor**: Create detailed business specifications with acceptance criteria
- **AI Task Generation**: Convert specifications into actionable technical tasks
- **Validation & Review**: Comprehensive validation and task review workflow
- **Effort Estimation**: AI-powered task complexity and time estimation

## 🏗️ Current Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state (transitioning to Supabase)
- **Database**: Supabase (PostgreSQL with real-time features)
- **AI Integration**: Groq API for fast LLM responses
- **GitHub Integration**: Octokit REST API
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Groq API key (for AI features)
- GitHub Personal Access Token (for repository integration)
- Supabase project (for data persistence)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sprint-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env file

# Start development server
npm run dev
```

### Environment Variables
```bash
# GitHub Integration
VITE_GITHUB_TOKEN=your_github_personal_access_token_here
VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id_here

# AI Integration (Groq)
VITE_GROQ_API_KEY=your_groq_api_key_here

# Supabase Integration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Settings
VITE_APP_URL=http://localhost:5173
```

### Database Setup

1. **Create Supabase Project**: Sign up at [supabase.com](https://supabase.com) and create a new project

2. **Run Migrations**: Execute the migration files in your Supabase SQL editor:
   ```sql
   -- Run these files in order:
   -- 1. supabase/migrations/20250625191426_sunny_river.sql
   -- 2. supabase/migrations/20250625191506_misty_meadow.sql
   -- 3. supabase/migrations/20250625191535_fancy_shrine.sql (for development data)
   ```

3. **Configure Environment**: Add your Supabase URL and anon key to `.env`

4. **Enable Authentication**: In Supabase dashboard, configure authentication providers as needed

### Usage
1. **Connect Repository**: Use the "Connect Repository" button to add your GitHub repositories
2. **Generate Documentation**: Select a repository and click "Generate with AI" to create comprehensive docs
3. **AI Assistant**: Press `Ctrl + .` to open the AI command palette for natural language assistance
4. **Create Business Specs**: Use the AI assistant to create business specifications
5. **Generate Tasks**: Convert business specs into actionable technical tasks
6. **Manage Tasks**: Create, edit, and track tasks in the Tasks view with real-time updates
7. **Sprint Planning**: Plan and track sprints in the Sprints view with capacity management
8. **Generate PR Templates**: Click the branch icon on any task to generate PR templates
9. **Team Analytics**: View developer profiles and team metrics in the Team Profile view

**Note**: All data is now fully persisted in Supabase with real-time updates! Business specifications are stored in the database with complete lifecycle management.

## 📄 License

MIT License - see LICENSE file for details

---

**Sprint.AI** - Transforming development workflows with AI-native intelligence. Built for the future of software development.

**Current Status**: Business Specification Service complete with database persistence and AI integration. Next phase: Developer Profile Service for complete team performance analytics.