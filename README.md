<div align="center">
  <h1><img src="https://project-management-gs.vercel.app/favicon.ico" width="20" height="20" alt="project-management Favicon">
   project-management</h1>
  <p>
    An open-source project management platform built with ReactJS and Tailwind CSS.
  </p>
  <p>
    <a href="https://github.com/GreatStackDev/project-management/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/GreatStackDev/project-management?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/GreatStackDev/project-management/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome"></a>
    <a href="https://github.com/GreatStackDev/project-management/issues"><img src="https://img.shields.io/github/issues/GreatStackDev/project-management?style=for-the-badge" alt="GitHub issues"></a>
  </p>
</div>

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 📝 Features <a name="-features"></a>

- **Multiple Workspaces:** Allow multiple workspaces to be created, each with its own set of projects, tasks, and members.
- **Project Management:** Manage projects, tasks, and team members.
- **Analytics:** View project analytics, including progress, completion rate, and team size.
- **Task Management:** Assign tasks to team members, set due dates, and track task status.
- **User Management:** Invite team members, manage user roles, and view user activity.

## 🛠️ Tech Stack <a name="-tech-stack"></a>

- **Client:** ReactJS + Vite + Tailwind CSS
- **Server:** Node.js + Express
- **Database:** PostgreSQL (Docker)
- **ORM:** Drizzle

## 🚀 Getting Started <a name="-getting-started"></a>

This repo is now a monorepo with:

- **client/**: Vite + React frontend
- **server/**: Express + Drizzle backend

### 1) Install dependencies

```bash
npm install
```

### 2) Start Postgres with Docker

```bash
npm run db:up
```

### 3) Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

### 4) Run the backend API

```bash
npm run dev:server
```

### 5) Run the frontend

```bash
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) to see the app. The API runs on [http://localhost:4000](http://localhost:4000).

### Admin Login

Use the seeded admin credentials:

- Email: admin@admin.com
- Password: Password123

You can start editing the page by modifying client/src/App.jsx. The page auto-updates as you edit the file.

---

## 🤝 Contributing <a name="-contributing"></a>

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on how to get started.

---

## 📜 License <a name="-license"></a>

This project is licensed under the MIT License. See the [LICENSE.md](./LICENSE.md) file for details.
