import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Clock, 
  User, 
  Tag,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Eye,
  Zap
} from 'lucide-react';
import { BusinessSpec, Task } from '../../types';
import { useBusinessSpecs } from '../../hooks/useBusinessSpecs';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { BusinessSpecModal } from './BusinessSpecModal';
import { BusinessSpecDetail } from './BusinessSpecDetail';
import { BusinessSpecStatusBadge } from './BusinessSpecStatusBadge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { FadeIn, SlideIn } from '../ui/AnimatedCounter';
import { TaskReviewModal } from '../overlay/TaskReviewModal';

export const BusinessSpecList: React.FC = () => {
  const { businessSpecs, loading, error, createBusinessSpec, generateTasksFromSpec } = useBusinessSpecs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<BusinessSpec | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState<string | null>(null);
  const [showTaskReview, setShowTaskReview] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] | null>(null);
  const [selectedSpecTitle, setSelectedSpecTitle] = useState('');

  // Filter and search business specs
  const filteredSpecs = useMemo(() => {
    return businessSpecs.filter(spec => {
      const matchesSearch = spec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           spec.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || spec.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || spec.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [businessSpecs, searchQuery, statusFilter, priorityFilter]);

  // Group specs by status for better organization
  const specsByStatus = useMemo(() => {
    const groups = {
      draft: filteredSpecs.filter(spec => spec.status === 'draft'),
      review: filteredSpecs.filter(spec => spec.status === 'review'),
      approved: filteredSpecs.filter(spec => spec.status === 'approved'),
      implemented: filteredSpecs.filter(spec => spec.status === 'implemented'),
    };
    return groups;
  }, [filteredSpecs]);

  const handleCreateSpec = async (specData: Omit<BusinessSpec, 'id' | 'lastUpdated'>) => {
    try {
      await createBusinessSpec(specData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create business spec:', error);
    }
  };

  const handleGenerateTasks = async (spec: BusinessSpec) => {
    try {
      setGeneratingTasks(spec.id);
      const response = await generateTasksFromSpec(spec.id);
      if (Array.isArray(response.tasks)) {
        setGeneratedTasks(response.tasks);
      } else {
        setGeneratedTasks([]);
      }
      setSelectedSpecTitle(spec.title);
    } catch (error) {
      console.error('Failed to generate tasks:', error);
    } finally {
      setGeneratingTasks(null);
    }
  };

  // Open TaskReviewModal whenever generatedTasks is set (not null)
  useEffect(() => {
    if (generatedTasks !== null && generatedTasks.length > 0) {
      setShowTaskReview(true);
    }
  }, [generatedTasks]);

  const getStatusIcon = (status: BusinessSpec['status']) => {
    switch (status) {
      case 'draft': return <FileText size={16} className="text-dark-400" />;
      case 'review': return <Eye size={16} className="text-warning-400" />;
      case 'approved': return <CheckCircle size={16} className="text-success-400" />;
      case 'implemented': return <CheckCircle size={16} className="text-primary-400" />;
      default: return <FileText size={16} className="text-dark-400" />;
    }
  };

  const getPriorityColor = (priority: BusinessSpec['priority']) => {
    switch (priority) {
      case 'critical': return 'text-error-400';
      case 'high': return 'text-warning-400';
      case 'medium': return 'text-primary-400';
      case 'low': return 'text-success-400';
      default: return 'text-dark-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error-400 mx-auto mb-4" />
          <p className="text-error-400 mb-2">Failed to load business specifications</p>
          <p className="text-dark-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Business Specifications</h1>
            <p className="text-dark-400 mt-1">
              Manage and track business requirements and feature specifications
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Specification</span>
          </Button>
        </div>
      </FadeIn>

      {/* Filters and Search */}
      <SlideIn direction="down" delay={100}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search specifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search size={16} />}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="approved">Approved</option>
                  <option value="implemented">Implemented</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </SlideIn>

      {/* Statistics */}
      <SlideIn direction="up" delay={200}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(specsByStatus).map(([status, specs], index) => (
            <FadeIn key={status} delay={300 + index * 100}>
              <Card className="hover:border-primary-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status as BusinessSpec['status'])}
                    <div>
                      <p className="text-2xl font-bold text-white">{specs.length}</p>
                      <p className="text-sm text-dark-400 capitalize">{status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </SlideIn>

      {/* Business Specs List */}
      <div className="space-y-4">
        {filteredSpecs.length === 0 ? (
          <SlideIn direction="up" delay={400}>
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-dark-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No specifications found</h3>
                <p className="text-dark-400 mb-4">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters or search query.'
                    : 'Create your first business specification to get started.'}
                </p>
                {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create First Specification
                  </Button>
                )}
              </CardContent>
            </Card>
          </SlideIn>
        ) : (
          filteredSpecs.map((spec, index) => (
            <SlideIn key={spec.id} direction="up" delay={400 + index * 50}>
              <Card className="hover:border-primary-500 transition-all duration-200 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => setSelectedSpec(spec)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                          {spec.title}
                        </h3>
                        <BusinessSpecStatusBadge status={spec.status} />
                        <div className={`flex items-center space-x-1 ${getPriorityColor(spec.priority)}`}>
                          <AlertCircle size={14} />
                          <span className="text-xs font-medium capitalize">{spec.priority}</span>
                        </div>
                      </div>
                      
                      <p className="text-dark-300 text-sm mb-3 line-clamp-2">
                        {spec.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-dark-400">
                        {spec.createdBy && (
                          <div className="flex items-center space-x-1">
                            <User size={12} />
                            <span>{spec.createdBy.name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{spec.lastUpdated.toLocaleDateString()}</span>
                        </div>
                        {spec.tags && spec.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Tag size={12} />
                            <span>{spec.tags.length} tags</span>
                          </div>
                        )}
                        {spec.estimatedEffort && (
                          <div className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{spec.estimatedEffort}h estimated</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {spec.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateTasks(spec);
                          }}
                          disabled={generatingTasks === spec.id}
                          className="flex items-center space-x-1"
                        >
                          {generatingTasks === spec.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Zap size={14} />
                          )}
                          <span>Generate Tasks</span>
                        </Button>
                      )}
                      <ChevronRight 
                        size={16} 
                        className="text-dark-400 group-hover:text-primary-400 transition-colors" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          ))
        )}
      </div>

      {/* Modals */}
      <BusinessSpecModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSpec}
      />

      {selectedSpec && (
        <BusinessSpecDetail
          spec={selectedSpec}
          isOpen={!!selectedSpec}
          onClose={() => setSelectedSpec(null)}
        />
      )}

     { generatedTasks && (
      <TaskReviewModal
        isOpen={showTaskReview && generatedTasks !== null && generatedTasks.length > 0}
        onClose={() => setShowTaskReview(false)}
        generatedTasks={generatedTasks}
        businessSpecTitle={selectedSpecTitle}
        businessSpecId={selectedSpec?.id}
        onTasksCreated={() => setShowTaskReview(false)}
      />
      )}
    </div>
  );
};