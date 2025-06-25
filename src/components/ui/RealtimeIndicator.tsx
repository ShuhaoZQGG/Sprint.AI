import React from 'react';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useRealtimeConnection } from '../../hooks/useRealtime';
import { Button } from './Button';

export const RealtimeIndicator: React.FC = () => {
  const { status, lastConnected, reconnect, isConnected } = useRealtimeConnection();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-success-400';
      case 'connecting': return 'text-warning-400';
      case 'disconnected': return 'text-error-400';
      default: return 'text-dark-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const StatusIcon = isConnected ? Wifi : WifiOff;

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <StatusIcon size={14} className={getStatusColor()} />
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      {status === 'disconnected' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={reconnect}
          className="p-1 h-6 w-6"
          title="Reconnect"
        >
          <RotateCcw size={12} />
        </Button>
      )}
      
      {lastConnected && (
        <span className="text-xs text-dark-500" title="Last connected">
          {lastConnected.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};