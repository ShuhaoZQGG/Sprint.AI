import React, { useState } from 'react';
import { User, Mail, Lock, Save, Upload, Users, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useAuth } from './AuthProvider';
import toast from 'react-hot-toast';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateProfile, updatePassword, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'team'>('profile');
  const [loading, setLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fullName: user?.profile?.full_name || '',
    email: user?.email || '',
    avatarUrl: user?.profile?.avatar_url || '',
    githubUsername: user?.profile?.github_username || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await updateProfile({
        full_name: profileData.fullName,
        avatar_url: profileData.avatarUrl,
        github_username: profileData.githubUsername,
      });

      if (error) {
        toast.error(error.message || 'Failed to update profile');
      } else {
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(passwordData.newPassword);

      if (error) {
        toast.error(error.message || 'Failed to update password');
      } else {
        toast.success('Password updated successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
      onClose();
      toast.success('Signed out successfully');
    }
  };

  const renderProfileTab = () => (
    <form onSubmit={handleProfileUpdate} className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative">
          {profileData.avatarUrl ? (
            <img
              src={profileData.avatarUrl}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-dark-600"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center border-2 border-dark-600">
              <User size={32} className="text-white" />
            </div>
          )}
          <button
            type="button"
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
          >
            <Upload size={14} className="text-white" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{profileData.fullName || 'Your Name'}</h3>
          <p className="text-sm text-dark-400">{profileData.email}</p>
          {user?.profile?.team_id && (
            <div className="flex items-center space-x-1 mt-1">
              <Users size={12} className="text-secondary-400" />
              <span className="text-xs text-secondary-400">Team Member</span>
            </div>
          )}
        </div>
      </div>

      <Input
        label="Full Name"
        value={profileData.fullName}
        onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
        icon={<User size={16} />}
      />

      <Input
        label="Email"
        type="email"
        value={profileData.email}
        disabled
        icon={<Mail size={16} />}
        className="opacity-50"
      />

      <Input
        label="Avatar URL"
        value={profileData.avatarUrl}
        onChange={(e) => setProfileData(prev => ({ ...prev, avatarUrl: e.target.value }))}
        placeholder="https://example.com/avatar.jpg"
      />

      <Input
        label="GitHub Username"
        value={profileData.githubUsername}
        onChange={(e) => setProfileData(prev => ({ ...prev, githubUsername: e.target.value }))}
        placeholder="your-github-username"
      />

      <Button type="submit" loading={loading} className="w-full">
        <Save size={16} className="mr-2" />
        Save Changes
      </Button>
    </form>
  );

  const renderSecurityTab = () => (
    <form onSubmit={handlePasswordUpdate} className="space-y-6">
      <div className="p-4 bg-warning-900/20 rounded-lg border border-warning-500">
        <h4 className="text-sm font-medium text-warning-400 mb-2">Password Security</h4>
        <p className="text-sm text-dark-300">
          Choose a strong password that you don't use elsewhere. We recommend using a password manager.
        </p>
      </div>

      <Input
        label="New Password"
        type="password"
        value={passwordData.newPassword}
        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
        icon={<Lock size={16} />}
        placeholder="Enter new password"
        required
      />

      <Input
        label="Confirm New Password"
        type="password"
        value={passwordData.confirmPassword}
        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
        icon={<Lock size={16} />}
        placeholder="Confirm new password"
        required
      />

      <Button type="submit" loading={loading} className="w-full">
        <Lock size={16} className="mr-2" />
        Update Password
      </Button>
    </form>
  );

  const renderTeamTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-secondary-900/20 rounded-lg border border-secondary-500">
        <h4 className="text-sm font-medium text-secondary-400 mb-2">Team Information</h4>
        {user?.profile?.team_id ? (
          <>
            <p className="text-sm text-dark-300 mb-2">
              You are a member of team <span className="font-semibold text-secondary-300">{user.team?.name || 'N/A'}</span>.
            </p>
            <p className="text-xs text-dark-400">
              Contact your team admin for changes to team membership or roles.
            </p>
          </>
        ) : (
          <p className="text-sm text-dark-300">You are not currently part of a team.</p>
        )}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile Settings">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary-700 text-white' : 'bg-dark-700 text-dark-300'}`}
              onClick={() => setActiveTab('profile')}
              type="button"
            >
              Profile
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-primary-700 text-white' : 'bg-dark-700 text-dark-300'}`}
              onClick={() => setActiveTab('security')}
              type="button"
            >
              Security
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-primary-700 text-white' : 'bg-dark-700 text-dark-300'}`}
              onClick={() => setActiveTab('team')}
              type="button"
            >
              Team
            </button>
            <div className="flex-1" />
            <button
              className="px-3 py-2 rounded-md text-sm font-medium bg-dark-700 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
              onClick={handleSignOut}
              type="button"
            >
              <LogOut size={16} className="inline-block mr-1" /> Sign Out
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'team' && renderTeamTab()}
        </CardContent>
      </Card>
    </Modal>
  );
};