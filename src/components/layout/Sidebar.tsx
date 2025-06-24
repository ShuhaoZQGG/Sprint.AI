import React from 'react';
import { clsx } from 'clsx';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Users, 
  Calendar,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'profile', label: 'Team Profile', icon: Users },
  { id: 'sprints', label: 'Sprints', icon: Calendar },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, currentView, setCurrentView } = useAppStore();

  return (
    <div
      className={clsx(
        'flex flex-col bg-dark-900 border-r border-dark-700 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        {sidebarOpen && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Sprint.AI</span>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className={clsx(
                'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-dark-300 hover:text-white hover:bg-dark-800'
              )}
            >
              <Icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-dark-700">
        <button
          className={clsx(
            'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-800 transition-all duration-200'
          )}
        >
          <Settings size={20} />
          {sidebarOpen && <span>Settings</span>}
        </button>
      </div>
    </div>
  );
};