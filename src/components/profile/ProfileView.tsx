import React, { useState } from 'react';
import { 
  User, 
  TrendingUp, 
  Star, 
  GitCommit,
  Award,
  Target,
  Plus,
  Edit,
  BarChart3,
  Clock,
  Users,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { DeveloperForm } from './DeveloperForm';
import { PerformanceChart } from './PerformanceChart';
import { TeamManagement } from '../team/TeamManagement';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useAuth } from '../auth/AuthProvider';
import { Developer } from '../../types';

export const ProfileView: React.FC = () => {
  const { 
    developers, 
    loading, 
    createDeveloper, 
    updateDeveloper, 
    updatePerformanceMetrics,
    updateSkills,
    getTeamCapacity 
  } = useDevelopers();
  
  const { user } = useAuth();
  const [showDeveloperForm, setShowDeveloperForm] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(null);
  const [showPerformanceChart, setShowPerformanceChart] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [teamCapacity, setTeamCapacity] = useState<number>(0);

  React.useEffect(() => {
    const fetchTeamCapacity = async () => {
      try {
        const capacity = await getTeamCapacity();
        setTeamCapacity(capacity);
      } catch (error) {
        console.error('Failed to fetch team capacity:', error);
      }
    };

    if (developers.length > 0) {
      fetchTeamCapacity();
    }
  }, [developers, getTeamCapacity]);

  const handleCreateDeveloper = async (developerData: Omit<Developer, 'id'>) => {
    try {
      await createDeveloper(developerData);
      setShowDeveloperForm(false);
    } catch (error) {
      console.error('Failed to create developer:', error);
    }
  };

  const handleUpdateDeveloper = async (developerData: Omit<Developer, 'id'>) => {
    if (!editingDeveloper) return;
    
    try {
      await updateDeveloper(editingDeveloper.id, developerData);
      setShowDeveloperForm(false);
      setEditingDeveloper(null);
    } catch (error) {
      console.error('Failed to update developer:', error);
    }
  };

  const handleEditDeveloper = (developer: Developer) => {
    setEditingDeveloper(developer);
    setShowDeveloperForm(true);
  };

  const handleViewPerformance = (developer: Developer) => {
    setSelectedDeveloper(developer);
    setShowPerformanceChart(true);
  };

  const getSkillColor = (skill: string) => {
    const colors = {
      'Frontend': 'bg-primary-500',
      'Backend': 'bg-secondary-500',
      'React': 'bg-accent-500',
      'TypeScript': 'bg-primary-400',
      'Python': 'bg-success-500',
      'DevOps': 'bg-warning-500',
      'Testing': 'bg-error-500',
      'QA': 'bg-error-400',
      'Documentation': 'bg-dark-500',
      'JavaScript': 'bg-warning-400',
      'Node.js': 'bg-success-400',
      'Database': 'bg-secondary-400',
      'API': 'bg-accent-400',
    };
    return colors[skill as keyof typeof colors] || 'bg-dark-500';
  };

  const isTeamAdmin = user?.profile?.role === 'admin' || user?.profile?.role === 'manager';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Team Profile</h1>
          <p className="text-dark-400">Developer velocity, strengths, and intelligent task assignment</p>
        </div>
        <div className="flex items-center space-x-3">
          {isTeamAdmin && (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowTeamManagement(true)}
              >
                <Settings size={16} className="mr-2" />
                Team Settings
              </Button>
              <Button onClick={() => setShowDeveloperForm(true)}>
                <Plus size={16} className="mr-2" />
                Add Developer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{developers.length}</div>
            <div className="text-dark-400">Team Members</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{teamCapacity}pts</div>
            <div className="text-dark-400">Total Velocity</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-warning-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <GitCommit className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {developers.reduce((acc, dev) => acc + dev.profile.commitFrequency, 0)}
            </div>
            <div className="text-dark-400">Commits/Week</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-success-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {developers.length > 0 
                ? Math.round(developers.reduce((acc, dev) => acc + dev.profile.codeQuality, 0) / developers.length * 10) / 10
                : 0
              }
            </div>
            <div className="text-dark-400">Avg Quality</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Information */}
      {user?.team && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Team Information</h3>
              {isTeamAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTeamManagement(true)}
                >
                  <Settings size={14} className="mr-1" />
                  Manage
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-2">{user.team.name}</h4>
                <p className="text-dark-400 text-sm mb-4">
                  {user.team.description || 'No description provided'}
                </p>
                <div className="flex items-center space-x-4 text-sm text-dark-500">
                  <span>Created {new Date(user.team.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{developers.length} members</span>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-medium text-dark-300 mb-2">Your Role</h5>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    user.profile?.role === 'admin' ? 'bg-warning-400' :
                    user.profile?.role === 'manager' ? 'bg-primary-400' : 'bg-success-400'
                  }`}></div>
                  <span className="text-white capitalize">{user.profile?.role || 'developer'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Developer Profiles */}
      <div className="space-y-4">
        {developers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Team Members</h3>
              <p className="text-dark-400 mb-4">
                Add team members to start tracking performance and managing capacity
              </p>
              {isTeamAdmin && (
                <Button onClick={() => setShowDeveloperForm(true)}>
                  <Plus size={16} className="mr-2" />
                  Add First Developer
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          developers.map((developer) => (
            <Card key={developer.id} hover>
              <CardContent className="p-6">
                <div className="flex items-start space-x-6">
                  {/* Avatar and Basic Info */}
                  <div className="flex items-center space-x-4">
                    <img
                      src={developer.avatar || `https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150`}
                      alt={developer.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{developer.name}</h3>
                      <p className="text-dark-400">{developer.email}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Target size={16} className="text-primary-400" />
                        <span className="text-sm text-dark-400">Velocity</span>
                      </div>
                      <div className="text-xl font-bold text-white">{developer.profile.velocity}pts</div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Star size={16} className="text-warning-400" />
                        <span className="text-sm text-dark-400">Quality</span>
                      </div>
                      <div className="text-xl font-bold text-white">{developer.profile.codeQuality}/10</div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Award size={16} className="text-secondary-400" />
                        <span className="text-sm text-dark-400">Collaboration</span>
                      </div>
                      <div className="text-xl font-bold text-white">{developer.profile.collaboration}/10</div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <GitCommit size={16} className="text-accent-400" />
                        <span className="text-sm text-dark-400">Commits</span>
                      </div>
                      <div className="text-xl font-bold text-white">{developer.profile.commitFrequency}/wk</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPerformance(developer)}
                    >
                      <BarChart3 size={14} className="mr-1" />
                      Performance
                    </Button>
                    {isTeamAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDeveloper(developer)}
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Skills and Strengths */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-3">Strengths</h4>
                    <div className="flex flex-wrap gap-2">
                      {developer.profile.strengths.map((strength) => (
                        <span
                          key={strength}
                          className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getSkillColor(strength)}`}
                        >
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-3">Preferred Tasks</h4>
                    <div className="flex flex-wrap gap-2">
                      {developer.profile.preferredTasks.map((taskType) => (
                        <span
                          key={taskType}
                          className="px-3 py-1 bg-dark-700 text-dark-300 rounded-full text-xs font-medium border border-dark-600"
                        >
                          {taskType}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Performance Indicator */}
                <div className="mt-6 p-4 bg-dark-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-dark-300">Performance Overview</h4>
                    <div className="flex items-center space-x-2 text-xs text-dark-500">
                      <Clock size={12} />
                      <span>Last 30 days</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-success-400">
                        {Math.round(developer.profile.velocity * 0.8)}
                      </div>
                      <div className="text-xs text-dark-400">Avg Points</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary-400">
                        {developer.profile.codeQuality}
                      </div>
                      <div className="text-xs text-dark-400">Quality Score</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-secondary-400">
                        {developer.profile.collaboration}
                      </div>
                      <div className="text-xs text-dark-400">Team Score</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Developer Form Modal */}
      <DeveloperForm
        isOpen={showDeveloperForm}
        onClose={() => {
          setShowDeveloperForm(false);
          setEditingDeveloper(null);
        }}
        onSubmit={editingDeveloper ? handleUpdateDeveloper : handleCreateDeveloper}
        developer={editingDeveloper}
      />

      {/* Performance Chart Modal */}
      {selectedDeveloper && (
        <PerformanceChart
          isOpen={showPerformanceChart}
          onClose={() => {
            setShowPerformanceChart(false);
            setSelectedDeveloper(null);
          }}
          developer={selectedDeveloper}
        />
      )}

      {/* Team Management Modal */}
      <TeamManagement
        isOpen={showTeamManagement}
        onClose={() => setShowTeamManagement(false)}
      />
    </div>
  );
};