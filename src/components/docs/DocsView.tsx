import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Edit3,
  Save,
  X,
  GitBranch,
  Zap,
  Eye,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal as UIModal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { DocGenerator } from './DocGenerator';
import { VersionHistory } from './VersionHistory';
import { MarkdownModal } from './MarkdownModal';
import { useDocumentation } from '../../hooks/useDocumentation';
import { useRepositories } from '../../hooks/useRepositories';
import { useBusinessSpecs } from '../../hooks/useBusinessSpecs';
import { docGenerator, GeneratedDocumentation } from '../../services/docGenerator';
import { groqService } from '../../services/groq';
import { BusinessSpec } from '../../types';
import toast from 'react-hot-toast';
import { codebaseAnalyzer } from '../../services/codebaseAnalyzer';
import { githubService } from '../../services/github';
import { RepositoryAnalysis, FileStructure } from '../../types/github';

// Utility to extract JSON from LLM responses
function extractJsonFromResponse(response: string): any {
  // Try to match a JSON code block
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let jsonString = codeBlockMatch ? codeBlockMatch[1] : response;

  // If still not pure JSON, try to find the first {...} block
  const curlyMatch = jsonString.match(/{[\s\S]*}/);
  if (curlyMatch) {
    jsonString = curlyMatch[0];
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Failed to extract valid JSON from response');
  }
}

