import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Zap,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { DocGenerator } from './DocGenerator';
import { VersionHistory } from './VersionHistory';
import MarkdownModal from './MarkdownModal';
import { BusinessSpecGenerationModal } from './BusinessSpecGenerationModal';
import { useDocumentation } from '../../hooks/useDocumentation';
import { useRepositories } from '../../hooks/useRepositories';
import { useBusinessSpecs } from '../../hooks/useBusinessSpecs';
import { useAuth } from '../auth/AuthProvider';
import { GeneratedDocumentation } from '../../services/docGenerator';
import toast from 'react-hot-toast';

export const DocsView: React.FC = () => {
  const { user } = useAuth();
  const { repositories, currentRepository, setCurrentRepository } = useRepositories();
  const { 
    documentation, 
    loading, 
    generateDocumentation, 
    updateDocumentation,
    exportDocumentation 
  } = useDocumentation();
  const { createBusinessSpec } = useBusinessSpecs();

  const [showDocGenerator, setShowDocGenerator] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [showSpecGenerationModal, setShowSpecGenerationModal] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocumentation | null>(null);
  const [docChanges, setDocChanges] = useState<Map<string, string>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filter documentation based on search
  const filteredDocs = documentation.filter(doc =>
    doc.sections.some(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleEditSection = (docId: string, sectionId: string, content: string) => {
    setEditingSection(`${docId}-${sectionId}`);
    setEditContent(content);
  };

  const handleSaveSection = async (docId: string, sectionId: string) => {
    try {
      const doc = documentation.find(d => d.id === docId);
      if (!doc) return;

      const updatedSections = doc.sections.map(section => 
        section.id === sectionId 
          ? { ...section, content: editContent }
          : section
      );

      await updateDocumentation(docId, { sections: updatedSections });
      
      // Track changes for business spec generation
      const changeKey = `${docId}-${sectionId}`;
      setDocChanges(prev => new Map(prev.set(changeKey, editContent)));
      setHasUnsavedChanges(true);
      
      setEditingSection(null);
      setEditContent('');
      toast.success('Section updated successfully!');
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error('Failed to save section');
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
  };

  const handleGenerateBusinessSpec = () => {
    if (docChanges.size === 0) {
      toast.error('No documentation changes detected');
      return;
    }
    setShowSpecGenerationModal(true);
  };

  const handleExportDoc = async (doc: GeneratedDocumentation, format: 'markdown' | 'pdf' | 'html') => {
    try {
      await exportDocumentation(doc.id, format);
      toast.success(`Documentation exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting documentation:', error);
      toast.error('Failed to export documentation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Documentation</h1>
          <p className="text-dark-400">
            AI-generated living documentation with business spec integration
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <Button
              onClick={handleGenerateBusinessSpec}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700"
            >
              <Zap size={16} className="mr-2" />
              Generate Business Spec
            </Button>
          )}
          <Button variant="ghost" onClick={() => setShowVersionHistory(true)}>
            <FileText size={16} className="mr-2" />
            Version History
          </Button>
          <Button onClick={() => setShowDocGenerator(true)}>
            <Plus size={16} className="mr-2" />
            Generate Docs
          </Button>
        </div>
      </div>

      {/* Repository Selection */}
      {repositories.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-dark-300">Repository:</label>
              <select
                value={currentRepository?.id || ''}
                onChange={(e) => {
                  const repo = repositories.find(r => r.id === e.target.value);
                  setCurrentRepository(repo || null);
                }}
                className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select a repository</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <Button variant="ghost" size="sm">
              <Filter size={16} className="mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentation List */}
      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Documentation Found</h3>
              <p className="text-dark-400 mb-4">
                {searchQuery 
                  ? 'No documentation matches your search criteria'
                  : 'Generate documentation from your repository to get started'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowDocGenerator(true)}>
                  <Plus size={16} className="mr-2" />
                  Generate Documentation
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id} hover>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{doc.title}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-dark-400">
                      <span>Generated {new Date(doc.generatedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{doc.sections.length} sections</span>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'completed' ? 'bg-success-600 text-white' :
                        doc.status === 'generating' ? 'bg-warning-600 text-white' :
                        'bg-error-600 text-white'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDoc(doc);
                        setShowMarkdownModal(true);
                      }}
                    >
                      <Edit3 size={14} className="mr-1" />
                      Edit
                    </Button>
                    <div className="relative group">
                      <Button variant="ghost" size="sm">
                        <Download size={14} className="mr-1" />
                        Export
                      </Button>
                      <div className="absolute right-0 top-full mt-1 w-32 bg-dark-800 border border-dark-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <button
                          onClick={() => handleExportDoc(doc, 'markdown')}
                          className="w-full text-left px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                          Markdown
                        </button>
                        <button
                          onClick={() => handleExportDoc(doc, 'html')}
                          className="w-full text-left px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                          HTML
                        </button>
                        <button
                          onClick={() => handleExportDoc(doc, 'pdf')}
                          className="w-full text-left px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {doc.sections.map((section) => {
                    const isEditing = editingSection === `${doc.id}-${section.id}`;
                    const hasChanges = docChanges.has(`${doc.id}-${section.id}`);
                    
                    return (
                      <div key={section.id} className="border border-dark-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-white flex items-center">
                            {section.title}
                            {hasChanges && (
                              <span className="ml-2 w-2 h-2 bg-warning-400 rounded-full" title="Unsaved changes" />
                            )}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSection(doc.id, section.id)}
                                >
                                  <Save size={14} className="mr-1" />
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <X size={14} />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSection(doc.id, section.id, section.content)}
                              >
                                <Edit3 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {isEditing ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full h-32 bg-dark-800 border border-dark-600 rounded-lg p-3 text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                            placeholder="Edit section content..."
                          />
                        ) : (
                          <div className="prose prose-invert max-w-none">
                            <div className="text-dark-300 text-sm leading-relaxed whitespace-pre-wrap">
                              {section.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 bg-warning-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
          <AlertCircle size={20} />
          <span className="font-medium">You have unsaved documentation changes</span>
          <Button
            size="sm"
            onClick={handleGenerateBusinessSpec}
            className="bg-white text-warning-600 hover:bg-gray-100"
          >
            <ArrowRight size={14} className="mr-1" />
            Generate Spec
          </Button>
        </div>
      )}

      {/* Modals */}
      <DocGenerator
        isOpen={showDocGenerator}
        onClose={() => setShowDocGenerator(false)}
      />

      <VersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
      />

      {selectedDoc && (
        <MarkdownModal
          isOpen={showMarkdownModal}
          onClose={() => {
            setShowMarkdownModal(false);
            setSelectedDoc(null);
          }}
          documentation={selectedDoc}
        />
      )}

      <BusinessSpecGenerationModal
        isOpen={showSpecGenerationModal}
        onClose={() => {
          setShowSpecGenerationModal(false);
          setDocChanges(new Map());
          setHasUnsavedChanges(false);
        }}
        docChanges={docChanges}
        onSpecGenerated={() => {
          setDocChanges(new Map());
          setHasUnsavedChanges(false);
        }}
      />
    </div>
  );
};