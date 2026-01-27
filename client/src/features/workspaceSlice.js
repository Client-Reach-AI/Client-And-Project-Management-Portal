import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  addProjectMember,
  addWorkspaceMember,
  createWorkspace,
  createProject,
  createTask,
  deleteTask as deleteTaskRequest,
  fetchWorkspaceById,
  fetchWorkspaces,
  updateProject,
  updateWorkspace as updateWorkspaceRequest,
  updateTask as updateTaskRequest,
} from '../api';

export const loadWorkspaces = createAsyncThunk('workspace/load', async () => {
  const list = await fetchWorkspaces();
  const storedId = localStorage.getItem('currentWorkspaceId');
  const hasStored = storedId && list.some((w) => w.id === storedId);
  const currentId = hasStored ? storedId : list[0]?.id || null;
  if (currentId) {
    localStorage.setItem('currentWorkspaceId', currentId);
  }
  const currentWorkspace = currentId
    ? await fetchWorkspaceById(currentId)
    : null;
  return { list, currentWorkspace };
});

export const loadWorkspaceById = createAsyncThunk(
  'workspace/loadById',
  async (workspaceId) => {
    const workspace = await fetchWorkspaceById(workspaceId);
    return workspace;
  }
);

export const createProjectThunk = createAsyncThunk(
  'workspace/createProject',
  async ({ workspaceId, payload }) => {
    const project = await createProject(payload);
    if (payload?.team_members?.length) {
      await Promise.all(
        payload.team_members.map((userId) =>
          addProjectMember(project.id, { userId })
        )
      );
    }
    const updated = await fetchWorkspaceById(workspaceId);
    return updated;
  }
);

export const createWorkspaceThunk = createAsyncThunk(
  'workspace/createWorkspace',
  async (payload) => {
    const created = await createWorkspace(payload);
    const list = await fetchWorkspaces();
    return { list, currentWorkspace: created };
  }
);

export const updateProjectThunk = createAsyncThunk(
  'workspace/updateProject',
  async ({ workspaceId, projectId, payload }) => {
    await updateProject(projectId, payload);
    return fetchWorkspaceById(workspaceId);
  }
);

export const updateWorkspaceThunk = createAsyncThunk(
  'workspace/updateWorkspace',
  async ({ workspaceId, payload }) => {
    await updateWorkspaceRequest(workspaceId, payload);
    return fetchWorkspaceById(workspaceId);
  }
);

export const createTaskThunk = createAsyncThunk(
  'workspace/createTask',
  async ({ workspaceId, projectId, payload }) => {
    await createTask(projectId, payload);
    return fetchWorkspaceById(workspaceId);
  }
);

export const updateTaskThunk = createAsyncThunk(
  'workspace/updateTask',
  async ({ workspaceId, taskId, payload }) => {
    await updateTaskRequest(taskId, payload);
    return fetchWorkspaceById(workspaceId);
  }
);

export const deleteTasksThunk = createAsyncThunk(
  'workspace/deleteTasks',
  async ({ workspaceId, taskIds }) => {
    await Promise.all(taskIds.map((id) => deleteTaskRequest(id)));
    return fetchWorkspaceById(workspaceId);
  }
);

export const addWorkspaceMemberThunk = createAsyncThunk(
  'workspace/addWorkspaceMember',
  async ({ workspaceId, payload }) => {
    await addWorkspaceMember(workspaceId, payload);
    return fetchWorkspaceById(workspaceId);
  }
);

export const addProjectMemberThunk = createAsyncThunk(
  'workspace/addProjectMember',
  async ({ workspaceId, projectId, payload }) => {
    await addProjectMember(projectId, payload);
    return fetchWorkspaceById(workspaceId);
  }
);

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  loading: true,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },
    setCurrentWorkspace: (state, action) => {
      localStorage.setItem('currentWorkspaceId', action.payload);
      state.currentWorkspace =
        state.workspaces.find((w) => w.id === action.payload) || null;
    },
    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);

      // set current workspace to the new workspace
      if (state.currentWorkspace?.id !== action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },
    updateWorkspace: (state, action) => {
      state.workspaces = state.workspaces.map((w) =>
        w.id === action.payload.id ? action.payload : w
      );

      // if current workspace is updated, set it to the updated workspace
      if (state.currentWorkspace?.id === action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },
    deleteWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter(
        (w) => w._id !== action.payload
      );
    },
    addProject: (state, action) => {
      state.currentWorkspace.projects.push(action.payload);
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? { ...w, projects: w.projects.concat(action.payload) }
          : w
      );
    },
    addTask: (state, action) => {
      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) => {
          if (p.id === action.payload.projectId) {
            p.tasks.push(action.payload);
          }
          return p;
        }
      );

      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? { ...p, tasks: p.tasks.concat(action.payload) }
                  : p
              ),
            }
          : w
      );
    },
    updateTask: (state, action) => {
      state.currentWorkspace.projects.map((p) => {
        if (p.id === action.payload.projectId) {
          p.tasks = p.tasks.map((t) =>
            t.id === action.payload.id ? action.payload : t
          );
        }
      });
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t
                      ),
                    }
                  : p
              ),
            }
          : w
      );
    },
    deleteTask: (state, action) => {
      state.currentWorkspace.projects.map((p) => {
        p.tasks = p.tasks.filter((t) => !action.payload.includes(t.id));
        return p;
      });
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.filter(
                        (t) => !action.payload.includes(t.id)
                      ),
                    }
                  : p
              ),
            }
          : w
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWorkspaces.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload.list;
        state.currentWorkspace = action.payload.currentWorkspace;
      })
      .addCase(loadWorkspaces.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadWorkspaceById.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadWorkspaceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWorkspace = action.payload;
        if (action.payload) {
          state.workspaces = state.workspaces.map((w) =>
            w.id === action.payload.id ? action.payload : w
          );
        }
      })
      .addCase(loadWorkspaceById.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createWorkspaceThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(createWorkspaceThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload.list;
        state.currentWorkspace = action.payload.currentWorkspace;
        if (action.payload.currentWorkspace?.id) {
          localStorage.setItem(
            'currentWorkspaceId',
            action.payload.currentWorkspace.id
          );
        }
      })
      .addCase(createWorkspaceThunk.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateWorkspaceThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateWorkspaceThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWorkspace = action.payload;
        state.workspaces = state.workspaces.map((w) =>
          w.id === action.payload.id ? action.payload : w
        );
      })
      .addCase(updateWorkspaceThunk.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createProjectThunk.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(updateProjectThunk.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(createTaskThunk.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(updateTaskThunk.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(deleteTasksThunk.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(addWorkspaceMemberThunk.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(addProjectMemberThunk.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      });
  },
});

export const {
  setWorkspaces,
  setCurrentWorkspace,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addProject,
  addTask,
  updateTask,
  deleteTask,
} = workspaceSlice.actions;
export default workspaceSlice.reducer;
