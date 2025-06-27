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
  ChevronRight,
  LogOut,
  Clipboard,
  Github
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useAuth } from '../auth/AuthProvider';
import { ProfileSettings } from '../auth/ProfileSettings';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'business-specs', label: 'Business Specs', icon: Clipboard },
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'profile', label: 'Team Profile', icon: Users },
  { id: 'sprints', label: 'Sprints', icon: Calendar },
  { id: 'repository-connector', label: 'Repository Connector', icon: Github },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, currentView, setCurrentView } = useAppStore();
  const { user, signOut } = useAuth();
  const [showProfileSettings, setShowProfileSettings] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const userButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        userButtonRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  // Close menu on escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showUserMenu]);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleProfileSettingsOpen = () => {
    setShowProfileSettings(true);
    setShowUserMenu(false);
  };

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

      {/* User Profile (Bottom) */}
      <div className="p-4 border-t border-dark-700 relative">
        <div className="relative" ref={userMenuRef}>
          <button
            ref={userButtonRef}
            onClick={handleUserMenuToggle}
            className={clsx(
              'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'text-dark-300 hover:text-white hover:bg-dark-800',
              sidebarOpen ? 'justify-start' : 'justify-center'
            )}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            {user && 'profile' in user && user.profile?.avatar_url ? (
              <img
                src={user.profile.avatar_url}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user && 'profile' in user && user.profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            {sidebarOpen && (
              <span className="text-sm">
                {user && 'profile' in user && user.profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </span>
            )}
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div
              className="absolute left-0 top-full mt-2 w-56 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-[9999] animate-scale-in backdrop-blur-sm"
              style={{ zIndex: 9999 }}
            >
              <div className="p-3 border-b border-dark-700">
                <p className="text-sm font-medium text-white">
                  {user && 'profile' in user && user.profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-dark-400">{user && user.email}</p>
                {user && 'profile' in user && user.profile?.role && (
                  <p className="text-xs text-primary-400 capitalize">
                    {user.profile.role}
                  </p>
                )}
              </div>
              <div className="py-1">
                <button
                  onClick={handleProfileSettingsOpen}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
                >
                  <Settings size={16} />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-dark-700 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />
      {/* Backdrop overlay when menu is open */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setShowUserMenu(false)}
          style={{ zIndex: 9998 }}
        />
      )}
    </div>
  );
};