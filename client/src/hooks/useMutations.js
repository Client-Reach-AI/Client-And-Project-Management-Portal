import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addTaskComment,
  addProjectMember,
  createProject,
  createTask,
  createUser,
  createWorkspace,
  deleteTask,
  acceptInvitation,
  sendInvitation,
  fetchUserByEmail,
  login,
  updateProject,
  updateTask,
  updateUser,
  updateWorkspace,
} from '../api';
import { projectKeys, taskKeys, workspaceKeys } from './queryKeys';

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      if (created?.id) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(created.id),
        });
      }
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, payload }) =>
      updateWorkspace(workspaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(variables.workspaceId),
      });
    },
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload, teamMemberEmails = [], teamLeadEmail }) => {
      const uniqueEmails = Array.from(new Set(teamMemberEmails)).filter(
        Boolean
      );

      const teamMemberIds = await Promise.all(
        uniqueEmails.map(async (email) => {
          const existing = await fetchUserByEmail(email);
          if (existing?.id) return existing.id;
          const name = email.split('@')[0];
          const created = await createUser({ name, email });
          return created.id;
        })
      );

      let teamLeadId = null;
      if (teamLeadEmail) {
        const lead = await fetchUserByEmail(teamLeadEmail);
        if (lead?.id) teamLeadId = lead.id;
      }

      const project = await createProject({
        ...payload,
        team_lead: teamLeadId,
      });

      if (teamMemberIds.length) {
        await Promise.all(
          teamMemberIds.map((userId) =>
            addProjectMember(project.id, { userId })
          )
        );
      }

      return project;
    },
    onSuccess: (created, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      const workspaceId = created?.workspaceId || variables?.workspaceId;
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(workspaceId),
        });
      }
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }) => updateProject(projectId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      if (variables?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(variables.workspaceId),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }) => createTask(projectId, payload),
    onSuccess: (created, variables) => {
      if (created?.projectId) {
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(created.projectId),
        });
      }
      if (variables?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(variables.workspaceId),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }) => updateTask(taskId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(variables.taskId),
      });
      if (variables?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(variables.workspaceId),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useDeleteTasks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds }) =>
      Promise.all(taskIds.map((id) => deleteTask(id))),
    onSuccess: (_, variables) => {
      if (variables?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(variables.workspaceId),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useAddTaskComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }) => addTaskComment(taskId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.comments(variables.taskId),
      });
    },
  });
};

export const useSendInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendInvitation,
    onSuccess: (_, variables) => {
      if (variables?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(variables.workspaceId),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useLogin = () =>
  useMutation({
    mutationFn: ({ email, password }) => login({ email, password }),
  });

export const useAddProjectMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, payload, email }) => {
      if (payload?.userId) {
        return addProjectMember(projectId, payload);
      }
      if (!email) {
        throw new Error('User email is required');
      }
      const user = await fetchUserByEmail(email);
      if (!user?.id) {
        throw new Error('User not found');
      }
      return addProjectMember(projectId, { userId: user.id });
    },
    onSuccess: (_, variables) => {
      if (variables?.projectId) {
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(variables.projectId),
        });
      }
      if (variables?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(variables.workspaceId),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }) => updateUser(userId, payload),
    onSuccess: (_, variables) => {
      if (variables?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(variables.workspaceId),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};
