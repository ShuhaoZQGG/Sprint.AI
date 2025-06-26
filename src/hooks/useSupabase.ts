import { useEffect, useState } from 'react';
import { supabase, getCurrentUserTeamId } from '../services/supabase';
import { Database } from '../types/database';
import { useAuth } from '../components/auth/AuthProvider';

export const useRealtime = <T>(
  table: keyof Database['public']['Tables'],
  filter?: string,
  callback?: (payload: any) => void
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any;
    const { user } = useAuth();

    const setupRealtime = async () => {
      try {
        // Get current user's team ID for filtering
        const teamId = await getCurrentUserTeamId(user?.id || '');
        if (!teamId) {
          setError('No team access');
          setLoading(false);
          return;
        }

        // Initial data fetch
        let query = supabase.from(table).select('*');
        
        // Add team filter if the table has team_id
        if (['repositories', 'developers', 'tasks', 'sprints', 'business_specs', 'generated_docs', 'pr_templates'].includes(table)) {
          query = query.eq('team_id', teamId);
        }

        if (filter) {
          // Parse and apply additional filters
          // This is a simple implementation - could be enhanced
          const [column, value] = filter.split('=');
          if (column && value) {
            query = query.eq(column, value);
          }
        }

        const { data: initialData, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setData(initialData || []);
        }

        // Set up realtime subscription
        subscription = supabase
          .channel(`${table}_changes`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table,
              filter: `team_id=eq.${teamId}`,
            },
            (payload) => {
              if (callback) {
                callback(payload);
              }

              // Update local data based on the change
              setData(current => {
                switch (payload.eventType) {
                  case 'INSERT':
                    return [...current, payload.new as T];
                  case 'UPDATE':
                    return current.map(item => 
                      (item as any).id === payload.new.id ? payload.new as T : item
                    );
                  case 'DELETE':
                    return current.filter(item => (item as any).id !== payload.old.id);
                  default:
                    return current;
                }
              });
            }
          )
          .subscribe();

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    setupRealtime();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [table, filter, callback]);

  return { data, loading, error };
};

export const useSupabaseQuery = <T>(
  table: keyof Database['public']['Tables'],
  options?: {
    select?: string;
    filter?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamId = await getCurrentUserTeamId(user?.id || '');
        if (!teamId) {
          setError('No team access');
          setLoading(false);
          return;
        }

        let query = supabase.from(table);

        if (options?.select) {
          query = query.select(options.select);
        } else {
          query = query.select('*');
        }

        // Add team filter if applicable
        if (['repositories', 'developers', 'tasks', 'sprints', 'business_specs', 'generated_docs', 'pr_templates'].includes(table)) {
          query = query.eq('team_id', teamId);
        }

        // Apply additional filters
        if (options?.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        // Apply ordering
        if (options?.orderBy) {
          query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending ?? true 
          });
        }

        // Apply limit
        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const { data: result, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setData(result || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, JSON.stringify(options)]);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    // Re-run the effect
    const fetchData = async () => {
      try {
        const teamId = await getCurrentUserTeamId(user?.id || '');
        if (!teamId) {
          setError('No team access');
          setLoading(false);
          return;
        }

        let query = supabase.from(table);

        if (options?.select) {
          query = query.select(options.select);
        } else {
          query = query.select('*');
        }

        if (['repositories', 'developers', 'tasks', 'sprints', 'business_specs', 'generated_docs', 'pr_templates'].includes(table)) {
          query = query.eq('team_id', teamId);
        }

        if (options?.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        if (options?.orderBy) {
          query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending ?? true 
          });
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const { data: result, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setData(result || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    await fetchData();
  };

  return { data, loading, error, refetch };
};
