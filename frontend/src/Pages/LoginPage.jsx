import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle, XCircle, Loader, LogIn, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { loginUser, verify2Fa } from '../Services/authApi';
import api from '../Services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA/OTP States
  const [is2FaRequired, setIs2FaRequired] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(300);

  const isEmailValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const navigate = useNavigate();
  const { login } = useAuth();

  // 2FA Countdown Timer
  useEffect(() => {
    let interval = null;
    if (is2FaRequired && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [is2FaRequired, otpTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEmailValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const payload = { email: email.toLowerCase(), password };
      const data = await loginUser(payload);

      if (data.message === '2FA_REQUIRED') {
        setIs2FaRequired(true);
        setOtpEmail(data.email || email.toLowerCase());
        setOtpTimer(300);
        toast.success('2FA verification code sent to your email! ✉️');
        setIsLoading(false);
        return;
      }

      try {
        const me = await api.get('/users/me');
        if (me.data?.user) {
          login(me.data.user);
        }
      } catch (err) {
        // ignore
      }

      toast.success(data.message || 'Welcome back! 🎉');

      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }

      setEmail('');
      setPassword('');
      setRememberMe(false);

      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const msg = err?.response?.data?.message || err.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter a 6-digit verification code');
      return;
    }
    setIsLoading(true);
    try {
      const data = await verify2Fa({ email: otpEmail, otp: otpCode });

      try {
        const me = await api.get('/users/me');
        if (me.data?.user) {
          login(me.data.user);
        }
      } catch (err) {
        // ignore
      }

      toast.success(data.message || 'Welcome back! 🎉');

      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }

      setEmail('');
      setPassword('');
      setOtpCode('');
      setIs2FaRequired(false);

      navigate('/');
    } catch (err) {
      console.error('2FA verification error:', err);
      const msg = err?.response?.data?.message || err.message || 'Verification failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const payload = { email: otpEmail, password };
      await loginUser(payload);
      setOtpTimer(300);
      toast.success('A new 2FA verification code has been sent! ✉️');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to resend verification code.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = 'http://localhost:4000/api/auth/google';
  };

  const handleGithubSignIn = () => {
    window.location.href = 'http://localhost:4000/api/auth/github';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="inline-block mb-6">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              TaskForge AI
            </span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {is2FaRequired ? 'Two-Factor Auth' : 'Welcome back'}
          </h1>
          <p className="text-gray-400">
            {is2FaRequired ? 'Enter the verification code sent to your email' : 'Sign in to continue to your workspace'}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {is2FaRequired ? (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="text-center">
                <span className="text-sm font-semibold text-indigo-400 block mb-1">{otpEmail}</span>
                <p className="text-xs text-gray-500">Code is valid for 5 minutes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-lg"
                    placeholder="000000"
                  />
                </div>
                <div className="flex justify-between items-center mt-3 text-xs">
                  <span className="text-gray-500">
                    {otpTimer > 0 ? (
                      <>Expires in <span className="text-indigo-400 font-medium">{formatTimer(otpTimer)}</span></>
                    ) : (
                      <span className="text-red-400">Code expired</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpTimer > 0 || isLoading}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Resend Code
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm shadow-lg shadow-white/5"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIs2FaRequired(false);
                  setOtpCode('');
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-400 transition-colors mt-2"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all text-sm font-medium text-gray-300 group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
                <button
                  onClick={handleGithubSignIn}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all text-sm font-medium text-gray-300 group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0a0a0f] px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-white/[0.03] text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all text-sm ${email && !isEmailValid
                        ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500'
                        : isEmailValid
                          ? 'border-emerald-500/50 focus:ring-emerald-500/20 focus:border-emerald-500'
                          : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-500/50'
                        }`}
                      placeholder="you@example.com"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {email && isEmailValid && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      {email && !isEmailValid && <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/20 cursor-pointer"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !isEmailValid || !password}
                  className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm shadow-lg shadow-white/5"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-gray-500 text-sm mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign up
          </Link>
        </motion.p>

        <motion.p
          className="text-center text-gray-600 text-xs mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          By signing in, you agree to our{' '}
          <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>
        </motion.p>
      </div>
    </div>
  );
};

export default LoginPage;