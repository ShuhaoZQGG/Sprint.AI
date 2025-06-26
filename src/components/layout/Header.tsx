import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, Command, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../ui/Button';
import { ProfileSettings } from '../auth/ProfileSettings';
import { RealtimeIndicator } from '../ui/RealtimeIndicator';

export const Header: React.FC = () => {
  const { setOverlayOpen } = useAppStore();
  const { user, signOut } = useAuth();
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
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
  useEffect(() => {
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
    <header className="flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-700 relative z-50">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold text-white">
          Sprint.AI
        </h1>
        {user?.profile?.team_id && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-dark-800 rounded-full">
            <div className="w-2 h-2 bg-success-400 rounded-full"></div>
            <span className="text-sm text-dark-300">
              {user.team?.name || 'Team'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Real-time Connection Status */}
        <RealtimeIndicator />

        {/* AI Command Palette Trigger */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOverlayOpen(true)}
          className="flex items-center space-x-2"
        >
          <Command size={16} />
          <span className="hidden sm:inline">AI Assistant</span>
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs bg-dark-700 border border-dark-600 rounded">
            Ctrl+.
          </kbd>
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 hover:border-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-64 transition-colors duration-200"
          />
        </div>

        {/* Notifications */}
        <button className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors relative">
          <Bell size={20} />
          {/* Notification badge */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
        </button>
      </div>

      {/* Profile Settings Modal */}
      {/* Backdrop overlay when menu is open */}
    </header>
  );
};