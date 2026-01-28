import { useQuery } from '@tanstack/react-query';
import {
  fetchProjectById,
  fetchTaskById,
  fetchTaskComments,
  fetchWorkspaceById,
  fetchWorkspaces,
  lookupInvitation,
} from '../api';
import { projectKeys, taskKeys, workspaceKeys } from './queryKeys';

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
