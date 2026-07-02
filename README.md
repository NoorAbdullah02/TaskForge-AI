# TaskForge AI

TaskForge AI is a full-stack team and project intelligence platform for modern organizations. It combines workspace onboarding, project execution, employee operations, reporting, and AI-assisted insights into a single product experience.

## What is included

This repository contains three connected parts:

- Frontend: a React 19 + Vite application with dashboards, project views, task management, calendar and attendance pages, AI workspace tooling, and reporting surfaces.
- Backend: an Express + TypeScript API with authentication, workspace management, project workflows, notifications, file handling, analytics endpoints, and AI integrations.
- ML service: a Python service with pre-trained models for productivity, delay, burnout, attendance, and resource prediction.

## Core capabilities

- Workspace-based onboarding with invites, registration codes, and admin approvals
- Role-based access for super admins, workspace admins, team leads, and members
- Project, sprint, epic, story, task, and time management workflows
- Attendance, leave, calendar, and notification modules
- Executive, PM, owner, and employee dashboards
- AI-powered workspace assistance, forecasting, and insight endpoints
- Real-time notifications and socket-based collaboration

## Architecture at a glance

- Frontend runs on Vite and communicates with the backend API over HTTP and Socket.IO.
- Backend exposes the application API, handles auth and business rules, and integrates with AI/ML services.
- The ML service exposes prediction endpoints and is intended to support the analytics and intelligence features.

## Repository structure

- Backend/ - Express/TypeScript backend, routes, controllers, services, database schema, and workers
- frontend/ - React application, pages, components, services, hooks, and design system
- ml-service/ - Python service with model assets, schemas, routers, and training scripts

## Prerequisites

Before you start, make sure you have:

- Node.js 20 or newer
- npm 10 or newer
- Python 3.10+ (for the ML service)
- PostgreSQL running locally or remotely
- Redis running locally or remotely (recommended for queues and background workflows)
- Optional: API keys for email, AI, and image upload providers

## Quick start

### 1) Clone the repository

```bash
git clone https://github.com/NoorAbdullah02/TaskForge-AI.git
cd "TaskForge AI"
```

### 2) Install dependencies

```bash
npm install --prefix Backend --include=dev
npm install --prefix frontend --include=dev
```

If you want to work with the ML service as well, install the Python dependencies inside a virtual environment:

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3) Configure environment variables

Create a file named .env inside Backend/ with values similar to the following:

```env
PORT=4000
NODE_ENV=development
DB_URL=postgresql://user:password@localhost:5432/taskforge
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
JWT_SECRET=replace-with-a-strong-secret
BREVO_API_KEY=
EMAIL_FROM=no-reply@taskforge.ai
EMAIL_FROM_NAME=TaskForge AI
GEMINI_API_KEY=
MISTRAL_API_KEY=
REDIS_URL=redis://127.0.0.1:6379
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
```

Create a frontend environment file at frontend/.env or at the repository root:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 4) Start the required services

Make sure your database and Redis services are running before you start the app.

### 5) Run the services

Open separate terminals for each service:

```bash
npm run dev --prefix Backend
```

```bash
npm run dev --prefix frontend
```

```bash
cd ml-service && source .venv/bin/activate && python run.py
```

The frontend should be available at http://localhost:5173 and the backend at http://localhost:4000.

## Database and migrations

The backend uses Drizzle ORM. After setting your database connection string, apply the schema:

```bash
npm run db:push --prefix Backend
```

You can also launch Drizzle Studio if needed:

```bash
npm run db:studio --prefix Backend
```

## Useful scripts

### Root

- npm run build - installs dependencies and builds both the frontend and backend
- npm run start - runs DB schema push and starts the backend

### Backend

- npm run dev - starts the backend in development mode
- npm run build - compiles the TypeScript server
- npm run db:push - applies the Drizzle schema to the database
- npm run db:studio - opens Drizzle Studio
- npm run start - runs the compiled server from dist/

### Frontend

- npm run dev - starts the Vite development server
- npm run build - builds the production frontend bundle
- npm run lint - runs ESLint
- npm run preview - previews the production build locally

### ML service

- python run.py - starts the local ML service
- python -m pytest or the repository test scripts can be used to validate the service once the environment is set up

## Environment variables

### Backend

- PORT - backend port
- NODE_ENV - runtime mode
- DB_URL - database connection string
- FRONTEND_URL - frontend base URL
- BACKEND_URL - backend base URL
- JWT_SECRET - secret for JWT signing
- BREVO_API_KEY - email provider key
- EMAIL_FROM - sender address for outbound mail
- EMAIL_FROM_NAME - sender display name
- GEMINI_API_KEY - AI service key
- MISTRAL_API_KEY - AI service key
- REDIS_URL - Redis connection string
- IMAGEKIT_PUBLIC_KEY - ImageKit public key
- IMAGEKIT_PRIVATE_KEY - ImageKit private key
- IMAGEKIT_URL_ENDPOINT - ImageKit endpoint

### Frontend

- VITE_API_BASE_URL - base URL for frontend API calls

## Notes

- The first user to register is intended to bootstrap the workspace as a super admin.
- Workspace invites, approval flows, and member management are part of the core experience.
- The backend and ML service should both be running for the full AI-driven experience to work end to end.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request with a clear description of the improvement.

## License

This project is published under the ISC license.
