import React, { useState } from 'react';
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

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-700">
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
            className="pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-64"
          />
        </div>

        {/* Notifications */}
        <button className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors relative">
          <Bell size={20} />
          {/* Notification badge */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
          >
            {user?.profile?.avatar_url ? (
              <img
                src={user.profile.avatar_url}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {user?.profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <span className="hidden sm:inline text-sm">
              {user?.profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </span>
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-dark-700">
                <p className="text-sm font-medium text-white">
                  {user?.profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-dark-400">{user?.email}</p>
                {user?.profile?.role && (
                  <p className="text-xs text-primary-400 capitalize">
                    {user.profile.role}
                  </p>
                )}
              </div>
              
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileSettings(true);
                    setShowUserMenu(false);
                  }}
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

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};