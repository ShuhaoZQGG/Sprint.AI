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

### 👥 Developer Profiling & Intelligence
- **Velocity Tracking**: Analyze commit history and development patterns
- **Skill Assessment**: Build comprehensive developer strength profiles
- **Intelligent Assignment**: Auto-assign tasks based on developer capabilities and capacity
- **Performance Analytics**: Track code quality, collaboration, and productivity metrics

### 🎨 AI Command Palette (Ctrl + .)
- **Contextual AI Assistant**: In-app overlay for instant AI assistance
- **Business-to-Technical Translation**: Convert business specs into actionable technical tasks
- **Smart Suggestions**: AI-powered recommendations based on project context
- **Real-time Processing**: Instant task generation and assignment

### 🚀 Autonomous Sprint Planning
- **Capacity-Based Planning**: Automatic sprint planning based on team velocity
- **Intelligent Distribution**: Smart task assignment across team members
- **Real-time Updates**: Live sprint board with automatic progress tracking
- **Burndown Analytics**: Comprehensive sprint performance metrics

### 🔧 PR Simulation Engine
- **Auto-generated Templates**: Branch names, commit messages, and PR descriptions
- **Code Scaffolding**: File-level scaffolds and TODO generation
- **Integration Ready**: Seamless GitHub integration for PR automation

## 🏗️ Current Architecture

### Frontend Structure
```
src/
├── components/
│   ├── dashboard/          # Main dashboard with metrics and overview
│   ├── tasks/             # Kanban-style task management
│   ├── docs/              # Living documentation viewer
│   ├── profile/           # Developer profiles and analytics
│   ├── sprints/           # Sprint planning and management
│   ├── overlay/           # AI command palette (Ctrl + .)
│   ├── layout/            # Sidebar, header, and navigation
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
├── stores/                # Zustand state management
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## 📊 Current Implementation Status

### ✅ Completed Features

#### Core UI Framework
- **Responsive Design System**: Complete Tailwind-based design system with dark theme
- **Navigation**: Collapsible sidebar with view switching
- **Component Library**: Reusable Button, Card, Input, Modal components
- **Layout System**: Header, sidebar, and main content areas

#### Dashboard View
- **Metrics Overview**: Active tasks, team velocity, sprint progress
- **Repository Display**: Recent repositories with language and star information
- **Team Overview**: Developer profiles with velocity and strengths
- **Progress Tracking**: Visual progress indicators and completion rates

#### Task Management
- **Kanban Board**: Full task board with status columns (Backlog → Done)
- **Task Filtering**: Search and status-based filtering
- **Task Details**: Priority, type, effort estimation, and assignment
- **Status Management**: Drag-and-drop ready task status updates

#### Developer Profiles
- **Comprehensive Profiles**: Velocity, skills, collaboration metrics
- **Performance Analytics**: Code quality and commit frequency tracking
- **Skill Visualization**: Strength and preferred task type display
- **Team Capacity**: Total team velocity and capacity planning

#### Sprint Management
- **Sprint Overview**: Active, planning, and completed sprint tracking
- **Progress Visualization**: Burndown charts and completion metrics
- **Team Assignment**: Developer assignment with avatar display
- **Capacity Planning**: Story points and team velocity matching

#### Documentation System
- **Living Docs Interface**: AI-generated documentation viewer
- **Repository Integration**: Multi-repository documentation support
- **Auto-generation Status**: AI processing indicators and status tracking
- **Export Functionality**: Documentation export capabilities

#### AI Command Palette
- **Keyboard Shortcut**: Ctrl + . activation
- **Quick Actions**: Pre-defined AI assistance options
- **Natural Language Input**: Free-form query processing
- **Contextual Suggestions**: Task generation, documentation updates, team assignment

### 🔄 State Management
- **Zustand Store**: Centralized state with repositories, developers, tasks, sprints
- **Type Safety**: Full TypeScript integration with proper type definitions
- **Reactive Updates**: Real-time UI updates based on state changes

### 🎨 Design System
- **Color Palette**: Comprehensive color system with primary, secondary, accent colors
- **Typography**: Inter font family with proper hierarchy
- **Spacing**: 8px grid system for consistent layouts
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: Keyboard navigation and focus management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sprint-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage
1. **Navigate Views**: Use the sidebar to switch between Dashboard, Tasks, Docs, Team Profile, and Sprints
2. **AI Assistant**: Press `Ctrl + .` to open the AI command palette
3. **Task Management**: Create, filter, and manage tasks in the Tasks view
4. **Sprint Planning**: Plan and track sprints in the Sprints view
5. **Documentation**: View and generate documentation in the Docs view

## 🎯 Success Metrics
- ⏱️ Sub-10 second repository → documentation generation
- 🔁 90%+ match between AI-estimated effort and developer actuals  
- 📉 25% fewer sync meetings across teams
- 🚀 Improved developer velocity and task completion rates

## 🤝 Contributing
This project is in active development. Contributions are welcome!

## 📄 License
MIT License - see LICENSE file for details