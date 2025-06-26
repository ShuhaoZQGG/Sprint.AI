import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a minimal user object from session data
  const createUserFromSession = useCallback((session: Session): AuthUser => {
    return {
      id: session.user.id,
      email: session.user.email!,
      user_metadata: session.user.user_metadata,
      profile: {
        id: session.user.id,
        email: session.user.email!,
        full_name: session.user.user_metadata?.full_name || null,
        avatar_url: session.user.user_metadata?.avatar_url || null,
        github_username: session.user.user_metadata?.github_username || null,
        team_id: null,
        role: 'developer',
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      team: null,
    };
  }, []);

  // Enhanced profile fetching with fallback
  const fetchUserProfile = useCallback(async (session: Session): Promise<AuthUser> => {
    try {
      console.log('👤 Attempting to fetch full user profile...');
      
      // Try to get the full profile with a reasonable timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000);
      });
      
      const profilePromise = authService.getCurrentUser();
      const enrichedUser = await Promise.race([profilePromise, timeoutPromise]);
      
      console.log('✅ Full user profile loaded successfully');
      return enrichedUser;
    } catch (error) {
      console.warn('⚠️ Profile fetch failed, using session data:', error);
      
      // Fallback to session-based user object
      const fallbackUser = createUserFromSession(session);
      
      // Try to fetch profile data in the background without blocking
      authService.getCurrentUser()
        .then((fullUser) => {
          console.log('✅ Background profile fetch successful');
          setUser(fullUser);
        })
        .catch((bgError) => {
          console.warn('⚠️ Background profile fetch also failed:', bgError);
        });
      
      return fallbackUser;
    }
  }, [createUserFromSession]);

  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing authentication...');
        
        // Set a hard timeout for the entire initialization
        initTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.warn('⚠️ Auth initialization timeout - completing with current state');
            setLoading(false);
          }
        }, 10000);

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          if (mounted) {
            setError(sessionError.message);
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;

        console.log('📋 Session status:', session ? `Found for ${session.user.email}` : 'No session');
        setSession(session);

        if (session?.user) {
          try {
            const userData = await fetchUserProfile(session);
            if (mounted) {
              setUser(userData);
              console.log('✅ User authenticated:', userData.email);
            }
          } catch (profileError) {
            console.error('❌ Profile error during init:', profileError);
            if (mounted) {
              // Still create a basic user object so the app can function
              const basicUser = createUserFromSession(session);
              setUser(basicUser);
              setError('Profile data partially unavailable');
            }
          }
        }

      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setError('Authentication initialization failed');
        }
      } finally {
        if (mounted) {
          clearTimeout(initTimeout);
          setLoading(false);
          console.log('✅ Auth initialization complete');
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Set up auth state listener
    console.log('🔄 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state changed:', event, newSession?.user?.email || 'No user');
        
        setSession(newSession);
        setError(null);

        if (newSession?.user) {
          try {
            const userData = await fetchUserProfile(newSession);
            if (mounted) {
              setUser(userData);
              console.log('✅ User updated from auth change');
            }
          } catch (error) {
            console.error('❌ Error updating user from auth change:', error);
            if (mounted) {
              // Fallback to basic user object
              const basicUser = createUserFromSession(newSession);
              setUser(basicUser);
            }
          }
        } else {
          console.log('👤 User signed out');
          if (mounted) {
            setUser(null);
          }
        }
        
        // Ensure loading is false after auth state changes (except initial)
        if (mounted && event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth provider...');
      mounted = false;
      clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, createUserFromSession]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Signing in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        setError(error.message);
        return { error };
      }
      
      if (data.session) {
        const userData = await fetchUserProfile(data.session);
        setUser(userData);
        setSession(data.session);
        console.log('✅ Sign in successful');
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
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
      console.log('📝 Signing up:', data.email);
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          }
        }
      });
      
      if (error) {
        console.error('❌ Sign up error:', error);
        setError(error.message);
        return { error };
      }
      
      if (authData.session) {
        const userData = createUserFromSession(authData.session);
        setUser(userData);
        setSession(authData.session);
        console.log('✅ Sign up successful');
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      });
      
      if (error) {
        setError(error.message);
        return { error };
      }
      
      // Update local user state
      if (user) {
        setUser({
          ...user,
          user_metadata: { ...user.user_metadata, ...updates },
          profile: user.profile ? { ...user.profile, ...updates } : null,
        });
      }
      
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        setError(error.message);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        setError(error.message);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      setError(errorMessage);
      return { error: { message: errorMessage } };
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