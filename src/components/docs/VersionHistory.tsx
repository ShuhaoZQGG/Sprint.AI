import React, { useState, useEffect } from 'react';
import { 
  History, 
  Calendar, 
  User, 
  FileText, 
  Eye, 
  Download,
  GitBranch,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { DocumentationVersion } from '../../services/documentationService';
import { useDocumentation } from '../../hooks/useDocumentation';
import { docGenerator } from '../../services/docGenerator';
import toast from 'react-hot-toast';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId: string;
  repositoryName: string;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  isOpen,
  onClose,
  repositoryId,
  repositoryName,
}) => {
  const { getVersionHistory } = useDocumentation();
  const [versions, setVersions] = useState<DocumentationVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [previewVersion, setPreviewVersion] = useState<DocumentationVersion | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen && repositoryId) {
      fetchVersionHistory();
    }
  }, [isOpen, repositoryId]);

  const fetchVersionHistory = async () => {
    try {
      setLoading(true);
      const history = await getVersionHistory(repositoryId);
      setVersions(history);
    } catch (error) {
      console.error('Failed to fetch version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVersionExpansion = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  };

  const handlePreviewVersion = (version: DocumentationVersion) => {
    setPreviewVersion(version);
    setShowPreview(true);
  };

  const handleDownloadVersion = (version: DocumentationVersion, format: 'markdown' | 'html' | 'json') => {
    try {
      const mockDoc = {
        id: version.id,
        repositoryId,
        sections: version.sections,
        generatedAt: version.createdAt,
        lastUpdated: version.createdAt,
        status: 'completed' as const,
      };

      const exported = docGenerator.exportDocumentation(mockDoc, format);
      const blob = new Blob([exported], { 
        type: format === 'html' ? 'text/html' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${repositoryName}-docs-v${version.version}.${format === 'json' ? 'json' : format === 'html' ? 'html' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Version ${version.version} exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export documentation');
    }
  };

  const getVersionStatus = (version: DocumentationVersion, index: number) => {
    if (index === 0) return { label: 'Latest', color: 'text-success-400 bg-success-900/20' };
    if (index === 1) return { label: 'Previous', color: 'text-warning-400 bg-warning-900/20' };
    return { label: `v${version.version}`, color: 'text-dark-400 bg-dark-700' };
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Version History" size="xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-secondary-600 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{repositoryName}</h3>
                <p className="text-sm text-dark-400">Documentation version history</p>
              </div>
            </div>
            <div className="text-sm text-dark-400">
              {versions.length} version{versions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Version List */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-white mb-2">No Version History</h4>
                <p className="text-dark-400">
                  Documentation versions will appear here after generation
                </p>
              </div>
            ) : (
              versions.map((version, index) => {
                const status = getVersionStatus(version, index);
                const isExpanded = expandedVersions.has(version.id);

                return (
                  <Card key={version.id} hover>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Version Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => toggleVersionExpansion(version.id)}
                              className="text-dark-400 hover:text-white transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                            <div className="flex items-center space-x-2">
                              <GitBranch size={16} className="text-secondary-400" />
                              <span className="font-medium text-white">Version {version.version}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewVersion(version)}
                            >
                              <Eye size={14} className="mr-1" />
                              Preview
                            </Button>
                            <div className="relative group">
                              <Button variant="ghost" size="sm">
                                <Download size={14} className="mr-1" />
                                Export
                              </Button>
                              <div className="absolute right-0 top-full mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                <div className="p-2 space-y-1 min-w-[120px]">
                                  <button
                                    onClick={() => handleDownloadVersion(version, 'markdown')}
                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-600 rounded"
                                  >
                                    Markdown
                                  </button>
                                  <button
                                    onClick={() => handleDownloadVersion(version, 'html')}
                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-600 rounded"
                                  >
                                    HTML
                                  </button>
                                  <button
                                    onClick={() => handleDownloadVersion(version, 'json')}
                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-600 rounded"
                                  >
                                    JSON
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Version Metadata */}
                        <div className="flex items-center space-x-4 text-sm text-dark-400">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>{version.createdAt.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{version.createdAt.toLocaleTimeString()}</span>
                          </div>
                          {version.createdBy && (
                            <div className="flex items-center space-x-1">
                              <User size={12} />
                              <span>{version.createdBy.name}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <FileText size={12} />
                            <span>{version.sections.length} sections</span>
                          </div>
                        </div>

                        {/* Change Log */}
                        {version.changeLog && (
                          <div className="p-3 bg-dark-700 rounded-lg border border-dark-600">
                            <h5 className="text-sm font-medium text-white mb-1">Changes</h5>
                            <p className="text-sm text-dark-300">{version.changeLog}</p>
                          </div>
                        )}

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t border-dark-700">
                            <h5 className="text-sm font-medium text-white">Sections ({version.sections.length})</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {version.sections.map((section) => (
                                <div
                                  key={section.id}
                                  className="p-2 bg-dark-700 rounded border border-dark-600"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white">{section.title}</span>
                                    <span className="text-xs text-dark-400 capitalize">{section.type}</span>
                                  </div>
                                  <div className="text-xs text-dark-500 mt-1">
                                    {section.wordCount} words
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {previewVersion && (
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={`Preview Version ${previewVersion.version}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-dark-400">
                <span>Version {previewVersion.version}</span>
                <span>•</span>
                <span>{previewVersion.sections.length} sections</span>
                <span>•</span>
                <span>{previewVersion.createdAt.toLocaleDateString()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    previewVersion.sections.map(s => s.content).join('\n\n')
                  );
                  toast.success('Content copied to clipboard!');
                }}
              >
                Copy All
              </Button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-4">
              {previewVersion.sections.map((section) => (
                <div key={section.id} className="border border-dark-600 rounded-lg">
                  <div className="p-3 bg-dark-700 border-b border-dark-600">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{section.title}</h4>
                      <span className="text-xs text-dark-400 capitalize">{section.type}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <pre className="whitespace-pre-wrap text-sm text-dark-200">
                      {section.content.substring(0, 500)}
                      {section.content.length > 500 && '...'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};