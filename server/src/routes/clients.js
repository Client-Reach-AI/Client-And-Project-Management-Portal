import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, workspaceMembers } from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { isWorkspaceAdmin } from '../lib/permissions.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.user.id)
        )
      );

    if (!membership.length && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const list = await db
      .select()
      .from(clients)
      .where(eq(clients.workspaceId, workspaceId));

    res.json(list);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, req.params.id))
      .limit(1);

    if (!client) return res.status(404).json({ message: 'Client not found' });

    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, client.workspaceId),
          eq(workspaceMembers.userId, req.user.id)
        )
      );

    if (!membership.length && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      workspaceId,
      name,
      company,
      email,
      phone,
      website,
      industry,
      details,
    } = req.body;

    if (!workspaceId || !name) {
      return res
        .status(400)
        .json({ message: 'workspaceId and name are required' });
    }

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, workspaceId));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const clientId = generateId('client');

    await db.insert(clients).values({
      id: clientId,
      workspaceId,
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      website: website || null,
      industry: industry || null,
      details: details || {},
      updatedAt: new Date(),
    });

    const [created] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, req.params.id))
      .limit(1);

    if (!client) return res.status(404).json({ message: 'Client not found' });

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, client.workspaceId));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const updates = {
      ...req.body,
      updatedAt: new Date(),
    };

    await db.update(clients).set(updates).where(eq(clients.id, req.params.id));

    const [updated] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, req.params.id));

    res.json(updated || null);
  } catch (error) {
    next(error);
  }
});

export default router;
