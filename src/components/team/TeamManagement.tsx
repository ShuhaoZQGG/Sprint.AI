import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  User,
  Mail,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useAuth } from '../auth/AuthProvider';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'admin' | 'manager' | 'developer';
  joinedAt: Date;
  lastActive: Date;
}

interface TeamManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'settings'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'developer' | 'manager'>('developer');
  const [inviteLink, setInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock team members data - replace with real data from your service
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      email: 'admin@company.com',
      fullName: 'Team Admin',
      avatarUrl: null,
      role: 'admin',
      joinedAt: new Date('2024-01-01'),
      lastActive: new Date(),
    },
    {
      id: '2',
      email: 'developer@company.com',
      fullName: 'John Developer',
      avatarUrl: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150',
      role: 'developer',
      joinedAt: new Date('2024-01-15'),
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  ]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'manager': return Shield;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-warning-400';
      case 'manager': return 'text-primary-400';
      default: return 'text-dark-400';
    }
  };

  const generateInviteLink = async () => {
    setLoading(true);
    try {
      // Mock invite link generation - replace with real service
      const mockLink = `${window.location.origin}/invite/abc123def456`;
      setInviteLink(mockLink);
      toast.success('Invite link generated!');
    } catch (error) {
      toast.error('Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const sendEmailInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      // Mock email invite - replace with real service
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      // Mock member removal - replace with real service
      toast.success('Team member removed successfully');
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'manager' | 'developer') => {
    try {
      // Mock role update - replace with real service
      toast.success(`Member role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update member role');
    }
  };

  const renderMembersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white">Team Members ({teamMembers.length})</h4>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus size={16} className="mr-2" />
          Invite Member
        </Button>
      </div>

      <div className="space-y-3">
        {teamMembers.map((member) => {
          const RoleIcon = getRoleIcon(member.role);
          const isCurrentUser = member.email === user?.email;
          const canManage = user?.role === 'admin' && !isCurrentUser;

          return (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName || member.email}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {(member.fullName || member.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-white">
                          {member.fullName || member.email.split('@')[0]}
                          {isCurrentUser && <span className="text-primary-400 ml-1">(You)</span>}
                        </h5>
                        <div className={`flex items-center space-x-1 ${getRoleColor(member.role)}`}>
                          <RoleIcon size={14} />
                          <span className="text-xs font-medium capitalize">{member.role}</span>
                        </div>
                      </div>
                      <p className="text-sm text-dark-400">{member.email}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-dark-500">
                        <span>Joined {member.joinedAt.toLocaleDateString()}</span>
                        <span>•</span>
                        <span>
                          Last active {member.lastActive.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value as any)}
                        className="text-sm bg-dark-700 border border-dark-600 rounded px-2 py-1 text-white"
                      >
                        <option value="developer">Developer</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderInvitesTab = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Invite New Members</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Invitation */}
          <Card>
            <CardHeader>
              <h5 className="font-medium text-white flex items-center">
                <Mail size={16} className="mr-2" />
                Email Invitation
              </h5>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="developer">Developer</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              
              <Button onClick={sendEmailInvite} loading={loading} className="w-full">
                Send Invitation
              </Button>
            </CardContent>
          </Card>

          {/* Invite Link */}
          <Card>
            <CardHeader>
              <h5 className="font-medium text-white flex items-center">
                <Copy size={16} className="mr-2" />
                Invite Link
              </h5>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-dark-400">
                Generate a shareable link that anyone can use to join your team.
              </p>
              
              {!inviteLink ? (
                <Button onClick={generateInviteLink} loading={loading} className="w-full">
                  Generate Invite Link
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyInviteLink}
                      className="flex-shrink-0"
                    >
                      {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInviteLink('')}
                      className="flex-1"
                    >
                      Generate New
                    </Button>
                    <Button
                      size="sm"
                      onClick={copyInviteLink}
                      className="flex-1"
                    >
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Team Settings</h4>
        
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Team Name
              </label>
              <Input
                value={user?.team?.name || ''}
                placeholder="Enter team name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Team Description
              </label>
              <textarea
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
                placeholder="Describe your team..."
                value={user?.team?.description || ''}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
              <div>
                <h6 className="font-medium text-white">Default Role for New Members</h6>
                <p className="text-sm text-dark-400">Role assigned to new team members by default</p>
              </div>
              <select className="bg-dark-800 border border-dark-600 rounded px-3 py-1 text-white">
                <option value="developer">Developer</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
              <div>
                <h6 className="font-medium text-white">Require Approval for New Members</h6>
                <p className="text-sm text-dark-400">New members must be approved by an admin</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            <Button className="w-full">
              Save Team Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Team Management" size="xl">
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center space-x-4 border-b border-dark-700">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'invites'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('invites')}
            >
              Invitations
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-dark-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'members' && renderMembersTab()}
          {activeTab === 'invites' && renderInvitesTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </Modal>

      {/* Email Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="developer">Developer</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmailInvite} loading={loading}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};