import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
  return (
    <div
      className={clsx(
        'bg-dark-800 border border-dark-700 rounded-lg shadow-sm',
        hover && 'hover:border-dark-600 hover:shadow-md transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={clsx('px-6 py-4 border-b border-dark-700', className)}>
    {children}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={clsx('px-6 py-4', className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={clsx('px-6 py-4 border-t border-dark-700', className)}>
    {children}
  </div>
);