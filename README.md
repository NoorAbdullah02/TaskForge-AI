# TaskForge AI

TaskForge AI is an enterprise-ready task and team intelligence platform built to support workspace-based onboarding, team collaboration, project management, notifications, AI-driven insights, and operational reporting.

## Overview

This repository includes a full-stack product with:
- Backend API and business logic in `Backend/` using Express, TypeScript, Drizzle ORM, PostgreSQL, Redis, and BullMQ.
- Frontend web application in `frontend/` built with React 19, Vite, Tailwind CSS, React Router, and Zustand.
- Machine learning service in `ml-service/` for prediction models and productivity analytics.

## Key Features

- Workspace onboarding with invite links, registration codes, and admin invite emails
- First-user super admin bootstrap and role-based workspace access
- Pending workspace join requests, approval workflow, and member management
- Project, sprint, epic, story, task, and time management
- Attendance, leave, calendar, and notification workflows
- AI and intelligence endpoints for productivity, delay, burnout, and resourcing insights
- Email queuing and trigger service for workspace events, onboarding, approvals, and reminders
- Real-time socket notifications with socket.io

## Repository Structure

- `/Backend` - Express backend, TypeScript code, routes, controllers, services, Drizzle ORM schema, and workers
- `/frontend` - React app, UI pages, components, services, and design system
- `/ml-service` - Python ML service, model training scripts, prediction endpoints, and serialized models

## Tech Stack

- Backend: Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL, Redis, BullMQ, JWT auth, socket.io
- Frontend: React 19, Vite, Tailwind CSS v4, React Router v7, Zustand, Axios
- ML: Python, FastAPI-style service, CatBoost/joblib models, data training pipelines

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database
- Redis server
- Optional: email provider credentials for outbound email delivery

### Install dependencies

```bash
npm install --prefix Backend --include=dev
npm install --prefix frontend --include=dev
```

### Backend configuration

Create a `.env` file in `Backend/` with the required environment variables. Example:

```env
PORT=4000
DB_URL=postgresql://user:password@localhost:5432/taskforge
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
JWT_SECRET=supersecretjwtkey
BREVO_API_KEY=your-brevo-api-key
EMAIL_FROM=no-reply@taskforge.ai
EMAIL_FROM_NAME=TaskForge AI
GEMINI_API_KEY=your-gemini-api-key
MISTRAL_API_KEY=your-mistral-api-key
REDIS_URL=redis://127.0.0.1:6379
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-account
```

### Frontend configuration

The frontend reads its API base URL from `VITE_API_BASE_URL`. Set it in a `.env` file at the project root or `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Run in development

```bash
npm run dev --prefix Backend
npm run dev --prefix frontend
```

If you want to run both at once from the root, use separate shells or a multiplexer.

### Build for production

```bash
npm run build
```

This command installs backend and frontend dependencies, then builds both projects.

### Start the backend server

```bash
npm run db:push --prefix Backend
npm run start --prefix Backend
```

## Available scripts

### Root

- `npm run build` - install dependencies and build frontend and backend
- `npm run start` - run database migration push and start backend

### Backend

- `npm run dev` - start backend with `nodemon`
- `npm run build` - compile TypeScript
- `npm run db:push` - apply Drizzle ORM schema changes to the database
- `npm run db:studio` - open Drizzle Studio
- `npm run start` - run compiled backend from `dist/`

### Frontend

- `npm run dev` - start Vite development server
- `npm run build` - build production frontend assets
- `npm run lint` - run ESLint
- `npm run preview` - preview built frontend

## Environment Variables

### Backend

- `PORT` - backend server port
- `DB_URL` - PostgreSQL database connection string
- `NODE_ENV` - environment mode (`development`, `production`)
- `FRONTEND_URL` - frontend application URL
- `BACKEND_URL` - backend application URL
- `JWT_SECRET` - JWT signing secret
- `BREVO_API_KEY` - Brevo transactional email API key
- `EMAIL_FROM` - outbound email "from" address
- `EMAIL_FROM_NAME` - outbound email sender name
- `GEMINI_API_KEY` - Gemini AI key for AI services
- `MISTRAL_API_KEY` - Mistral AI key for AI services
- `REDIS_URL` - Redis connection URL for queues and caching
- `IMAGEKIT_PUBLIC_KEY` - ImageKit public key
- `IMAGEKIT_PRIVATE_KEY` - ImageKit private key
- `IMAGEKIT_URL_ENDPOINT` - ImageKit upload endpoint URL

### Frontend

- `VITE_API_BASE_URL` - API base URL used by the frontend app (default: `http://localhost:4000/api`)

## Notes

- The first registered user is designed to become a `super_admin` and bootstrap the system.
- Workspace invites support email-based invitations, coded invite links, and workspace join approvals.
- The backend serves the frontend statically when `NODE_ENV=production`.

## Contribution

Contributions are welcome. Open issues or submit pull requests against the main repository.

## License

This project is currently published under the ISC license.
