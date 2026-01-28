import { createContext, useContext } from 'react';

export const WorkspaceContext = createContext(null);

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      'useWorkspaceContext must be used within WorkspaceProvider'
    );
  }
  return context;
};
