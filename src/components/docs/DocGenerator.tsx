import React, { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Download, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Edit3
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { docGenerator, GeneratedDocumentation, DocumentationGenerationProgress } from '../../services/docGenerator';
import { groqService, DocumentationSection } from '../../services/groq';
import { Repository } from '../../types';
import { RepositoryAnalysis } from '../../types/github';
import toast from 'react-hot-toast';

interface DocGeneratorProps {
  repository: Repository;
  analysis: RepositoryAnalysis;
  onDocumentationGenerated: (documentation: GeneratedDocumentation) => void;
}

export const DocGenerator: React.FC<DocGeneratorProps> = ({
  repository,
  analysis,
  onDocumentationGenerated,
}) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<DocumentationGenerationProgress | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocumentation | null>(null);
  const [previewSection, setPreviewSection] = useState<DocumentationSection | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateDocumentation = async () => {
    if (!groqService.isAvailable()) {
      toast.error('AI service is not configured. Please add your Groq API key to the environment variables.');
      return;
    }

    setGenerating(true);
    setProgress(null);

    try {
      const documentation = await docGenerator.generateDocumentation(
        repository,
        analysis,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setGeneratedDoc(documentation);
      onDocumentationGenerated(documentation);
      
      if (documentation.status === 'completed') {
        toast.success(`Generated ${documentation.sections.length} documentation sections!`);
      }
    } catch (error) {
      console.error('Documentation generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate documentation');
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const handlePreviewSection = (section: DocumentationSection) => {
    setPreviewSection(section);
    setShowPreview(true);
  };

  const handleExportDocumentation = (format: 'markdown' | 'html' | 'json') => {
    if (!generatedDoc) return;

    try {
      const exported = docGenerator.exportDocumentation(generatedDoc, format);
      const blob = new Blob([exported], { 
        type: format === 'html' ? 'text/html' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${repository.name}-docs.${format === 'json' ? 'json' : format === 'html' ? 'html' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Documentation exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export documentation');
    }
  };

  const getProgressColor = (step: string) => {
    switch (step) {
      case 'initialization': return 'text-primary-400';
      case 'analysis': return 'text-secondary-400';
      case 'generation': return 'text-warning-400';
      case 'processing': return 'text-accent-400';
      case 'completion': return 'text-success-400';
      default: return 'text-dark-400';
    }
  };

  const getSectionIcon = (type: DocumentationSection['type']) => {
    switch (type) {
      case 'overview': return FileText;
      case 'api': return RefreshCw;
      case 'components': return Edit3;
      case 'architecture': return Sparkles;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">AI Documentation Generator</h3>
                <p className="text-sm text-dark-400">
                  Generate comprehensive documentation from your codebase
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {generatedDoc && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportDocumentation('markdown')}
                  >
                    <Download size={14} className="mr-1" />
                    Export MD
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportDocumentation('html')}
                  >
                    <Download size={14} className="mr-1" />
                    Export HTML
                  </Button>
                </>
              )}
              <Button
                onClick={handleGenerateDocumentation}
                loading={generating}
                disabled={generating}
              >
                <Sparkles size={16} className="mr-2" />
                {generatedDoc ? 'Regenerate' : 'Generate'} Docs
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Progress Indicator */}
        {progress && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${getProgressColor(progress.step)}`}>
                  {progress.message}
                </span>
                <span className="text-sm text-dark-400">
                  {progress.progress}%
                </span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Generated Documentation Sections */}
      {generatedDoc && generatedDoc.status === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Generated Documentation</h3>
            <div className="flex items-center space-x-2 text-sm text-dark-400">
              <CheckCircle size={16} className="text-success-400" />
              <span>Generated {generatedDoc.generatedAt.toLocaleDateString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedDoc.sections.map((section) => {
              const Icon = getSectionIcon(section.type);
              return (
                <Card key={section.id} hover>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                          <Icon size={16} className="text-primary-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{section.title}</h4>
                          <p className="text-xs text-dark-400 capitalize">{section.type}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewSection(section)}
                      >
                        <Eye size={14} className="mr-1" />
                        Preview
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-dark-500">
                        <span>{section.wordCount} words</span>
                        <span>Generated {section.lastGenerated.toLocaleTimeString()}</span>
                      </div>
                      
                      <div className="text-sm text-dark-300 line-clamp-3">
                        {section.content.substring(0, 150)}...
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Error State */}
      {generatedDoc && generatedDoc.status === 'error' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-8 h-8 text-error-400" />
              <div>
                <h4 className="font-medium text-white mb-1">Documentation Generation Failed</h4>
                <p className="text-sm text-dark-400">{generatedDoc.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {generating && !progress && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <div>
                <h4 className="font-medium text-white mb-1">Initializing AI Documentation Generator</h4>
                <p className="text-sm text-dark-400">Preparing to analyze your codebase...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={previewSection?.title}
        size="xl"
      >
        {previewSection && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-dark-400">
                <span className="capitalize">{previewSection.type}</span>
                <span>•</span>
                <span>{previewSection.wordCount} words</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(previewSection.content);
                  toast.success('Content copied to clipboard!');
                }}
              >
                Copy Content
              </Button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-dark-200 bg-dark-800 p-4 rounded-lg border border-dark-700">
                  {previewSection.content}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};