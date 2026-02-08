import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  image: text('image'),
  password_hash: text('password_hash'),
  role: text('role').default('USER').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  settings: jsonb('settings').default({}),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  image_url: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  role: text('role').notNull(),
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  company: text('company'),
  contactName: text('contact_name'),
  contactRole: text('contact_role'),
  email: text('email'),
  phone: text('phone'),
  website: text('website'),
  industry: text('industry'),
  serviceType: text('service_type'),
  businessDetails: jsonb('business_details').default({}),
  serviceResponses: jsonb('service_responses').default({}),
  uploadedFiles: jsonb('uploaded_files').default([]),
  calendlyEventId: text('calendly_event_id'),
  status: text('status').default('ACTIVE').notNull(),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const clientIntakes = pgTable('client_intakes', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  clientId: text('client_id').references(() => clients.id),
  token: text('token').notNull(),
  status: text('status').default('OPEN').notNull(),
  serviceType: text('service_type'),
  companyName: text('company_name'),
  contactName: text('contact_name'),
  contactRole: text('contact_role'),
  industry: text('industry'),
  businessDetails: jsonb('business_details').default({}),
  serviceResponses: jsonb('service_responses').default({}),
  uploadedFiles: jsonb('uploaded_files').default([]),
  calendlyEventId: text('calendly_event_id'),
  payload: jsonb('payload').default({}),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  clientId: text('client_id').references(() => clients.id),
  name: text('name').notNull(),
  description: text('description'),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  start_date: timestamp('start_date', { withTimezone: true }),
  end_date: timestamp('end_date', { withTimezone: true }),
  team_lead: text('team_lead').references(() => users.id),
  progress: integer('progress').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projectMembers = pgTable('project_members', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  type: text('type').notNull(),
  priority: text('priority').notNull(),
  assigneeId: text('assignee_id').references(() => users.id),
  due_date: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invitations = pgTable('invitations', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull(),
  role: text('role').notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  projectId: text('project_id').references(() => projects.id),
  invitedBy: text('invited_by').references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
