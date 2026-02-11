import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
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
  messages,
  invitations,
  sharedFiles,
} from './db/schema.js';

const run = async () => {
  const adminPasswordHash = await bcrypt.hash('admin@1234', 10);

  await db.delete(comments);
  await db.delete(messages);
  await db.delete(tasks);
  await db.delete(projectMembers);
  await db.delete(invitations);
  await db.delete(sharedFiles);
  await db.delete(clientIntakes);
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'requests'
      ) THEN
        DELETE FROM requests;
      END IF;
    END $$;
  `);
  await db.update(clients).set({ portalProjectId: null });
  await db.delete(projects);
  await db.delete(clients);
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
      id: 'workspace_1',
      name: 'Workspace 1',
      slug: 'workspace-1',
      description: null,
      settings: {},
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'workspace_2',
      name: 'Workspace 2',
      slug: 'workspace-2',
      description: null,
      settings: {},
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'workspace_3',
      name: 'Workspace 3',
      slug: 'workspace-3',
      description: null,
      settings: {},
      ownerId: 'user_admin',
      image_url: null,
    },
    {
      id: 'workspace_4',
      name: 'Workspace 4',
      slug: 'workspace-4',
      description: null,
      settings: {},
      ownerId: 'user_admin',
      image_url: null,
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
