import { useQuery } from '@tanstack/react-query';
import {
  fetchProjectById,
  fetchTaskById,
  fetchTaskComments,
  fetchWorkspaceById,
  fetchWorkspaces,
  lookupInvitation,
  fetchClients,
  fetchClientIntakes,
  lookupClientIntake,
} from '../api';
import {
  clientKeys,
  intakeKeys,
  projectKeys,
  taskKeys,
  workspaceKeys,
} from './queryKeys';

export const useWorkspaces = (options = {}) =>
  useQuery({
    queryKey: workspaceKeys.all,
    queryFn: fetchWorkspaces,
    staleTime: 1000 * 30,
    ...options,
  });

export const useWorkspace = (id, options = {}) =>
  useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => fetchWorkspaceById(id),
    enabled: Boolean(id),
    ...options,
  });

export const useProject = (id, options = {}) =>
  useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProjectById(id),
    enabled: Boolean(id),
    ...options,
  });

export const useTask = (id, options = {}) =>
  useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => fetchTaskById(id),
    enabled: Boolean(id),
    ...options,
  });

export const useTaskComments = (id, options = {}) =>
  useQuery({
    queryKey: taskKeys.comments(id),
    queryFn: () => fetchTaskComments(id),
    enabled: Boolean(id),
    refetchInterval: 10000,
    ...options,
  });

export const useInvitationLookup = (token, options = {}) =>
  useQuery({
    queryKey: ['invitation', token],
    queryFn: () => lookupInvitation(token),
    enabled: Boolean(token),
    ...options,
  });

export const useClients = (workspaceId, options = {}) =>
  useQuery({
    queryKey: clientKeys.list(workspaceId),
    queryFn: () => fetchClients(workspaceId),
    enabled: Boolean(workspaceId),
    ...options,
  });

export const useClientIntakes = (workspaceId, options = {}) =>
  useQuery({
    queryKey: intakeKeys.list(workspaceId),
    queryFn: () => fetchClientIntakes(workspaceId),
    enabled: Boolean(workspaceId),
    ...options,
  });

export const useClientIntakeLookup = (token, options = {}) =>
  useQuery({
    queryKey: intakeKeys.lookup(token),
    queryFn: () => lookupClientIntake(token),
    enabled: Boolean(token),
    ...options,
  });
