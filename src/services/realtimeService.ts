import { supabase } from './supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Database } from '../types/database';

export type TableName = keyof Database['public']['Tables'];
export type RealtimePayload<T extends TableName> = RealtimePostgresChangesPayload<{
  [K in T]: Database['public']['Tables'][K]['Row'];
}>;

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  lastSeen: string;
}

export interface RealtimeOptions {
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

class RealtimeService {
  private subscriptions = new Map<string, RealtimeSubscription>();
  private presenceChannels = new Map<string, RealtimeChannel>();
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupConnectionMonitoring();
  }

  /**
   * Set up connection monitoring and auto-reconnection
   */
  private setupConnectionMonitoring() {
    supabase.realtime.onConnect(() => {
      console.log('Realtime connected');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.notifyConnectionChange('connected');
    });

    supabase.realtime.onDisconnect(() => {
      console.log('Realtime disconnected');
      this.connectionStatus = 'disconnected';
      this.notifyConnectionChange('disconnected');
      this.handleReconnection();
    });
  }

  /**
   * Handle automatic reconnection with exponential backoff
   */
  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.connectionStatus = 'connecting';
    this.reconnectAttempts++;
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      // Supabase handles reconnection automatically, we just need to wait
    }, delay);
  }

  /**
   * Notify connection status changes
   */
  private notifyConnectionChange(status: 'connected' | 'disconnected') {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('realtime-connection-change', {
      detail: { status }
    }));
  }

  /**
   * Subscribe to table changes with automatic cleanup
   */
  subscribeToTable<T extends TableName>(
    table: T,
    callback: (payload: RealtimePayload<T>) => void,
    options: RealtimeOptions = {}
  ): RealtimeSubscription {
    const subscriptionId = `${table}_${Date.now()}_${Math.random()}`;
    
    let channelBuilder = supabase
      .channel(`${table}_changes_${subscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: 'public',
          table: table as string,
          filter: options.filter,
        },
        (payload) => {
          try {
            callback(payload as RealtimePayload<T>);
          } catch (error) {
            console.error(`Error in realtime callback for ${table}:`, error);
          }
        }
      );

    const channel = channelBuilder.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to ${table} changes`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to ${table} changes`);
      }
    });

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
        console.log(`Unsubscribed from ${table} changes`);
      }
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Subscribe to multiple tables with a single callback
   */
  subscribeToTables<T extends TableName>(
    tables: T[],
    callback: (table: T, payload: RealtimePayload<T>) => void,
    options: RealtimeOptions = {}
  ): RealtimeSubscription[] {
    return tables.map(table => 
      this.subscribeToTable(table, (payload) => callback(table, payload), options)
    );
  }

  /**
   * Set up presence tracking for collaborative features
   */
  setupPresence(
    channelName: string,
    user: PresenceUser,
    onPresenceChange: (users: PresenceUser[]) => void
  ): RealtimeSubscription {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence state
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = Object.values(presenceState).flat() as PresenceUser[];
        onPresenceChange(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New users joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Users left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Send initial presence data
          await channel.track({
            ...user,
            lastSeen: new Date().toISOString(),
          });
        }
      });

    this.presenceChannels.set(channelName, channel);

    return {
      channel,
      unsubscribe: () => {
        channel.untrack();
        supabase.removeChannel(channel);
        this.presenceChannels.delete(channelName);
      }
    };
  }

  /**
   * Update presence data (e.g., cursor position)
   */
  async updatePresence(channelName: string, data: Partial<PresenceUser>) {
    const channel = this.presenceChannels.get(channelName);
    if (channel) {
      await channel.track({
        ...data,
        lastSeen: new Date().toISOString(),
      });
    }
  }

  /**
   * Send broadcast message to channel
   */
  async broadcast(channelName: string, event: string, payload: any) {
    const channel = this.presenceChannels.get(channelName);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  }

  /**
   * Listen for broadcast messages
   */
  onBroadcast(
    channelName: string,
    event: string,
    callback: (payload: any) => void
  ) {
    const channel = this.presenceChannels.get(channelName);
    if (channel) {
      channel.on('broadcast', { event }, ({ payload }) => {
        callback(payload);
      });
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Manually reconnect
   */
  reconnect() {
    this.reconnectAttempts = 0;
    // Supabase will handle the actual reconnection
    console.log('Manual reconnection triggered');
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    // Unsubscribe from all table subscriptions
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();

    // Clean up presence channels
    this.presenceChannels.forEach(channel => {
      channel.untrack();
      supabase.removeChannel(channel);
    });
    this.presenceChannels.clear();

    console.log('Realtime service cleaned up');
  }

  /**
   * Get subscription count for monitoring
   */
  getSubscriptionCount() {
    return {
      tables: this.subscriptions.size,
      presence: this.presenceChannels.size,
    };
  }
}

export const realtimeService = new RealtimeService();