import { Router } from 'express';
import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clientIntakes, clients, workspaces } from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { requireAuth } from '../middleware/auth.js';
import { isWorkspaceAdmin } from '../lib/permissions.js';

const router = Router();

const buildIntakeLink = (token) => {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  return `${baseUrl}/client-intake?token=${token}`;
};

router.get('/lookup', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'token is required' });

    const [intake] = await db
      .select()
      .from(clientIntakes)
      .where(eq(clientIntakes.token, token))
      .limit(1);

    if (!intake) return res.status(404).json({ message: 'Intake not found' });
    if (intake.status !== 'OPEN') {
      return res.status(400).json({ message: 'Intake already submitted' });
    }
    if (new Date(intake.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Intake expired' });
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, intake.workspaceId))
      .limit(1);

    const [client] = intake.clientId
      ? await db
          .select()
          .from(clients)
          .where(eq(clients.id, intake.clientId))
          .limit(1)
      : [];

    res.json({
      workspaceId: intake.workspaceId,
      workspaceName: workspace?.name || null,
      clientId: intake.clientId,
      clientName: client?.name || null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/submit', async (req, res, next) => {
  try {
    const { token, payload } = req.body;
    if (!token) return res.status(400).json({ message: 'token is required' });

    const [intake] = await db
      .select()
      .from(clientIntakes)
      .where(eq(clientIntakes.token, token))
      .limit(1);

    if (!intake) return res.status(404).json({ message: 'Intake not found' });
    if (intake.status !== 'OPEN') {
      return res.status(400).json({ message: 'Intake already submitted' });
    }
    if (new Date(intake.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Intake expired' });
    }

    let clientId = intake.clientId || null;

    if (!clientId) {
      const newClientId = generateId('client');
      const name = payload?.clientName || payload?.company || 'Client';

      await db.insert(clients).values({
        id: newClientId,
        workspaceId: intake.workspaceId,
        name,
        company: payload?.company || null,
        email: payload?.email || null,
        phone: payload?.phone || null,
        website: payload?.website || null,
        industry: payload?.industry || null,
        details: {
          source: 'INTAKE',
          intakeId: intake.id,
          projectName: payload?.projectName || null,
          goals: payload?.goals || null,
          budget: payload?.budget || null,
          timeline: payload?.timeline || null,
          targetAudience: payload?.targetAudience || null,
          brandGuidelines: payload?.brandGuidelines || null,
          competitors: payload?.competitors || null,
          successMetrics: payload?.successMetrics || null,
          notes: payload?.notes || null,
        },
        updatedAt: new Date(),
      });

      clientId = newClientId;
    }

    await db
      .update(clientIntakes)
      .set({
        payload: payload || {},
        status: 'SUBMITTED',
        submittedAt: new Date(),
        clientId,
      })
      .where(eq(clientIntakes.id, intake.id));

    res.json({ message: 'Intake submitted', clientId });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, workspaceId));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const list = await db
      .select()
      .from(clientIntakes)
      .where(eq(clientIntakes.workspaceId, workspaceId));

    res.json(list);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { workspaceId, clientId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const admin =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, workspaceId));
    if (!admin) return res.status(403).json({ message: 'Forbidden' });

    const token = crypto.randomBytes(24).toString('hex');
    const intakeId = generateId('intake');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

    await db.insert(clientIntakes).values({
      id: intakeId,
      workspaceId,
      clientId: clientId || null,
      token,
      status: 'OPEN',
      expiresAt,
    });

    const link = buildIntakeLink(token);
    res.status(201).json({ link, token });
  } catch (error) {
    next(error);
  }
});

export default router;
