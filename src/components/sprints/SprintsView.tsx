import React, { useState } from 'react';
import { 
  Calendar, 
  Play, 
  Pause, 
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useSprints } from '../../hooks/useSprints';
import { useAppStore } from '../../stores/useAppStore';
import { Sprint } from '../../types';

const statusConfig = {
  planning: { color: 'text-dark-400', bg: 'bg-dark-700', icon: Calendar },
  active: { color: 'text-success-400', bg: 'bg-success-900/20', icon: Play },
  completed: { color: 'text-primary-400', bg: 'bg-primary-900/20', icon: CheckCircle },
  cancelled: { color: 'text-error-400', bg: 'bg-error-900/20', icon: CheckCircle },
};

export const SprintsView: React.FC = () => {
  const { sprints, activeSprint, loading, createSprint, updateSprint, deleteSprint } = useSprints();
  const { developers } = useAppStore();
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    capacity: 120,
  });

  const totalCapacity = developers.reduce((acc, dev) => acc + dev.profile.velocity, 0);

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      return;
    }

    try {
      const sprintData = {
        name: formData.name,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        status: 'planning' as const,
        capacity: formData.capacity,
      };

      if (editingSprint) {
        await updateSprint(editingSprint.id, sprintData);
      } else {
        await createSprint(sprintData);
      }

      setShowSprintForm(false);
      setEditingSprint(null);
      setFormData({ name: '', startDate: '', endDate: '', capacity: 120 });
    } catch (error) {
      console.error('Failed to save sprint:', error);
    }
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      startDate: sprint.startDate.toISOString().split('T')[0],
      endDate: sprint.endDate.toISOString().split('T')[0],
      capacity: sprint.capacity,
    });
    setShowSprintForm(true);
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (window.confirm('Are you sure you want to delete this sprint?')) {
      try {
        await deleteSprint(sprintId);
      } catch (error) {
        console.error('Failed to delete sprint:', error);
      }
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await updateSprint(sprintId, { status: 'active' });
    } catch (error) {
      console.error('Failed to start sprint:', error);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      await updateSprint(sprintId, { status: 'completed' });
    } catch (error) {
      console.error('Failed to complete sprint:', error);
    }
  };

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
          <h1 className="text-2xl font-bold text-white mb-2">Sprint Planning</h1>
          <p className="text-dark-400">Autonomous sprint planning with AI-powered task distribution</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost">
            <TrendingUp size={16} className="mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setShowSprintForm(true)}>
            <Plus size={16} className="mr-2" />
            New Sprint
          </Button>
        </div>
      </div>

      {/* Sprint Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{sprints.length}</div>
            <div className="text-dark-400">Total Sprints</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{totalCapacity}pts</div>
            <div className="text-dark-400">Team Capacity</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-warning-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {activeSprint ? `${Math.round((activeSprint.tasks.filter(t => t.status === 'done').length / activeSprint.tasks.length) * 100) || 0}%` : '0%'}
            </div>
            <div className="text-dark-400">Sprint Progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-success-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {activeSprint ? activeSprint.tasks.length : 0}
            </div>
            <div className="text-dark-400">Active Tasks</div>
          </CardContent>
        </Card>
      </div>

      {/* Sprint Cards */}
      <div className="space-y-4">
        {sprints.map((sprint) => {
          const config = statusConfig[sprint.status];
          const Icon = config.icon;
          const daysRemaining = Math.ceil((sprint.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const completedTasks = sprint.tasks.filter(task => task.status === 'done').length;
          const totalTasks = sprint.tasks.length;

          return (
            <Card key={sprint.id} hover>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                      <Icon size={20} className={config.color} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{sprint.name}</h3>
                      <p className="text-sm text-dark-400">
                        {sprint.startDate.toLocaleDateString()} - {sprint.endDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      {sprint.status}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSprint(sprint)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSprint(sprint.id)}
                      className="text-error-400 hover:text-error-300"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Progress */}
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">Progress</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-400">Tasks</span>
                        <span className="text-white">{completedTasks}/{totalTasks}</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">Capacity</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-400">Hours</span>
                        <span className="text-white">{sprint.capacity}h</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-secondary-500 to-accent-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (sprint.capacity / 160) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team Assignment */}
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">Team</h4>
                    <div className="flex -space-x-2">
                      {developers.slice(0, 3).map((dev, index) => (
                        <img
                          key={dev.id}
                          src={dev.avatar}
                          alt={dev.name}
                          className="w-8 h-8 rounded-full border-2 border-dark-800 object-cover"
                          title={dev.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2">
                    {sprint.status === 'planning' && (
                      <Button size="sm" onClick={() => handleStartSprint(sprint.id)}>
                        <Play size={14} className="mr-1" />
                        Start
                      </Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button size="sm" onClick={() => handleCompleteSprint(sprint.id)}>
                        <CheckCircle size={14} className="mr-1" />
                        Complete
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Task List */}
                {sprint.tasks.length > 0 && (
                  <div className="mt-6 p-4 bg-dark-700 rounded-lg">
                    <h4 className="text-sm font-medium text-dark-300 mb-3">Sprint Tasks ({sprint.tasks.length})</h4>
                    <div className="space-y-2">
                      {sprint.tasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center justify-between text-sm">
                          <span className="text-white">{task.title}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.status === 'done' ? 'bg-success-900/20 text-success-400' :
                            task.status === 'in-progress' ? 'bg-warning-900/20 text-warning-400' :
                            'bg-dark-600 text-dark-300'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      ))}
                      {sprint.tasks.length > 3 && (
                        <div className="text-xs text-dark-500 text-center">
                          +{sprint.tasks.length - 3} more tasks
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sprint Form Modal */}
      <Modal
        isOpen={showSprintForm}
        onClose={() => {
          setShowSprintForm(false);
          setEditingSprint(null);
          setFormData({ name: '', startDate: '', endDate: '', capacity: 120 });
        }}
        title={editingSprint ? 'Edit Sprint' : 'Create New Sprint'}
      >
        <form onSubmit={handleCreateSprint} className="space-y-4">
          <Input
            label="Sprint Name"
            placeholder="e.g., Sprint 1 - Core Features"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Capacity (hours)"
            type="number"
            min="40"
            max="320"
            value={formData.capacity}
            onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 120 }))}
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-dark-700">
            <Button
              variant="ghost"
              onClick={() => {
                setShowSprintForm(false);
                setEditingSprint(null);
                setFormData({ name: '', startDate: '', endDate: '', capacity: 120 });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingSprint ? 'Update Sprint' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};