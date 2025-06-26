import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'dark';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'border-primary-400 border-t-transparent',
    secondary: 'border-secondary-400 border-t-transparent',
    white: 'border-white border-t-transparent',
    dark: 'border-dark-400 border-t-transparent',
  };

  return (
    <div
      className={clsx(
        'border-2 rounded-full animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
};

// Skeleton loading components
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('animate-pulse bg-dark-700 rounded-lg', className)}>
    <div className="p-6 space-y-4">
      <div className="h-4 bg-dark-600 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-dark-600 rounded"></div>
        <div className="h-3 bg-dark-600 rounded w-5/6"></div>
      </div>
      <div className="flex space-x-2">
        <div className="h-6 bg-dark-600 rounded w-16"></div>
        <div className="h-6 bg-dark-600 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 3, 
  className 
}) => (
  <div className={clsx('space-y-3', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="animate-pulse flex items-center space-x-4 p-4 bg-dark-700 rounded-lg">
        <div className="w-10 h-10 bg-dark-600 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-dark-600 rounded w-3/4"></div>
          <div className="h-3 bg-dark-600 rounded w-1/2"></div>
        </div>
        <div className="w-16 h-8 bg-dark-600 rounded"></div>
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({ 
  rows = 5, 
  cols = 4, 
  className 
}) => (
  <div className={clsx('animate-pulse', className)}>
    {/* Header */}
    <div className="flex space-x-4 p-4 border-b border-dark-700">
      {Array.from({ length: cols }).map((_, index) => (
        <div key={index} className="flex-1 h-4 bg-dark-600 rounded"></div>
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 p-4 border-b border-dark-800">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div key={colIndex} className="flex-1 h-3 bg-dark-700 rounded"></div>
        ))}
      </div>
    ))}
  </div>
);