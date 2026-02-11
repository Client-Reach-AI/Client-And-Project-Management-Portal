import { Router } from 'express';
import crypto from 'crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  clientIntakes,
  clients,
  invitations,
  projectMembers,
  projects,
  tasks,
  users,
  workspaces,
  workspaceMembers,
} from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import {
  getProjectsForUser,
  getWorkspaceMember,
  isWorkspaceAdmin,
} from '../lib/permissions.js';

const router = Router();

const stripSensitive = (user) => {
  if (!user) return user;
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const buildInviteLink = (token) => {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  return `${baseUrl}/accept-invite?token=${token}`;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const getUniqueWorkspaceSlug = async (rawSlug) => {
  const base = slugify(rawSlug || 'client-portal') || 'client-portal';
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

const ensureClientPortal = async ({ client, sourceProject, ownerId }) => {
  let portalWorkspaceId = client.portalWorkspaceId || null;

  if (!portalWorkspaceId) {
    const workspaceId = generateId('ws');
    const workspaceName = `${client.name || client.company || 'Client'} Portal`;
    const slug = await getUniqueWorkspaceSlug(workspaceName);

    await db.insert(workspaces).values({
      id: workspaceId,
      name: workspaceName,
      slug,
      description: `Client portal for ${client.name || client.company || 'Client'}.`,
      settings: {
        isClientPortal: true,
        sourceWorkspaceId: sourceProject.workspaceId,
        clientId: client.id,
      },
      ownerId,
      updatedAt: new Date(),
    });

    const memberId = generateId('wm');
    await db.insert(workspaceMembers).values({
      id: memberId,
      workspaceId,
      userId: ownerId,
      role: 'ADMIN',
      message: 'Portal owner',
      updatedAt: new Date(),
    });

    portalWorkspaceId = workspaceId;

    await db
      .update(clients)
      .set({ portalWorkspaceId, updatedAt: new Date() })
      .where(eq(clients.id, client.id));
  }

  let [portalProject] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, portalWorkspaceId),
        eq(projects.sourceProjectId, sourceProject.id)
      )
    )
    .limit(1);

  if (!portalProject) {
    const portalProjectId = generateId('proj');
    await db.insert(projects).values({
      id: portalProjectId,
      workspaceId: portalWorkspaceId,
      clientId: null,
      sourceProjectId: sourceProject.id,
      name: sourceProject.name,
      description: sourceProject.description || null,
      priority: sourceProject.priority,
      status: sourceProject.status,
      start_date: sourceProject.start_date || null,
      end_date: sourceProject.end_date || null,
      team_lead: null,
      progress: sourceProject.progress || 0,
      updatedAt: new Date(),
    });

    const sourceTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, sourceProject.id));

    if (sourceTasks.length) {
      await db.insert(tasks).values(
        sourceTasks.map((task) => ({
          id: generateId('task'),
          projectId: portalProjectId,
          sourceTaskId: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          type: task.type,
          priority: task.priority,
          assigneeId: null,
          due_date: task.due_date || null,
          updatedAt: new Date(),
        }))
      );
    }

    portalProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, portalProjectId))
      .limit(1)
      .then((rows) => rows[0] || null);
  }

  if (portalProject?.id && client.portalProjectId !== portalProject.id) {
    await db
      .update(clients)
      .set({ portalProjectId: portalProject.id, updatedAt: new Date() })
      .where(eq(clients.id, client.id));
  }

  let inviteLink = null;

  if (client.email) {
    const [existingInvite] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, client.email.toLowerCase()),
          eq(invitations.workspaceId, portalWorkspaceId),
          eq(invitations.role, 'CLIENT'),
          eq(invitations.acceptedAt, null)
        )
      )
      .limit(1);

    if (existingInvite) {
      inviteLink = buildInviteLink(existingInvite.token);
    } else {
      const token = crypto.randomBytes(24).toString('hex');
      const inviteId = generateId('invite');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      await db.insert(invitations).values({
        id: inviteId,
        email: client.email.toLowerCase(),
        token,
        role: 'CLIENT',
        workspaceId: portalWorkspaceId,
        projectId: null,
        invitedBy: ownerId,
        expiresAt,
      });

      inviteLink = buildInviteLink(token);
    }
  }

  return {
    workspaceId: portalWorkspaceId,
    projectId: portalProject?.id || null,
    inviteLink,
  };
};

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (workspaceId) {
      if (req.user.role === 'CLIENT') {
        const member = await getWorkspaceMember(req.user.id, workspaceId);
        if (!member) return res.status(403).json({ message: 'Forbidden' });
        const items = await db
          .select()
          .from(projects)
          .where(eq(projects.workspaceId, workspaceId));
        return res.json(items);
      }
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
    if (req.user.role === 'CLIENT') {
      return res.json([]);
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

    if (req.user.role === 'CLIENT') {
      const member = await getWorkspaceMember(req.user.id, project.workspaceId);
      if (!member) return res.status(403).json({ message: 'Forbidden' });
    } else if (req.user.role !== 'ADMIN') {
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
      createClientPortal,
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

    let clientPortal = null;
    if (created && clientId && createClientPortal) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (client) {
        clientPortal = await ensureClientPortal({
          client,
          sourceProject: created,
          ownerId: req.user.id,
        });
      }
    }

    res.status(201).json({ ...created, clientPortal });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user.role === 'CLIENT') {
      return res.status(403).json({ message: 'Forbidden' });
    }
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

    if (updated) {
      const [portalProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.sourceProjectId, updated.id))
        .limit(1);

      if (portalProject) {
        const portalUpdates = {};
        const allowed = [
          'name',
          'description',
          'priority',
          'status',
          'start_date',
          'end_date',
          'progress',
        ];

        allowed.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(updates, key)) {
            portalUpdates[key] = updates[key];
          }
        });

        if (Object.keys(portalUpdates).length) {
          portalUpdates.updatedAt = new Date();
          await db
            .update(projects)
            .set(portalUpdates)
            .where(eq(projects.id, portalProject.id));
        }
      }
    }

    res.json(updated || null);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role === 'CLIENT') {
      return res.status(403).json({ message: 'Forbidden' });
    }
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

    const [portalProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.sourceProjectId, req.params.id))
      .limit(1);

    if (portalProject) {
      await db.delete(tasks).where(eq(tasks.projectId, portalProject.id));
      await db.delete(projects).where(eq(projects.id, portalProject.id));
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
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, req.params.id))
      .limit(1);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role === 'CLIENT') {
      const member = await getWorkspaceMember(req.user.id, project.workspaceId);
      if (!member) return res.status(403).json({ message: 'Forbidden' });
    } else if (req.user.role !== 'ADMIN') {
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
    if (req.user.role === 'CLIENT') {
      return res.status(403).json({ message: 'Forbidden' });
    }

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

    const [portalProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.sourceProjectId, req.params.id))
      .limit(1);

    if (portalProject && created) {
      await db.insert(tasks).values({
        id: generateId('task'),
        projectId: portalProject.id,
        sourceTaskId: created.id,
        title: created.title,
        description: created.description,
        status: created.status,
        type: created.type,
        priority: created.priority,
        assigneeId: null,
        due_date: created.due_date || null,
        updatedAt: new Date(),
      });
    }
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/client-invite', async (req, res, next) => {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, req.params.id))
      .limit(1);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, project.workspaceId));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    if (!project.clientId) {
      return res.status(400).json({ message: 'Project has no client' });
    }

    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, project.clientId))
      .limit(1);

    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (!client.email) {
      return res.status(400).json({ message: 'Client email is required' });
    }

    const portal = await ensureClientPortal({
      client,
      sourceProject: project,
      ownerId: req.user.id,
    });

    if (!portal.inviteLink) {
      return res.status(400).json({ message: 'Unable to create invite link' });
    }

    res.json({ inviteLink: portal.inviteLink });
  } catch (error) {
    next(error);
  }
});

export default router;
