import { useEffect, useRef, useCallback, useState } from 'react';
import { realtimeService, TableName, RealtimePayload, PresenceUser, RealtimeSubscription } from '../services/realtimeService';

/**
 * Hook for subscribing to real-time table changes
 */
export const useRealtimeTable = <T extends TableName>(
  table: T,
  callback: (payload: RealtimePayload<T>) => void,
  options?: {
    filter?: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    enabled?: boolean;
  }
) => {
  const callbackRef = useRef(callback);
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    // Subscribe to table changes
    subscriptionRef.current = realtimeService.subscribeToTable(
      table,
      (payload) => callbackRef.current(payload),
      {
        filter: options?.filter,
        event: options?.event,
      }
    );

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [table, options?.filter, options?.event, options?.enabled]);

  return {
    isSubscribed: !!subscriptionRef.current,
  };
};

/**
 * Hook for real-time presence tracking
 */
export const usePresence = (
  channelName: string,
  user: PresenceUser,
  options?: {
    enabled?: boolean;
  }
) => {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);

  const updatePresence = useCallback(async (data: Partial<PresenceUser>) => {
    if (subscriptionRef.current) {
      await realtimeService.updatePresence(channelName, data);
    }
  }, [channelName]);

  const broadcast = useCallback(async (event: string, payload: any) => {
    await realtimeService.broadcast(channelName, event, payload);
  }, [channelName]);

  const onBroadcast = useCallback((event: string, callback: (payload: any) => void) => {
    realtimeService.onBroadcast(channelName, event, callback);
  }, [channelName]);

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    subscriptionRef.current = realtimeService.setupPresence(
      channelName,
      user,
      (presenceUsers) => {
        setUsers(presenceUsers);
        setIsOnline(true);
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        setIsOnline(false);
        setUsers([]);
      }
    };
  }, [channelName, user.id, user.name, options?.enabled]);

  return {
    users,
    isOnline,
    updatePresence,
    broadcast,
    onBroadcast,
  };
};

/**
 * Hook for monitoring connection status
 */
export const useRealtimeConnection = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  useEffect(() => {
    const handleConnectionChange = (event: CustomEvent) => {
      const newStatus = event.detail.status;
      setStatus(newStatus);
      
      if (newStatus === 'connected') {
        setLastConnected(new Date());
      }
    };

    window.addEventListener('realtime-connection-change', handleConnectionChange as EventListener);

    // Get initial status
    setStatus(realtimeService.getConnectionStatus());

    return () => {
      window.removeEventListener('realtime-connection-change', handleConnectionChange as EventListener);
    };
  }, []);

  const reconnect = useCallback(() => {
    realtimeService.reconnect();
  }, []);

  return {
    status,
    lastConnected,
    reconnect,
    isConnected: status === 'connected',
  };
};

/**
 * Hook for optimistic updates with real-time sync
 */
export const useOptimisticUpdates = <T>(
  initialData: T[],
  keyField: keyof T = 'id' as keyof T
) => {
  const [data, setData] = useState<T[]>(initialData);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  // Update data when initial data changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const optimisticUpdate = useCallback((id: string, updates: Partial<T>) => {
    setPendingUpdates(prev => new Set(prev).add(id));
    
    setData(prev => prev.map(item => 
      item[keyField] === id 
        ? { ...item, ...updates }
        : item
    ));
  }, [keyField]);

  const optimisticAdd = useCallback((newItem: T) => {
    const id = String(newItem[keyField]);
    setPendingUpdates(prev => new Set(prev).add(id));
    
    setData(prev => [newItem, ...prev]);
  }, [keyField]);

  const optimisticRemove = useCallback((id: string) => {
    setPendingUpdates(prev => new Set(prev).add(id));
    
    setData(prev => prev.filter(item => item[keyField] !== id));
  }, [keyField]);

  const confirmUpdate = useCallback((id: string) => {
    setPendingUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const revertUpdate = useCallback((id: string) => {
    setPendingUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    // Revert to original data
    const originalItem = initialData.find(item => item[keyField] === id);
    if (originalItem) {
      setData(prev => prev.map(item => 
        item[keyField] === id ? originalItem : item
      ));
    }
  }, [initialData, keyField]);

  return {
    data,
    pendingUpdates,
    optimisticUpdate,
    optimisticAdd,
    optimisticRemove,
    confirmUpdate,
    revertUpdate,
  };
};

/**
 * Hook for real-time collaboration cursors
 */
export const useCollaborativeCursors = (channelName: string, user: PresenceUser) => {
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; user: PresenceUser }>>(new Map());
  const { updatePresence, users } = usePresence(channelName, user);

  const updateCursor = useCallback((x: number, y: number) => {
    updatePresence({ cursor: { x, y } });
  }, [updatePresence]);

  useEffect(() => {
    const newCursors = new Map();
    users.forEach(presenceUser => {
      if (presenceUser.id !== user.id && presenceUser.cursor) {
        newCursors.set(presenceUser.id, {
          ...presenceUser.cursor,
          user: presenceUser,
        });
      }
    });
    setCursors(newCursors);
  }, [users, user.id]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      updateCursor(event.clientX, event.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [updateCursor]);

  return {
    cursors: Array.from(cursors.values()),
    updateCursor,
  };
};