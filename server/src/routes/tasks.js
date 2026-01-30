import { Router } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  comments,
  projectMembers,
  projects,
  tasks,
  users,
} from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { isWorkspaceAdmin } from '../lib/permissions.js';

const router = Router();

const stripSensitive = (user) => {
  if (!user) return user;
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

router.get('/:id', async (req, res, next) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.id))
      .limit(1);

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId))
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
              eq(projectMembers.projectId, task.projectId),
              eq(projectMembers.userId, req.user.id)
            )
          )
          .limit(1);

        if (!membership) return res.status(403).json({ message: 'Forbidden' });
      }
    }

    let assignee = null;
    if (task.assigneeId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, task.assigneeId))
        .limit(1);
      assignee = stripSensitive(user || null);
    }

    res.json({ ...task, assignee });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.id))
      .limit(1);

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId))
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
              eq(projectMembers.projectId, task.projectId),
              eq(projectMembers.userId, req.user.id)
            )
          )
          .limit(1);

        if (!membership) return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const updates = req.body;
    if (updates.due_date) updates.due_date = new Date(updates.due_date);
    updates.updatedAt = new Date();

    if (updates.assigneeId) {
      const [existingMember] = await db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, task.projectId),
            eq(projectMembers.userId, updates.assigneeId)
          )
        )
        .limit(1);

      if (!existingMember) {
        const memberId = generateId('pm');
        await db.insert(projectMembers).values({
          id: memberId,
          projectId: task.projectId,
          userId: updates.assigneeId,
        });
      }
    }

    await db.update(tasks).set(updates).where(eq(tasks.id, req.params.id));

    const [updated] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.id));

    res.json(updated || null);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.id))
      .limit(1);

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId))
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
              eq(projectMembers.projectId, task.projectId),
              eq(projectMembers.userId, req.user.id)
            )
          )
          .limit(1);

        if (!membership) return res.status(403).json({ message: 'Forbidden' });
      }
    }

    await db.delete(tasks).where(eq(tasks.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.id))
      .limit(1);

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId))
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
              eq(projectMembers.projectId, task.projectId),
              eq(projectMembers.userId, req.user.id)
            )
          )
          .limit(1);

        if (!membership) return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const taskComments = await db
      .select()
      .from(comments)
      .where(eq(comments.taskId, req.params.id));
    const userIds = taskComments.map((c) => c.userId);
    const userList = userIds.length
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];

    const usersMap = Object.fromEntries(
      userList.map((u) => [u.id, stripSensitive(u)])
    );

    res.json(
      taskComments.map((comment) => ({
        ...comment,
        user: usersMap[comment.userId] || null,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.id))
      .limit(1);

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'ADMIN') {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId))
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
              eq(projectMembers.projectId, task.projectId),
              eq(projectMembers.userId, req.user.id)
            )
          )
          .limit(1);

        if (!membership) return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'content is required' });
    }

    const commentId = generateId('cmt');

    await db.insert(comments).values({
      id: commentId,
      taskId: req.params.id,
      userId: req.user.id,
      content,
    });

    const [created] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    res.status(201).json({
      ...created,
      user: stripSensitive(user) || null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
