import React, { useState } from 'react';
import { X, Mail, Lock, User, Users, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from './AuthProvider';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
  inviteCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signin',
  inviteCode,
}) => {
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    teamName: '',
    createTeam: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }

      const { error } = await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        teamName: formData.createTeam ? formData.teamName : undefined,
        joinTeamId: inviteCode && !formData.createTeam ? inviteCode : undefined,
      });

      if (error) {
        toast.error(error.message || 'Failed to create account');
      } else {
        toast.success('Account created successfully!');
        onClose();
      }
    } else if (mode === 'signin') {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        toast.error(error.message || 'Failed to sign in');
      } else {
        toast.success('Welcome back!');
        onClose();
      }
    } else if (mode === 'reset') {
      const { error } = await resetPassword(formData.email);

      if (error) {
        toast.error(error.message || 'Failed to send reset email');
      } else {
        toast.success('Password reset email sent!');
        setMode('signin');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      teamName: '',
      createTeam: true,
    });
    setShowPassword(false);
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return inviteCode ? 'Join Team' : 'Create Account';
      case 'reset': return 'Reset Password';
      default: return 'Sign In';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          icon={<Mail size={16} />}
          required
        />

        {/* Password (not for reset mode) */}
        {mode !== 'reset' && (
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              icon={<Lock size={16} />}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-dark-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        )}

        {/* Confirm Password (signup only) */}
        {mode === 'signup' && (
          <Input
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            icon={<Lock size={16} />}
            required
          />
        )}

        {/* Full Name (signup only) */}
        {mode === 'signup' && (
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            icon={<User size={16} />}
          />
        )}

        {/* Team Setup (signup only, not for invites) */}
        {mode === 'signup' && !inviteCode && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.createTeam}
                  onChange={() => handleInputChange('createTeam', 'true')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-white">Create new team</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.createTeam}
                  onChange={() => handleInputChange('createTeam', 'false')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-white">Join existing team</span>
              </label>
            </div>

            {formData.createTeam && (
              <Input
                label="Team Name"
                placeholder="Enter your team name"
                value={formData.teamName}
                onChange={(e) => handleInputChange('teamName', e.target.value)}
                icon={<Users size={16} />}
                required
              />
            )}

            {!formData.createTeam && (
              <div className="p-4 bg-dark-700 rounded-lg border border-dark-600">
                <p className="text-sm text-dark-300 mb-2">
                  To join an existing team, you'll need an invitation link from a team admin.
                </p>
                <p className="text-xs text-dark-400">
                  Create your account first, then use the invitation link to join the team.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Invite Info */}
        {inviteCode && mode === 'signup' && (
          <div className="p-4 bg-primary-900/20 rounded-lg border border-primary-500">
            <div className="flex items-center space-x-2 mb-2">
              <Users size={16} className="text-primary-400" />
              <span className="text-sm font-medium text-primary-400">Team Invitation</span>
            </div>
            <p className="text-sm text-dark-300">
              You're being invited to join a team. Complete your account setup to get started.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          className="w-full"
        >
          {mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Send Reset Email' : 'Sign In'}
        </Button>

        {/* Mode Switching */}
        <div className="space-y-3 pt-4 border-t border-dark-700">
          {mode === 'signin' && (
            <>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
              <div className="text-center">
                <span className="text-sm text-dark-400">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-center">
              <span className="text-sm text-dark-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="text-center">
              <span className="text-sm text-dark-400">Remember your password? </span>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};