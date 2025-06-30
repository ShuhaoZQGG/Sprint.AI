import React from 'react';

interface BoltBadgeProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const BoltBadge: React.FC<BoltBadgeProps> = ({ 
  className = '', 
  position = 'top-right' 
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <a 
      href="https://bolt.new/" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`absolute ${positionClasses[position]} z-10 transition-transform hover:scale-105 ${className}`}
      title="Built with Bolt.new"
    >
      <img 
        src="/bolt-badge.png" 
        alt="Built with Bolt.new" 
        className="w-12 h-12 rounded-full shadow-md"
      />
    </a>
  );
};