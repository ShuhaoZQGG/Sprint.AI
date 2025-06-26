import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService, AuthUser } from '../services/authService';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize error handling to prevent re-renders
  const handleError = useCallback((error: any, defaultMessage: string) => {
    const errorMessage = error?.message || defaultMessage;
    setError(errorMessage);
    console.error(errorMessage, error);
    return { error: { message: errorMessage } };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          const enrichedUser = await authService.getCurrentUser();
          if (mounted) {
            setUser(enrichedUser);
          }
        }
      } catch (error) {
        if (mounted) {
          handleError(error, 'Error getting initial session');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setError(null); // Clear any previous errors
        
        if (session?.user) {
          try {
            const enrichedUser = await authService.getCurrentUser();
            if (mounted) {
              setUser(enrichedUser);
            }
          } catch (error) {
            if (mounted) {
              handleError(error, 'Error fetching user profile');
            }
          }
        } else {
          if (mounted) {
            setUser(null);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleError]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { user: authUser, error } = await authService.signIn({ email, password });
      
      if (error) {
        return handleError(error, 'Failed to sign in');
      }
      
      setUser(authUser);
      return { error: null };
    } catch (error) {
      return handleError(error, 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const signUp = useCallback(async (data: { 
    email: string; 
    password: string; 
    fullName?: string; 
    teamName?: string; 
    joinTeamId?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const { user: authUser, error } = await authService.signUp(data);
      
      if (error) {
        return handleError(error, 'Failed to create account');
      }
      
      setUser(authUser);
      return { error: null };
    } catch (error) {
      return handleError(error, 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      handleError(error, 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const updateProfile = useCallback(async (updates: any) => {
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
  }, [user, handleError]);

  const updatePassword = useCallback(async (newPassword: string) => {
    setError(null);
    
    try {
      const { error } = await authService.updatePassword(newPassword);
      return { error };
    } catch (error) {
      return handleError(error, 'Failed to update password');
    }
  }, [handleError]);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    
    try {
      const { error } = await authService.resetPassword(email);
      return { error };
    } catch (error) {
      return handleError(error, 'Failed to send reset email');
    }
  }, [handleError]);

  return {
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
};