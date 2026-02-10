import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './db/index.js';
import {
  users,
  workspaces,
  workspaceMembers,
  clients,
  clientIntakes,
  projects,
  projectMembers,
  tasks,
  comments,
  invitations,
  sharedFiles,
} from './db/schema.js';

const run = async () => {
  const adminPasswordHash = await bcrypt.hash('admin@1234', 10);

  await db.delete(comments);
  await db.delete(tasks);
  await db.delete(projectMembers);
  await db.delete(invitations);
  await db.delete(projects);
  await db.delete(clientIntakes);
  await db.delete(clients);
  await db.delete(sharedFiles);
  await db.delete(workspaceMembers);
  await db.delete(workspaces);
  await db.delete(users);

  await db.insert(users).values([
    {
      id: 'user_admin',
      name: 'Client Reach Admin',
      email: 'admin@clientreach.ai',
      image: null,
      role: 'ADMIN',
      password_hash: adminPasswordHash,
    },
  ]);

  await db.insert(workspaces).values([
    {
      id: 'org_core',
      name: 'Client Reach AI - Core Platform',
      slug: 'client-reach-core',
      description: 'Core product roadmap and delivery for Client Reach AI.',
      settings: { theme: 'midnight' },
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'org_marketing',
      name: 'Client Reach AI - Marketing',
      slug: 'client-reach-marketing',
      description: 'Marketing campaigns, web presence, and growth experiments.',
      settings: { theme: 'sunrise' },
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'org_delivery',
      name: 'Client Reach AI - Client Delivery',
      slug: 'client-reach-delivery',
      description: 'Client projects across mobile apps, web, and AI workflows.',
      settings: { theme: 'forest' },
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'org_internal',
      name: 'Client Reach AI - Internal Ops',
      slug: 'client-reach-ops',
      description: 'Internal automation, IT, and operational tooling.',
      settings: { theme: 'marine' },
      ownerId: 'user_admin',
      image_url: null,
    },
  ]);

  await db.insert(workspaceMembers).values([
    {
      id: 'wm_core_admin',
      workspaceId: 'org_core',
      userId: 'user_admin',
      role: 'ADMIN',
      message: 'Workspace owner',
    },
    {
      id: 'wm_marketing_admin',
      workspaceId: 'org_marketing',
      userId: 'user_admin',
      role: 'ADMIN',
      message: 'Workspace owner',
    },
    {
      id: 'wm_delivery_admin',
      workspaceId: 'org_delivery',
      userId: 'user_admin',
      role: 'ADMIN',
      message: 'Workspace owner',
    },
    {
      id: 'wm_internal_admin',
      workspaceId: 'org_internal',
      userId: 'user_admin',
      role: 'ADMIN',
      message: 'Workspace owner',
    },
  ]);
};

run()
  .then(() => {
    console.log('Seed complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
