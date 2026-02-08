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
  const baseUrl = process.env.ONBOARDING_PORTAL_URL || 'http://localhost:3000';
  return `${baseUrl}/intake?token=${token}`;
};

const createIntakeRecord = async ({ workspaceId, clientId = null }) => {
  const token = crypto.randomBytes(24).toString('hex');
  const intakeId = generateId('intake');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await db.insert(clientIntakes).values({
    id: intakeId,
    workspaceId,
    clientId,
    token,
    status: 'OPEN',
    expiresAt,
  });

  return { token, link: buildIntakeLink(token) };
};

router.post('/public', async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const result = await createIntakeRecord({ workspaceId });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

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

    const intakeSource = payload?.source === 'PUBLIC' ? 'PUBLIC' : 'INTAKE';

    if (!clientId) {
      const newClientId = generateId('client');
      const name =
        payload?.contact_name ||
        payload?.clientName ||
        payload?.company_name ||
        payload?.company ||
        'Client';
      const website =
        payload?.company_website ||
        payload?.website ||
        payload?.service_responses?.current_url ||
        null;

      await db.insert(clients).values({
        id: newClientId,
        workspaceId: intake.workspaceId,
        name,
        company: payload?.company_name || payload?.company || null,
        contactName: payload?.contact_name || null,
        contactRole: payload?.contact_role || null,
        email: payload?.email || null,
        phone: payload?.phone || null,
        website,
        industry: payload?.industry || null,
        serviceType: payload?.service_type || null,
        businessDetails: payload?.business_details || {},
        serviceResponses: payload?.service_responses || {},
        uploadedFiles: payload?.uploaded_files || [],
        calendlyEventId: payload?.calendly_event_id || null,
        details: {
          source: intakeSource,
          intakeId: intake.id,
          serviceType: payload?.service_type || null,
          contactRole: payload?.contact_role || null,
          businessDetails: payload?.business_details || null,
          serviceResponses: payload?.service_responses || null,
          uploadedFiles: payload?.uploaded_files || null,
          calendlyEventId: payload?.calendly_event_id || null,
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
        serviceType: payload?.service_type || null,
        companyName: payload?.company_name || null,
        contactName: payload?.contact_name || null,
        contactRole: payload?.contact_role || null,
        industry: payload?.industry || null,
        businessDetails: payload?.business_details || {},
        serviceResponses: payload?.service_responses || {},
        uploadedFiles: payload?.uploaded_files || [],
        calendlyEventId: payload?.calendly_event_id || null,
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

    const result = await createIntakeRecord({
      workspaceId,
      clientId: clientId || null,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
