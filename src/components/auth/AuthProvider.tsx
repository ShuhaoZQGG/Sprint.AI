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
  refreshUser: () => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear all auth state
  const clearAuthState = () => {
    console.log('🧹 Clearing auth state...');
    setUser(null);
    setSession(null);
    setError(null);
  };

  // Fetch user profile with retry logic
  const fetchUserProfile = async (retries = 3): Promise<AuthUser | null> => {
    console.log('👤 Fetching user profile...');
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const enrichedUser = await authService.getCurrentUser();
        console.log('✅ User profile fetched successfully:', enrichedUser?.email);
        return enrichedUser;
      } catch (error) {
        console.error(`❌ Error fetching user profile (attempt ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          // On final attempt, check if it's a session issue
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) {
            console.log('🔄 No valid session found, clearing auth state');
            clearAuthState();
            return null;
          }
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return null;
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        const enrichedUser = await fetchUserProfile();
        if (enrichedUser) {
          setUser(enrichedUser);
          setSession(currentSession);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
      setError('Failed to refresh user data');
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking initial session...');
        setLoading(true);
        setError(null);

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Failed to get session');
          clearAuthState();
          return;
        }

        if (!mounted) return;

        if (initialSession?.user) {
          console.log('✅ Valid session found:', initialSession.user.email);
          setSession(initialSession);
          
          try {
            const enrichedUser = await fetchUserProfile();
            if (mounted && enrichedUser) {
              setUser(enrichedUser);
            }
          } catch (error) {
            console.error('❌ Failed to fetch user profile during initialization:', error);
            setError('Failed to load user profile');
            // Don't clear session here, just set error
          }
        } else {
          console.log('ℹ️ No session found');
          clearAuthState();
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setError('Authentication initialization failed');
          clearAuthState();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.log('⚠️ Auth initialization taking too long, forcing completion');
        setLoading(false);
        if (!user && !session) {
          setError('Authentication timeout - please try signing in again');
        }
      }
    }, 10000); // 10 second timeout

    initializeAuth();

    // Listen for auth changes
    console.log('🔄 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔄 Auth state changed:', event, newSession?.user?.email);
        
        if (!mounted) return;

        // Clear timeout since we got an auth event
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        setSession(newSession);
        
        if (event === 'SIGNED_OUT' || !newSession?.user) {
          console.log('👋 User signed out or session invalid');
          clearAuthState();
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('👤 Fetching user profile after auth change...');
          try {
            const enrichedUser = await fetchUserProfile();
            if (mounted && enrichedUser) {
              setUser(enrichedUser);
              setError(null); // Clear any previous errors
            }
          } catch (error) {
            console.error('❌ Failed to fetch user profile after auth change:', error);
            setError('Failed to load user profile');
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.log('🧹 Cleaning up auth provider...');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email);
    setLoading(true);
    setError(null);
    
    try {
      const { user: authUser, error } = await authService.signIn({ email, password });
      
      if (error) {
        setError(error.message || 'Sign in failed');
        return { error };
      }
      
      // User will be set by the auth state change listener
      console.log('✅ Sign in successful');
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMessage);
      return { error: { message: errorMessage } };
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
    console.log('📝 Attempting sign up for:', data.email);
    setLoading(true);
    setError(null);
    
    try {
      const { user: authUser, error } = await authService.signUp(data);
      
      if (error) {
        setError(error.message || 'Sign up failed');
        return { error };
      }
      
      // User will be set by the auth state change listener
      console.log('✅ Sign up successful');
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('👋 Attempting sign out...');
    setLoading(true);
    
    try {
      // Clear local state first
      clearAuthState();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      
      console.log('✅ Sign out successful');
      
      // Force a page reload to clear any cached data
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      setError('Failed to sign out');
      // Even if sign out fails, clear local state
      clearAuthState();
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      const { profile, error } = await authService.updateProfile(updates);
      
      if (!error && profile && user) {
        setUser({ ...user, profile });
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await authService.updatePassword(newPassword);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await authService.resetPassword(email);
      return { error };
    } catch (error) {
      return { error };
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
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};