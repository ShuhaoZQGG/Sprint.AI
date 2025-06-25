import React, { useState } from 'react';
import { 
  Plus, 
  Sparkles, 
  FileText, 
  CheckSquare, 
  Clock, 
  User,
  AlertCircle,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { groqService } from '../../services/groq';
import { useAppStore } from '../../stores/useAppStore';
import { BusinessSpec, Task, TaskType, Priority } from '../../types';
import toast from 'react-hot-toast';

interface TaskGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpec?: BusinessSpec;
}

interface GeneratedTask {
  title: string;
  description: string;
  type: TaskType;
  priority: Priority;
  estimatedEffort: number;
  requiredSkills?: string[];
  dependencies?: string[];
}

export const TaskGenerator: React.FC<TaskGeneratorProps> = ({
  isOpen,
  onClose,
  initialSpec,
}) => {
  const { 
    businessSpecs, 
    addBusinessSpec, 
    updateBusinessSpec, 
    addTask, 
    developers,
    repositories,
    currentRepository 
  } = useAppStore();

  const [step, setStep] = useState<'spec' | 'generate' | 'review'>('spec');
  const [currentSpec, setCurrentSpec] = useState<BusinessSpec>(
    initialSpec || {
      id: '',
      title: '',
      description: '',
      acceptanceCriteria: [''],
      technicalRequirements: [''],
      lastUpdated: new Date(),
    }
  );
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);

  const handleSpecChange = (field: keyof BusinessSpec, value: any) => {
    setCurrentSpec(prev => ({
      ...prev,
      [field]: value,
      lastUpdated: new Date(),
    }));
  };

  const addCriterion = (field: 'acceptanceCriteria' | 'technicalRequirements') => {
    setCurrentSpec(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), ''],
    }));
  };

  const updateCriterion = (
    field: 'acceptanceCriteria' | 'technicalRequirements',
    index: number,
    value: string
  ) => {
    setCurrentSpec(prev => ({
      ...prev,
      [field]: prev[field]?.map((item, i) => i === index ? value : item) || [],
    }));
  };

  const removeCriterion = (field: 'acceptanceCriteria' | 'technicalRequirements', index: number) => {
    setCurrentSpec(prev => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || [],
    }));
  };

  const validateSpec = (): boolean => {
    if (!currentSpec.title.trim()) {
      toast.error('Please provide a title for the specification');
      return false;
    }
    if (!currentSpec.description.trim()) {
      toast.error('Please provide a description');
      return false;
    }
    if (!currentSpec.acceptanceCriteria?.some(criteria => criteria.trim())) {
      toast.error('Please provide at least one acceptance criterion');
      return false;
    }
    return true;
  };

  const handleGenerateTasks = async () => {
    if (!validateSpec()) return;

    if (!groqService.isAvailable()) {
      toast.error('AI service is not configured. Please add your Groq API key.');
      return;
    }

    setGenerating(true);

    try {
      // Save or update the business spec first
      const specToSave = {
        ...currentSpec,
        id: currentSpec.id || `spec-${Date.now()}`,
        acceptanceCriteria: currentSpec.acceptanceCriteria?.filter(c => c.trim()) || [],
        technicalRequirements: currentSpec.technicalRequirements?.filter(r => r.trim()) || [],
      };

      if (currentSpec.id) {
        updateBusinessSpec(currentSpec.id, specToSave);
      } else {
        addBusinessSpec(specToSave);
        setCurrentSpec(specToSave);
      }

      // Prepare context for task generation
      const codebaseContext = currentRepository?.structure || {
        modules: [],
        services: [],
        dependencies: [],
        summary: 'No repository selected',
      };

      const teamSkills = developers.flatMap(dev => dev.profile.strengths);

      // Generate tasks using AI
      const taskResponse = await groqService.generateTasks({
        businessSpec: specToSave,
        codebaseContext,
        teamSkills,
      });

      setGeneratedTasks(taskResponse.tasks);
      setStep('review');
      toast.success(`Generated ${taskResponse.tasks.length} tasks from specification!`);

    } catch (error) {
      console.error('Task generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate tasks');
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskEdit = (index: number, field: keyof GeneratedTask, value: any) => {
    setGeneratedTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    ));
  };

  const handleRemoveTask = (index: number) => {
    setGeneratedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTasks = () => {
    generatedTasks.forEach(generatedTask => {
      const task: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: generatedTask.title,
        description: generatedTask.description,
        type: generatedTask.type,
        priority: generatedTask.priority,
        status: 'backlog',
        estimatedEffort: generatedTask.estimatedEffort,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addTask(task);
    });

    toast.success(`Created ${generatedTasks.length} tasks successfully!`);
    handleClose();
  };

  const handleClose = () => {
    setStep('spec');
    setCurrentSpec(initialSpec || {
      id: '',
      title: '',
      description: '',
      acceptanceCriteria: [''],
      technicalRequirements: [''],
      lastUpdated: new Date(),
    });
    setGeneratedTasks([]);
    setEditingTaskIndex(null);
    onClose();
  };

  const getTaskTypeColor = (type: TaskType) => {
    const colors = {
      feature: 'bg-primary-500',
      bug: 'bg-error-500',
      refactor: 'bg-secondary-500',
      docs: 'bg-accent-500',
      test: 'bg-warning-500',
      devops: 'bg-dark-500',
    };
    return colors[type] || 'bg-dark-500';
  };

  const getPriorityColor = (priority: Priority) => {
    const colors = {
      low: 'text-dark-400',
      medium: 'text-warning-400',
      high: 'text-accent-400',
      critical: 'text-error-400',
    };
    return colors[priority] || 'text-dark-400';
  };

  const renderSpecEditor = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Business Specification</h3>
        <p className="text-dark-400">
          Define your feature requirements and acceptance criteria
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Feature Title"
          placeholder="e.g., User Authentication System"
          value={currentSpec.title}
          onChange={(e) => handleSpecChange('title', e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Description
          </label>
          <textarea
            placeholder="Describe the feature, its purpose, and how it should work..."
            value={currentSpec.description}
            onChange={(e) => handleSpecChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-dark-200">
              Acceptance Criteria
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addCriterion('acceptanceCriteria')}
            >
              <Plus size={14} className="mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {currentSpec.acceptanceCriteria?.map((criterion, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  placeholder={`Acceptance criterion ${index + 1}`}
                  value={criterion}
                  onChange={(e) => updateCriterion('acceptanceCriteria', index, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCriterion('acceptanceCriteria', index)}
                  className="text-error-400 hover:text-error-300"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-dark-200">
              Technical Requirements (Optional)
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addCriterion('technicalRequirements')}
            >
              <Plus size={14} className="mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {currentSpec.technicalRequirements?.map((requirement, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  placeholder={`Technical requirement ${index + 1}`}
                  value={requirement}
                  onChange={(e) => updateCriterion('technicalRequirements', index, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCriterion('technicalRequirements', index)}
                  className="text-error-400 hover:text-error-300"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button onClick={handleClose} variant="ghost" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleGenerateTasks}
          loading={generating}
          disabled={generating}
          className="flex-1"
        >
          <Sparkles size={16} className="mr-2" />
          Generate Tasks
        </Button>
      </div>
    </div>
  );

  const renderTaskReview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-success-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckSquare className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Generated Tasks</h3>
        <p className="text-dark-400">
          Review and edit the generated tasks before creating them
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3">
        {generatedTasks.map((task, index) => (
          <Card key={index} className="relative">
            <CardContent className="p-4">
              {editingTaskIndex === index ? (
                <div className="space-y-3">
                  <Input
                    value={task.title}
                    onChange={(e) => handleTaskEdit(index, 'title', e.target.value)}
                    placeholder="Task title"
                  />
                  <textarea
                    value={task.description}
                    onChange={(e) => handleTaskEdit(index, 'description', e.target.value)}
                    placeholder="Task description"
                    rows={3}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={task.type}
                      onChange={(e) => handleTaskEdit(index, 'type', e.target.value as TaskType)}
                      className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="feature">Feature</option>
                      <option value="bug">Bug</option>
                      <option value="refactor">Refactor</option>
                      <option value="docs">Documentation</option>
                      <option value="test">Testing</option>
                      <option value="devops">DevOps</option>
                    </select>
                    <select
                      value={task.priority}
                      onChange={(e) => handleTaskEdit(index, 'priority', e.target.value as Priority)}
                      className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <Input
                      type="number"
                      min="1"
                      max="40"
                      value={task.estimatedEffort}
                      onChange={(e) => handleTaskEdit(index, 'estimatedEffort', parseInt(e.target.value))}
                      placeholder="Hours"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTaskIndex(null)}
                    >
                      <X size={14} className="mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setEditingTaskIndex(null)}
                    >
                      <Save size={14} className="mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-white text-sm leading-5">
                      {task.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTaskIndex(index)}
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTask(index)}
                        className="text-error-400 hover:text-error-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-dark-400 line-clamp-3">
                    {task.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium text-white ${getTaskTypeColor(task.type)}`}
                      >
                        {task.type}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-dark-500">
                      <Clock size={12} />
                      <span>{task.estimatedEffort}h</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {generatedTasks.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-dark-400 mx-auto mb-3" />
          <p className="text-dark-400">No tasks generated</p>
        </div>
      )}

      <div className="flex space-x-3">
        <Button onClick={() => setStep('spec')} variant="ghost" className="flex-1">
          Back to Spec
        </Button>
        <Button
          onClick={handleCreateTasks}
          disabled={generatedTasks.length === 0}
          className="flex-1"
        >
          <Plus size={16} className="mr-2" />
          Create {generatedTasks.length} Tasks
        </Button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="min-h-[500px]">
        {step === 'spec' && renderSpecEditor()}
        {step === 'review' && renderTaskReview()}
      </div>
    </Modal>
  );
};