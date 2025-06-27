import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AIOverlay } from './components/overlay/AIOverlay';
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksView } from './components/tasks/TasksView';
import { DocsView } from './components/docs/DocsView';
import { ProfileView } from './components/profile/ProfileView';
import { SprintsView } from './components/sprints/SprintsView';
import { BusinessSpecView } from './components/business/BusinessSpecView';
import { AuthModal } from './components/auth/AuthModal';
import { useAppStore } from './stores/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAuth } from './components/auth/AuthProvider';
import { FadeIn, SlideIn } from './components/ui/AnimatedCounter';
import { RepositoryConnector } from './components/repository/RepositoryConnector';

function App() {
  const { currentView, setCurrentView } = useAppStore() as { currentView: 'dashboard' | 'tasks' | 'business-specs' | 'docs' | 'profile' | 'sprints' | 'repository-connector', setCurrentView: (view: string) => void };
  const { user, loading, error, clearError } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { ShortcutHelperModal } = useKeyboardShortcuts();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <FadeIn className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Sprint.AI...</p>
          {error && (
            <div className="mt-4 p-3 bg-error-900/20 border border-error-500 rounded-lg max-w-md">
              <p className="text-error-400 text-sm">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-xs text-error-300 hover:text-error-200 underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </FadeIn>
      </div>
    );
  }

  // Show authentication modal if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 text-white">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <FadeIn delay={200}>
              <div className="mb-8">
                <SlideIn direction="down" delay={400}>
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mx-auto mb-4 animate-float">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </SlideIn>
                <SlideIn direction="up" delay={600}>
                  <h1 className="text-3xl font-bold mb-2">Welcome to Sprint.AI</h1>
                  <p className="text-dark-400">Your AI-native development platform</p>
                </SlideIn>
              </div>
            </FadeIn>
            
            <SlideIn direction="up" delay={800}>
              <div className="space-y-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/25"
                >
                  Get Started
                </button>
                
                {/* Show error if there's an auth error */}
                {error && (
                  <div className="p-3 bg-error-900/20 border border-error-500 rounded-lg">
                    <p className="text-error-400 text-sm">{error}</p>
                    <button
                      onClick={clearError}
                      className="mt-2 text-xs text-error-300 hover:text-error-200 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-sm text-dark-400">
                  <FadeIn delay={1000}>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center mx-auto mb-2 hover:bg-dark-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span>AI-Powered</span>
                    </div>
                  </FadeIn>
                  <FadeIn delay={1200}>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center mx-auto mb-2 hover:bg-dark-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span>Team Focused</span>
                    </div>
                  </FadeIn>
                  <FadeIn delay={1400}>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center mx-auto mb-2 hover:bg-dark-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span>Real-time</span>
                    </div>
                  </FadeIn>
                </div>
              </div>
            </SlideIn>
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
      case 'business-specs':
        return <BusinessSpecView />;
      case 'docs':
        return <DocsView />;
      case 'profile':
        return <ProfileView />;
      case 'sprints':
        return <SprintsView />;
      case 'repository-connector':
        return <RepositoryConnector isOpen={true} onClose={() => setCurrentView('dashboard')} />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <div className="flex">
        <SlideIn direction="left" duration={300}>
          <Sidebar />
        </SlideIn>
        <div className="flex-1 flex flex-col min-h-screen overflow-x-auto">
          <SlideIn direction="down" duration={300} delay={100}>
            <Header />
          </SlideIn>
          <main id="main-content" className="flex-1 p-6">
            <FadeIn duration={400} delay={200}>
              {renderCurrentView()}
            </FadeIn>
          </main>
        </div>
      </div>
      <AIOverlay />
      <ShortcutHelperModal />
    </div>
  );
}

export default App;