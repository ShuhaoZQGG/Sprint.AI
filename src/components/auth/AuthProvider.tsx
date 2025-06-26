import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService, AuthUser } from '../../services/authService';
import { supabase } from '../../services/supabase';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (data: { email: string; password: string; fullName?: string; teamName?: string; joinTeamId?: string }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Helper function to create a timeout promise
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to handle errors consistently
  const handleError = (error: any, defaultMessage: string) => {
    const errorMessage = error?.message || defaultMessage;
    setError(errorMessage);
    console.error(errorMessage, error);
    return { error: { message: errorMessage } };
  };

  // Helper function to fetch user profile with timeout
  const fetchUserProfile = async (timeoutMs: number = 10000): Promise<AuthUser | null> => {
    try {
      console.log('👤 Fetching user profile...');
      const enrichedUser = await withTimeout(authService.getCurrentUser(), timeoutMs);
      console.log('✅ User profile loaded:', enrichedUser?.profile?.full_name || enrichedUser?.email);
      return enrichedUser;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      
      // If profile fetch fails, create a minimal user object from session
      const currentSession = await supabase.auth.getSession();
      if (currentSession.data.session?.user) {
        const fallbackUser: AuthUser = {
          id: currentSession.data.session.user.id,
          email: currentSession.data.session.user.email!,
          profile: null,
          team: null,
        };
        console.log('⚠️ Using fallback user object');
        return fallbackUser;
      }
      
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    // Set a maximum initialization time
    initializationTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth initialization taking too long, forcing completion');
        setLoading(false);
        setError('Authentication initialization timed out');
      }
    }, 15000); // 15 second timeout

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Checking initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          if (mounted) {
            setError(error.message);
            setLoading(false);
          }
          return;
        }

        console.log('📋 Initial session:', session ? 'Found' : 'None');
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          try {
            const enrichedUser = await fetchUserProfile(8000); // 8 second timeout for initial load
            if (mounted) {
              setUser(enrichedUser);
            }
          } catch (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            if (mounted) {
              setError('Failed to load user profile');
            }
          }
        } else {
          console.log('👤 No user session found');
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error);
        if (mounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete');
          clearTimeout(initializationTimeout);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    console.log('🔄 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
        
        setSession(session);
        setError(null); // Clear any previous errors
        
        if (session?.user) {
          try {
            console.log('👤 Fetching user profile after auth change...');
            const enrichedUser = await fetchUserProfile(5000); // 5 second timeout for auth changes
            if (mounted) {
              setUser(enrichedUser);
              console.log('✅ User profile updated');
            }
          } catch (error) {
            console.error('❌ Error fetching user profile after auth change:', error);
            if (mounted) {
              // Don't set loading to false here, let the profile fetch handle it
              setError('Failed to load user profile');
            }
          }
        } else {
          console.log('👤 User signed out');
          if (mounted) {
            setUser(null);
          }
        }
        
        // Always ensure loading is false after auth state changes
        if (mounted && event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth provider...');
      mounted = false;
      clearTimeout(initializationTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Attempting sign in for:', email);
      const { user: authUser, error } = await authService.signIn({ email, password });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return handleError(error, 'Failed to sign in');
      }
      
      console.log('✅ Sign in successful');
      setUser(authUser);
      return { error: null };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      return handleError(error, 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: { 
    email: string; 
    password: string; 
    fullName?: string; 
    teamName?: string; 
    joinTeamId?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Attempting sign up for:', data.email);
      const { user: authUser, error } = await authService.signUp(data);
      
      if (error) {
        console.error('❌ Sign up error:', error);
        return handleError(error, 'Failed to create account');
      }
      
      console.log('✅ Sign up successful');
      setUser(authUser);
      return { error: null };
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      return handleError(error, 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚪 Signing out...');
      await authService.signOut();
      setUser(null);
      setSession(null);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      handleError(error, 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    setError(null);
    
    try {
      const { profile, error } = await authService.updateProfile(updates);
      
      if (!error && profile && user) {
        setUser({ ...user, profile });
      }
      
      return { error };
    } catch (error) {
      return handleError(error, 'Failed to update profile');
    }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    
    try {
      const { error } = await authService.updatePassword(newPassword);
      return { error };
    } catch (error) {
      return handleError(error, 'Failed to update password');
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    
    try {
      const { error } = await authService.resetPassword(email);
      return { error };
    } catch (error) {
      return handleError(error, 'Failed to send reset email');
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};