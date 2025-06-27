import React, { useState } from 'react';
import { 
  X, 
  Edit, 
  Trash2, 
  Clock, 
  User, 
  Tag, 
  CheckSquare, 
  FileText,
  Zap,
  GitBranch,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { BusinessSpec } from '../../types';
import { useBusinessSpecs } from '../../hooks/useBusinessSpecs';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BusinessSpecStatusBadge } from './BusinessSpecStatusBadge';
import { BusinessSpecEditor } from './BusinessSpecEditor';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { FadeIn, SlideIn } from '../ui/AnimatedCounter';

interface BusinessSpecDetailProps {
  spec: BusinessSpec;
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessSpecDetail: React.FC<BusinessSpecDetailProps> = ({
  spec,
  isOpen,
  onClose,
}) => {
  const { 
    updateBusinessSpec, 
    deleteBusinessSpec, 
    updateStatus, 
    updatePriority,
    generateTasksFromSpec 
  } = useBusinessSpecs();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  const handleEdit = async (updates: Partial<BusinessSpec>) => {
    try {
      await updateBusinessSpec(spec.id, updates);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update business spec:', error);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteBusinessSpec(spec.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete business spec:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (status: BusinessSpec['status']) => {
    try {
      await updateStatus(spec.id, status);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handlePriorityChange = async (priority: BusinessSpec['priority']) => {
    try {
      await updatePriority(spec.id, priority);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleGenerateTasks = async () => {
    try {
      setGeneratingTasks(true);
      await generateTasksFromSpec(spec.id);
    } catch (error) {
      console.error('Failed to generate tasks:', error);
    } finally {
      setGeneratingTasks(false);
    }
  };

  const getPriorityColor = (priority: BusinessSpec['priority']) => {
    switch (priority) {
      case 'critical': return 'text-error-400 bg-error-900/20 border-error-500';
      case 'high': return 'text-warning-400 bg-warning-900/20 border-warning-500';
      case 'medium': return 'text-primary-400 bg-primary-900/20 border-primary-500';
      case 'low': return 'text-success-400 bg-success-900/20 border-success-500';
      default: return 'text-dark-400 bg-dark-800 border-dark-600';
    }
  };

  if (isEditing) {
    return (
      <BusinessSpecEditor
        spec={spec}
        isOpen={isOpen}
        onClose={() => setIsEditing(false)}
        onSubmit={handleEdit}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-white">{spec.title}</h2>
          <BusinessSpecStatusBadge status={spec.status} />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1"
          >
            <Edit size={14} />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Metadata */}
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-700 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <AlertCircle size={14} className="text-dark-400" />
                <span className="text-xs text-dark-400">Priority</span>
              </div>
              <select
                value={spec.priority}
                onChange={(e) => handlePriorityChange(e.target.value as BusinessSpec['priority'])}
                className={`w-full bg-transparent border rounded px-2 py-1 text-xs font-medium capitalize ${getPriorityColor(spec.priority)}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <GitBranch size={14} className="text-dark-400" />
                <span className="text-xs text-dark-400">Status</span>
              </div>
              <select
                value={spec.status}
                onChange={(e) => handleStatusChange(e.target.value as BusinessSpec['status'])}
                className="w-full bg-transparent border border-dark-600 rounded px-2 py-1 text-xs font-medium text-white"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="implemented">Implemented</option>
              </select>
            </div>

            {spec.estimatedEffort && (
              <div className="bg-dark-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock size={14} className="text-dark-400" />
                  <span className="text-xs text-dark-400">Effort</span>
                </div>
                <p className="text-white font-medium">{spec.estimatedEffort}h</p>
              </div>
            )}

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Calendar size={14} className="text-dark-400" />
                <span className="text-xs text-dark-400">Updated</span>
              </div>
              <p className="text-white text-xs">{spec.lastUpdated.toLocaleDateString()}</p>
            </div>
          </div>
        </FadeIn>

        {/* Description */}
        <SlideIn direction="up" delay={100}>
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <FileText size={16} />
              <span>Description</span>
            </h3>
            <div className="bg-dark-700 rounded-lg p-4">
              <p className="text-dark-200 whitespace-pre-wrap">{spec.description}</p>
            </div>
          </div>
        </SlideIn>

        {/* Acceptance Criteria */}
        {spec.acceptanceCriteria.length > 0 && (
          <SlideIn direction="up" delay={200}>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <CheckSquare size={16} />
                <span>Acceptance Criteria</span>
              </h3>
              <div className="bg-dark-700 rounded-lg p-4">
                <ul className="space-y-2">
                  {spec.acceptanceCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckSquare size={14} className="text-success-400 mt-0.5 flex-shrink-0" />
                      <span className="text-dark-200">{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SlideIn>
        )}

        {/* Technical Requirements */}
        {spec.technicalRequirements && spec.technicalRequirements.length > 0 && (
          <SlideIn direction="up" delay={300}>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <FileText size={16} />
                <span>Technical Requirements</span>
              </h3>
              <div className="bg-dark-700 rounded-lg p-4">
                <ul className="space-y-2">
                  {spec.technicalRequirements.map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-dark-200">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SlideIn>
        )}

        {/* Tags */}
        {spec.tags && spec.tags.length > 0 && (
          <SlideIn direction="up" delay={400}>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <Tag size={16} />
                <span>Tags</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {spec.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary-900/20 border border-primary-500 text-primary-400 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </SlideIn>
        )}

        {/* Creator Info */}
        {spec.createdBy && (
          <SlideIn direction="up" delay={500}>
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <User size={16} className="text-dark-400" />
                <div>
                  <p className="text-white font-medium">{spec.createdBy.name}</p>
                  <p className="text-dark-400 text-sm">{spec.createdBy.email}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-dark-400 text-xs">Created</p>
                  <p className="text-white text-sm">
                    {spec.createdAt?.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </SlideIn>
        )}

        {/* Actions */}
        <SlideIn direction="up" delay={600}>
          <div className="flex items-center justify-between pt-4 border-t border-dark-700">
            <div className="flex items-center space-x-2">
              {spec.status === 'approved' && (
                <Button
                  onClick={handleGenerateTasks}
                  disabled={generatingTasks}
                  className="flex items-center space-x-2"
                >
                  {generatingTasks ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Zap size={16} />
                  )}
                  <span>Generate Tasks</span>
                </Button>
              )}
            </div>
            
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              {isDeleting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Trash2 size={16} />
              )}
              <span>Delete</span>
            </Button>
          </div>
        </SlideIn>
      </div>
    </Modal>
  );
};