import { supabase } from './supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

export interface AuthUser extends User {
  profile?: Profile;
  team?: Team;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  teamName?: string;
  joinTeamId?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  invitedByName: string;
  email: string;
  role: 'admin' | 'manager' | 'developer';
  expiresAt: Date;
}

class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (authError) {
        return { user: null, error: authError };
      }

      if (!authData.user) {
        return { user: null, error: { message: 'User creation failed' } as AuthError };
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.fullName || null,
          avatar_url: authData.user.user_metadata?.avatar_url || null,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Handle team creation or joining
      if (data.teamName) {
        await this.createTeam(authData.user.id, data.teamName);
      } else if (data.joinTeamId) {
        await this.joinTeam(authData.user.id, data.joinTeamId);
      }

      const enrichedUser = await this.enrichUser(authData.user);
      return { user: enrichedUser, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error: error as AuthError };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        return { user: null, error: authError };
      }

      if (!authData.user) {
        return { user: null, error: { message: 'Sign in failed' } as AuthError };
      }

      const enrichedUser = await this.enrichUser(authData.user);
      return { user: enrichedUser, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error: error as AuthError };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  /**
   * Get current session
   */
  async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  }

  /**
   * Get current user with profile and team data
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    return this.enrichUser(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Profile>): Promise<{ profile: Profile | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { profile: null, error: { message: 'No authenticated user' } };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    return { profile: data, error };
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  }

  /**
   * Create a new team
   */
  async createTeam(userId: string, teamName: string): Promise<{ team: Team | null; error: any }> {
    try {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          created_by: userId,
        })
        .select()
        .single();

      if (teamError) {
        return { team: null, error: teamError };
      }

      // Update user profile with team ID and admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          team_id: team.id,
          role: 'admin',
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      return { team, error: null };
    } catch (error) {
      console.error('Team creation error:', error);
      return { team: null, error };
    }
  }

  /**
   * Join an existing team
   */
  async joinTeam(userId: string, teamId: string, role: 'developer' | 'manager' = 'developer'): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          team_id: teamId,
          role,
        })
        .eq('id', userId);

      return { error };
    } catch (error) {
      console.error('Join team error:', error);
      return { error };
    }
  }

  /**
   * Leave current team
   */
  async leaveTeam(userId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          team_id: null,
          role: 'developer',
        })
        .eq('id', userId);

      return { error };
    } catch (error) {
      console.error('Leave team error:', error);
      return { error };
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<{ members: Profile[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      return { members: data || [], error };
    } catch (error) {
      console.error('Get team members error:', error);
      return { members: [], error };
    }
  }

  /**
   * Update team member role
   */
  async updateMemberRole(
    userId: string, 
    newRole: 'admin' | 'manager' | 'developer'
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      return { error };
    } catch (error) {
      console.error('Update member role error:', error);
      return { error };
    }
  }

  /**
   * Remove team member
   */
  async removeMember(userId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          team_id: null,
          role: 'developer',
        })
        .eq('id', userId);

      return { error };
    } catch (error) {
      console.error('Remove member error:', error);
      return { error };
    }
  }

  /**
   * Generate team invitation link
   */
  async generateInviteLink(teamId: string, role: 'admin' | 'manager' | 'developer' = 'developer'): Promise<string> {
    const inviteData = {
      teamId,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const encodedData = btoa(JSON.stringify(inviteData));
    return `${window.location.origin}/invite/${encodedData}`;
  }

  /**
   * Process team invitation
   */
  async processInvitation(inviteCode: string): Promise<{ 
    invitation: TeamInvitation | null; 
    error: any 
  }> {
    try {
      const inviteData = JSON.parse(atob(inviteCode));
      
      if (new Date(inviteData.expiresAt) < new Date()) {
        return { invitation: null, error: { message: 'Invitation has expired' } };
      }

      // Get team information
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', inviteData.teamId)
        .single();

      if (teamError || !team) {
        return { invitation: null, error: { message: 'Invalid invitation' } };
      }

      const invitation: TeamInvitation = {
        id: inviteCode,
        teamId: team.id,
        teamName: team.name,
        invitedBy: team.created_by || '',
        invitedByName: 'Team Admin',
        email: '',
        role: inviteData.role,
        expiresAt: new Date(inviteData.expiresAt),
      };

      return { invitation, error: null };
    } catch (error) {
      console.error('Process invitation error:', error);
      return { invitation: null, error: { message: 'Invalid invitation code' } };
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(inviteCode: string): Promise<{ error: any }> {
    try {
      const { invitation, error: inviteError } = await this.processInvitation(inviteCode);
      
      if (inviteError || !invitation) {
        return { error: inviteError };
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: { message: 'Must be logged in to accept invitation' } };
      }

      return this.joinTeam(user.id, invitation.teamId, invitation.role);
    } catch (error) {
      console.error('Accept invitation error:', error);
      return { error };
    }
  }

  /**
   * Enrich user with profile and team data
   */
  private async enrichUser(user: User): Promise<AuthUser> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('id', user.id)
        .single();

      return {
        ...user,
        profile: profile || undefined,
        team: profile?.team || undefined,
      };
    } catch (error) {
      console.error('Error enriching user:', error);
      return user;
    }
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();