import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get current user's team ID
export const getCurrentUserTeamId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single();

  return profile?.team_id || null;
};

// Helper function to ensure user has a profile
export const ensureUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!existingProfile) {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      });

    if (error) throw error;
  }

  return existingProfile;
};

// Helper function to create or join a team
export const createOrJoinTeam = async (teamName: string, isCreating: boolean = true) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  if (isCreating) {
    // Create new team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        created_by: user.id,
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // Update user profile with team ID
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: team.id, role: 'admin' })
      .eq('id', user.id);

    if (profileError) throw profileError;

    return team;
  } else {
    // Join existing team (would need invitation system)
    throw new Error('Team joining not implemented yet');
  }
};

// Connection status monitoring
export const monitorConnection = () => {
  return supabase.realtime.onConnect(() => {
    console.log('Connected to Supabase Realtime');
  });
};

// Error handling helper
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  if (error?.code === 'PGRST116') {
    return 'No data found';
  }
  
  if (error?.code === '23505') {
    return 'This item already exists';
  }
  
  if (error?.code === '42501') {
    return 'You do not have permission to perform this action';
  }
  
  return error?.message || 'An unexpected error occurred';
};

export default supabase;