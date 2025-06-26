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
  clearError: () => void;
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
  const [initialized, setInitialized] = useState(false);

  // Clear error function
  const clearError = () => setError(null);

  // Enhanced session restoration with better error handling
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...');
        setLoading(true);
        setError(null);

        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted && !initialized) {
            console.log('⏰ Auth initialization timeout - forcing completion');
            setLoading(false);
            setInitialized(true);
            setError('Authentication initialization timed out. Please try signing in again.');
          }
        }, 8000);

        // Get initial session with retry logic
        let session: Session | null = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries && mounted) {
          try {
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.log(`❌ Session error (attempt ${retryCount + 1}):`, sessionError.message);
              if (sessionError.message.includes('Invalid Refresh Token') || 
                  sessionError.message.includes('refresh_token_not_found')) {
                // Clear invalid session
                await supabase.auth.signOut();
                break;
              }
              throw sessionError;
            }

            session = currentSession;
            break;
          } catch (err) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw err;
            }
            console.log(`🔄 Retrying session fetch (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        if (!mounted) return;

        console.log('📱 Initial session:', session ? `Found for ${session.user.email}` : 'None');
        setSession(session);

        // If we have a session, try to get the user profile
        if (session?.user) {
          try {
            console.log('👤 Fetching user profile for session...');
            const enrichedUser = await authService.getCurrentUser();
            
            if (mounted) {
              setUser(enrichedUser);
              console.log('✅ Session restored successfully for:', enrichedUser?.email);
            }
          } catch (profileError: any) {
            console.log('❌ Profile fetch error during session restoration:', profileError.message);
            
            // If profile fetch fails, clear the session
            if (profileError.message?.includes('JWT') || 
                profileError.message?.includes('expired') ||
                profileError.message?.includes('invalid')) {
              console.log('🔄 Clearing invalid session...');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            } else {
              setError('Failed to load user profile. Please try signing in again.');
            }
          }
        }

      } catch (error: any) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setError(error.message || 'Failed to initialize authentication');
          // Clear any invalid session
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
          setInitialized(true);
          console.log('✅ Auth initialization completed');
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!initialized) return;

    console.log('🔄 Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
        
        try {
          setSession(session);
          
          if (event === 'SIGNED_OUT' || !session?.user) {
            console.log('👋 User signed out or session cleared');
            setUser(null);
            setError(null);
            return;
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('👤 Fetching user profile after auth change...');
            
            try {
              const enrichedUser = await authService.getCurrentUser();
              setUser(enrichedUser);
              setError(null);
              console.log('✅ User profile updated:', enrichedUser?.email);
            } catch (profileError: any) {
              console.error('❌ Profile fetch error after auth change:', profileError.message);
              
              // If profile fetch fails after sign in, it's a serious issue
              if (event === 'SIGNED_IN') {
                setError('Failed to load user profile after sign in. Please try again.');
              }
            }
          }
        } catch (error: any) {
          console.error('❌ Error in auth state change handler:', error);
          setError(error.message || 'Authentication error occurred');
        }
      }
    );

    return () => {
      console.log('🔄 Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [initialized]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Attempting sign in for:', email);
      const { user: authUser, error } = await authService.signIn({ email, password });
      
      if (error) {
        setError(error.message || 'Sign in failed');
        return { error };
      }
      
      // User will be set by the auth state change listener
      console.log('✅ Sign in successful');
      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed';
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
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Attempting sign up for:', data.email);
      const { user: authUser, error } = await authService.signUp(data);
      
      if (error) {
        setError(error.message || 'Sign up failed');
        return { error };
      }
      
      // User will be set by the auth state change listener
      console.log('✅ Sign up successful');
      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Sign up failed';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Signing out...');
      setLoading(true);
      
      // Clear state immediately for better UX
      setUser(null);
      setSession(null);
      setError(null);
      
      // Sign out from Supabase
      await authService.signOut();
      
      console.log('✅ Sign out successful');
      
      // Force page reload to clear any cached data
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      // Even if sign out fails, clear local state
      setUser(null);
      setSession(null);
      setError(null);
      
      // Still reload the page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
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
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};