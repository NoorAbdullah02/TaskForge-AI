# TaskForge AI

**An AI-augmented team, project, and workforce intelligence platform.**

TaskForge AI unifies workspace onboarding, project execution, employee operations, reporting, and AI-driven insights into a single, cohesive product — built as a modern monorepo spanning a React frontend, an Express/TypeScript backend, and a Python ML service.

---

## Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Start Required Services](#4-start-required-services)
  - [5. Run the Application](#5-run-the-application)
- [Database & Migrations](#database--migrations)
- [Available Scripts](#available-scripts)
- [Environment Variables Reference](#environment-variables-reference)
- [Notes](#notes)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

TaskForge AI provides:

- **Workspace onboarding** — invites, registration codes, and admin approval flows
- **Role-based access control** — super admins, workspace admins, team leads, and members
- **Project execution workflows** — sprints, epics, stories, tasks, and time tracking
- **Workforce operations** — attendance, leave management, and calendaring
- **Real-time collaboration** — Socket.IO-powered notifications and live updates
- **Executive intelligence** — dashboards tailored for executives, PMs, owners, and employees
- **AI-assisted insights** — workspace assistance, forecasting, and predictive analytics

## Repository Structure

```
TaskForge-AI/
├── Backend/       # Express + TypeScript API, auth, business logic, DB schema, workers
├── frontend/      # React 19 + Vite application, pages, components, hooks, design system
└── ml-service/    # Python service with trained models and prediction endpoints
```

## Tech Stack

| Layer        | Technology                                                        |
|--------------|--------------------------------------------------------------------|
| Frontend     | React 19, Vite, Socket.IO client                                   |
| Backend      | Express, TypeScript, Drizzle ORM, Socket.IO, Redis                 |
| Database     | PostgreSQL                                                          |
| ML Service   | Python 3.10+, pre-trained models for productivity, delay, burnout, attendance, and resource prediction |
| AI Providers | Gemini, Mistral                                                     |
| Integrations | Brevo (email), ImageKit (media)                                    |

## Prerequisites

Ensure the following are installed and running before setup:

- Node.js 20 or newer
- npm 10 or newer
- Python 3.10+ (for the ML service)
- PostgreSQL (local or remote)
- Redis (recommended for queues and background workflows)
- Optional: API keys for email, AI, and image upload providers

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/NoorAbdullah02/TaskForge-AI.git
cd "TaskForge AI"
```

### 2. Install Dependencies

```bash
npm install --prefix Backend --include=dev
npm install --prefix frontend --include=dev
```

To work with the ML service, set up a Python virtual environment:

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside `Backend/`:

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

Create a `.env` file inside `frontend/` (or at the repository root):

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 4. Start Required Services

Make sure PostgreSQL and Redis are running locally or accessible remotely before proceeding.

### 5. Run the Application

Open a separate terminal for each service:

```bash
# Backend
npm run dev --prefix Backend
```

```bash
# Frontend
npm run dev --prefix frontend
```

```bash
# ML service
cd ml-service && source .venv/bin/activate && python run.py
```

Once running:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000

## Database & Migrations

TaskForge AI uses **Drizzle ORM**. After configuring your database connection string, apply the schema:

```bash
npm run db:push --prefix Backend
```

To inspect and manage the database visually:

```bash
npm run db:studio --prefix Backend
```

## Available Scripts

### Root

| Script            | Description                                              |
|-------------------|------------------------------------------------------------|
| `npm run build`   | Installs dependencies and builds both frontend and backend |
| `npm run start`   | Runs the DB schema push and starts the backend              |

### Backend

| Script              | Description                                  |
|---------------------|-----------------------------------------------|
| `npm run dev`       | Starts the backend in development mode         |
| `npm run build`     | Compiles the TypeScript server                 |
| `npm run db:push`   | Applies the Drizzle schema to the database     |
| `npm run db:studio` | Opens Drizzle Studio                            |
| `npm run start`     | Runs the compiled server from `dist/`          |

### Frontend

| Script            | Description                            |
|-------------------|------------------------------------------|
| `npm run dev`     | Starts the Vite development server       |
| `npm run build`   | Builds the production frontend bundle     |
| `npm run lint`    | Runs ESLint                                |
| `npm run preview` | Previews the production build locally     |

### ML Service

| Command                 | Description                                             |
|--------------------------|----------------------------------------------------------|
| `python run.py`          | Starts the local ML service                              |
| `python -m pytest`       | Runs the test suite (once the environment is configured) |

## Environment Variables Reference

### Backend

| Variable                | Description                        |
|--------------------------|-------------------------------------|
| `PORT`                   | Backend server port                 |
| `NODE_ENV`                | Runtime environment                 |
| `DB_URL`                  | PostgreSQL connection string        |
| `FRONTEND_URL`             | Frontend base URL                   |
| `BACKEND_URL`              | Backend base URL                    |
| `JWT_SECRET`               | Secret used for JWT signing         |
| `BREVO_API_KEY`            | Email provider API key              |
| `EMAIL_FROM`               | Sender address for outbound email   |
| `EMAIL_FROM_NAME`          | Sender display name                 |
| `GEMINI_API_KEY`           | AI service key (Gemini)             |
| `MISTRAL_API_KEY`          | AI service key (Mistral)            |
| `REDIS_URL`                | Redis connection string             |
| `IMAGEKIT_PUBLIC_KEY`      | ImageKit public key                 |
| `IMAGEKIT_PRIVATE_KEY`     | ImageKit private key                |
| `IMAGEKIT_URL_ENDPOINT`    | ImageKit endpoint URL               |

### Frontend

| Variable              | Description                     |
|------------------------|-----------------------------------|
| `VITE_API_BASE_URL`    | Base URL used for backend API calls |

## Notes

- The first user to register automatically bootstraps the workspace as a **super admin**.
- Workspace invites, approval flows, and member management are core to the onboarding experience.
- For the full AI-driven experience, both the **backend** and **ML service** must be running simultaneously.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with a clear description of the change and its motivation.

## License

This project is published under the **ISC License**.