import React, { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx'
import { Navigate } from 'react-router-dom';
import Header from './Components/Header.jsx'
import DesignSystemProviderWrapper from './design-system/DesignSystemProviderWrapper.jsx'
import DSAppShell from './design-system/DSAppShell.jsx'

// ─── Eagerly loaded (critical path — minimal, always needed) ─────────────────
import LoginPage from './Pages/LoginPage.jsx'
import RegisterPage from './Pages/RegisterPage.jsx'

// ─── Lazily loaded (code-split — loaded only when navigated to) ──────────────
const LandingPage                 = lazy(() => import('./Pages/LandingPage.jsx'))

// ─── Lazily loaded (code-split — loaded only when navigated to) ──────────────
const Dashboard                   = lazy(() => import('./Pages/Dashboard.jsx'))
const ProfilePage                 = lazy(() => import('./Pages/ProfilePage.jsx'))
const VerifyEmailToken            = lazy(() => import('./Pages/VerifyEmailToken.jsx'))
const VerifyEmailResult           = lazy(() => import('./Pages/VerifyEmailResult.jsx'))
const ResetPassword               = lazy(() => import('./Pages/ResetPassword.jsx'))
const ForgotPassword              = lazy(() => import('./Pages/ForgotPassword.jsx'))
const ProjectsPage                = lazy(() => import('./Pages/ProjectsPage.jsx'))
const ProjectDetailsPage          = lazy(() => import('./Pages/ProjectDetailsPage.jsx'))
const TasksPage                   = lazy(() => import('./Pages/TasksPage.jsx'))
const TaskDetailsPage             = lazy(() => import('./Pages/TaskDetailsPage.jsx'))
const AttendancePage              = lazy(() => import('./Pages/AttendancePage.jsx'))
const LeavePage                   = lazy(() => import('./Pages/LeavePage.jsx'))
const AIWorkspace                 = lazy(() => import('./Pages/AIWorkspace.jsx'))
const EnterpriseAIPage            = lazy(() => import('./Pages/EnterpriseAIPage.jsx'))
const AdminSettingsPage           = lazy(() => import('./Pages/AdminSettingsPage.jsx'))
const AICopilot                   = lazy(() => import('./Components/AICopilot.jsx'))
const SuperAdminConsole           = lazy(() => import('./Pages/SuperAdminConsole.jsx'))
const ReportsPage                 = lazy(() => import('./Pages/ReportsPage.jsx'))
const ProjectIntelligenceDashboard = lazy(() => import('./Pages/ProjectIntelligenceDashboard.jsx'))
const ExecutiveDashboard          = lazy(() => import('./Pages/ExecutiveDashboard.jsx'))
const ChatHub                     = lazy(() => import('./Pages/ChatHub.jsx'))
const KnowledgeBase               = lazy(() => import('./Pages/KnowledgeBase.jsx'))
const TimeTracker                 = lazy(() => import('./Pages/TimeTracker.jsx'))
const WorkspaceCalendar           = lazy(() => import('./Pages/WorkspaceCalendar.jsx'))
const AfterRegister               = lazy(() => import('./Pages/AfterRegister.jsx'))
const SprintPlanningPage          = lazy(() => import('./Pages/SprintPlanningPage.jsx'))

// ─── Page-level loading fallback ─────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-950">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
    </div>
  </div>
);

// ─── Auth guard ───────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <PageLoader />;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  // Hide header & copilot on auth/landing pages for immersive dark experience
  const authPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password',
    '/after-register', '/verify-email-token', '/verify-email-result'];
  const isFullscreenPage = (!isLoggedIn && location.pathname === '/') ||
    authPaths.slice(1).includes(location.pathname);

  if (loading) return <PageLoader />;

  return (
    <DesignSystemProviderWrapper>
      <DSAppShell
        showHeader={!isFullscreenPage}
        header={!isFullscreenPage ? <Header /> : null}
        showCopilot={!isFullscreenPage}
        copilot={null}
        backgroundMode={isFullscreenPage ? 'hero' : 'subtle'}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* Public routes */}
            <Route path="/register"              element={<RegisterPage />} />
            <Route path="/login"                 element={<LoginPage />} />
            <Route path="/forgot-password"       element={<ForgotPassword />} />
            <Route path="/reset-password"        element={<ResetPassword />} />
            <Route path="/verify-email-token"    element={<VerifyEmailToken />} />
            <Route path="/verify-email-result"   element={<VerifyEmailResult />} />
            <Route path="/after-register"        element={<AfterRegister />} />

            {/* Protected routes */}
            <Route path="/profile"               element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/projects"              element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/projects/:id"          element={<ProtectedRoute><ProjectDetailsPage /></ProtectedRoute>} />
            <Route path="/projects/:id/intelligence" element={<ProtectedRoute><ProjectIntelligenceDashboard /></ProtectedRoute>} />
            <Route path="/tasks"                 element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            <Route path="/tasks/:id"             element={<ProtectedRoute><TaskDetailsPage /></ProtectedRoute>} />
            <Route path="/attendance"            element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
            <Route path="/leaves"                element={<ProtectedRoute><LeavePage /></ProtectedRoute>} />
            <Route path="/chat"                  element={<ProtectedRoute><ChatHub /></ProtectedRoute>} />
            <Route path="/kb"                    element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/time-tracker"          element={<ProtectedRoute><TimeTracker /></ProtectedRoute>} />
            <Route path="/calendar"              element={<ProtectedRoute><WorkspaceCalendar /></ProtectedRoute>} />
            <Route path="/ai-workspace"          element={<ProtectedRoute><AIWorkspace /></ProtectedRoute>} />
            <Route path="/enterprise-ai"         element={<ProtectedRoute><EnterpriseAIPage /></ProtectedRoute>} />
            <Route path="/admin-settings"        element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
            <Route path="/super-admin"           element={<ProtectedRoute><SuperAdminConsole /></ProtectedRoute>} />
            <Route path="/reports"               element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/dashboard"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/executive-dashboard"   element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
            <Route path="/sprint-planning"       element={<ProtectedRoute><SprintPlanningPage /></ProtectedRoute>} />

            {/* Root — dashboard if logged in, landing page otherwise */}
            <Route path="/"                      element={isLoggedIn ? <Dashboard /> : <LandingPage />} />

            {/* Catch-all */}
            <Route path="*"                      element={<Navigate to="/" />} />

          </Routes>
        </Suspense>

        {/* Lazy-loaded AI Copilot floating widget */}
        {!isFullscreenPage && (
          <Suspense fallback={null}>
            <AICopilot />
          </Suspense>
        )}
      </DSAppShell>
    </DesignSystemProviderWrapper>
  );
}

export default App