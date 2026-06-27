# TaskForge AI — Frontend Audit & Redesign Plan

_Audit date: 2026-06-27 · Scope: `frontend/src` (React 19 + Vite + Tailwind v4)_

This is an audit-first deliverable. **No source files were changed.** It documents what
exists, what's inconsistent or broken, and a phased plan to reach the premium SaaS UI
described in the project brief — while preserving the existing architecture and reusing
what's already good.

---

## 1. Executive summary

The frontend is **not a blank slate** — there is already a real design-system foundation
(`src/design-system/`) with theme tokens and styled primitives (Button, Input, GlassCard,
Badge, Modal), plus a Three.js premium background, code-splitting, and lazy loading. The
problem is **adoption and consistency**, not absence.

The single biggest issue: **only 10 of 30 pages actually use the design system.** The
other ~20 pages — including the heaviest, most-used ones (Tasks, Projects, Task Details,
Project Details, Admin Settings, AI Workspace) — hand-roll their own styling inline, and
many mix a **light theme** (`bg-gray-100`, `bg-blue-50`, light pills) against a design
system built entirely for **dark glass surfaces** (`bg-white/[0.03]`, `text-white`). The
result is two visual languages competing in the same app.

Severity legend: 🔴 Critical (breaks consistency or function) · 🟠 High · 🟡 Medium.

---

## 2. What already exists and is worth keeping

