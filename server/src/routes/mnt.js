import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { mntPeople, sharedFiles, workspaceMembers } from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { isWorkspaceAdmin } from '../lib/permissions.js';

const router = Router();

const getMembership = async (workspaceId, userId) => {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  return membership || null;
};

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const membership = await getMembership(workspaceId, req.user.id);
    const isAdmin = req.user.role === 'ADMIN' || membership?.role === 'ADMIN';
    if (!isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const people = await db
      .select()
      .from(mntPeople)
      .where(eq(mntPeople.workspaceId, workspaceId))
      .orderBy(desc(mntPeople.createdAt));

    res.json(people);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { workspaceId, fullName, email, phone, status, notes, details } =
      req.body || {};

    if (!workspaceId || !fullName?.trim()) {
      return res
        .status(400)
        .json({ message: 'workspaceId and fullName are required' });
    }

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, workspaceId));
    if (!admin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const mntId = generateId('mnt');
    await db.insert(mntPeople).values({
      id: mntId,
      workspaceId,
      fullName: fullName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      status: status || 'ACTIVE',
      notes: notes?.trim() || null,
      details: details || {},
      updatedAt: new Date(),
    });

    const [created] = await db
      .select()
      .from(mntPeople)
      .where(eq(mntPeople.id, mntId))
      .limit(1);

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const [record] = await db
      .select()
      .from(mntPeople)
      .where(eq(mntPeople.id, req.params.id))
      .limit(1);

    if (!record) {
      return res.status(404).json({ message: 'MNT person not found' });
    }

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, record.workspaceId));
    if (!admin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updates = {
      ...req.body,
      updatedAt: new Date(),
    };

    if (typeof updates.fullName === 'string') {
      updates.fullName = updates.fullName.trim();
      if (!updates.fullName) {
        return res.status(400).json({ message: 'fullName cannot be empty' });
      }
    }

    if (typeof updates.email === 'string') {
      updates.email = updates.email.trim() || null;
    }

    if (typeof updates.phone === 'string') {
      updates.phone = updates.phone.trim() || null;
    }

    if (typeof updates.notes === 'string') {
      updates.notes = updates.notes.trim() || null;
    }

    delete updates.id;
    delete updates.workspaceId;
    delete updates.createdAt;

    await db.update(mntPeople).set(updates).where(eq(mntPeople.id, record.id));

    const [updated] = await db
      .select()
      .from(mntPeople)
      .where(eq(mntPeople.id, record.id))
      .limit(1);

    res.json(updated || null);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [record] = await db
      .select()
      .from(mntPeople)
      .where(eq(mntPeople.id, req.params.id))
      .limit(1);

    if (!record) {
      return res.status(404).json({ message: 'MNT person not found' });
    }

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, record.workspaceId));
    if (!admin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.delete(sharedFiles).where(eq(sharedFiles.mntPersonId, record.id));
    await db.delete(mntPeople).where(eq(mntPeople.id, record.id));

    res.json({ id: record.id, deleted: true });
  } catch (error) {
    next(error);
  }
});

export default router;
