import React from 'react';
import { BusinessSpec } from '../../types';

interface BusinessSpecStatusBadgeProps {
  status: BusinessSpec['status'];
  className?: string;
}

export const BusinessSpecStatusBadge: React.FC<BusinessSpecStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const getStatusConfig = (status: BusinessSpec['status']) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          className: 'bg-dark-700 text-dark-300 border-dark-600',
        };
      case 'review':
        return {
          label: 'Review',
          className: 'bg-warning-900/20 text-warning-400 border-warning-500',
        };
      case 'approved':
        return {
          label: 'Approved',
          className: 'bg-success-900/20 text-success-400 border-success-500',
        };
      case 'implemented':
        return {
          label: 'Implemented',
          className: 'bg-primary-900/20 text-primary-400 border-primary-500',
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-dark-700 text-dark-300 border-dark-600',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
};