# TaskForge AI

**An AI-augmented team, project, and workforce intelligence platform.**

TaskForge AI unifies workspace onboarding, project execution, employee operations, real-time collaboration, reporting, and AI-driven predictive analytics into a single cohesive product — built as a modern monorepo spanning a React frontend, an Express/TypeScript backend, and a Python FastAPI ML service.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
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
- [Pages & Routes](#pages--routes)
- [ML Prediction Endpoints](#ml-prediction-endpoints)
- [Notes](#notes)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

TaskForge AI provides:

- **Workspace onboarding** — invites, registration codes, and admin approval flows
- **Role-based access control** — super admins, workspace admins, team leads, and members
- **Project execution workflows** — sprints, epics, stories, tasks, and time tracking
- **Workforce operations** — attendance, leave management, and workspace calendaring
- **Real-time collaboration** — Socket.IO-powered chat hub, notifications, and live updates
- **Executive intelligence** — dashboards tailored for executives, PMs, owners, and employees
- **AI-assisted insights** — Gemini-powered workspace assistant, knowledge base Q&A, and AI-driven project intelligence
- **Predictive analytics** — ML models for delay, burnout, productivity, attendance, and resource allocation

---

## Features

### Project Management
- Create and manage **projects**, **epics**, **sprints**, and **tasks** with full CRUD
- Kanban boards, **Gantt chart** view, and sprint planning board
- Drag-and-drop task ordering and status transitions using `@dnd-kit`
- Task time tracking with detailed time logs
- File and image attachments via ImageKit
- Task-level comments and activity feed

### Team & Workforce
- Team creation with role assignments (employee, admin, super admin)
- **Attendance tracking** with morning/evening shift support
- **Leave management** with approval workflows
- **Workspace calendar** for shared scheduling
- Team-level reporting and member performance metrics

### Real-Time Collaboration
- **Chat Hub** with per-project and per-team channels powered by Socket.IO
- Live notifications for task updates, mentions, and assignments
- Presence indicators and typing signals

### AI Features
- **AI Workspace** — built-in chat assistant powered by Google Gemini for natural-language queries about your projects and data
- **Knowledge Base** — store, search, and query team documents with AI-assisted retrieval
- **Project Intelligence Dashboard** — AI-generated summaries, risk signals, and recommendations
- **Enterprise AI Page** — advanced AI-driven workflows for larger teams
- **Executive Dashboard** — high-level KPIs with AI narrative summaries

### Predictive ML Service
Five independent prediction endpoints backed by trained gradient-boosted models:

| Prediction | Description |
|---|---|
| Task Delay | Flags tasks likely to miss their deadline |
| Attendance | Models expected attendance per shift and team |
| Productivity | Surfaces productivity trends and anomalies |
| Resource Allocation | Identifies over/under-allocated team members |
| Burnout Risk | Early-warning signals for individual and team burnout |

### Authentication & Security
- JWT-based sessions with secure HTTP-only cookies
- Email verification (token-based) and **two-factor authentication (OTP)**
- Password reset flow via Nodemailer / Resend with MJML-templated emails
- Helmet HTTP security headers, CORS, rate limiting, and role-based guards
- Session management with IP and user-agent tracking

### Admin & Reporting
- **Admin Settings** — user management, workspace configuration, and billing
- **Super Admin Console** — multi-workspace governance and system-wide controls
- **Reports Page** — customisable charts (Recharts) for tasks, time, attendance, and productivity
- Swagger UI for full backend API documentation at `/api-docs`

---

## Repository Structure

```
TaskForge AI/
├── Backend/                  # Express + TypeScript API
│   └── src/
│       ├── config/           # Environment & app config
│       ├── controllers/      # Route handler functions
│       ├── db/               # Drizzle ORM schema & DB client
│       ├── emails/           # MJML transactional email templates
│       ├── middleware/       # Auth, error handling, validation guards
│       ├── repositories/     # Data access layer (queries)
│       ├── routes/           # Express routers
│       ├── services/         # Business logic & external integrations
│       ├── validations/      # Zod request schemas
│       └── workers/          # node-cron scheduled jobs & background tasks
│
├── frontend/                 # React 19 + Vite SPA
│   └── src/
│       ├── Pages/            # Top-level page components
│       ├── components/       # Shared UI components and design system
│       ├── store/            # Zustand global stores
│       └── lib/              # Utilities, hooks, and API clients (axios)
│
└── ml-service/               # FastAPI Python prediction service
    ├── routers/              # Endpoint routers per prediction domain
    ├── services/             # Predictor orchestration logic
    ├── schemas/              # Pydantic request/response models
    ├── models/               # Serialised trained model files (joblib)
    └── training/             # Model training scripts
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
| Recharts | Data visualisation charts |
| Three.js + @react-three/fiber | 3D landing page elements |
| Lenis | Smooth scroll |
| Lucide React | Icon set |
| react-hot-toast | Toast notifications |

### Backend

| Package | Purpose |
|---|---|
| Express 5 (TypeScript) | HTTP server & REST API |
| Drizzle ORM + drizzle-kit | Type-safe ORM & schema migrations |
| PostgreSQL (pg) | Primary relational database |
| Socket.IO | WebSocket server for real-time features |
| JWT + bcryptjs | Token-based auth & password hashing |
| Nodemailer + Resend + MJML | Transactional email delivery & templating |
| Google Generative AI (Gemini) | AI assistant & project intelligence |
| ImageKit | Cloud image & file storage |
| Multer | Multipart file upload handling |
| node-cron | Scheduled background jobs |
| Zod | Runtime request validation |
| Swagger UI Express | Auto-generated API documentation |
| Helmet | HTTP security headers |
| cookie-parser | Signed cookie handling |
| request-ip | IP address resolution |

### ML Service

| Package | Purpose |
|---|---|
| FastAPI + Uvicorn | Async HTTP server |
| scikit-learn | Core ML preprocessing & model utilities |
| XGBoost | Gradient-boosted tree models |
| LightGBM | Fast gradient-boosted models |
| CatBoost | Categorical feature gradient boosting |
| joblib | Model serialisation |
| pandas + numpy | Data manipulation & numerical computing |
| Pydantic | Request/response schema validation |
| httpx | Async HTTP client |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          Browser                            │
│                React 19 + Vite  (port 5173)                 │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP REST + WebSocket
┌────────────────────────▼────────────────────────────────────┐
│              Node.js / Express Backend  (port 4000)         │
│       Auth · Projects · Tasks · Chat · Workers · AI         │
│                  Drizzle ORM · Socket.IO                     │
└────────┬───────────────────────────────┬────────────────────┘
         │ SQL                           │ HTTP
┌────────▼──────────────┐   ┌───────────▼────────────────────┐
│    PostgreSQL DB       │   │   Python ML Service (port 8000) │
│                        │   │   FastAPI · XGBoost · LightGBM  │
└────────────────────────┘   └─────────────────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  External Services   │
                              │  Gemini · ImageKit   │
                              │  Resend · Nodemailer │
                              └─────────────────────┘
```

---

## Prerequisites

Ensure the following are installed and running before setup:

- **Node.js** 20 or newer + npm 10 or newer
- **Python** 3.10 or newer
- **PostgreSQL** 15 or newer (local or remote)
- API keys for: Google Gemini, ImageKit, Resend (or SMTP credentials)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/NoorAbdullah02/TaskForge-AI.git
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
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

Create `Backend/.env` (see [Environment Variables Reference](#environment-variables-reference) below).  
Create `frontend/.env` with:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 4. Start Required Services

Make sure PostgreSQL is running and accessible before proceeding.

### 5. Run the Application

Open a separate terminal for each service:

```bash
# Terminal 1 — Backend
npm run dev --prefix Backend
```

```bash
# Terminal 2 — Frontend
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
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Backend Swagger docs | http://localhost:4000/api-docs |
| ML Service | http://localhost:8000 |
| ML Service docs | http://localhost:8000/docs |

---

## Database & Migrations

TaskForge AI uses **Drizzle ORM**. After configuring your `DB_URL`, apply the schema:

```bash
npm run db:push --prefix Backend
```

To inspect and manage the database visually:

```bash
npm run db:studio --prefix Backend
```

---

## Available Scripts

### Backend (`Backend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start the backend in watch/development mode (nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled server from `dist/index.js` |
| `npm run db:push` | Apply the Drizzle schema to the database |
| `npm run db:studio` | Open Drizzle Studio GUI |

### Frontend (`frontend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build the production bundle |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

### ML Service (`ml-service/`)

| Command | Description |
|---|---|
| `python run.py` | Start the FastAPI ML service |
| `python -m pytest` | Run the test suite |

---

## Environment Variables Reference

### Backend (`Backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Backend server port (default `4000`) |
| `NODE_ENV` | Runtime environment (`development` / `production`) |
| `DB_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Frontend origin URL (for CORS) |
| `BACKEND_URL` | Backend base URL |
| `JWT_SECRET` | Secret key for signing access JWTs |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens |
| `GEMINI_API_KEY` | Google Gemini API key |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit CDN endpoint URL |
| `RESEND_API_KEY` | Resend email API key |
| `SMTP_HOST` | SMTP host (Nodemailer fallback) |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for backend API calls |

---

## Pages & Routes

| Page | Path | Description |
|---|---|---|
| Landing Page | `/` | Marketing homepage with 3D elements |
| Register | `/register` | Workspace registration |
| Login | `/login` | User login |
| Forgot Password | `/forgot-password` | Password reset initiation |
| Reset Password | `/reset-password` | New password form |
| Verify Email | `/verify-email` | Email verification flow |
| After Register | `/after-register` | Post-registration onboarding |
| Dashboard | `/dashboard` | Personal task and activity overview |
| Projects | `/projects` | All projects list |
| Project Details | `/projects/:id` | Project board, tasks, and members |
| Tasks | `/tasks` | Global task list |
| Task Details | `/tasks/:id` | Task detail view with comments |
| Sprint Planning | `/sprint-planning` | Sprint board and planning interface |
| Gantt Chart | `/gantt` | Gantt chart timeline view |
| Teams | `/teams` | Team management |
| Attendance | `/attendance` | Attendance records and check-in |
| Leave | `/leave` | Leave requests and approvals |
| Workspace Calendar | `/calendar` | Shared workspace calendar |
| Time Tracker | `/time-tracker` | Time log entry and reports |
| Chat Hub | `/chat` | Real-time team and project chat |
| Reports | `/reports` | Analytics and reporting charts |
| Knowledge Base | `/knowledge-base` | Team document library and AI Q&A |
| AI Workspace | `/ai-workspace` | Gemini-powered AI assistant |
| Enterprise AI | `/enterprise-ai` | Enterprise AI feature hub |
| Project Intelligence | `/project-intelligence` | AI-generated project insights |
| Executive Dashboard | `/executive-dashboard` | Executive KPI overview |
| Profile | `/profile` | User profile and settings |
| Admin Settings | `/admin` | Workspace admin configuration |
| Super Admin Console | `/super-admin` | Platform-wide administration |

---

## ML Prediction Endpoints

The ML service exposes five prediction groups under `/api/v1`:

| Route prefix | Models used | Prediction |
|---|---|---|
| `/delay` | XGBoost / LightGBM | Task delivery delay risk |
| `/attendance` | CatBoost / scikit-learn | Expected attendance |
| `/productivity` | LightGBM | Team productivity score |
| `/resource` | XGBoost | Resource allocation recommendations |
| `/burnout` | CatBoost | Individual / team burnout risk |

Full interactive documentation is available at `http://localhost:8000/docs` once the service is running.

---

## Notes

- The first user to register automatically becomes the **super admin** for the workspace.
- Workspace invites, approval flows, and member onboarding are core to the platform — review the Admin Settings page after first login.
- For the full AI-driven experience, both the **backend** and **ML service** must be running simultaneously.
- 2FA (OTP) can be enabled per user from the Profile page.

---

## Contributing

Contributions are welcome. Please open an issue to discuss your change before submitting a pull request. Ensure all linting passes (`npm run lint` in `frontend/`) and that your changes do not break existing API contracts.

---

## License

This project is published under the **ISC License**.
