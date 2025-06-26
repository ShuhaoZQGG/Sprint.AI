import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

console.log('🔧 Initializing Supabase client...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Missing');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to ensure user profile exists
export const ensureUserProfile = async (user: any) => {
  if (!user) return null;

  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingProfile) {
      return existingProfile;
    }

    // Create profile if it doesn't exist
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return newProfile;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return null;
  }
};

// Helper function to get current user's team ID
export const getCurrentUserTeamId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user team ID:', error);
      return null;
    }

    return profile?.team_id || null;
  } catch (error) {
    console.error('Error getting current user team ID:', error);
    return null;
  }
};

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection error:', error);
  } else {
    console.log('✅ Supabase client initialized successfully');
    console.log('Session:', data.session ? 'Found existing session' : 'No existing session');
  }
}).catch((error) => {
  console.error('❌ Failed to test Supabase connection:', error);
});