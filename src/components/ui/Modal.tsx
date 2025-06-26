import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-lg',
    lg: 'w-full max-w-2xl',
    xl: 'w-full max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-8">
        <div
          className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div
          className={clsx(
            'relative transform overflow-hidden rounded-lg bg-dark-800 border border-dark-700 shadow-xl transition-all animate-scale-in',
            'flex flex-col',
            // Responsive height management
            'h-auto min-h-[400px] max-h-[90vh]',
            // Responsive width management
            sizeClasses[size],
            // Ensure proper sizing on all screen sizes
            'mx-auto'
          )}
          style={{
            // Force minimum height for form modals
            minHeight: size === 'lg' ? '600px' : '400px',
          }}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="text-dark-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 h-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};