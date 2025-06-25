import React from 'react';
import { PresenceUser } from '../../services/realtimeService';

interface CollaborativeCursorProps {
  x: number;
  y: number;
  user: PresenceUser;
}

export const CollaborativeCursor: React.FC<CollaborativeCursorProps> = ({
  x,
  y,
  user,
}) => {
  return (
    <div
      className="fixed pointer-events-none z-50 transition-all duration-100 ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className="drop-shadow-sm"
      >
        <path
          d="M2 2L18 8L8 12L2 18L2 2Z"
          fill="#3B82F6"
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User label */}
      <div className="absolute top-5 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
        {user.name}
      </div>
    </div>
  );
};