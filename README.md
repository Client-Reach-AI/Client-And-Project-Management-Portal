## Project Management Monorepo

End-to-end project management platform with a Vite + React client and an Express + Drizzle backend. The system supports workspaces, projects, tasks, members, comments, and basic admin authentication.

### Features

- Workspaces with members and ownership
- Project lifecycle tracking (status, priority, progress)
- Task management with assignments, due dates, and comments
- Analytics and calendar views
- Admin login with seeded credentials

### Tech Stack

- Client: React, Vite, Tailwind CSS
- Server: Node.js, Express
- Database: PostgreSQL (Docker)
- ORM: Drizzle

### Repository Structure

- client/ – frontend
- server/ – backend API

### Getting Started

1) Install dependencies

```
npm install
```

2) Start PostgreSQL

```
npm run db:up
```

3) Apply migrations and seed data

```
npm run db:migrate
npm run db:seed
```

4) Run the API

```
npm run dev:server
```

5) Run the client

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
