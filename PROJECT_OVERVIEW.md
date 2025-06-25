### Frontend Structure
```
src/
├── components/
│   ├── dashboard/          # Main dashboard with metrics and overview
│   ├── tasks/             # Kanban-style task management with PR generation
│   ├── docs/              # Living documentation viewer and generator
│   ├── profile/           # Developer profiles and analytics
│   ├── sprints/           # Sprint planning and management
│   ├── overlay/           # AI command palette (Ctrl + .) and task generator
│   ├── repository/        # Repository connection and management
│   ├── layout/            # Sidebar, header, and navigation
│   └── ui/                # Reusable UI components
├── services/              # Core business logic and API integrations
│   ├── github.ts          # GitHub API integration
│   ├── groq.ts           # Groq AI API service
│   ├── docGenerator.ts   # Documentation generation engine
│   ├── nlpProcessor.ts   # Natural language processing
│   ├── codebaseAnalyzer.ts # Repository structure analysis
│   ├── prGenerator.ts    # PR template and code scaffold generation
│   ├── repositoryService.ts # Repository data management with Supabase
│   ├── taskService.ts    # Task data management with real-time updates
│   ├── sprintService.ts  # Sprint data management with capacity planning
│   ├── businessSpecService.ts # Business specification management with version history
│   └── supabase.ts       # Supabase database client and utilities
├── hooks/                 # Custom React hooks including Supabase hooks
│   ├── useSupabase.ts    # Authentication and real-time data hooks
│   ├── useRepositories.ts # Repository management hooks
│   ├── useTasks.ts       # Task management hooks with real-time updates
│   ├── useSprints.ts     # Sprint management hooks with capacity tracking
│   └── useBusinessSpecs.ts # Business specification management hooks
├── stores/                # Zustand state management (transitioning to database)
├── types/                 # TypeScript type definitions including database types
├── config/                # Configuration files
└── utils/                 # Utility functions
```

### Database Architecture
```
supabase/
├── migrations/
│   ├── 20250625191426_sunny_river.sql    # Complete database schema
│   ├── 20250625191506_misty_meadow.sql   # Row Level Security policies
│   └── 20250625191535_fancy_shrine.sql   # Development seed data
```