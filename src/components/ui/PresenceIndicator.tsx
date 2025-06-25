import React from 'react';
import { Users } from 'lucide-react';
import { PresenceUser } from '../../services/realtimeService';

interface PresenceIndicatorProps {
  users: PresenceUser[];
  maxVisible?: number;
  showNames?: boolean;
  className?: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  maxVisible = 3,
  showNames = false,
  className = '',
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.id}
            className="relative"
            title={user.name}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-6 h-6 rounded-full border-2 border-dark-800 object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-dark-800 bg-primary-600 flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success-400 rounded-full border border-dark-800" />
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="w-6 h-6 rounded-full border-2 border-dark-800 bg-dark-600 flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              +{hiddenCount}
            </span>
          </div>
        )}
      </div>
      
      {showNames && (
        <div className="flex items-center space-x-1 text-xs text-dark-400">
          <Users size={12} />
          <span>
            {users.length === 1 
              ? `${users[0].name} is here`
              : `${users.length} people online`
            }
          </span>
        </div>
      )}
    </div>
  );
};