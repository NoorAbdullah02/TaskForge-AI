import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Header from './Components/Header.jsx'
import DesignSystemProviderWrapper from './design-system/DesignSystemProviderWrapper.jsx'
import DSAppShell from './design-system/DSAppShell.jsx'
import useLenisSmoothScroll from './hooks/useLenisSmoothScroll.js'

/* ── All pages lazy-loaded (including auth pages which pull in framer/three) ── */
const LoginPage                    = lazy(() => import('./Pages/LoginPage.jsx'))
const RegisterPage                 = lazy(() => import('./Pages/RegisterPage.jsx'))
const LandingPage                  = lazy(() => import('./Pages/LandingPage.jsx'))
const Dashboard                    = lazy(() => import('./Pages/Dashboard.jsx'))
const ProfilePage                  = lazy(() => import('./Pages/ProfilePage.jsx'))
const VerifyEmailToken             = lazy(() => import('./Pages/VerifyEmailToken.jsx'))
const VerifyEmailResult            = lazy(() => import('./Pages/VerifyEmailResult.jsx'))
const ResetPassword                = lazy(() => import('./Pages/ResetPassword.jsx'))
const ForgotPassword               = lazy(() => import('./Pages/ForgotPassword.jsx'))
const ProjectsPage                 = lazy(() => import('./Pages/ProjectsPage.jsx'))
const ProjectDetailsPage           = lazy(() => import('./Pages/ProjectDetailsPage.jsx'))
const TasksPage                    = lazy(() => import('./Pages/TasksPage.jsx'))
const TaskDetailsPage              = lazy(() => import('./Pages/TaskDetailsPage.jsx'))
const AttendancePage               = lazy(() => import('./Pages/AttendancePage.jsx'))
const LeavePage                    = lazy(() => import('./Pages/LeavePage.jsx'))
const AIWorkspace                  = lazy(() => import('./Pages/AIWorkspace.jsx'))
const EnterpriseAIPage             = lazy(() => import('./Pages/EnterpriseAIPage.jsx'))
const AdminSettingsPage            = lazy(() => import('./Pages/AdminSettingsPage.jsx'))
const AICopilot                    = lazy(() => import('./Components/AICopilot.jsx'))
const SuperAdminConsole            = lazy(() => import('./Pages/SuperAdminConsole.jsx'))
const ReportsPage                  = lazy(() => import('./Pages/ReportsPage.jsx'))
const ProjectIntelligenceDashboard = lazy(() => import('./Pages/ProjectIntelligenceDashboard.jsx'))
const ExecutiveDashboard           = lazy(() => import('./Pages/ExecutiveDashboard.jsx'))
const ChatHub                      = lazy(() => import('./Pages/ChatHub.jsx'))
const KnowledgeBase                = lazy(() => import('./Pages/KnowledgeBase.jsx'))
const TimeTracker                  = lazy(() => import('./Pages/TimeTracker.jsx'))
const WorkLogPage                  = lazy(() => import('./Pages/WorkLogPage.jsx'))
const TimesheetPage                = lazy(() => import('./Pages/TimesheetPage.jsx'))
const WorkspaceCalendar            = lazy(() => import('./Pages/WorkspaceCalendar.jsx'))
const AfterRegister                = lazy(() => import('./Pages/AfterRegister.jsx'))
const SprintPlanningPage           = lazy(() => import('./Pages/SprintPlanningPage.jsx'))
const BillingPage                  = lazy(() => import('./Pages/BillingPage.jsx'))

/* ── Page loader: top progress bar + subtle fade, no layout-shifting spinner ── */
const PageLoader = () => (
  <div className="fixed inset-0 z-9999 pointer-events-none">
    {/* Thin top progress bar */}
    <div className="absolute top-0 left-0 h-[2px] bg-linear-to-r from-blue-500 via-indigo-500 to-purple-500 animate-[progress_1.4s_ease-in-out_infinite]"
      style={{ width: '100%' }} />
    {/* Centered subtle spinner — no large layout shifts */}
    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
        <span className="text-sm font-medium text-slate-500">Loading…</span>
      </div>
    </div>
  </div>
);

/* ── Auth loader: used only for the initial /users/me check — minimal ── */
const AuthLoader = () => (
  <div className="fixed inset-0 bg-white flex items-center justify-center">
    <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <AuthLoader />;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const App = () => {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();
  useLenisSmoothScroll();

  const authPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password',
    '/after-register', '/verify-email-token', '/verify-email-result'];
  const isFullscreenPage = (!isLoggedIn && location.pathname === '/') ||
    authPaths.slice(1).includes(location.pathname);

  if (loading) return <AuthLoader />;

  return (
    <DesignSystemProviderWrapper>
      <DSAppShell
        showHeader={!isFullscreenPage}
        header={!isFullscreenPage ? <Header /> : null}
        showCopilot={!isFullscreenPage}
        copilot={
          !isFullscreenPage ? (
            <Suspense fallback={null}>
              <AICopilot />
            </Suspense>
          ) : null
        }
        backgroundMode="app"
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
            <Route path="/work-log"              element={<ProtectedRoute><WorkLogPage /></ProtectedRoute>} />
            <Route path="/timesheet"             element={<ProtectedRoute><TimesheetPage /></ProtectedRoute>} />
            <Route path="/calendar"              element={<ProtectedRoute><WorkspaceCalendar /></ProtectedRoute>} />
            <Route path="/ai-workspace"          element={<ProtectedRoute><AIWorkspace /></ProtectedRoute>} />
            <Route path="/enterprise-ai"         element={<ProtectedRoute><EnterpriseAIPage /></ProtectedRoute>} />
            <Route path="/admin-settings"        element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
            <Route path="/super-admin"           element={<ProtectedRoute><SuperAdminConsole /></ProtectedRoute>} />
            <Route path="/reports"               element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/dashboard"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/executive-dashboard"   element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
            <Route path="/sprint-planning"       element={<ProtectedRoute><SprintPlanningPage /></ProtectedRoute>} />
            <Route path="/billing"               element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />

            <Route path="/"                      element={isLoggedIn ? <Dashboard /> : <LandingPage />} />
            <Route path="*"                      element={<Navigate to="/" />} />

          </Routes>
        </Suspense>
      </DSAppShell>
    </DesignSystemProviderWrapper>
  );
}

export default App
