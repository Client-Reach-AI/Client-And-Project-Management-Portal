import { Router } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  workspaces,
  workspaceMembers,
  projects,
  projectMembers,
  tasks,
  clients,
  comments,
  invitations,
  clientIntakes,
} from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { getProjectsForUser, isWorkspaceAdmin } from '../lib/permissions.js';

const router = Router();

const stripSensitive = (user) => {
  if (!user) return user;
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const getUniqueWorkspaceSlug = async (rawSlug) => {
  const base = rawSlug.trim().toLowerCase();
  let candidate = base;
  let counter = 1;

  while (true) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (!existing) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
};

const buildWorkspacePayload = async (workspaceId, user) => {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) return null;

  const members = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  let projectList = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  const clientList = await db
    .select()
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));

  if (user?.role !== 'ADMIN') {
    const admin = await isWorkspaceAdmin(user.id, workspaceId);
    if (!admin) {
      projectList = await getProjectsForUser(user.id, workspaceId);
    }
  }

  const projectIds = projectList.map((p) => p.id);

  const projectMemberList = projectIds.length
    ? await db
        .select()
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds))
    : [];

  const taskList = projectIds.length
    ? await db.select().from(tasks).where(inArray(tasks.projectId, projectIds))
    : [];

  const userIds = new Set([
    workspace.ownerId,
    ...members.map((m) => m.userId),
    ...projectList.map((p) => p.team_lead).filter(Boolean),
    ...projectMemberList.map((m) => m.userId),
    ...taskList.map((t) => t.assigneeId).filter(Boolean),
  ]);

  const userList = userIds.size
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, Array.from(userIds)))
    : [];

  const usersMap = Object.fromEntries(
    userList.map((u) => [u.id, stripSensitive(u)])
  );

  const clientsMap = Object.fromEntries(
    clientList.map((client) => [client.id, client])
  );

  const projectsWithDetails = projectList.map((project) => {
    const projectTasks = taskList
      .filter((task) => task.projectId === project.id)
      .map((task) => ({
        ...task,
        assignee: task.assigneeId ? usersMap[task.assigneeId] : null,
        comments: [],
      }));

    const projectMemberDetails = projectMemberList
      .filter((member) => member.projectId === project.id)
      .map((member) => ({
        ...member,
        user: usersMap[member.userId] || null,
      }));

    return {
      ...project,
      client: project.clientId ? clientsMap[project.clientId] || null : null,
      tasks: projectTasks,
      members: projectMemberDetails,
    };
  });

  const memberDetails = members.map((member) => ({
    ...member,
    user: usersMap[member.userId] || null,
  }));

  return {
    ...workspace,
    owner: usersMap[workspace.ownerId] || null,
    members: memberDetails,
    projects: projectsWithDetails,
    clients: clientList,
  };
};

router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      const workspaceList = await db.select().from(workspaces);
      const workspaceIds = workspaceList.map((w) => w.id);
      const memberList = workspaceIds.length
        ? await db
            .select()
            .from(workspaceMembers)
            .where(inArray(workspaceMembers.workspaceId, workspaceIds))
        : [];

      const memberCounts = memberList.reduce((acc, member) => {
        acc[member.workspaceId] = (acc[member.workspaceId] || 0) + 1;
        return acc;
      }, {});

      return res.json(
        workspaceList.map((workspace) => ({
          ...workspace,
          memberCount: memberCounts[workspace.id] || 0,
        }))
      );
    }

    const memberships = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, req.user.id));

    const workspaceIds = memberships.map((m) => m.workspaceId);
    if (!workspaceIds.length) return res.json([]);

    const workspaceList = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, workspaceIds));

    const memberList = workspaceIds.length
      ? await db
          .select()
          .from(workspaceMembers)
          .where(inArray(workspaceMembers.workspaceId, workspaceIds))
      : [];

    const memberCounts = memberList.reduce((acc, member) => {
      acc[member.workspaceId] = (acc[member.workspaceId] || 0) + 1;
      return acc;
    }, {});

    res.json(
      workspaceList.map((workspace) => ({
        ...workspace,
        memberCount: memberCounts[workspace.id] || 0,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, req.params.id),
            eq(workspaceMembers.userId, req.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const payload = await buildWorkspacePayload(req.params.id, req.user);
    if (!payload)
      return res.status(404).json({ message: 'Workspace not found' });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, slug, description, image_url } = req.body;

    if (!name || !slug || !slug.trim()) {
      return res.status(400).json({ message: 'name and slug are required' });
    }

    const workspaceId = generateId('org');
    const memberId = generateId('wm');
    const uniqueSlug = await getUniqueWorkspaceSlug(slug);

    await db.insert(workspaces).values({
      id: workspaceId,
      name,
      slug: uniqueSlug,
      ownerId: req.user.id,
      description: description || null,
      image_url: image_url || null,
    });

    await db.insert(workspaceMembers).values({
      id: memberId,
      workspaceId,
      userId: req.user.id,
      role: 'ADMIN',
      message: null,
    });

    const payload = await buildWorkspacePayload(workspaceId, req.user);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, req.params.id));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const { name, slug, description, image_url, settings } = req.body;
    const updates = {
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(image_url !== undefined ? { image_url } : {}),
      ...(settings !== undefined ? { settings } : {}),
      updatedAt: new Date(),
    };

    await db
      .update(workspaces)
      .set(updates)
      .where(eq(workspaces.id, req.params.id));

    const payload = await buildWorkspacePayload(req.params.id, req.user);
    if (!payload)
      return res.status(404).json({ message: 'Workspace not found' });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, req.params.id));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const projectList = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.workspaceId, req.params.id));
    const projectIds = projectList.map((p) => p.id);

    const taskList = projectIds.length
      ? await db
          .select({ id: tasks.id })
          .from(tasks)
          .where(inArray(tasks.projectId, projectIds))
      : [];
    const taskIds = taskList.map((t) => t.id);

    if (taskIds.length) {
      await db.delete(comments).where(inArray(comments.taskId, taskIds));
    }

    if (projectIds.length) {
      await db
        .delete(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds));
      await db.delete(tasks).where(inArray(tasks.projectId, projectIds));
    }

    await db
      .delete(invitations)
      .where(eq(invitations.workspaceId, req.params.id));
    await db
      .delete(clientIntakes)
      .where(eq(clientIntakes.workspaceId, req.params.id));
    await db.delete(clients).where(eq(clients.workspaceId, req.params.id));
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, req.params.id));
    await db.delete(projects).where(eq(projects.workspaceId, req.params.id));
    await db.delete(workspaces).where(eq(workspaces.id, req.params.id));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members', async (req, res, next) => {
  try {
    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, req.params.id));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const { userId, role, message } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ message: 'userId and role are required' });
    }

    const memberId = generateId('wm');

    await db.insert(workspaceMembers).values({
      id: memberId,
      workspaceId: req.params.id,
      userId,
      role,
      message: message || null,
    });

    const payload = await buildWorkspacePayload(req.params.id, req.user);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