| Asset | Location | Verdict |
|---|---|---|
| Theme tokens (colors, glass, radius, spacing, motion) | `design-system/theme.ts` | Good base — but **not wired into Tailwind** (see 🔴 below) |
| Styled primitives: Button, Input, GlassCard, Badge, Modal | `design-system/primitives.jsx` | Solid, reduced-motion aware — **underused** |
| App shell + background layering | `design-system/DSAppShell.jsx`, `BackgroundLayer.jsx` | Good pattern, one bug (see 🔴 #1) |
| Three.js aurora background | `design-system/background/TaskForgePremiumBackground.jsx` | Premium, reduced-motion aware — keep |
| Code-splitting + lazy routes | `App.jsx` | Already done well |
| 5 role dashboards using recharts + primitives | `Pages/dashboards/*` | Best-built part of the app — use as the template |
| Toaster, react-hot-toast (32 pages) | global in `DSAppShell` | Consistent toast story |

The 5 role dashboards are the highest-quality pages and should be the **reference standard**
the rest of the app is brought up to.

---

## 3. Findings

### 🔴 Critical

**C1 — App shell background relies on an undefined class.**
`DSAppShell.jsx` sets `className="min-h-screen bg-base-100"`. `bg-base-100` is a **DaisyUI**
class, but DaisyUI is not installed and no Tailwind config / `@theme` block defines it
(`index.css` is literally one line: `@import "tailwindcss";`). So the shell has **no real
base background color** — the screen is painted only by the 3D background. Any page that
doesn't paint its own background inherits nothing.

**C2 — Theme tokens are never connected to Tailwind v4.**
`theme.ts` defines a full token set (brand blue `#2563EB`, purple `#7C3AED`, semantic
colors, radii, spacing, motion easing). None of it is exposed to Tailwind via an `@theme`
block in `index.css`, so utilities like `bg-brand`, `rounded-lg` (custom), etc. don't
exist. Every page therefore picks **arbitrary** Tailwind values, which is the root cause of
color/spacing drift.

**C3 — Two competing visual themes (light vs dark).**
The primitives are dark-glass only (`GlassCard` → `bg-white/[0.03]`, `Input` → `text-white`).
Yet pages like `TasksPage` define light pills: `low: 'bg-gray-100 text-gray-700'`,
`medium: 'bg-blue-50 text-blue-700'`. The brief says "keep the background white but redesign
with premium SaaS styling," but the actual primitives assume dark. **A direction must be
picked and enforced** (see Decision Needed, §6).

**C4 — Design system adoption ≈ 33%.**
Pages importing `design-system`: **10 / 30** (the 5 dashboards, Login, Register, Landing,
ForgotPassword, ResetPassword). The other 20 — including the largest — reimplement glass
cards, buttons, inputs, and status colors inline.

### 🟠 High

**H1 — Monolithic page files.** Several pages are far too large to keep consistent or
performant: `AdminSettingsPage` 1950, `AIWorkspace` 1743, `TaskDetailsPage` 1297,
`ProjectDetailsPage` 1201, `ProfilePage` 1079, `ProjectsPage` 841 LOC. These need to be
decomposed into reusable sections/components.

**H2 — Duplicated status/priority/color maps.** `PRIORITY_COLORS`, `STATUS_LABELS`, etc.
are redefined per page rather than living in one shared module — guaranteeing they drift.

**H3 — Dead / duplicate components.** `Components/GlassCard.jsx` is **never imported**
(a second GlassCard exists in `primitives.jsx`). Confusing and a drift risk. Pick one.

**H4 — Chart styling is not standardized.** recharts is used on 7 pages (38 Bar, 22 Pie,
15 Area, 11 Line, 10 Radar charts) but there is **no shared chart theme/wrapper** — each
chart sets its own colors, grid, tooltip. No `Components/charts/` directory exists.

**H5 — Missing chart types the brief requires.** No burndown, burnup, sprint-velocity,
calendar-heatmap, or activity-heatmap components were found. `GanttChartPage` exists (287
LOC) but the agile/analytics chart library is incomplete.

### 🟡 Medium

**M1 — Copilot wiring is half-dead.** `App.jsx` passes `copilot={null}` to `DSAppShell`
and then renders `<AICopilot />` separately; the shell's `showCopilot`/`copilot` props are
effectively unused.

**M2 — No shared layout primitives.** No `PageHeader`, `PageContainer`, `EmptyState`,
`StatCard`, `DataTable`, or `Skeleton` components — each page rebuilds these, so spacing and
typography vary page to page.

**M3 — Loader inconsistency.** `App.jsx` `PageLoader` uses `bg-gray-950` (hardcoded dark),
which won't match if a light/white direction is chosen — symptom of C2/C3.

**M4 — Typography scale not defined.** No shared heading scale; headings range from
`text-lg` to `text-3xl` ad hoc across pages.

---

## 4. The proposed design-system foundation (Phase 0)

Before touching any page, establish the single source of truth so every later change is
cheap and consistent.

1. **Wire tokens into Tailwind v4** — add an `@theme` block to `index.css` exposing brand
   colors, semantic colors, radii, spacing, shadows, and the motion easing from `theme.ts`.
   This makes `bg-brand`, `text-brand`, `rounded-card`, `shadow-glass` real utilities.
2. **Fix the shell background (C1)** — replace `bg-base-100` with a defined token surface.
3. **Pick one theme and codify it (C3)** — see §6; update primitives + loader to match.
4. **Add shared layout primitives (M2)** — `PageContainer`, `PageHeader`, `StatCard`,
   `EmptyState`, `Skeleton`, `DataTable`, `SectionCard`.
5. **Centralize constants (H2)** — one `lib/uiMaps.js` for status/priority/role colors+labels.
6. **Create a chart kit (H4/H5)** — `Components/charts/` with a themed `ChartCard` wrapper
   and standardized Pie/Line/Bar/Area/Radar, plus Burndown, Burnup, Velocity, and
   CalendarHeatmap built on recharts.
7. **Delete dead code (H3)** — remove unused `Components/GlassCard.jsx`.

---

## 5. Phased redesign roadmap

**Phase 0 — Foundation (highest leverage).** Items in §4. Nothing visual ships yet, but it
unblocks consistent, fast work everywhere after. _Est: 1 focused batch._

**Phase 1 — Public surface.** Landing, Login, Register, Forgot/Reset, verify-email pages.
Highest first-impression value; these already use the DS so it's polish, not rewrite.

**Phase 2 — Dashboards & shell.** Header (role-aware nav), the 5 role dashboards, and the
shared chart kit. Make the dashboards feel like "Jira + Linear + ClickUp."

**Phase 3 — Core workflow pages.** Projects, Project Details, Tasks, Task Details, Kanban,
Sprint Planning, Gantt. Migrate to DS + decompose the monoliths (H1).

**Phase 4 — Secondary pages.** Attendance, Leave, Time Tracker, Calendar, Reports, Teams,
Chat, Knowledge Base, AI Workspace, Enterprise AI, Admin Settings, Super Admin.

**Phase 5 — Polish & perf.** Skeletons everywhere, hover/transition consistency,
memoization of heavy lists, reduced-motion checks, responsive QA.

---

## 6. Decision needed before code (the one real fork)

The brief says "keep the background **white**, premium SaaS styling," but the existing
design system and 3D background are built for a **dark** surface. These can't both be the
default. Three viable directions:

- **A — Dark premium (least rework):** Embrace the existing dark glass system; fix the
  light-themed pages to match. Fastest path to consistency; matches Linear's aesthetic.
- **B — Light premium (matches the brief literally):** Rebuild primitives for a white/glass
  light surface; matches the brief but means reworking the design system and background.
- **C — Dual theme (most work):** Proper light+dark theming with a toggle. Most flexible,
  most effort.

I recommend confirming this before Phase 0, because it determines how the primitives and
the 3D background are tuned.

---

## 7. Quick wins (low risk, do anytime)

- Fix `bg-base-100` (C1) — one-line, removes an invisible-but-real bug.
- Delete unused `Components/GlassCard.jsx` (H3).
- Extract status/priority maps to `lib/uiMaps.js` (H2).
- Make `PageLoader` use a token surface, not hardcoded `bg-gray-950` (M3).

---

_Next step: confirm the theme direction in §6, then I'll execute Phase 0 (the foundation)
as the first code batch._