export const DocsView: React.FC = () => {
  const { documentation, loading, getDocumentationByRepository, updateDocumentation } = useDocumentation();
  const { repositories } = useRepositories();
  const { createBusinessSpec } = useBusinessSpecs();
  
  const [showGenerator, setShowGenerator] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocumentation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDoc, setEditingDoc] = useState<GeneratedDocumentation | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [selectingRepository, setSelectingRepository] = useState(false);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const filteredDocs = documentation.filter(doc =>
    doc.sections.some(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleEditSection = (doc: GeneratedDocumentation, sectionId: string) => {
    const section = doc.sections.find(s => s.id === sectionId);
    if (section) {
      setEditingDoc(doc);
      setEditSectionId(sectionId);
      setEditContent(section.content);
    }
  };

  const handleSaveSection = async () => {
    if (!editingDoc || !editSectionId) return;

    try {
      const updatedSections = editingDoc.sections.map(section =>
        section.id === editSectionId
          ? { ...section, content: editContent, lastGenerated: new Date() }
          : section
      );

      const updatedDoc = {
        ...editingDoc,
        sections: updatedSections,
        lastUpdated: new Date(),
      };

      await updateDocumentation(editingDoc.id, updatedDoc);
      
      // Check if changes warrant a new business spec
      await checkForSpecGeneration(editingDoc, editSectionId, editContent);
      
      setEditingDoc(null);
      setEditSectionId(null);
      setEditContent('');
      
      toast.success('Documentation updated successfully!');
    } catch (error) {
      console.error('Error saving documentation:', error);
      toast.error('Failed to save documentation');
    }
  };

  const checkForSpecGeneration = async (doc: GeneratedDocumentation, sectionId: string, newContent: string) => {
    const section = doc.sections.find(s => s.id === sectionId);
    if (!section) return;

    const oldContent = section.content;

    const shouldGenerate = window.confirm(
      'Significant changes detected in documentation. Would you like to generate a business specification from these changes?'
    );
    
    if (shouldGenerate) {
      await generateBusinessSpecFromChanges(doc, sectionId, oldContent, newContent);
    }
  };

  const generateBusinessSpecFromChanges = async (
    doc: GeneratedDocumentation, 
    sectionId: string, 
    oldContent: string, 
    newContent: string
  ) => {
    if (!groqService.isAvailable()) {
      toast.error('AI service not available for spec generation');
      return;
    }

    setGeneratingSpec(true);

    try {
      const prompt = `
        Analyze the following documentation changes and generate a business specification:

        Section: ${doc.sections.find(s => s.id === sectionId)?.title}
        
        Original Content:
        ${oldContent}
        
        Updated Content:
        ${newContent}
        
        Generate a business specification that captures the new requirements or changes.
        Include:
        1. Clear title
        2. Detailed description
        3. Acceptance criteria (as array)
        4. Technical requirements (as array)
        
        Return as JSON:
        {
          "title": "Feature Title",
          "description": "Detailed description",
          "acceptanceCriteria": ["criteria 1", "criteria 2"],
          "technicalRequirements": ["requirement 1", "requirement 2"]
        }
      `;

      const response = await groqService.makeCompletion(prompt, 1024, { type: 'json_object' });
      // Use robust JSON extraction
      const specData = extractJsonFromResponse(response);

      const businessSpec: Omit<BusinessSpec, 'id' | 'lastUpdated'> = {
        title: specData.title || 'Generated from Documentation Changes',
        description: specData.description || 'Auto-generated from documentation updates',
        acceptanceCriteria: specData.acceptanceCriteria || [],
        technicalRequirements: specData.technicalRequirements || [],
        status: 'draft',
        priority: 'medium',
        tags: ['auto-generated', 'documentation'],
        createdAt: new Date(),
      };

      await createBusinessSpec(businessSpec);
      toast.success('Business specification generated from documentation changes!');
    } catch (error) {
      console.error('Error generating business spec:', error);
      toast.error('Failed to generate business specification');
    } finally {
      setGeneratingSpec(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingDoc(null);
    setEditSectionId(null);
    setEditContent('');
  };

  const handleViewDoc = (doc: GeneratedDocumentation) => {
    setSelectedDoc(doc);
    setShowMarkdownModal(true);
  };

  const handleExportDoc = (doc: GeneratedDocumentation, format: 'markdown' | 'html' | 'json' = 'markdown') => {
    try {
      const content = docGenerator.exportDocumentation(doc, format);
      const blob = new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.repositoryId}-docs.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Documentation exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export documentation');
    }
  };

  const handleContinueToGenerator = async () => {
    if (!selectedRepositoryId) return;
    setLoadingAnalysis(true);
    setAnalysis(null);
    try {
      const repo = repositories.find(r => r.id === selectedRepositoryId)!;
      const parsed = githubService.parseRepositoryUrl(repo.url);
      if (!parsed) {
        toast.error('Invalid repository URL');
        setLoadingAnalysis(false);
        return;
      }
      const codebase = await codebaseAnalyzer.analyzeCodebase(parsed.owner, parsed.repo);
      const pushedAt = repo.lastUpdated instanceof Date ? repo.lastUpdated.toISOString() : String(repo.lastUpdated);
      // Build a minimal FileStructure root node with modules as children
      const structure: FileStructure = {
        name: repo.name,
        path: '',
        type: 'directory',
        children: codebase.modules.map(m => ({
          name: m.name,
          path: m.path,
          type: 'file',
          size: 0,
          language: repo.language,
          isImportant: true,
        })),
      };
      const lastActivity = repo.lastUpdated instanceof Date ? repo.lastUpdated.toISOString() : String(repo.lastUpdated);
      const repoAnalysis: RepositoryAnalysis = {
        repository: {
          id: 0,
          name: repo.name,
          full_name: repo.name,
          description: repo.description,
          html_url: repo.url,
          clone_url: repo.url,
          language: repo.language,
          stargazers_count: repo.stars,
          forks_count: 0,
          open_issues_count: 0,
          default_branch: 'main',
          created_at: lastActivity,
          updated_at: lastActivity,
          pushed_at: pushedAt,
          size: 0,
          owner: { login: '', avatar_url: '', html_url: '' },
        },
        structure,
        contributors: [],
        languages: {},
        recentCommits: [],
        summary: {
          totalFiles: codebase.modules.length,
          totalLines: 0,
          primaryLanguage: repo.language,
          lastActivity,
          commitFrequency: 0,
        },
      };
      setAnalysis(repoAnalysis);
      setShowGenerator(true);
    } catch (error) {
      toast.error('Failed to analyze repository');
    } finally {
      setLoadingAnalysis(false);
      setSelectingRepository(false);
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
            AI-generated living documentation with collaborative editing
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => setShowVersionHistory(true)}>
            <History size={16} className="mr-2" />
            History
          </Button>
          <Button onClick={() => setSelectingRepository(true)}>
            <Plus size={16} className="mr-2" />
            Generate Docs
          </Button>
        </div>
      </div>

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
              <FileText className="w-12 h-12 text-dark-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Documentation Found</h3>
              <p className="text-dark-400 mb-4">
                {searchQuery ? 'No documentation matches your search.' : 'Generate documentation from your repositories to get started.'}
              </p>
              <Button onClick={() => setSelectingRepository(true)}>
                <Plus size={16} className="mr-2" />
                Generate Documentation
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id} hover>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{doc.repositoryId}</h3>
                    <p className="text-sm text-dark-400">
                      {doc.sections.length} sections • Last updated {doc.lastUpdated.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDoc(doc)}>
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleExportDoc(doc)}>
                      <Download size={14} className="mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {doc.sections.map((section) => (
                    <div key={section.id} className="border border-dark-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white">{section.title}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-dark-400">
                            {section.wordCount} words
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSection(doc, section.id)}
                            className="p-1 h-6 w-6"
                          >
                            <Edit3 size={12} color="white" />
                            <span className="text-xs text-dark-400">
                              Edit
                            </span>
                          </Button>
                        </div>
                      </div>
                      
                      {editingDoc?.id === doc.id && editSectionId === section.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full h-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none resize-none"
                            placeholder="Edit section content..."
                          />
                          <div className="flex items-center space-x-2">
                            <Button size="sm" onClick={handleSaveSection} disabled={generatingSpec}>
                              {generatingSpec ? (
                                <LoadingSpinner size="sm" className="mr-1" />
                              ) : (
                                <Save size={14} className="mr-1" />
                              )}
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                              <X size={14} className="mr-1" />
                              Cancel
                            </Button>
                            {generatingSpec && (
                              <span className="text-sm text-warning-400 flex items-center">
                                <Zap size={12} className="mr-1" />
                                Analyzing changes for spec generation...
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none">
                          <p className="text-dark-300 line-clamp-3">
                            {section.content.substring(0, 200)}...
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      <UIModal isOpen={selectingRepository} onClose={() => setSelectingRepository(false)} title="Select Repository">
        <div className="space-y-4">
          <select
            value={selectedRepositoryId || ''}
            onChange={e => setSelectedRepositoryId(e.target.value)}
            className="w-full p-2 rounded border border-dark-600 bg-dark-800 text-white"
          >
            <option value="" disabled>Select a repository</option>
            {repositories.map(repo => (
              <option key={repo.id} value={repo.id}>{repo.name}</option>
            ))}
          </select>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setSelectingRepository(false)}>Cancel</Button>
            <Button
              onClick={handleContinueToGenerator}
              disabled={!selectedRepositoryId || loadingAnalysis}
            >
              {loadingAnalysis ? <LoadingSpinner size="sm" /> : 'Continue'}
            </Button>
          </div>
        </div>
      </UIModal>

      {/* Show loading spinner while analysis is being fetched */}
      {loadingAnalysis && (
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-dark-400">Analyzing repository...</span>
        </div>
      )}

      {/* Only show DocGenerator when both repository and analysis are available */}
      {selectedRepositoryId && showGenerator && analysis && (
        <DocGenerator
          repository={repositories.find(r => r.id === selectedRepositoryId)!}
          analysis={analysis}
          onDocumentationGenerated={() => {
            setShowGenerator(false);
            setSelectedRepositoryId(null);
            setAnalysis(null);
          }}
        />
      )}

      <VersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        repositoryId={selectedRepositoryId || ''}
        repositoryName={
          selectedRepositoryId
            ? repositories.find(r => r.id === selectedRepositoryId)?.name || ''
            : ''
        }
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
    </div>
  );
};