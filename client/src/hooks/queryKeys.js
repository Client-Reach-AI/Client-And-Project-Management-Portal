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

export const clientKeys = {
  list: (workspaceId) => ['clients', workspaceId],
  detail: (id) => ['client', id],
};

export const intakeKeys = {
  list: (workspaceId) => ['clientIntakes', workspaceId],
  lookup: (token) => ['clientIntake', token],
};
