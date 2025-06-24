import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className,
  ...props
}) => {
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
          className={clsx(
            'block w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors',
            icon && 'pl-10',
            error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
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