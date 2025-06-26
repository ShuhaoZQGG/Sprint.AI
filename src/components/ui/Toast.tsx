import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} />;
      case 'error': return <XCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'info': return <Info size={20} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success': return 'bg-success-900/90 border-success-500 text-success-100';
      case 'error': return 'bg-error-900/90 border-error-500 text-error-100';
      case 'warning': return 'bg-warning-900/90 border-warning-500 text-warning-100';
      case 'info': return 'bg-primary-900/90 border-primary-500 text-primary-100';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return 'text-success-400';
      case 'error': return 'text-error-400';
      case 'warning': return 'text-warning-400';
      case 'info': return 'text-primary-400';
    }
  };

  return (
    <div
      className={clsx(
        'flex items-start space-x-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300 ease-out',
        getColors(),
        {
          'translate-x-0 opacity-100': isVisible && !isExiting,
          'translate-x-full opacity-0': !isVisible || isExiting,
        }
      )}
    >
      <div className={clsx('flex-shrink-0 mt-0.5', getIconColor())}>
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium">{title}</h4>
        {message && (
          <p className="mt-1 text-sm opacity-90">{message}</p>
        )}
      </div>
      
      <button
        onClick={handleClose}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Toast container component
export const ToastContainer: React.FC<{
  toasts: ToastProps[];
  onClose: (id: string) => void;
}> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  };

  const error = (title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  };

  const warning = (title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  };

  const info = (title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  };

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onClose={removeToast} />,
  };
};