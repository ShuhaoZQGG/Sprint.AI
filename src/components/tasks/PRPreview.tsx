import React, { useState } from 'react';
import { 
  GitBranch, 
  FileText, 
  Copy, 
  ExternalLink,
  CheckCircle,
  Code,
  List,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PRTemplate, Task, Repository } from '../../types';
import toast from 'react-hot-toast';

interface PRPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  template: PRTemplate;
  task: Task;
  repository: Repository;
}

export const PRPreview: React.FC<PRPreviewProps> = ({
  isOpen,
  onClose,
  template,
  task,
  repository,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'commits'>('overview');

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleDownloadScaffolds = () => {
    template.fileScaffolds.forEach(scaffold => {
      const blob = new Blob([scaffold.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = scaffold.path.split('/').pop() || 'file.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    toast.success('File scaffolds downloaded!');
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Branch Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <GitBranch size={16} className="text-primary-400" />
            <h4 className="font-medium text-white">Branch Information</h4>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Branch Name:</span>
              <div className="flex items-center space-x-2">
                <code className="px-2 py-1 bg-dark-700 rounded text-sm text-primary-400">
                  {template.branchName}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(template.branchName, 'Branch name')}
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Repository:</span>
              <span className="text-sm text-white">{repository.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">Task Type:</span>
              <span className={`text-sm px-2 py-1 rounded-full font-medium text-white ${
                task.type === 'feature' ? 'bg-primary-500' :
                task.type === 'bug' ? 'bg-error-500' :
                task.type === 'refactor' ? 'bg-secondary-500' :
                'bg-dark-500'
              }`}>
                {task.type}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PR Title and Description */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText size={16} className="text-secondary-400" />
              <h4 className="font-medium text-white">Pull Request</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyToClipboard(
                `${template.title}\n\n${template.description}`,
                'PR content'
              )}
            >
              <Copy size={14} className="mr-1" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-dark-300 mb-2 block">Title</label>
              <div className="p-3 bg-dark-700 rounded-lg border border-dark-600">
                <p className="text-white text-sm">{template.title}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-300 mb-2 block">Description</label>
              <div className="p-3 bg-dark-700 rounded-lg border border-dark-600 max-h-48 overflow-y-auto">
                <pre className="text-dark-200 text-sm whitespace-pre-wrap">{template.description}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commit Message */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} className="text-success-400" />
              <h4 className="font-medium text-white">Commit Message</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyToClipboard(template.commitMessage, 'Commit message')}
            >
              <Copy size={14} className="mr-1" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-dark-700 rounded-lg border border-dark-600">
            <code className="text-accent-400 text-sm">{template.commitMessage}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFiles = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">File Scaffolds ({template.fileScaffolds.length})</h4>
        {template.fileScaffolds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleDownloadScaffolds}>
            <Download size={14} className="mr-1" />
            Download All
          </Button>
        )}
      </div>

      {template.fileScaffolds.length === 0 ? (
        <div className="text-center py-8">
          <Code className="w-12 h-12 text-dark-400 mx-auto mb-3" />
          <p className="text-dark-400">No file scaffolds generated</p>
        </div>
      ) : (
        <div className="space-y-4">
          {template.fileScaffolds.map((scaffold, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Code size={16} className="text-accent-400" />
                    <span className="font-medium text-white text-sm">{scaffold.path}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToClipboard(scaffold.content, 'File content')}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-dark-400 mb-2 block">Content</label>
                    <div className="p-3 bg-dark-900 rounded border border-dark-600 max-h-48 overflow-y-auto">
                      <pre className="text-dark-200 text-xs whitespace-pre-wrap">{scaffold.content}</pre>
                    </div>
                  </div>
                  
                  {scaffold.todos.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-dark-400 mb-2 block">TODO Items</label>
                      <div className="space-y-1">
                        {scaffold.todos.map((todo, todoIndex) => (
                          <div key={todoIndex} className="flex items-start space-x-2 text-xs">
                            <span className="text-warning-400 mt-0.5">•</span>
                            <span className="text-dark-300">{todo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderCommits = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-white">Suggested Workflow</h4>
      
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs text-white font-medium">
                  1
                </div>
                <div>
                  <h5 className="text-sm font-medium text-white">Create Branch</h5>
                  <p className="text-xs text-dark-400 mt-1">Create a new branch from main</p>
                  <div className="mt-2 p-2 bg-dark-900 rounded border border-dark-600">
                    <code className="text-xs text-primary-400">
                      git checkout -b {template.branchName}
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-secondary-600 rounded-full flex items-center justify-center text-xs text-white font-medium">
                  2
                </div>
                <div>
                  <h5 className="text-sm font-medium text-white">Implement Changes</h5>
                  <p className="text-xs text-dark-400 mt-1">Create files and implement the feature</p>
                  <div className="mt-2 space-y-1">
                    {template.fileScaffolds.map((scaffold, index) => (
                      <div key={index} className="text-xs text-dark-300">
                        • Create {scaffold.path}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-accent-600 rounded-full flex items-center justify-center text-xs text-white font-medium">
                  3
                </div>
                <div>
                  <h5 className="text-sm font-medium text-white">Commit Changes</h5>
                  <p className="text-xs text-dark-400 mt-1">Commit your implementation</p>
                  <div className="mt-2 p-2 bg-dark-900 rounded border border-dark-600">
                    <code className="text-xs text-accent-400">
                      git commit -m "{template.commitMessage}"
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-success-600 rounded-full flex items-center justify-center text-xs text-white font-medium">
                  4
                </div>
                <div>
                  <h5 className="text-sm font-medium text-white">Create Pull Request</h5>
                  <p className="text-xs text-dark-400 mt-1">Push branch and create PR</p>
                  <div className="mt-2 space-y-1">
                    <div className="p-2 bg-dark-900 rounded border border-dark-600">
                      <code className="text-xs text-success-400">
                        git push origin {template.branchName}
                      </code>
                    </div>
                    <p className="text-xs text-dark-400">
                      Then create PR with the generated title and description
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PR Template Preview" size="xl">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-dark-700 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white'
                : 'text-dark-300 hover:text-white hover:bg-dark-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'files'
                ? 'bg-primary-600 text-white'
                : 'text-dark-300 hover:text-white hover:bg-dark-600'
            }`}
          >
            Files ({template.fileScaffolds.length})
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'commits'
                ? 'bg-primary-600 text-white'
                : 'text-dark-300 hover:text-white hover:bg-dark-600'
            }`}
          >
            Workflow
          </button>
        </div>

        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'files' && renderFiles()}
          {activeTab === 'commits' && renderCommits()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-700">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                const repoUrl = repository.url;
                const compareUrl = `${repoUrl}/compare/main...${template.branchName}`;
                window.open(compareUrl, '_blank');
              }}
            >
              <ExternalLink size={14} className="mr-1" />
              Open in GitHub
            </Button>
            <Button
              onClick={() => {
                handleCopyToClipboard(
                  `Branch: ${template.branchName}\n\nTitle: ${template.title}\n\nDescription:\n${template.description}\n\nCommit: ${template.commitMessage}`,
                  'Complete PR template'
                );
              }}
            >
              <Copy size={14} className="mr-1" />
              Copy All
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};