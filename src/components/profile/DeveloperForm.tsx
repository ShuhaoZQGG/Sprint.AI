import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Developer, TaskType } from '../../types';

interface DeveloperFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (developer: Omit<Developer, 'id'>) => void;
  developer?: Developer | null;
}

const availableSkills = [
  'Frontend', 'Backend', 'React', 'TypeScript', 'JavaScript', 'Python', 
  'Node.js', 'DevOps', 'Testing', 'QA', 'Documentation', 'Database', 
  'API', 'Mobile', 'UI/UX', 'Security', 'Performance'
];

const taskTypes: TaskType[] = ['feature', 'bug', 'refactor', 'docs', 'test', 'devops'];

export const DeveloperForm: React.FC<DeveloperFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  developer,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    velocity: 8,
    strengths: [] as string[],
    preferredTasks: [] as TaskType[],
    commitFrequency: 10,
    codeQuality: 8,
    collaboration: 8,
  });

  const [newStrength, setNewStrength] = useState('');

  useEffect(() => {
    if (developer) {
      setFormData({
        name: developer.name,
        email: developer.email,
        avatar: developer.avatar,
        velocity: developer.profile.velocity,
        strengths: developer.profile.strengths,
        preferredTasks: developer.profile.preferredTasks,
        commitFrequency: developer.profile.commitFrequency,
        codeQuality: developer.profile.codeQuality,
        collaboration: developer.profile.collaboration,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        avatar: '',
        velocity: 8,
        strengths: [],
        preferredTasks: [],
        commitFrequency: 10,
        codeQuality: 8,
        collaboration: 8,
      });
    }
  }, [developer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      return;
    }

    onSubmit({
      name: formData.name,
      email: formData.email,
      avatar: formData.avatar,
      profile: {
        velocity: formData.velocity,
        strengths: formData.strengths,
        preferredTasks: formData.preferredTasks,
        commitFrequency: formData.commitFrequency,
        codeQuality: formData.codeQuality,
        collaboration: formData.collaboration,
      },
    });
  };

  const addStrength = () => {
    if (newStrength.trim() && !formData.strengths.includes(newStrength.trim())) {
      setFormData(prev => ({
        ...prev,
        strengths: [...prev.strengths, newStrength.trim()],
      }));
      setNewStrength('');
    }
  };

  const removeStrength = (strength: string) => {
    setFormData(prev => ({
      ...prev,
      strengths: prev.strengths.filter(s => s !== strength),
    }));
  };

  const togglePreferredTask = (taskType: TaskType) => {
    setFormData(prev => ({
      ...prev,
      preferredTasks: prev.preferredTasks.includes(taskType)
        ? prev.preferredTasks.filter(t => t !== taskType)
        : [...prev.preferredTasks, taskType],
    }));
  };

  const addPredefinedStrength = (skill: string) => {
    if (!formData.strengths.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        strengths: [...prev.strengths, skill],
      }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={developer ? 'Edit Developer' : 'Add New Developer'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-dark-300">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Enter developer name..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="developer@company.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Avatar URL (optional)"
            placeholder="https://example.com/avatar.jpg"
            value={formData.avatar}
            onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
          />
        </div>

        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-dark-300">Performance Metrics</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Velocity (points/sprint)"
              type="number"
              min="0"
              max="20"
              value={formData.velocity}
              onChange={(e) => setFormData(prev => ({ ...prev, velocity: parseInt(e.target.value) || 0 }))}
            />

            <Input
              label="Commits/Week"
              type="number"
              min="0"
              max="50"
              value={formData.commitFrequency}
              onChange={(e) => setFormData(prev => ({ ...prev, commitFrequency: parseInt(e.target.value) || 0 }))}
            />

            <Input
              label="Code Quality (1-10)"
              type="number"
              min="1"
              max="10"
              value={formData.codeQuality}
              onChange={(e) => setFormData(prev => ({ ...prev, codeQuality: parseInt(e.target.value) || 5 }))}
            />

            <Input
              label="Collaboration (1-10)"
              type="number"
              min="1"
              max="10"
              value={formData.collaboration}
              onChange={(e) => setFormData(prev => ({ ...prev, collaboration: parseInt(e.target.value) || 5 }))}
            />
          </div>
        </div>

        {/* Skills and Strengths */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-dark-300">Skills & Strengths</h4>
          
          {/* Quick Add Skills */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Quick Add Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => addPredefinedStrength(skill)}
                  disabled={formData.strengths.includes(skill)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    formData.strengths.includes(skill)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-dark-700 text-dark-300 border-dark-600 hover:border-primary-500'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Strength Input */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Add Custom Skill
            </label>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter custom skill..."
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())}
              />
              <Button type="button" onClick={addStrength} disabled={!newStrength.trim()}>
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Current Strengths */}
          {formData.strengths.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Current Skills ({formData.strengths.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.strengths.map(strength => (
                  <div
                    key={strength}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary-600 text-white text-xs rounded-full"
                  >
                    <span>{strength}</span>
                    <button
                      type="button"
                      onClick={() => removeStrength(strength)}
                      className="hover:text-primary-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preferred Task Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-dark-300">Preferred Task Types</h4>
          
          <div className="grid grid-cols-3 gap-2">
            {taskTypes.map(taskType => (
              <button
                key={taskType}
                type="button"
                onClick={() => togglePreferredTask(taskType)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  formData.preferredTasks.includes(taskType)
                    ? 'bg-secondary-600 text-white border-secondary-600'
                    : 'bg-dark-700 text-dark-300 border-dark-600 hover:border-secondary-500'
                }`}
              >
                {taskType}
              </button>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-dark-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {developer ? 'Update Developer' : 'Add Developer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};