import { Router } from 'express';
import crypto from 'crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  clients,
  mntPeople,
  projects,
  sharedFiles,
  workspaceMembers,
} from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { isWorkspaceAdmin } from '../lib/permissions.js';

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
    const { workspaceId, clientId, projectId, mntPersonId, fileScope } =
      req.query;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const allowed = await canAccessWorkspace(req.user, workspaceId);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    if (mntPersonId && (clientId || projectId)) {
      return res.status(400).json({
        message: 'mntPersonId cannot be combined with clientId or projectId',
      });
    }

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

    const hasAdminAccess =
      req.user.role === 'ADMIN' ||
      (await isWorkspaceAdmin(req.user.id, effectiveWorkspaceId));

    const filters = [eq(sharedFiles.workspaceId, effectiveWorkspaceId)];
    if (effectiveClientId) {
      filters.push(eq(sharedFiles.clientId, effectiveClientId));
    }
    if (mntPersonId) {
      const admin =
        req.user.role === 'ADMIN' ||
        (await isWorkspaceAdmin(req.user.id, effectiveWorkspaceId));
      if (!admin) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const [person] = await db
        .select()
        .from(mntPeople)
        .where(eq(mntPeople.id, mntPersonId))
        .limit(1);

      if (!person || person.workspaceId !== effectiveWorkspaceId) {
        return res.status(400).json({ message: 'Invalid mntPersonId' });
      }

      filters.push(eq(sharedFiles.mntPersonId, mntPersonId));
    } else {
      filters.push(isNull(sharedFiles.mntPersonId));
    }

    if (projectId) filters.push(eq(sharedFiles.projectId, projectId));

    if (fileScope === 'ADMIN_ONLY') {
      if (!hasAdminAccess) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      filters.push(sql`(
        (${sharedFiles.metadata} ->> 'fileScope') = 'ADMIN_ONLY'
        OR (${sharedFiles.metadata} ->> 'source') = 'ADMIN_PORTAL'
      )`);
    }

    if (fileScope === 'CLIENT_PORTAL') {
      filters.push(sql`NOT (
        (${sharedFiles.metadata} ->> 'fileScope') = 'ADMIN_ONLY'
        OR (${sharedFiles.metadata} ->> 'source') = 'ADMIN_PORTAL'
      )`);
    }

    if (!fileScope && !hasAdminAccess) {
      filters.push(sql`NOT (
        (${sharedFiles.metadata} ->> 'fileScope') = 'ADMIN_ONLY'
        OR (${sharedFiles.metadata} ->> 'source') = 'ADMIN_PORTAL'
      )`);
    }

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
      mntPersonId,
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

    if (mntPersonId && (clientId || projectId)) {
      return res.status(400).json({
        message: 'mntPersonId cannot be combined with clientId or projectId',
      });
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

    if (mntPersonId) {
      const admin =
        req.user.role === 'ADMIN' ||
        (await isWorkspaceAdmin(req.user.id, workspaceId));
      if (!admin) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const [person] = await db
        .select()
        .from(mntPeople)
        .where(eq(mntPeople.id, mntPersonId))
        .limit(1);

      if (!person || person.workspaceId !== workspaceId) {
        return res.status(400).json({ message: 'Invalid mntPersonId' });
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
      mntPersonId: mntPersonId || null,
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
