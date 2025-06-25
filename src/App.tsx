import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AIOverlay } from './components/overlay/AIOverlay';
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksView } from './components/tasks/TasksView';
import { DocsView } from './components/docs/DocsView';
import { ProfileView } from './components/profile/ProfileView';
import { SprintsView } from './components/sprints/SprintsView';
import { AuthModal } from './components/auth/AuthModal';
import { useAppStore } from './stores/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAuth } from './components/auth/AuthProvider';

function App() {
  const { currentView } = useAppStore();
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  useKeyboardShortcuts();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Sprint.AI...</p>
        </div>
      </div>
    );
  }

  // Show authentication modal if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 text-white">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome to Sprint.AI</h1>
              <p className="text-dark-400">Your AI-native development platform</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Get Started
              </button>
              
              <div className="grid grid-cols-3 gap-4 text-sm text-dark-400">
                <div className="text-center">
                  <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>AI-Powered</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span>Team Focused</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span>Real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode="signup"
        />
      </div>
    );
  }

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