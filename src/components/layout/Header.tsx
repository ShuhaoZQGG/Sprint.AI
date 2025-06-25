import React from 'react';
import { Search, Bell, User, Command } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useAuth } from '../../hooks/useSupabase';
import { Button } from '../ui/Button';
import { RealtimeIndicator } from '../ui/RealtimeIndicator';

export const Header: React.FC = () => {
  const { setOverlayOpen } = useAppStore();
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-700">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold text-white">
          AI Development Platform
        </h1>
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

        {/* Profile */}
        <button className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <User size={20} />
          )}
        </button>
      </div>
    </header>
  );
};