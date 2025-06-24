import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AIOverlay } from './components/overlay/AIOverlay';
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksView } from './components/tasks/TasksView';
import { DocsView } from './components/docs/DocsView';
import { ProfileView } from './components/profile/ProfileView';
import { SprintsView } from './components/sprints/SprintsView';
import { useAppStore } from './stores/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { currentView } = useAppStore();
  useKeyboardShortcuts();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'tasks':
        return <TasksView />;
      case 'docs':
        return <DocsView />;
      case 'profile':
        return <ProfileView />;
      case 'sprints':
        return <SprintsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-6">
            {renderCurrentView()}
          </main>
        </div>
      </div>
      <AIOverlay />
    </div>
  );
}

export default App;