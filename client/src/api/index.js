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

export const deleteWorkspace = async (id) =>
  apiFetch(`/api/workspaces/${id}`, { method: 'DELETE' });

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

export const createProjectClientInvite = async (projectId) =>
  apiFetch(`/api/projects/${projectId}/client-invite`, {
    method: 'POST',
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

export const fetchClients = async (workspaceId) =>
  apiFetch(`/api/clients?workspaceId=${encodeURIComponent(workspaceId)}`);

export const createClient = async (payload) =>
  apiFetch('/api/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateClient = async (id, payload) =>
  apiFetch(`/api/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const fetchClientIntakes = async (workspaceId) =>
  apiFetch(
    `/api/client-intakes?workspaceId=${encodeURIComponent(workspaceId)}`
  );

export const createClientIntake = async (payload) =>
  apiFetch('/api/client-intakes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createPublicClientIntake = async (payload) =>
  apiFetch('/api/client-intakes/public', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const lookupClientIntake = async (token) =>
  apiFetch(`/api/client-intakes/lookup?token=${encodeURIComponent(token)}`);

export const submitClientIntake = async (payload) =>
  apiFetch('/api/client-intakes/submit', {
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

export const fetchSharedFiles = async ({
  workspaceId,
  clientId,
  projectId,
} = {}) => {
  const params = new URLSearchParams();
  if (workspaceId) params.set('workspaceId', workspaceId);
  if (clientId) params.set('clientId', clientId);
  if (projectId) params.set('projectId', projectId);
  return apiFetch(`/api/files?${params.toString()}`);
};

export const createSharedFile = async (payload) =>
  apiFetch('/api/files', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createFileSignature = async (payload) =>
  apiFetch('/api/files/signature', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
