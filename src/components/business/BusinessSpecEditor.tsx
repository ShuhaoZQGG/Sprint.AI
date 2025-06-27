import React, { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { BusinessSpec } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface BusinessSpecEditorProps {
  spec?: BusinessSpec;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (spec: Partial<BusinessSpec>) => Promise<void>;
}

export const BusinessSpecEditor: React.FC<BusinessSpecEditorProps> = ({
  spec,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: spec?.title || '',
    description: spec?.description || '',
    acceptanceCriteria: spec?.acceptanceCriteria || [''],
    technicalRequirements: spec?.technicalRequirements || [''],
    priority: spec?.priority || 'medium' as BusinessSpec['priority'],
    status: spec?.status || 'draft' as BusinessSpec['status'],
    estimatedEffort: spec?.estimatedEffort || 0,
    tags: spec?.tags || [],
  });
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      const specData = {
        ...formData,
        acceptanceCriteria: formData.acceptanceCriteria.filter(c => c.trim()),
        technicalRequirements: formData.technicalRequirements.filter(r => r.trim()),
        estimatedEffort: formData.estimatedEffort || undefined,
        createdAt: spec?.createdAt || new Date(),
      };

      await onSubmit(specData);
      onClose();
    } catch (error) {
      console.error('Failed to save business spec:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAcceptanceCriteria = () => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, '']
    }));
  };

  const removeAcceptanceCriteria = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index)
    }));
  };

  const updateAcceptanceCriteria = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.map((item, i) => i === index ? value : item)
    }));
  };

  const addTechnicalRequirement = () => {
    setFormData(prev => ({
      ...prev,
      technicalRequirements: [...prev.technicalRequirements, '']
    }));
  };

  const removeTechnicalRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      technicalRequirements: prev.technicalRequirements.filter((_, i) => i !== index)
    }));
  };

  const updateTechnicalRequirement = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      technicalRequirements: prev.technicalRequirements.map((item, i) => i === index ? value : item)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          {spec ? 'Edit Business Specification' : 'Create Business Specification'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter specification title..."
            required
          />

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the business requirement in detail..."
              rows={4}
              required
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors duration-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as BusinessSpec['priority'] }))}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as BusinessSpec['status'] }))}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="implemented">Implemented</option>
              </select>
            </div>

            <Input
              label="Estimated Effort (hours)"
              type="number"
              value={formData.estimatedEffort}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedEffort: parseInt(e.target.value) || 0 }))}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        {/* Acceptance Criteria */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-dark-200">
              Acceptance Criteria
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addAcceptanceCriteria}
              className="flex items-center space-x-1"
            >
              <Plus size={14} />
              <span>Add</span>
            </Button>
          </div>
          <div className="space-y-2">
            {formData.acceptanceCriteria.map((criteria, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  value={criteria}
                  onChange={(e) => updateAcceptanceCriteria(index, e.target.value)}
                  placeholder="Enter acceptance criteria..."
                  className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
                />
                {formData.acceptanceCriteria.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAcceptanceCriteria(index)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Technical Requirements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-dark-200">
              Technical Requirements
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addTechnicalRequirement}
              className="flex items-center space-x-1"
            >
              <Plus size={14} />
              <span>Add</span>
            </Button>
          </div>
          <div className="space-y-2">
            {formData.technicalRequirements.map((requirement, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  value={requirement}
                  onChange={(e) => updateTechnicalRequirement(index, e.target.value)}
                  placeholder="Enter technical requirement..."
                  className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
                />
                {formData.technicalRequirements.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTechnicalRequirement(index)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-3">
            Tags
          </label>
          <div className="flex items-center space-x-2 mb-3">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add a tag..."
              className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addTag}
            >
              <Plus size={14} />
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="flex items-center space-x-1 px-2 py-1 bg-primary-900/20 border border-primary-500 text-primary-400 text-xs rounded-full"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-primary-300"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-dark-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save size={16} />
            )}
            <span>{spec ? 'Update' : 'Create'} Specification</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};