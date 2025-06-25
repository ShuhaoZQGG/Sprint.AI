import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, ensureUserProfile, getCurrentUserTeamId } from '../services/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
};

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

    const setupRealtime = async () => {
      try {
        // Get current user's team ID for filtering
        const teamId = await getCurrentUserTeamId();
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamId = await getCurrentUserTeamId();
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
        const teamId = await getCurrentUserTeamId();
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