import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  isValid?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  isValid,
  className,
  type = 'text',
  ...props
}) => {
  const getBorderClasses = () => {
    if (error) {
      return 'border-error-500 focus:border-error-500 focus:ring-error-500';
    }
    
    // For password and email inputs in forms, show success border when valid
    if (isValid && (type === 'email' || type === 'password')) {
      return 'border-success-500 focus:border-success-500 focus:ring-success-500';
    }
    
    // Default styling with hover effect
    return 'border-dark-600 hover:border-dark-500 focus:border-primary-500 focus:ring-primary-500';
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-200 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={clsx(
            'block w-full rounded-lg border bg-dark-700 px-3 py-2 text-white placeholder-dark-400 focus:outline-none focus:ring-1 transition-colors duration-200',
            icon && 'pl-10',
            getBorderClasses(),
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-error-400">{error}</p>
      )}
    </div>
  );
};