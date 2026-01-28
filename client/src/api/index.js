import { apiFetch } from './client';

export const login = async (payload) =>
  apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchWorkspaces = async () => apiFetch('/api/workspaces');

export const fetchWorkspaceById = async (id) =>
  apiFetch(`/api/workspaces/${id}`);

export const createWorkspace = async (payload) =>
  apiFetch('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateWorkspace = async (id, payload) =>
  apiFetch(`/api/workspaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const createProject = async (payload) =>
  apiFetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchProjectById = async (id) => apiFetch(`/api/projects/${id}`);

export const updateProject = async (id, payload) =>
  apiFetch(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const createTask = async (projectId, payload) =>
  apiFetch(`/api/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTask = async (taskId, payload) =>
  apiFetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteTask = async (taskId) =>
  apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });

export const fetchTaskComments = async (taskId) =>
  apiFetch(`/api/tasks/${taskId}/comments`);

export const fetchTaskById = async (taskId) => apiFetch(`/api/tasks/${taskId}`);

export const addTaskComment = async (taskId, payload) =>
  apiFetch(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchUserByEmail = async (email) =>
  apiFetch(`/api/users?email=${encodeURIComponent(email)}`);

export const createUser = async (payload) =>
  apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateUser = async (id, payload) =>
  apiFetch(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const addWorkspaceMember = async (workspaceId, payload) =>
  apiFetch(`/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const addProjectMember = async (projectId, payload) =>
  apiFetch(`/api/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const sendInvitation = async (payload) =>
  apiFetch('/api/invitations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const lookupInvitation = async (token) =>
  apiFetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`);

export const acceptInvitation = async (payload) =>
  apiFetch('/api/invitations/accept', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const declineInvitation = async (payload) =>
  apiFetch('/api/invitations/decline', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
