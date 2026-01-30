import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useWorkspace, useWorkspaces } from '../hooks/useQueries';
import { WorkspaceContext } from './workspaceContext';

export const WorkspaceProvider = ({ children }) => {
  const user = useSelector((state) => state.auth.user);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() =>
    localStorage.getItem('currentWorkspaceId')
  );
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: workspaces = [],
    isLoading: workspacesLoading,
    isFetching: workspacesFetching,
  } = useWorkspaces({
    enabled: Boolean(user),
    retry: false,
  });

  useEffect(() => {
    if (currentWorkspaceId) {
      localStorage.setItem('currentWorkspaceId', currentWorkspaceId);
    }
  }, [currentWorkspaceId]);

  const {
    data: currentWorkspace,
    isLoading: workspaceLoading,
    isError: workspaceError,
    error: workspaceErrorDetails,
  } = useWorkspace(currentWorkspaceId, {
    enabled: Boolean(currentWorkspaceId && user && workspaces.length),
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.status === 'error' ? false : 10000,
    retry: false,
  });

  useEffect(() => {
    if (!workspaces.length) return;
    if (!currentWorkspaceId) {
      if (workspacesFetching) return;
      const nextId = workspaces[0]?.id || null;
      if (nextId) {
        setCurrentWorkspaceId(nextId);
      }
      return;
    }

    if (workspaces.some((workspace) => workspace.id === currentWorkspaceId)) {
      return;
    }

    if (workspacesFetching) return;
    const nextId = workspaces[0]?.id || null;
    if (nextId) {
      setCurrentWorkspaceId(nextId);
    }
  }, [workspaces, currentWorkspaceId, workspacesFetching, workspaceError]);

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      currentWorkspaceId,
      setCurrentWorkspaceId,
      loading: workspacesLoading || workspaceLoading,
      error: workspaceErrorDetails || null,
      hasError: Boolean(workspaceError),
      searchQuery,
      setSearchQuery,
    }),
    [
      workspaces,
      currentWorkspace,
      currentWorkspaceId,
      workspacesLoading,
      workspaceLoading,
      workspaceErrorDetails,
      workspaceError,
      searchQuery,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
