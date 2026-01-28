## Project Management Monorepo

End-to-end project management platform with a Vite + React client and an Express + Drizzle backend. The system supports multi-workspace collaboration, client intake, project delivery workflows, and team visibility controls.

### Features

- Multi-workspace collaboration with role-based access (Admin/Member)
- Client management (manual profiles + client intake submissions)
- Secure client intake links with submission tracking
- Project creation with client tagging and intake auto-fill
- Project delivery views: tasks, analytics, calendar, and settings
- Task management with assignments, priorities, statuses, and comments
- “My Tasks” Kanban board with drag-and-drop status updates
- Workspace analytics and activity insights
- Admin login with seeded credentials

### Tech Stack

- Client: React, Vite, Tailwind CSS
- Server: Node.js, Express
- Database: PostgreSQL (Docker)
- ORM: Drizzle

### Projects & Pages

- Dashboard: KPI summaries, activity feed, and quick actions
- Projects: project cards with status, priority, and client info
- Project Details: tasks, analytics, calendar, and settings
- Clients: client profiles, intake submissions, and project creation from intake
- My Tasks: personal Kanban board to manage assigned tasks
- Team: workspace member list and invitations
- Settings: workspace settings and management

### Repository Structure

- client/ – frontend
- server/ – backend API

### Getting Started

1. Install dependencies

```
npm install
```

2. Start PostgreSQL

```
npm run db:up
```

3. Apply migrations and seed data

```
npm run db:migrate
npm run db:seed
```

4. Run the API

```
npm run dev:server
```

5. Run the client

```
npm run dev:client
```

Client runs at http://localhost:5173 and API at http://localhost:4000.

### Admin Login

- Email: admin@admin.com
- Password: Password123

### Common Scripts

- npm run dev:client
- npm run dev:server
- npm run db:up
- npm run db:down
- npm run db:migrate
- npm run db:seed
