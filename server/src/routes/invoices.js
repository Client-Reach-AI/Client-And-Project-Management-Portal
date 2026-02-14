import { Router } from 'express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, invoices, workspaceMembers } from '../db/schema.js';
import { generateId } from '../lib/ids.js';
import { isWorkspaceAdmin } from '../lib/permissions.js';
import { getStripeClient, isStripeConfigured } from '../lib/stripe.js';

const router = Router();

const INVOICE_STATUSES = new Set([
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'VOID',
]);

const toIsoOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeCurrency = (value) => {
  if (!value) return 'USD';
  return String(value).trim().toUpperCase();
};

const parseAmountCents = (rawAmount) => {
  if (rawAmount === null || rawAmount === undefined || rawAmount === '') {
    return null;
  }

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(amount * 100);
};

const getWorkspaceMembership = async (workspaceId, userId) => {
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

const getClientRecord = async (clientId) => {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  return client || null;
};

const resolveClientIdsForPortalUser = async (workspaceId, user) => {
  if (!workspaceId || !user?.id) return [];

  const portalClients = await db
    .select({
      id: clients.id,
      email: clients.email,
      portalUserId: clients.portalUserId,
    })
    .from(clients)
    .where(eq(clients.portalWorkspaceId, workspaceId));

  return portalClients
    .filter((client) => {
      if (client.portalUserId && client.portalUserId === user.id) return true;
      if (!client.email || !user.email) return false;
      return client.email.toLowerCase() === user.email.toLowerCase();
    })
    .map((client) => client.id);
};

const canManageClientInvoices = async (user, client) => {
  if (user.role === 'ADMIN') return true;
  if (!client) return false;

  const isAdminInSourceWorkspace = await isWorkspaceAdmin(
    user.id,
    client.workspaceId
  );

  if (isAdminInSourceWorkspace) return true;

  if (client.portalWorkspaceId) {
    return isWorkspaceAdmin(user.id, client.portalWorkspaceId);
  }

  return false;
};

const canAccessInvoice = async (user, invoice, client) => {
  if (user.role === 'ADMIN') return true;

  const membership = await getWorkspaceMembership(invoice.workspaceId, user.id);
  if (!membership) return false;

  if (membership.role === 'ADMIN') return true;

  if (membership.role === 'CLIENT') {
    if (client?.portalUserId && client.portalUserId === user.id) return true;
    if (client?.email && user.email) {
      return client.email.toLowerCase() === user.email.toLowerCase();
    }
    return false;
  }

  return true;
};

const getNextInvoiceNumber = async (workspaceId) => {
  const [result] = await db
    .select({ count: sql`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.workspaceId, workspaceId));

  const count = Number(result?.count || 0) + 1;
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${String(count).padStart(4, '0')}`;
};

router.get('/', async (req, res, next) => {
  try {
    const { workspaceId, clientId } = req.query;

    if (!workspaceId && !clientId) {
      return res
        .status(400)
        .json({ message: 'workspaceId or clientId is required' });
    }

    if (clientId) {
      const client = await getClientRecord(clientId);
      if (!client) return res.status(404).json({ message: 'Client not found' });

      const canManage = await canManageClientInvoices(req.user, client);
      if (!canManage) return res.status(403).json({ message: 'Forbidden' });

      const rows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.clientId, client.id))
        .orderBy(desc(invoices.createdAt));

      return res.json(rows);
    }

    const membership = await getWorkspaceMembership(workspaceId, req.user.id);
    if (!membership && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (req.user.role === 'CLIENT' || membership?.role === 'CLIENT') {
      const ownClientIds = await resolveClientIdsForPortalUser(
        workspaceId,
        req.user
      );

      if (!ownClientIds.length) return res.json([]);

      const rows = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.workspaceId, workspaceId),
            inArray(invoices.clientId, ownClientIds)
          )
        )
        .orderBy(desc(invoices.createdAt));

      return res.json(rows);
    }

    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId))
      .orderBy(desc(invoices.createdAt));

    return res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, req.params.id))
      .limit(1);

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const client = await getClientRecord(invoice.clientId);
    const hasAccess = await canAccessInvoice(req.user, invoice, client);

    if (!hasAccess) return res.status(403).json({ message: 'Forbidden' });

    return res.json(invoice);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      clientId,
      title,
      description,
      currency,
      amount,
      dueDate,
      invoiceNumber,
      status,
      metadata,
    } = req.body;

    if (!clientId || !title || amount === undefined) {
      return res
        .status(400)
        .json({ message: 'clientId, title, and amount are required' });
    }

    const client = await getClientRecord(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const canManage = await canManageClientInvoices(req.user, client);
    if (!canManage) return res.status(403).json({ message: 'Forbidden' });

    const amountCents = parseAmountCents(amount);
    if (!amountCents) {
      return res.status(400).json({ message: 'amount must be greater than 0' });
    }

    const invoiceWorkspaceId = client.portalWorkspaceId || client.workspaceId;
    const safeStatus = INVOICE_STATUSES.has(status) ? status : 'SENT';
    const dueDateParsed = toIsoOrNull(dueDate);
    if (dueDate && !dueDateParsed) {
      return res.status(400).json({ message: 'dueDate is invalid' });
    }

    const nextInvoiceNumber =
      invoiceNumber && String(invoiceNumber).trim()
        ? String(invoiceNumber).trim()
        : await getNextInvoiceNumber(invoiceWorkspaceId);

    const invoiceId = generateId('inv');

    await db.insert(invoices).values({
      id: invoiceId,
      workspaceId: invoiceWorkspaceId,
      clientId,
      createdBy: req.user.id,
      invoiceNumber: nextInvoiceNumber,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      currency: normalizeCurrency(currency),
      amountCents,
      amountPaidCents: 0,
      status: safeStatus,
      dueDate: dueDateParsed,
      issuedAt: new Date(),
      metadata: metadata || {},
      updatedAt: new Date(),
    });

    const [created] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    return res.status(201).json(created);
  } catch (error) {
    if (String(error?.message || '').includes('duplicate key value')) {
      return res.status(409).json({ message: 'invoiceNumber already exists' });
    }
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, req.params.id))
      .limit(1);

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const client = await getClientRecord(invoice.clientId);
    const canManage = await canManageClientInvoices(req.user, client);
    if (!canManage) return res.status(403).json({ message: 'Forbidden' });

    const updates = { updatedAt: new Date() };

    if (req.body.title !== undefined) {
      updates.title = String(req.body.title || '').trim();
      if (!updates.title) {
        return res.status(400).json({ message: 'title cannot be empty' });
      }
    }

    if (req.body.description !== undefined) {
      updates.description = req.body.description
        ? String(req.body.description).trim()
        : null;
    }

    if (req.body.currency !== undefined) {
      updates.currency = normalizeCurrency(req.body.currency);
    }

    if (req.body.dueDate !== undefined) {
      const parsed = toIsoOrNull(req.body.dueDate);
      if (req.body.dueDate && !parsed) {
        return res.status(400).json({ message: 'dueDate is invalid' });
      }
      updates.dueDate = parsed;
    }

    if (req.body.status !== undefined) {
      if (!INVOICE_STATUSES.has(req.body.status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      updates.status = req.body.status;
      if (req.body.status === 'PAID') {
        updates.amountPaidCents = invoice.amountCents;
        updates.paidAt = new Date();
      }
      if (req.body.status === 'VOID') {
        updates.paidAt = null;
      }
    }

    if (req.body.amount !== undefined) {
      if (invoice.status === 'PAID') {
        return res
          .status(400)
          .json({ message: 'Cannot change amount on a paid invoice' });
      }
      const amountCents = parseAmountCents(req.body.amount);
      if (!amountCents) {
        return res
          .status(400)
          .json({ message: 'amount must be greater than 0' });
      }
      updates.amountCents = amountCents;
    }

    await db.update(invoices).set(updates).where(eq(invoices.id, invoice.id));

    const [updated] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice.id))
      .limit(1);

    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/checkout-session', async (req, res, next) => {
  try {
    if (!isStripeConfigured()) {
      return res
        .status(503)
        .json({ message: 'Stripe is not configured on this server' });
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, req.params.id))
      .limit(1);

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const client = await getClientRecord(invoice.clientId);
    const hasAccess = await canAccessInvoice(req.user, invoice, client);
    if (!hasAccess) return res.status(403).json({ message: 'Forbidden' });

    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      return res
        .status(400)
        .json({ message: `Invoice is ${invoice.status.toLowerCase()}` });
    }

    const remainingAmountCents = Math.max(
      0,
      invoice.amountCents - (invoice.amountPaidCents || 0)
    );

    if (!remainingAmountCents) {
      return res
        .status(400)
        .json({ message: 'Invoice has no remaining balance' });
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const currency = String(invoice.currency || 'USD')
      .trim()
      .toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) {
      return res.status(400).json({ message: 'Invoice currency is invalid' });
    }
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: invoice.id,
      customer_email: client?.email || req.user.email,
      metadata: {
        invoiceId: invoice.id,
        workspaceId: invoice.workspaceId,
        clientId: invoice.clientId,
      },
      success_url: `${appBaseUrl}/client-invoices?checkout=success`,
      cancel_url: `${appBaseUrl}/client-invoices?checkout=cancel`,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: invoice.title,
              description: invoice.description || undefined,
            },
            unit_amount: remainingAmountCents,
          },
          quantity: 1,
        },
      ],
    });

    await db
      .update(invoices)
      .set({
        stripeCheckoutSessionId: session.id,
        status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id));

    return res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
