import React from 'react'
import RegisterPage from './Pages/RegisterPage.jsx'
import LoginPage from './Pages/LoginPage.jsx'
import Dashboard from './Pages/Dashboard.jsx'
import ProfilePage from './Pages/ProfilePage.jsx'
import VerifyEmailToken from './Pages/VerifyEmailToken.jsx'
import ResetPassword from './Pages/ResetPassword.jsx'
import ForgotPassword from './Pages/ForgotPassword.jsx'
import ProjectsPage from './Pages/ProjectsPage.jsx'
import ProjectDetailsPage from './Pages/ProjectDetailsPage.jsx'
import TasksPage from './Pages/TasksPage.jsx'
import TaskDetailsPage from './Pages/TaskDetailsPage.jsx'
import AttendancePage from './Pages/AttendancePage.jsx'
import LeavePage from './Pages/LeavePage.jsx'
import AIWorkspace from './Pages/AIWorkspace.jsx'
import AdminSettingsPage from './Pages/AdminSettingsPage.jsx'
import AICopilot from './Components/AICopilot.jsx'
import LandingPage from './Pages/LandingPage.jsx'
import { Routes, Route, useLocation } from 'react-router-dom';


import { useAuth } from './context/AuthContext.jsx'
import { Toaster } from 'react-hot-toast';
import Header from './Components/Header.jsx'
import AfterRegister from './Pages/AfterRegister.jsx'
import { Navigate, useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const App = () => {

  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  // Hide header & copilot on auth and landing pages for immersive dark experience
  const authPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  const isFullscreenPage = (!isLoggedIn && location.pathname === '/') || authPaths.slice(1).includes(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className='min-h-screen bg-base-100'>
        {!isFullscreenPage && <Header />}
        <main>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/verify-email-token" element={<VerifyEmailToken />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailsPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetailsPage /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
            <Route path="/leaves" element={<ProtectedRoute><LeavePage /></ProtectedRoute>} />
            <Route path="/ai-workspace" element={<ProtectedRoute><AIWorkspace /></ProtectedRoute>} />
            <Route path="/admin-settings" element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/" element={isLoggedIn ? <Dashboard /> : <LandingPage />} />

            <Route path="/after-register" element={<AfterRegister />} />
            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </main>
        {!isFullscreenPage && <AICopilot />}
      </div>
    </>
  );
}

export default App