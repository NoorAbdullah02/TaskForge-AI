import React from 'react'
import RegisterPage from './Pages/RegisterPage.jsx'
import LoginPage from './Pages/LoginPage.jsx'
import Dashboard from './Pages/Dashboard.jsx'
import ProfilePage from './Pages/ProfilePage.jsx'
import VerifyEmailToken from './Pages/VerifyEmailToken.jsx'
import ResetPassword from './Pages/ResetPassword.jsx'
import ForgotPassword from './Pages/ForgotPassword.jsx'
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx'
import { Toaster } from 'react-hot-toast';
import Header from './Components/Header.jsx'
import AfterRegister from './Pages/AfterRegister.jsx'
import { Navigate, useNavigate } from 'react-router-dom';

const App = () => {

  const { isLoggedIn } = useAuth();


  return (
    <>
      <div className='min-h-screen bg-base-100'>
        <Header />
        <main>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/verify-email-token" element={<VerifyEmailToken />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/after-register" element={<AfterRegister />} />
            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </main>
      </div>
    </>
  );
}

export default App