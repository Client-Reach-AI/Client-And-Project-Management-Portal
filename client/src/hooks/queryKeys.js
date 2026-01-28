export const workspaceKeys = {
  all: ['workspaces'],
  detail: (id) => ['workspace', id],
};

export const projectKeys = {
  detail: (id) => ['project', id],
};

export const taskKeys = {
  detail: (id) => ['task', id],
  comments: (id) => ['taskComments', id],
};
