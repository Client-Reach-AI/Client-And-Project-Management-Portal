import { Router } from 'express';
import crypto from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  clients,
  projects,
  sharedFiles,
  workspaceMembers,
} from '../db/schema.js';
import { generateId } from '../lib/ids.js';

const router = Router();

const canAccessWorkspace = async (user, workspaceId) => {
  if (!workspaceId) return false;
  if (user?.role === 'ADMIN') return true;

  const member = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id)
      )
    )
    .limit(1);

  return Boolean(member.length);
};

const buildSignature = ({ apiSecret, params }) => {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${signatureBase}${apiSecret}`)
    .digest('hex');
};

const resolveLinkedClient = async (workspaceId) => {
  if (!workspaceId) return null;
  const [linkedClient] = await db
    .select()
    .from(clients)
    .where(eq(clients.portalWorkspaceId, workspaceId))
    .limit(1);

  return linkedClient || null;
};

router.post('/signature', async (req, res, next) => {
  try {
    const { workspaceId, folder } = req.body || {};
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const allowed = await canAccessWorkspace(req.user, workspaceId);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiKey || !apiSecret || !cloudName) {
      return res.status(500).json({ message: 'Cloudinary config is missing' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = generateId('file');
    const resolvedFolder = folder || `workspaces/${workspaceId}`;

    const accessMode = 'public';
    const signature = buildSignature({
      apiSecret,
      params: {
        access_mode: accessMode,
        folder: resolvedFolder,
        public_id: publicId,
        timestamp,
      },
    });

    res.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: resolvedFolder,
      publicId,
      accessMode,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId, clientId, projectId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const allowed = await canAccessWorkspace(req.user, workspaceId);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    let effectiveWorkspaceId = workspaceId;
    let effectiveClientId = clientId || null;

    const linkedClient = await resolveLinkedClient(workspaceId);
    if (linkedClient) {
      effectiveWorkspaceId = linkedClient.workspaceId;
      effectiveClientId = effectiveClientId || linkedClient.id;

      if (clientId && clientId !== linkedClient.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const filters = [eq(sharedFiles.workspaceId, effectiveWorkspaceId)];
    if (effectiveClientId) {
      filters.push(eq(sharedFiles.clientId, effectiveClientId));
    }
    if (projectId) filters.push(eq(sharedFiles.projectId, projectId));

    const list = await db
      .select()
      .from(sharedFiles)
      .where(and(...filters))
      .orderBy(desc(sharedFiles.createdAt));

    res.json(list);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      workspaceId,
      clientId,
      projectId,
      name,
      type,
      url,
      size,
      mimeType,
      cloudinaryPublicId,
      metadata,
    } = req.body || {};

    if (!workspaceId || !name || !type || !url) {
      return res
        .status(400)
        .json({ message: 'workspaceId, name, type, url are required' });
    }

    const allowed = await canAccessWorkspace(req.user, workspaceId);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

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

    if (projectId) {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project || project.workspaceId !== workspaceId) {
        return res.status(400).json({ message: 'Invalid projectId' });
      }
    }

    let resolvedClientId = clientId || null;
    let effectiveWorkspaceId = workspaceId;

    const linkedClient = await resolveLinkedClient(workspaceId);
    if (linkedClient) {
      effectiveWorkspaceId = linkedClient.workspaceId;
      resolvedClientId = resolvedClientId || linkedClient.id;

      if (clientId && clientId !== linkedClient.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const fileId = generateId('file');

    await db.insert(sharedFiles).values({
      id: fileId,
      workspaceId: effectiveWorkspaceId,
      clientId: resolvedClientId,
      projectId: projectId || null,
      name,
      type,
      url,
      size: size || null,
      mimeType: mimeType || null,
      cloudinaryPublicId: cloudinaryPublicId || null,
      uploadedBy: req.user.id,
      metadata: metadata || {},
      updatedAt: new Date(),
    });

    const [created] = await db
      .select()
      .from(sharedFiles)
      .where(eq(sharedFiles.id, fileId))
      .limit(1);

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

export default router;
