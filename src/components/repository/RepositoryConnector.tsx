import React, { useState } from 'react';
import { 
  Github, 
  Search, 
  Plus, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Star,
  GitFork,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { githubService } from '../../services/github';
import { codebaseAnalyzer } from '../../services/codebaseAnalyzer';
import { GitHubRepository, RepositoryAnalysis } from '../../types/github';
import { useRepositories } from '../../hooks/useRepositories';
import toast from 'react-hot-toast';

interface RepositoryConnectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RepositoryConnector: React.FC<RepositoryConnectorProps> = ({
  isOpen,
  onClose,
}) => {
  const { addRepository, storeAnalysis, updateRepository } = useRepositories();
  const [step, setStep] = useState<'input' | 'search' | 'analyze' | 'complete'>('input');
  const [repoUrl, setRepoUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlSubmit = async () => {
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const parsed = githubService.parseRepositoryUrl(repoUrl);
      if (!parsed) {
        throw new Error('Invalid GitHub repository URL');
      }

      const repo = await githubService.getRepository(parsed.owner, parsed.repo);
      setSelectedRepo(repo);
      setStep('analyze');
      await analyzeRepository(repo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const results = await githubService.searchRepositories(searchQuery, 10);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepository = async (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setStep('analyze');
    await analyzeRepository(repo);
  };

  const analyzeRepository = async (repo: GitHubRepository) => {
    setLoading(true);
    setError(null);

    try {
      const parsed = githubService.parseRepositoryUrl(repo.html_url);
      if (!parsed) {
        throw new Error('Invalid repository URL');
      }

      // First, add the repository to the database
      const newRepository = await addRepository({
        name: repo.name,
        url: repo.html_url,
        description: repo.description || '',
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count,
      });

      // Then analyze the repository
      const repoAnalysis = await githubService.analyzeRepository(parsed.owner, parsed.repo);
      const codebaseStructure = await codebaseAnalyzer.analyzeCodebase(parsed.owner, parsed.repo);
      
      await updateRepository(newRepository.id, {
        structure: codebaseStructure,
      });

      // Store the analysis results
      await storeAnalysis(newRepository.id, repoAnalysis);
      
      setAnalysis(repoAnalysis);
      setStep('complete');
      toast.success('Repository analyzed and stored successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze repository');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setRepoUrl('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedRepo(null);
    setAnalysis(null);
    setError(null);
    onClose();
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Github className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connect GitHub Repository</h3>
        <p className="text-dark-400">
          Add a repository to analyze its structure and generate documentation
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Repository URL
          </label>
          <Input
            placeholder="https://github.com/owner/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={handleUrlSubmit}
            loading={loading}
            disabled={!repoUrl.trim()}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Repository
          </Button>
          <span className="text-dark-400">or</span>
          <Button
            variant="ghost"
            onClick={() => setStep('search')}
            className="flex-1"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Repositories
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-error-900/20 border border-error-500 rounded-lg">
          <AlertCircle className="w-5 h-5 text-error-400" />
          <span className="text-error-400 text-sm">{error}</span>
        </div>
      )}
    </div>
  );

  const renderSearchStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Search Repositories</h3>
        <Button variant="ghost" size="sm" onClick={() => setStep('input')}>
          Back
        </Button>
      </div>

      <div className="flex space-x-2">
        <Input
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} loading={loading} disabled={!searchQuery.trim()}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {searchResults.map((repo) => (
            <div key={repo.id} className="cursor-pointer" onClick={() => handleSelectRepository(repo)}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-white">{repo.full_name}</h4>
                        <ExternalLink className="w-4 h-4 text-dark-400" />
                      </div>
                      <p className="text-sm text-dark-400 mb-3">
                        {repo.description || 'No description available'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-dark-500">
                        <span>{repo.language}</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>{repo.stargazers_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <GitFork className="w-3 h-3" />
                          <span>{repo.forks_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-error-900/20 border border-error-500 rounded-lg">
          <AlertCircle className="w-5 h-5 text-error-400" />
          <span className="text-error-400 text-sm">{error}</span>
        </div>
      )}
    </div>
  );

  const renderAnalyzeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
          {loading ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <Github className="w-8 h-8 text-white" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {loading ? 'Analyzing Repository' : 'Repository Selected'}
        </h3>
        <p className="text-dark-400">
          {loading 
            ? 'Parsing codebase structure and storing in database...' 
            : `Ready to analyze ${selectedRepo?.name}`
          }
        </p>
      </div>

      {selectedRepo && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center">
                <Github className="w-6 h-6 text-primary-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">{selectedRepo.full_name}</h4>
                <p className="text-sm text-dark-400 mb-3">
                  {selectedRepo.description || 'No description available'}
                </p>
                <div className="flex items-center space-x-4 text-xs text-dark-500">
                  <span>{selectedRepo.language}</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>{selectedRepo.stargazers_count}</span>
                  </div>
                  <span>Updated {new Date(selectedRepo.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-dark-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Adding repository to database...</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-dark-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Fetching repository structure...</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-dark-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing codebase modules...</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-dark-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Storing analysis results...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-error-900/20 border border-error-500 rounded-lg">
          <AlertCircle className="w-5 h-5 text-error-400" />
          <span className="text-error-400 text-sm">{error}</span>
        </div>
      )}
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-success-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Repository Added Successfully!</h3>
        <p className="text-dark-400">
          Your repository has been analyzed and stored in the database
        </p>
      </div>

      {analysis && (
        <Card>
          <CardHeader>
            <h4 className="font-medium text-white">Analysis Summary</h4>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-dark-400">Total Files:</span>
                <span className="text-white ml-2">{analysis.summary.totalFiles}</span>
              </div>
              <div>
                <span className="text-dark-400">Primary Language:</span>
                <span className="text-white ml-2">{analysis.summary.primaryLanguage}</span>
              </div>
              <div>
                <span className="text-dark-400">Contributors:</span>
                <span className="text-white ml-2">{analysis.contributors.length}</span>
              </div>
              <div>
                <span className="text-dark-400">Commit Frequency:</span>
                <span className="text-white ml-2">{analysis.summary.commitFrequency}/week</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex space-x-3">
        <Button onClick={handleClose} className="flex-1">
          Done
        </Button>
        <Button variant="ghost" onClick={() => setStep('input')}>
          Add Another
        </Button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="min-h-[400px] relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
        {step === 'input' && renderInputStep()}
        {step === 'search' && renderSearchStep()}
        {step === 'analyze' && renderAnalyzeStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </Modal>
  );
};