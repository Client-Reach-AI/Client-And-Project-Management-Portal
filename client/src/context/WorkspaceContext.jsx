import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useWorkspace, useWorkspaces } from '../hooks/useQueries';
import { WorkspaceContext } from './workspaceContext';

export const WorkspaceProvider = ({ children }) => {
  const user = useSelector((state) => state.auth.user);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() =>
    localStorage.getItem('currentWorkspaceId')
  );

  const {
    data: workspaces = [],
    isLoading: workspacesLoading,
    isFetching: workspacesFetching,
  } = useWorkspaces({
    enabled: Boolean(user),
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
  } = useWorkspace(currentWorkspaceId, {
    enabled: Boolean(currentWorkspaceId && user),
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
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

    if (workspacesFetching || !workspaceError) return;
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
    }),
    [
      workspaces,
      currentWorkspace,
      currentWorkspaceId,
      workspacesLoading,
      workspaceLoading,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
