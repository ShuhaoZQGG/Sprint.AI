import { useState, useEffect } from 'react';
import { GeneratedDocumentation } from '../services/docGenerator';
import { DocumentationVersion, DocumentationSearchResult, documentationService } from '../services/documentationService';
import { useAuth } from '../components/auth/AuthProvider';
import toast from 'react-hot-toast';

export const useDocumentation = () => {
  const [documentation, setDocumentation] = useState<GeneratedDocumentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setDocumentation([]);
      setLoading(false);
      return;
    }

    const fetchDocumentation = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await documentationService.getDocumentation();
        setDocumentation(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documentation';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentation();

    // Subscribe to real-time updates
    const subscription = documentationService.subscribeToDocumentation((updatedDocs) => {
      setDocumentation(updatedDocs);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const getDocumentationByRepository = async (repositoryId: string) => {
    try {
      return await documentationService.getDocumentationByRepository(repositoryId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repository documentation';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getDocumentationById = async (id: string) => {
    try {
      return await documentationService.getDocumentationById(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documentation';
      toast.error(errorMessage);
      throw err;
    }
  };

  const storeDocumentation = async (
    repositoryId: string,
    doc: Omit<GeneratedDocumentation, 'id'>
  ) => {
    try {
      const newDoc = await documentationService.storeDocumentation(repositoryId, doc);
      setDocumentation(prev => [newDoc, ...prev]);
      toast.success('Documentation saved successfully!');
      return newDoc;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store documentation';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateDocumentation = async (
    id: string,
    updates: Partial<GeneratedDocumentation>
  ) => {
    try {
      const updatedDoc = await documentationService.updateDocumentation(id, updates);
      setDocumentation(prev => 
        prev.map(doc => doc.id === id ? updatedDoc : doc)
      );
      toast.success('Documentation updated successfully!');
      return updatedDoc;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update documentation';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteDocumentation = async (id: string) => {
    try {
      await documentationService.deleteDocumentation(id);
      setDocumentation(prev => prev.filter(doc => doc.id !== id));
      toast.success('Documentation deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete documentation';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getVersionHistory = async (repositoryId: string): Promise<DocumentationVersion[]> => {
    try {
      return await documentationService.getVersionHistory(repositoryId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch version history';
      toast.error(errorMessage);
      throw err;
    }
  };

  const searchDocumentation = async (query: string): Promise<DocumentationSearchResult[]> => {
    try {
      return await documentationService.searchDocumentation(query);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search documentation';
      toast.error(errorMessage);
      throw err;
    }
  };

  const getLatestDocumentation = async (repositoryId: string) => {
    try {
      return await documentationService.getLatestDocumentation(repositoryId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch latest documentation';
      toast.error(errorMessage);
      throw err;
    }
  };

  const createNewVersion = async (
    originalId: string,
    changes: Partial<GeneratedDocumentation>,
    changeLog?: string
  ) => {
    try {
      const newVersion = await documentationService.createNewVersion(originalId, changes, changeLog);
      setDocumentation(prev => [newVersion, ...prev]);
      toast.success('New documentation version created!');
      return newVersion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create new version';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    documentation,
    loading,
    error,
    getDocumentationByRepository,
    getDocumentationById,
    storeDocumentation,
    updateDocumentation,
    deleteDocumentation,
    getVersionHistory,
    searchDocumentation,
    getLatestDocumentation,
    createNewVersion,
    refetch: () => {
      if (user) {
        documentationService.getDocumentation().then(setDocumentation).catch(console.error);
      }
    },
  };
};