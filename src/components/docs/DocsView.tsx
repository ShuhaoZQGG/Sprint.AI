import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  RefreshCw, 
  Edit, 
  Download,
  GitBranch,
  Clock,
  Sparkles,
  Plus,
  Github,
  Zap,
  History,
  Search,
  Eye,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PresenceIndicator } from '../ui/PresenceIndicator';
import { RealtimeIndicator } from '../ui/RealtimeIndicator';
import { RepositoryConnector } from '../repository/RepositoryConnector';
import { DocGenerator } from './DocGenerator';
import { VersionHistory } from './VersionHistory';
import { useRepositories } from '../../hooks/useRepositories';
import { useDocumentation } from '../../hooks/useDocumentation';
import { useAppStore } from '../../stores/useAppStore';
import { useRealtimeTable, usePresence } from '../../hooks/useRealtime';
import { useAuth } from '../../hooks/useSupabase';
import { GeneratedDocumentation } from '../../services/docGenerator';
import { RepositoryAnalysis } from '../../types/github';
import { DocumentationSearchResult } from '../../services/documentationService';
import toast from 'react-hot-toast';

export const DocsView: React.FC = () => {
  const { repositories, loading: repositoriesLoading } = useRepositories();
  const { 
    documentation, 
    loading: docsLoading, 
    storeDocumentation, 
    searchDocumentation,
    getLatestDocumentation 
  } = useDocumentation();
  const { currentRepository, setCurrentRepository } = useAppStore();
  const { user } = useAuth();
  
  const [generating, setGenerating] = useState(false);
  const [showConnector, setShowConnector] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [collaborativeEditing, setCollaborativeEditing] = useState<string | null>(null);

  // Real-time presence for collaboration
  const { users: onlineUsers, broadcast, onBroadcast } = usePresence(
    'docs-collaboration',
    {
      id: user?.id || 'anonymous',
      name: user?.user_metadata?.full_name || user?.email || 'Anonymous',
      avatar: user?.user_metadata?.avatar_url,
    },
    { enabled: !!user }
  );

  // Real-time documentation updates
  useRealtimeTable(
    'generated_docs',
    (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      switch (eventType) {
        case 'INSERT':
          if (newRecord && newRecord.created_by !== user?.id) {
            toast.success(`New documentation created: ${newRecord.title}`);
          }
          break;
          
        case 'UPDATE':
          if (newRecord && newRecord.created_by !== user?.id) {
            toast.info(`Documentation updated: ${newRecord.title}`);
          }
          break;
          
        case 'DELETE':
          if (oldRecord) {
            toast.info(`Documentation deleted: ${oldRecord.title}`);
          }
          break;
      }
    },
    { enabled: !docsLoading }
  );

  // Listen for collaborative editing events
  useEffect(() => {
    onBroadcast('doc-editing-started', (payload) => {
      if (payload.userId !== user?.id) {
        toast.info(`${payload.userName} started editing documentation`);
      }
    });

    onBroadcast('doc-editing-stopped', (payload) => {
      if (payload.userId !== user?.id) {
        toast.info(`${payload.userName} stopped editing documentation`);
      }
    });

    onBroadcast('doc-section-updated', (payload) => {
      if (payload.userId !== user?.id) {
        toast.success(`${payload.userName} updated a documentation section`);
      }
    });
  }, [onBroadcast, user?.id]);

  const handleGenerateDocs = async () => {
    setGenerating(true);
    
    // Broadcast that user started generating docs
    broadcast('doc-generation-started', {
      userId: user?.id,
      userName: user?.user_metadata?.full_name || user?.email,
      repositoryId: selectedRepo,
    });

    // Simulate AI documentation generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    setGenerating(false);

    // Broadcast completion
    broadcast('doc-generation-completed', {
      userId: user?.id,
      userName: user?.user_metadata?.full_name || user?.email,
      repositoryId: selectedRepo,
    });
  };

  const handleDocumentationGenerated = async (repoId: string, documentation: GeneratedDocumentation) => {
    try {
      await storeDocumentation(repoId, documentation);
      toast.success('Documentation saved to database!');
      
      // Broadcast the new documentation
      broadcast('doc-created', {
        userId: user?.id,
        userName: user?.user_metadata?.full_name || user?.email,
        repositoryId: repoId,
        documentationId: documentation.id,
      });
    } catch (error) {
      console.error('Failed to store documentation:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchDocumentation(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleViewDocumentation = async (repositoryId: string) => {
    try {
      const latestDoc = await getLatestDocumentation(repositoryId);
      if (latestDoc) {
        // Broadcast that user is viewing documentation
        broadcast('doc-viewing', {
          userId: user?.id,
          userName: user?.user_metadata?.full_name || user?.email,
          repositoryId,
          documentationId: latestDoc.id,
        });
        
        toast.success('Opening documentation...');
      } else {
        toast.info('No documentation found for this repository');
      }
    } catch (error) {
      console.error('Failed to fetch documentation:', error);
    }
  };

  const handleStartCollaborativeEditing = (docId: string) => {
    setCollaborativeEditing(docId);
    
    // Broadcast that user started editing
    broadcast('doc-editing-started', {
      userId: user?.id,
      userName: user?.user_metadata?.full_name || user?.email,
      documentationId: docId,
    });
  };

  const handleStopCollaborativeEditing = () => {
    if (collaborativeEditing) {
      broadcast('doc-editing-stopped', {
        userId: user?.id,
        userName: user?.user_metadata?.full_name || user?.email,
        documentationId: collaborativeEditing,
      });
      
      setCollaborativeEditing(null);
    }
  };

  const getRepositoryAnalysis = (repoId: string): RepositoryAnalysis | null => {
    // In a real implementation, this would fetch the analysis from the database
    // For now, we'll create a mock analysis
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return null;

    return {
      repository: {
        id: parseInt(repo.id),
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
        created_at: new Date().toISOString(),
        updated_at: repo.lastUpdated.toISOString(),
        pushed_at: repo.lastUpdated.toISOString(),
        size: 1000,
        owner: {
          login: 'owner',
          avatar_url: '',
          html_url: '',
        },
      },
      structure: [],
      contributors: [],
      languages: { [repo.language]: 1000 },
      recentCommits: [],
      summary: {
        totalFiles: 50,
        totalLines: 5000,
        primaryLanguage: repo.language,
        lastActivity: repo.lastUpdated.toISOString(),
        commitFrequency: 10,
      },
    };
  };

  const handleRepositorySelect = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (repo) {
      setCurrentRepository(repo);
      setSelectedRepo(repoId);
      
      // Broadcast repository selection
      broadcast('repo-selected', {
        userId: user?.id,
        userName: user?.user_metadata?.full_name || user?.email,
        repositoryId: repoId,
        repositoryName: repo.name,
      });
    }
  };

  const getRepositoryDocumentation = (repoId: string) => {
    return documentation.filter(doc => doc.repositoryId === repoId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Living Documentation</h1>
          <p className="text-dark-400">AI-generated and maintained codebase documentation</p>
        </div>
        <div className="flex items-center space-x-3">
          <PresenceIndicator users={onlineUsers} showNames />
          <RealtimeIndicator />
          <Button variant="ghost" onClick={() => setShowConnector(true)}>
            <Plus size={16} className="mr-2" />
            Connect Repository
          </Button>
          <Button variant="ghost">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button
            onClick={handleGenerateDocs}
            loading={generating}
          >
            <Sparkles size={16} className="mr-2" />
            Generate with AI
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                icon={<Search size={16} />}
              />
            </div>
            <Button onClick={handleSearch} loading={searching}>
              Search
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-white">Search Results ({searchResults.length})</h4>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-3 bg-dark-700 rounded-lg border border-dark-600 hover:border-primary-500 transition-colors cursor-pointer"
                  onClick={() => handleViewDocumentation(result.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-white">{result.title}</h5>
                      <p className="text-sm text-dark-400 mt-1">{result.repositoryName}</p>
                      <p className="text-sm text-dark-300 mt-2">{result.excerpt}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-dark-500">
                      <span>v{result.version}</span>
                      <span>•</span>
                      <span>{result.lastUpdated.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Connected Repositories</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <GitBranch size={16} className="text-dark-400" />
                <span className="text-sm text-dark-400">main branch</span>
              </div>
              {onlineUsers.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-dark-400">
                  <Users size={14} />
                  <span>{onlineUsers.length} collaborating</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {repositoriesLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-dark-400">Loading repositories...</p>
            </div>
          ) : repositories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {repositories.map((repo) => {
                const repoDocumentation = getRepositoryDocumentation(repo.id);
                const hasDocumentation = repoDocumentation.length > 0;
                const isSelected = selectedRepo === repo.id;
                const isBeingEdited = collaborativeEditing === repo.id;
                
                return (
                  <div
                    key={repo.id}
                    className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-900/20' 
                        : 'border-dark-600 hover:border-primary-500'
                    } ${isBeingEdited ? 'ring-2 ring-secondary-500' : ''}`}
                    onClick={() => handleRepositorySelect(repo.id)}
                  >
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                        <Github size={16} className="text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{repo.name}</h4>
                        <p className="text-sm text-dark-400 mb-2">{repo.description}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {hasDocumentation && (
                          <div className="w-3 h-3 bg-success-400 rounded-full" title="Documentation available" />
                        )}
                        {isSelected && (
                          <div className="flex items-center space-x-1 text-primary-400">
                            <Zap size={12} />
                          </div>
                        )}
                        {isBeingEdited && (
                          <div className="flex items-center space-x-1 text-secondary-400">
                            <Edit size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="text-dark-500">{repo.language}</span>
                        <span className="text-dark-500">⭐ {repo.stars}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {hasDocumentation && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowVersionHistory(true);
                              }}
                              className="p-1"
                            >
                              <History size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocumentation(repo.id);
                              }}
                              className="p-1"
                            >
                              <Eye size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isBeingEdited) {
                                  handleStopCollaborativeEditing();
                                } else {
                                  handleStartCollaborativeEditing(repo.id);
                                }
                              }}
                              className="p-1"
                            >
                              <Edit size={12} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Documentation Status */}
                    {hasDocumentation && (
                      <div className="mt-3 pt-3 border-t border-dark-700">
                        <div className="flex items-center justify-between text-xs text-dark-500">
                          <span>{repoDocumentation.length} version{repoDocumentation.length !== 1 ? 's' : ''}</span>
                          <span>Latest: {repoDocumentation[0]?.lastUpdated.toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}

                    {repo.structure && (
                      <div className="mt-3 pt-3 border-t border-dark-700">
                        <div className="flex items-center justify-between text-xs text-dark-500">
                          <span>{repo.structure.modules.length} modules</span>
                          <span>{repo.structure.services.length} services</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Github className="w-8 h-8 text-dark-400" />
              </div>
              <h4 className="text-lg font-medium text-white mb-2">No Repositories Connected</h4>
              <p className="text-dark-400 mb-4">
                Connect your GitHub repositories to start generating documentation
              </p>
              <Button onClick={() => setShowConnector(true)}>
                <Plus size={16} className="mr-2" />
                Connect Repository
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Documentation Generator */}
      {selectedRepo && (
        <div className="space-y-6">
          {(() => {
            const repo = repositories.find(r => r.id === selectedRepo);
            const analysis = getRepositoryAnalysis(selectedRepo);
            
            if (!repo || !analysis) return null;
            
            return (
              <DocGenerator
                repository={repo}
                analysis={analysis}
                onDocumentationGenerated={(doc) => handleDocumentationGenerated(repo.id, doc)}
              />
            );
          })()}
        </div>
      )}

      {/* Existing Documentation Grid */}
      {documentation.length > 0 && !selectedRepo && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Recent Documentation</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {documentation.slice(0, 6).map((doc) => (
              <Card key={doc.id} hover>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{doc.repositoryId}</h3>
                        <p className="text-sm text-dark-400 mt-1">{doc.sections.length} sections</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-xs text-secondary-400 bg-secondary-900/20 px-2 py-1 rounded">
                        <Sparkles size={12} />
                        <span>AI</span>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          doc.status === 'completed' ? 'bg-success-400' : 
                          doc.status === 'generating' ? 'bg-warning-400' : 'bg-error-400'
                        }`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-dark-400">
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>Updated {doc.lastUpdated.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDocumentation(doc.id)}
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleStartCollaborativeEditing(doc.id)}
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        <RefreshCw size={14} className="mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Generation Status */}
      {generating && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center animate-pulse">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-white">Generating Documentation</h4>
                <p className="text-sm text-dark-400">AI is analyzing your codebase and creating comprehensive docs...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repository Connector Modal */}
      <RepositoryConnector
        isOpen={showConnector}
        onClose={() => setShowConnector(false)}
      />

      {/* Version History Modal */}
      {selectedRepo && (
        <VersionHistory
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          repositoryId={selectedRepo}
          repositoryName={repositories.find(r => r.id === selectedRepo)?.name || 'Repository'}
        />
      )}
    </div>
  );
};