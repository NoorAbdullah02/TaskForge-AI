# TaskForge AI

**An AI-augmented team, project, and workforce intelligence platform.**

TaskForge AI unifies workspace onboarding, project execution, agile planning, workforce operations, real-time collaboration, billing, reporting, and AI-driven predictive analytics into a single cohesive product. It is built as a modern polyrepo/monorepo spanning three cooperating services:

- a **React 19 + Vite** single-page frontend,
- an **Express 5 / TypeScript** REST + WebSocket backend backed by **PostgreSQL** (Drizzle ORM), and
- a **Python FastAPI** machine-learning microservice serving gradient-boosted prediction models.

---

## Table of Contents

- [Overview](#overview)
- [Feature Catalog](#feature-catalog)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Roles & Permissions](#roles--permissions)
- [Billing & Subscriptions](#billing--subscriptions)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Start PostgreSQL & Push the Schema](#4-start-postgresql--push-the-schema)
  - [5. Run the Application](#5-run-the-application)
- [Production Build & Deployment](#production-build--deployment)
- [Available Scripts](#available-scripts)
- [Environment Variables Reference](#environment-variables-reference)
- [Backend API Reference](#backend-api-reference)
- [Frontend Pages & Routes](#frontend-pages--routes)
- [ML Service API Reference](#ml-service-api-reference)
- [Background Jobs & Schedulers](#background-jobs--schedulers)
- [Real-Time (Socket.IO) Events](#real-time-socketio-events)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

TaskForge AI provides an end-to-end operating system for software and delivery teams:

- **Workspace onboarding** — self-service registration, invite codes/links, password-protected workspaces, and admin approval flows.
- **Role-based access control** — super admins, workspace owners/admins, team leaders, project managers, and employees, each with tailored dashboards.
- **Project execution** — projects, epics, stories, sprints, tasks, subtasks, dependencies, milestones, recurring tasks, templates, and full task history/undo.
- **Agile delivery** — sprint planning board, Kanban boards, Gantt chart timeline, and story points.
- **Workforce operations** — attendance (with shifts and geo/IP capture), leave requests with approvals, daily work logs, and timesheets.
- **Time management** — start/stop/pause time logs, Pomodoro sessions, idle tracking, and per-task actual vs. estimated hours.
- **Real-time collaboration** — Socket.IO chat hub (direct, group, project, and team channels), live notifications, and presence.
- **AI assistance** — Gemini-powered workspace copilot, knowledge base Q&A, project intelligence, and enterprise AI workflows.
- **Predictive analytics** — a dedicated ML service for delay, deadline, project-success, attendance, productivity, resource-allocation, burnout, and health-score prediction.
- **Billing** — free/pro/enterprise plans with 7-day trials, manual bKash/Nagad payment submission, invoicing (PDF), and admin review.
- **Reporting** — Recharts dashboards plus Excel/PDF export.

---

## Feature Catalog

### Project & Task Management
- Full CRUD for **projects**, **epics**, **stories**, **sprints**, **tasks**, and **subtasks**.
- **Kanban board** with drag-and-drop (`@dnd-kit`) status transitions and ordering.
- **Gantt chart** timeline view with task dependencies (`FS`/`SS`/`FF`/`SF` types).
- **Sprint planning** board with story points and sprint goals.
- **Milestones**, **recurring tasks** (cron-based), **task templates**, **labels/categories**, and **priority** levels.
- **Task time tracking**: active timer, actual vs. estimated hours, Pomodoro counter/sessions.
- **Task locking**, **archiving**, **watchers/followers**, and full **task history** with undo support.
- Task **comments**, **attachments**, and **project documents** (with file versioning and download audit).

### Team & Workforce
- **Teams** with leaders and department grouping; per-member **skills** with proficiency levels.
- **Attendance** tracking with morning/evening **shift types**, check-in/check-out, IP and location capture.
- **Leave management** (sick / casual / annual) with configurable per-workspace policy and approval workflow.
- **Daily work logs** with hours, progress %, challenges, tomorrow’s plan, Git commit links, attachments, and review workflow.
- **Timesheets** (daily / weekly / monthly) aggregating work logs, with submit → approve/reject lifecycle and locking.
- **Workspace calendar** with meetings and shared scheduling.

### Real-Time Collaboration
- **Chat Hub** — direct, group, project, and team channels powered by Socket.IO.
- **Notification Center** — live in-app notifications with per-category preferences (email/push/reminders).
- Presence and live updates across tasks, boards, and chat.

### AI Features
- **AI Workspace / Copilot** — Google Gemini assistant for natural-language queries over your workspace data.
- **Knowledge Base** — wiki pages, docs, notes, and SOPs with AI-assisted retrieval and Q&A.
- **Project Intelligence Dashboard** — AI-generated summaries, risk signals, and recommendations per project.
- **Enterprise AI Page** — advanced AI-driven workflows for larger organizations.
- **Executive Dashboard** — high-level KPIs with AI narrative summaries.
- All AI requests are logged (`ai_requests`) with prompt type, tokens used, and status.

### Predictive ML Service
Eight prediction endpoints backed by trained gradient-boosted models (XGBoost / LightGBM / CatBoost / scikit-learn):

| Domain | Endpoints |
|---|---|
| Delay & Success | task delay risk, deadline dates, project-success status |
| Attendance | attendance-status prediction |
| Productivity | developer productivity score |
| Resource | project resource recommendation |
| Burnout & Health | burnout risk, health score |

### Authentication & Security
- **JWT** sessions with server-side session tracking (IP + user-agent).
- **Email verification** (token-based) and **two-factor authentication (OTP)**.
- **Password reset** flow with time-limited tokens and MJML-templated emails (delivered via Brevo).
- **Helmet** security headers (CSP, HSTS, clickjacking protection), **CORS**, **rate limiting**, and **RBAC** guards.
- Password hashing with **bcryptjs**; subscription gating via middleware.

### Admin & Reporting
- **Admin Settings** — user management, workspace configuration, org settings.
- **Super Admin Console** — multi-workspace governance and platform-wide controls.
- **Reports** — Recharts visualizations for tasks, time, attendance, and productivity, plus **Excel (ExcelJS)** and **PDF (PDFKit)** export.
- Interactive API documentation via **Swagger UI**.

---

## Repository Structure

```
TaskForge AI/
├── Backend/                       # Express 5 + TypeScript API
│   ├── drizzle/                   # Generated SQL migrations & snapshots
│   ├── drizzle.config.ts          # Drizzle Kit config
│   ├── nodemon.json               # Dev watcher config
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # App entry: middleware, routes, socket, schedulers
│       ├── config/                # env.ts (env loader) & plans.ts (billing plans)
│       ├── controllers/           # 27 route-handler modules
│       ├── db/                    # schema.ts (Drizzle schema), index.ts, queries.ts, seed.ts
│       ├── emails/                # MJML transactional email templates
│       ├── lib/                   # gemini, imagekit, nodemailer, redis, queue, logger, errors…
│       ├── middleware/            # auth, RBAC, rate-limit, validation, subscription gate
│       ├── repositories/          # Data-access layer (base + notification)
│       ├── routes/                # Express routers (one per domain)
│       ├── services/              # Business logic, ML client, socket, schedulers
│       ├── validations/           # Zod request schemas
│       └── workers/               # node-cron background workers (mail, automation)
│
├── frontend/                      # React 19 + Vite SPA
│   ├── index.html
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── src/
│       ├── App.jsx                # Route table (lazy-loaded pages)
│       ├── main.jsx               # React root + providers
│       ├── Pages/                 # Top-level pages (+ dashboards/ per-role)
│       ├── Components/            # Shared UI (Kanban, TaskModal, charts, copilot…)
│       ├── Services/              # Axios API clients (one per backend domain)
│       ├── context/              # AuthContext
│       ├── design-system/        # Theme provider, primitives, backgrounds, app shell
│       ├── hooks/                # e.g. useLenisSmoothScroll
│       ├── lib/                  # Utilities & shims
│       └── utils/               # passwordPolicy, etc.
│
├── ml-service/                    # FastAPI Python prediction service
│   ├── main.py                    # FastAPI app + CORS + router registration
│   ├── run.py                     # Uvicorn entry point
│   ├── config.py                  # Settings (host, port, API prefix)
│   ├── requirements.txt
│   ├── routers/                   # delay, attendance, productivity, resource, burnout
│   ├── schemas/                   # Pydantic request/response models
│   ├── services/                  # PredictorService (model loading/inference)
│   ├── models/                    # Serialized trained models (*.joblib)
│   ├── training/                  # Model training + synthetic data scripts
│   └── test_api.py                # Endpoint smoke tests
│
├── ML_Models_Testing.ipynb        # ML experimentation notebook
├── PROJECT_INFORMATION.txt        # Project notes
├── BRD(Document).docx             # Business Requirements Document
├── SRS(Document).docx             # Software Requirements Specification
├── TaskForge AI Light Theme.pptx  # Presentation deck
└── package.json                   # Root build/start orchestration scripts
```

---

## Tech Stack

### Frontend

| Package | Purpose |
|---|---|
| React 19 + React Router 7 | UI framework & client-side routing |
| Vite 7 | Build tool & dev server |
| Tailwind CSS 4 | Utility-first styling |
| Zustand | Global state management |
| TanStack Query v5 | Server state, caching & background refetching |
| Axios | HTTP client |
| Socket.IO Client | Real-time WebSocket communication |
| Framer Motion + GSAP | Animations and transitions |
| @dnd-kit | Drag-and-drop for boards and lists |
| Recharts | Data visualization charts |
| Three.js + @react-three/fiber + drei | 3D landing/background elements |
| Lenis | Smooth scroll |
| Lucide React | Icon set |
| react-hot-toast | Toast notifications |

### Backend

| Package | Purpose |
|---|---|
| Express 5 (TypeScript) | HTTP server & REST API |
| Drizzle ORM + drizzle-kit | Type-safe ORM & schema migrations |
| PostgreSQL (`pg`) | Primary relational database |
| Socket.IO | WebSocket server for real-time features |
| JWT (`jsonwebtoken`) + bcryptjs | Token auth & password hashing |
| Nodemailer + MJML + Brevo | Transactional email delivery & templating |
| @google/generative-ai (Gemini) | AI assistant & project intelligence |
| ImageKit | Cloud image & file storage |
| Multer | Multipart file upload handling |
| node-cron | Scheduled background jobs |
| Zod | Runtime request validation |
| ExcelJS + PDFKit | Report & invoice export |
| Swagger UI Express | API documentation |
| Helmet · cors · cookie-parser · request-ip | Security & request utilities |

### ML Service

| Package | Purpose |
|---|---|
| FastAPI + Uvicorn | Async HTTP server |
| scikit-learn | Preprocessing, scalers & model utilities |
| XGBoost | Gradient-boosted tree models |
| LightGBM | Fast gradient-boosted models |
| CatBoost | Categorical-feature gradient boosting |
| joblib | Model serialization |
| pandas + numpy | Data manipulation & numerical computing |
| Pydantic | Request/response schema validation |
| httpx | Async HTTP client |

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                            Browser                            │
│                 React 19 + Vite  (dev: port 5173)            │
└─────────────────────────────┬─────────────────────────────────┘
                             │  HTTP REST  +  WebSocket (Socket.IO)
┌─────────────────────────────▼─────────────────────────────────┐
│               Node.js / Express Backend  (port 4000)         │
│   Auth · Projects · Agile · Tasks · Attendance · Leave       │
│   Chat · KB · Time · Work Logs · Timesheets · Billing · AI    │
│   Drizzle ORM · Socket.IO · node-cron schedulers              │
└──────┬───────────────────────────────────────┬───────────────┘
       │ SQL                                    │ HTTP (ml.service)
┌──────▼──────────────┐              ┌──────────▼──────────────────┐
│   PostgreSQL DB      │              │  Python ML Service (8000)   │
│  (Neon / local pg)   │              │  FastAPI · XGB/LGBM/CatBoost │
└──────────────────────┘              └─────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                        External Services                        │
│   Google Gemini · ImageKit · Brevo (email) · bKash/Nagad        │
└──────────────────────────────────────────────────────────────────┘
```

In **production**, the backend serves the built frontend (`frontend/dist`) as static files and falls back to `index.html` for client-side routes, so a single Node process hosts both the API and the SPA.

---

## Data Model

The PostgreSQL schema (Drizzle, `Backend/src/db/schema.ts`) is organized into the following groups:

**Identity & Access** — `users`, `sessions`, `verify_email`, `password_reset_tokens`, `user_skills`, `notification_preferences`.

**Workspace & Org** — `workspaces`, `workspace_members`, `departments`, `teams`, `system_settings`, `activity_logs`, `email_logs`, `api_keys`.

**Delivery** — `projects`, `project_members`, `epics`, `stories`, `sprints`, `tasks`, `subtasks`, `task_dependencies`, `task_watchers`, `task_templates`, `task_history`, `comments`, `attachments`, `project_documents`, `file_versions`, `file_downloads`.

**Workforce** — `attendance`, `leave_requests`, `work_logs`, `work_log_attachments`, `timesheets`, `time_logs`, `meetings`.

**Collaboration & AI** — `chats`, `chat_members`, `messages`, `wiki_pages`, `notifications`, `ai_requests`.

**Billing** — `subscriptions`, `payments`, `invoices`, `billing_history`, `subscription_logs`.

**Automation** — `automation_logs`.

Apply the schema with `npm run db:push --prefix Backend` (see [Database](#4-start-postgresql--push-the-schema)).

---

## Roles & Permissions

TaskForge AI recognizes a layered role model. The **first user to register a workspace becomes its owner/super admin**.

| Role | Scope | Capabilities (summary) |
|---|---|---|
| Super Admin | Platform | Multi-workspace governance, system settings, review of all payments |
| Owner / Admin | Workspace | Members, projects, billing, workspace configuration, approvals |
| Team Leader | Team | Team members, work-log/timesheet review, team reporting |
| Project Manager | Project | Sprints, epics, tasks, project intelligence |
| Employee | Self | Assigned tasks, attendance, leave, work logs, chat |

Role-specific dashboards live under `frontend/src/Pages/dashboards/` (`OwnerDashboard`, `PMDashboard`, `TeamLeaderDashboard`, `EmployeeDashboard`, `SuperAdminDashboard`). Access is enforced by `rbac.middleware.ts` and `subscriptionGate.middleware.ts` on the backend.

---

## Billing & Subscriptions

Defined in `Backend/src/config/plans.ts`. Money is stored as integer **cents** (1 BDT = 100 paisa). Every workspace starts on a **7-day trial**.

| Plan | Workspaces | Members | Projects | Storage | AI Requests | Monthly | Yearly (per mo.) |
|---|---|---|---|---|---|---|---|
| Free | 1 | 5 | 3 | 1 GB | 100 | — | — |
| Pro | Unlimited | Unlimited | Unlimited | 20 GB | 5,000 | 10 BDT | 8 BDT |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | 15 BDT | 13 BDT |

Payments are submitted manually via **bKash** or **Nagad** (transaction ID + sender number + screenshot), then moved through `pending → under_review → approved/rejected` by an admin. Approved payments generate a PDF **invoice** and a **billing_history** entry. A billing scheduler handles trial expiry and renewals.

---

## Prerequisites

Install and have the following available before setup:

- **Node.js** 20+ and **npm** 10+
- **Python** 3.10+
- **PostgreSQL** 15+ (local, or a hosted provider such as Neon)
- API keys / credentials for: **Google Gemini**, **ImageKit**, and **Brevo** (email)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/NoorAbdullah02/TaskForge-AI-.git
cd "TaskForge AI"
```

### 2. Install Dependencies

```bash
# Backend
npm install --prefix Backend

# Frontend
npm install --prefix frontend

# ML service — use a virtual environment
cd ml-service
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

Create `Backend/.env` and `frontend/.env`. See the [Environment Variables Reference](#environment-variables-reference) for every key.

`frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

> ⚠️ **Never commit real secrets.** Use placeholder values in committed `.env` files and keep production credentials out of version control (see [Security](#security)).

### 4. Start PostgreSQL & Push the Schema

Ensure your database is running and `DB_URL` points to it, then apply the Drizzle schema:

```bash
npm run db:push --prefix Backend
```

Optionally inspect the database visually:

```bash
npm run db:studio --prefix Backend
```

### 5. Run the Application

Open a separate terminal per service:

```bash
# Terminal 1 — Backend (nodemon watch mode)
npm run dev --prefix Backend
```

```bash
# Terminal 2 — Frontend (Vite dev server)
npm run dev --prefix frontend
```

```bash
# Terminal 3 — ML service
cd ml-service
source venv/bin/activate
python run.py
```

Once running:

| Service | URL |
|---|---|
| Frontend (dev) | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Backend health check | http://localhost:4000/health |
| Backend Swagger docs | http://localhost:4000/api-docs |
| ML Service | http://localhost:8000 |
| ML Service docs | http://localhost:8000/docs |

---

## Production Build & Deployment

The root `package.json` orchestrates a single-command build and start (frontend is served by the backend in production):

```bash
# From the repository root

# Build both frontend and backend
npm run build      # installs deps, builds frontend/dist, compiles Backend/dist

# Push schema and start the compiled server
npm start          # runs db:push then node dist/index.js (in Backend)
```

Set `NODE_ENV=production` in `Backend/.env`. In production mode the backend:
- serves static assets from `../frontend/dist`,
- routes all non-`/api` GET requests to the SPA’s `index.html`,
- enforces stricter CORS based on `FRONTEND_URL` / `BACKEND_URL`.

The ML service is deployed separately (e.g. `uvicorn` behind a reverse proxy) and reached by the backend’s `ml.service` client.

---

## Available Scripts

### Root (`/`)

| Script | Description |
|---|---|
| `npm run build` | Install deps for Backend + frontend, build the frontend, compile the backend |
| `npm start` | Push DB schema, then start the compiled backend (serves the SPA) |

### Backend (`Backend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start the backend in watch mode (nodemon + ts-node) |
| `npm run build` | Compile TypeScript to `dist/` (`tsc`) |
| `npm run start` | Run the compiled server (`node dist/index.js`) |
| `npm run db:push` | Apply the Drizzle schema to the database |
| `npm run db:studio` | Open Drizzle Studio GUI |

### Frontend (`frontend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build the production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

### ML Service (`ml-service/`)

| Command | Description |
|---|---|
| `python run.py` | Start the FastAPI ML service (Uvicorn) |
| `python test_api.py` | Run endpoint smoke tests |
| `python training/train_all.py` | Retrain all models |

---

## Environment Variables Reference

### Backend (`Backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | Backend port (default `4000`) |
| `NODE_ENV` | no | `development` or `production` (default `development`) |
| `DB_URL` | **yes** | PostgreSQL connection string |
| `FRONTEND_URL` | yes | Frontend origin (CORS, links) — default `http://localhost:5173` |
| `BACKEND_URL` | yes | Backend base URL — default `http://localhost:4000` |
| `JWT_SECRET` | **yes** | Secret for signing JWTs |
| `GEMINI_API_KEY` | yes | Google Gemini API key (AI features) |
| `MISTRAL_API_KEY` | no | Mistral API key (optional AI fallback) |
| `IMAGEKIT_PUBLIC_KEY` | yes | ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | yes | ImageKit private key |
| `IMAGEKIT_URL_ENDPOINT` | yes | ImageKit CDN endpoint URL |
| `BREVO_API_KEY` | yes | Brevo (email) API key |
| `EMAIL_FROM` | yes | Sender email address |
| `EMAIL_FROM_NAME` | yes | Sender display name |
| `BKASH_MERCHANT_NUMBER` | no | bKash merchant number for billing |
| `NAGAD_MERCHANT_NUMBER` | no | Nagad merchant number for billing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Google OAuth (if enabled) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SERECT` | no | GitHub OAuth (if enabled) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for backend API calls (e.g. `http://localhost:4000/api`) |

### ML Service (environment / `config.py`)

| Variable | Description |
|---|---|
| `HOST` | Bind host (default `127.0.0.1`) |
| `PORT` | Port (default `8000`) |
| `BACKEND_URL` | Backend origin (CORS) |
| `FRONTEND_URL` | Frontend origin (CORS) |

---

## Backend API Reference

All routes are mounted under `/api`. Health and docs are served at the root.

| Base path | Router | Responsibility |
|---|---|---|
| `/api/users` | `userRoute` | Auth, registration, verification, 2FA, profile, sessions |
| `/api/projects` | `project.routes` | Projects, members, documents |
| `/api/tasks` | `task.routes` | Tasks, subtasks, comments, attachments, timers, history |
| `/api/agile` | `agile.routes` | Epics, stories, sprints, dependencies |
| `/api/attendance` | `attendance.routes` | Check-in/out, attendance records |
| `/api/leaves` | `leave.routes` | Leave requests & approvals |
| `/api/worklogs` | `workLog.routes` | Daily work logs & reviews |
| `/api/timesheets` | `timesheet.routes` | Timesheet aggregation & lifecycle |
| `/api/time` | `time.routes` | Time logs (start/pause/stop), Pomodoro |
| `/api/calendar` | `calendar.routes` | Meetings & workspace calendar |
| `/api/chat` | `chat.routes` | Chats, members, messages |
| `/api/kb` | `kb.routes` | Knowledge base / wiki pages |
| `/api/notifications` | `notification.routes` | Notifications & preferences |
| `/api/dashboard` | `dashboard.routes` | Aggregated dashboard data |
| `/api/reports` | `reports.routes` | Reports & Excel/PDF export |
| `/api/intelligence` | `projectIntelligence.routes` | AI project insights |
| `/api/ai` | `ai.routes` | AI copilot / assistant |
| `/api/workspaces` | `workspace.routes` | Workspace onboarding & settings |
| `/api/admin` | `admin.routes` | Workspace admin operations |
| `/api/super-admin` | `superAdmin.routes` | Platform-wide administration |
| `/api/billing` | `billing.routes` | Subscriptions, payments, invoices |
| `/api/upload` | `upload.routes` | ImageKit upload signing |
| `/api/files` | `file.routes` | File versions & download audit |
| `GET /health` | — | Service health / uptime |
| `GET /api-docs` | — | Swagger UI |

> Explore request/response schemas interactively at **`/api-docs`** when the backend is running.

---

## Frontend Pages & Routes

Auth pages are public; all others are wrapped in `<ProtectedRoute>` (redirect to `/login` when unauthenticated). Routes are defined in `frontend/src/App.jsx`.

| Page | Path | Access | Description |
|---|---|---|---|
| Landing / Dashboard | `/` | Public / Auth | Marketing page when logged out, Dashboard when logged in |
| Register | `/register` | Public | Workspace / user registration |
| Login | `/login` | Public | User login |
| Forgot Password | `/forgot-password` | Public | Start password reset |
| Reset Password | `/reset-password` | Public | Set a new password |
| Verify Email (token) | `/verify-email-token` | Public | Email verification via token |
| Verify Email (result) | `/verify-email-result` | Public | Verification outcome |
| After Register | `/after-register` | Public | Post-registration onboarding |
| Dashboard | `/dashboard` | Protected | Role-aware overview |
| Executive Dashboard | `/executive-dashboard` | Protected | Executive KPIs |
| Projects | `/projects` | Protected | Project list |
| Project Details | `/projects/:id` | Protected | Board, tasks, members |
| Project Intelligence | `/projects/:id/intelligence` | Protected | AI project insights |
| Tasks | `/tasks` | Protected | Global task list |
| Task Details | `/tasks/:id` | Protected | Task detail + comments |
| Sprint Planning | `/sprint-planning` | Protected | Sprint board & planning |
| Attendance | `/attendance` | Protected | Attendance & check-in |
| Leaves | `/leaves` | Protected | Leave requests & approvals |
| Work Log | `/work-log` | Protected | Daily work logs |
| Timesheet | `/timesheet` | Protected | Timesheets |
| Time Tracker | `/time-tracker` | Protected | Time logs & Pomodoro |
| Calendar | `/calendar` | Protected | Workspace calendar |
| Chat Hub | `/chat` | Protected | Real-time chat |
| Knowledge Base | `/kb` | Protected | Docs & AI Q&A |
| AI Workspace | `/ai-workspace` | Protected | Gemini assistant |
| Enterprise AI | `/enterprise-ai` | Protected | Enterprise AI hub |
| Reports | `/reports` | Protected | Analytics & export |
| Billing | `/billing` | Protected | Plans, payments, invoices |
| Profile | `/profile` | Protected | Profile & 2FA settings |
| Admin Settings | `/admin-settings` | Protected | Workspace administration |
| Super Admin Console | `/super-admin` | Protected | Platform administration |

A global **AI Copilot** overlay is available on all non-fullscreen pages.

---

## ML Service API Reference

The FastAPI service registers all routers under the `/api` prefix, and each router uses a `/predict` sub-prefix. All endpoints are **POST** and accept/return JSON validated by Pydantic schemas.

| Method & Path | Domain | Prediction |
|---|---|---|
| `POST /api/predict/delay` | Delay & Success | Task/project delivery delay risk |
| `POST /api/predict/deadline` | Delay & Success | Predicted deadline dates |
| `POST /api/predict/project-success` | Delay & Success | Project-success status |
| `POST /api/predict/attendance` | Attendance | Attendance-status prediction |
| `POST /api/predict/productivity` | Productivity | Developer productivity score |
| `POST /api/predict/resource` | Resource | Project resource recommendation |
| `POST /api/predict/burnout` | Burnout & Health | Burnout risk |
| `POST /api/predict/health-score` | Burnout & Health | Employee health score |
| `GET /` | — | Service status / metadata |
| `GET /docs` | — | Swagger UI (interactive) |

Trained model artifacts live in `ml-service/models/*.joblib` and are loaded at startup by `PredictorService`. Retrain with the scripts in `ml-service/training/` (`train_all.py`, `train_delay.py`, `train_attendance.py`, `train_productivity.py`, `train_resource.py`). Explore all request schemas at **`http://localhost:8000/docs`**.

---

## Background Jobs & Schedulers

Started from `Backend/src/index.ts` and implemented under `services/` and `workers/`:

- **Escalation scheduler** (`escalation.scheduler.ts`) — escalates overdue tasks (bumps `escalationLevel`, notifies).
- **Billing scheduler** (`billing.scheduler.ts`) — handles trial expiry, renewals, and status transitions.
- **Automation scheduler / worker** (`automation.scheduler.ts`, `workers/automation.worker.ts`) — recurring tasks and automation jobs.
- **Mail worker** (`workers/mail.worker.ts`) — asynchronous email dispatch.
- **Email triggers** (`emailTrigger.service.ts`) — event-driven notification emails.

Job runs are recorded in the `automation_logs` and `email_logs` tables.

---

## Real-Time (Socket.IO) Events

The backend initializes Socket.IO in `services/socket.service.ts` (started alongside the HTTP server). It powers:

- **Chat** — message delivery across direct/group/project/team channels.
- **Notifications** — live push of in-app notifications.
- **Live updates** — task/board changes and presence signals.

The frontend connects via `frontend/src/Services/socket.js` and consumes events in the Chat Hub and Notification Center.

---

## Security

TaskForge AI ships with multiple layers of protection:

- **Helmet** security headers with a configured Content-Security-Policy, HSTS, and clickjacking protection.
- **CORS** locked to `FRONTEND_URL` / `BACKEND_URL` in production.
- **JWT** auth with server-side session records (`sessions`) tracking IP and user-agent.
- **Rate limiting** (`rateLimit.middleware.ts`) and **RBAC** (`rbac.middleware.ts`) guards.
- **Zod** validation on inbound requests; **bcryptjs** password hashing.
- **Email verification** and optional **2FA (OTP)**.

> 🔐 **Important:** The repository currently contains a populated `Backend/.env` with live-looking credentials (database URL, API keys, JWT secret). Before any public or production use you should:
> 1. **Rotate every exposed secret** (DB password, Gemini/Mistral, ImageKit, Brevo, JWT secret, OAuth secrets).
> 2. Remove `.env` from version control and add it to `.gitignore`.
> 3. Provide a committed `.env.example` with placeholder values only.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Backend exits on startup | `DB_URL` invalid or Postgres unreachable — verify the connection string and that the DB accepts SSL if required |
| `db:push` fails | Schema/permission mismatch — confirm the DB user can create/alter tables |
| CORS errors in the browser | `FRONTEND_URL` / `BACKEND_URL` mismatch — align them with your actual origins |
| AI features return errors | Missing/invalid `GEMINI_API_KEY`, or the request exceeds plan `aiRequests` limit |
| Uploads fail | Check ImageKit keys and `IMAGEKIT_URL_ENDPOINT` |
| Emails not sending | Verify `BREVO_API_KEY`, `EMAIL_FROM`, and check `email_logs` for error rows |
| ML calls fail from backend | Ensure the ML service is running on port 8000 and reachable from the backend |
| Frontend can’t reach API | Confirm `VITE_API_BASE_URL` points to the running backend |

---

## Contributing

Contributions are welcome:

1. Open an issue describing the change before submitting a PR.
2. Keep changes scoped and consistent with existing patterns.
3. Ensure `npm run lint` passes in `frontend/` and the backend compiles (`npm run build --prefix Backend`).
4. Don’t break existing API contracts; update Swagger annotations and this README when behavior changes.

---

## License

Published under the **ISC License**.
