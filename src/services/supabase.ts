import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { authService } from './authService';

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

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any, context?: string) => {
  console.error(`Supabase error${context ? ` in ${context}` : ''}:`, error);
  
  // Handle specific error types
  if (error?.code === 'PGRST116') {
    return { message: 'No data found', type: 'not_found' };
  }
  
  if (error?.code === '23505') {
    return { message: 'This record already exists', type: 'duplicate' };
  }
  
  if (error?.code === '42501') {
    return { message: 'Permission denied', type: 'permission' };
  }
  
  if (error?.message?.includes('JWT')) {
    return { message: 'Authentication required', type: 'auth' };
  }
  
  if (error?.message?.includes('RLS')) {
    return { message: 'Access denied', type: 'access' };
  }
  
  // Default error handling
  return { 
    message: error?.message || 'An unexpected error occurred', 
    type: 'unknown' 
  };
};

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
export const getCurrentUserTeamId = async (userId?: string): Promise<string | null> => {
  const id = userId ?? (await authService.getCurrentUser())?.id;
  if (!id) return null;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', id)
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