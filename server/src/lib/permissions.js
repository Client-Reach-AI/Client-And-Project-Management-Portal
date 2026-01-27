import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projectMembers, projects, workspaceMembers } from '../db/schema.js';

export const isWorkspaceAdmin = async (userId, workspaceId) => {
  if (!userId) return false;
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  return member?.role === 'ADMIN';
};

export const getWorkspaceMembership = async (userId) => {
  return db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
};

export const getProjectMemberships = async (userId) => {
  return db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
};

export const getProjectsForUser = async (userId, workspaceId) => {
  const memberships = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const projectIds = memberships.map((m) => m.projectId);
  if (!projectIds.length) return [];

  return db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        inArray(projects.id, projectIds)
      )
    );
};
