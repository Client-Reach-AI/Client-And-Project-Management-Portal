import { Router } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  clientIntakes,
  clients,
  projectMembers,
  projects,
  tasks,
  users,
} from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { getProjectsForUser, isWorkspaceAdmin } from '../lib/permissions.js';

const router = Router();

const stripSensitive = (user) => {
  if (!user) return user;
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (workspaceId) {
      if (req.user.role === 'ADMIN') {
        const items = await db
          .select()
          .from(projects)
          .where(eq(projects.workspaceId, workspaceId));
        return res.json(items);
      }

      const admin = await isWorkspaceAdmin(req.user.id, workspaceId);
      if (admin) {
        const items = await db
          .select()
          .from(projects)
          .where(eq(projects.workspaceId, workspaceId));
        return res.json(items);
      }

      const items = await getProjectsForUser(req.user.id, workspaceId);
      return res.json(items);
    }
    if (req.user.role === 'ADMIN') {
      const items = await db.select().from(projects);
      return res.json(items);
    }
    return res.json([]);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, req.params.id))
      .limit(1);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role !== 'ADMIN') {
      const admin = await isWorkspaceAdmin(req.user.id, project.workspaceId);
      if (!admin) {
        const [membership] = await db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, project.id),
              eq(projectMembers.userId, req.user.id)
            )
          )
          .limit(1);

        if (!membership) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
    }

    const memberList = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));

    const [client] = project.clientId
      ? await db
          .select()
          .from(clients)
          .where(eq(clients.id, project.clientId))
          .limit(1)
      : [];

    const taskList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, project.id));

    const [latestIntake] = project.clientId
      ? await db
          .select()
          .from(clientIntakes)
          .where(
            and(
              eq(clientIntakes.clientId, project.clientId),
              eq(clientIntakes.status, 'SUBMITTED')
            )
          )
          .orderBy(desc(clientIntakes.submittedAt))
          .limit(1)
      : [];

    const userIds = new Set([
      ...memberList.map((m) => m.userId),
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

    res.json({
      ...project,
      client: client || null,
      clientIntake: latestIntake || null,
      tasks: taskList.map((task) => ({
        ...task,
        assignee: task.assigneeId ? usersMap[task.assigneeId] : null,
        comments: [],
      })),
      members: memberList.map((member) => ({
        ...member,
        user: usersMap[member.userId] || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      workspaceId,
      name,
      description,
      priority,
      status,
      start_date,
      end_date,
      team_lead,
      progress,
      clientId,
    } = req.body;

    if (!workspaceId || !name || !priority || !status) {
      return res.status(400).json({
        message: 'workspaceId, name, priority, and status are required',
      });
    }

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, workspaceId));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    if (clientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (!client || client.workspaceId !== workspaceId) {
        return res.status(400).json({ message: 'Invalid clientId' });
      }
    }

    const projectId = generateId('proj');

    await db.insert(projects).values({
      id: projectId,
      workspaceId,
      clientId: clientId || null,
      name,
      description: description || null,
      priority,
      status,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      team_lead: team_lead || null,
      progress: typeof progress === 'number' ? progress : 0,
      updatedAt: new Date(),
    });

    const [created] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, req.params.id))
        .limit(1);

      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      const admin = await isWorkspaceAdmin(req.user.id, project.workspaceId);
      if (!admin) return res.status(403).json({ message: 'Forbidden' });
    }

    const updates = req.body;

    if (updates.start_date) updates.start_date = new Date(updates.start_date);
    if (updates.end_date) updates.end_date = new Date(updates.end_date);
    updates.updatedAt = new Date();

    await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, req.params.id));

    const [updated] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, req.params.id));

    res.json(updated || null);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, req.params.id))
        .limit(1);

      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      const admin = await isWorkspaceAdmin(req.user.id, project.workspaceId);
      if (!admin) return res.status(403).json({ message: 'Forbidden' });
    }

    await db.delete(projects).where(eq(projects.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, req.params.id))
        .limit(1);

      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      const admin = await isWorkspaceAdmin(req.user.id, project.workspaceId);
      if (!admin) return res.status(403).json({ message: 'Forbidden' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const memberId = generateId('pm');

    await db.insert(projectMembers).values({
      id: memberId,
      projectId: req.params.id,
      userId,
    });

    res.status(201).json({ id: memberId, projectId: req.params.id, userId });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/tasks', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, req.params.id))
        .limit(1);

      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      const admin = await isWorkspaceAdmin(req.user.id, project.workspaceId);
      if (!admin) {
        const [membership] = await db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, project.id),
              eq(projectMembers.userId, req.user.id)
            )
          )
          .limit(1);

        if (!membership) return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const taskList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, req.params.id));

    res.json(taskList);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/tasks', async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, req.params.id))
        .limit(1);

      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      const admin = await isWorkspaceAdmin(req.user.id, project.workspaceId);
      if (!admin) return res.status(403).json({ message: 'Forbidden' });
    }

    const { title, description, status, type, priority, assigneeId, due_date } =
      req.body;

    if (!title || !status || !type || !priority) {
      return res
        .status(400)
        .json({ message: 'title, status, type, and priority are required' });
    }

    const taskId = generateId('task');

    await db.insert(tasks).values({
      id: taskId,
      projectId: req.params.id,
      title,
      description: description || null,
      status,
      type,
      priority,
      assigneeId: assigneeId || null,
      due_date: due_date ? new Date(due_date) : null,
      updatedAt: new Date(),
    });

    if (assigneeId) {
      const [existingMember] = await db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, req.params.id),
            eq(projectMembers.userId, assigneeId)
          )
        )
        .limit(1);

      if (!existingMember) {
        const memberId = generateId('pm');
        await db.insert(projectMembers).values({
          id: memberId,
          projectId: req.params.id,
          userId: assigneeId,
        });
      }
    }

    const [created] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

export default router;
