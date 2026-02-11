import { Router } from 'express';
import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { messages, users } from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { getWorkspaceMember } from '../lib/permissions.js';

const router = Router();

const stripSensitive = (user) => {
  if (!user) return user;
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const ensureWorkspaceAccess = async ({ workspaceId, user }) => {
  if (user.role === 'ADMIN') return true;
  const member = await getWorkspaceMember(user.id, workspaceId);
  return Boolean(member);
};

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const allowed = await ensureWorkspaceAccess({
      workspaceId,
      user: req.user,
    });
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const list = await db
      .select()
      .from(messages)
      .where(eq(messages.workspaceId, workspaceId))
      .orderBy(asc(messages.createdAt));

    const senderIds = Array.from(
      new Set(list.map((message) => message.senderId).filter(Boolean))
    );

    let senderMap = {};
    if (senderIds.length) {
      const senders = await db
        .select()
        .from(users)
        .where(inArray(users.id, senderIds));

      senderMap = senders.reduce((acc, user) => {
        acc[user.id] = stripSensitive(user);
        return acc;
      }, {});
    }

    const payload = list.map((message) => ({
      ...message,
      sender: senderMap[message.senderId] || null,
    }));

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { workspaceId, body } = req.body;
    if (!workspaceId || !body?.trim()) {
      return res
        .status(400)
        .json({ message: 'workspaceId and body are required' });
    }

    const allowed = await ensureWorkspaceAccess({
      workspaceId,
      user: req.user,
    });
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const messageId = generateId('msg');
    const trimmedBody = body.trim();

    await db.insert(messages).values({
      id: messageId,
      workspaceId,
      senderId: req.user.id,
      body: trimmedBody,
    });

    const [created] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    res.status(201).json({
      ...created,
      sender: stripSensitive(sender || null),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
