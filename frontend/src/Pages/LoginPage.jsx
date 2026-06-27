import { useState, useEffect, useRef, useMemo } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { loginUser, verify2Fa } from '../Services/authApi';
import api from '../Services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../design-system/primitives';

/* ── 3D: floating distorted orb ── */
function Orb({ position, color, scale = 1, speed = 1.5, distort = 0.35 }) {
  const mesh = useRef(null);
  useFrame((s) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = s.clock.getElapsedTime() * 0.15 * speed;
    mesh.current.rotation.y = s.clock.getElapsedTime() * 0.2 * speed;
  });
  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={0.7}>
      <mesh ref={mesh} position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={2}
          roughness={0.05}
          metalness={0.3}
          transparent
          opacity={0.22}
        />
      </mesh>
    </Float>
  );
}

/* ── 3D: particle cloud ── */
function Particles({ count = 110 }) {
  const ref = useRef(null);
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 9;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
      const c = new THREE.Color();
      c.setHSL(0.67 + Math.random() * 0.15, 0.65, 0.62);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count]);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.getElapsedTime() * 0.018;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

/* ── 3D: scene ── */
function AuthScene() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 4]} intensity={0.9} />
      <Orb position={[-1.4, 1.6, 0]} color="#6366f1" scale={2.4} speed={1.1} distort={0.42} />
      <Orb position={[1.8, -0.8, -1]} color="#8b5cf6" scale={1.6} speed={1.7} distort={0.3} />
      <Orb position={[0.2, -2.2, 0.5]} color="#06b6d4" scale={1.1} speed={2.1} distort={0.5} />
      <Particles count={110} />
    </>
  );
}

/* ── Framer Motion variants ── */
const formWrap  = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fieldItem = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const FEATURES = [
  { icon: Zap,       label: 'AI-powered task automation' },
  { icon: BarChart3, label: 'Real-time sprint analytics' },
  { icon: Shield,    label: 'Enterprise-grade security' },
];

/* ── Main component ── */
const LoginPage = () => {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [rememberMe, setRememberMe]         = useState(false);
  const [is2FaRequired, setIs2FaRequired]   = useState(false);
  const [otpEmail, setOtpEmail]             = useState('');
  const [otpCode, setOtpCode]               = useState('');
  const [otpTimer, setOtpTimer]             = useState(300);

  const isEmailValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const navigate = useNavigate();
  const { login } = useAuth();
  const panelRef = useRef(null);

  /* OTP countdown */
  useEffect(() => {
    let t = null;
    if (is2FaRequired && otpTimer > 0) {
      t = setInterval(() => setOtpTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(t);
  }, [is2FaRequired, otpTimer]);

  /* GSAP entrance for left panel */
  useEffect(() => {
    if (!panelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ delay: 0.25 })
        .from('.login-brand',   { opacity: 0, y: 30,  duration: 0.8,  ease: 'power3.out' })
        .from('.login-heading', { opacity: 0, y: 22,  duration: 0.75, ease: 'power3.out' }, '-=0.4')
        .from('.login-sub',     { opacity: 0, y: 14,  duration: 0.6,  ease: 'power2.out' }, '-=0.35')
        .from('.login-feat',    { opacity: 0, x: -20, duration: 0.55, stagger: 0.1, ease: 'power2.out' }, '-=0.25');
    }, panelRef);
    return () => ctx.revert();
  }, []);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* Login submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailValid) { toast.error('Please enter a valid email address'); return; }
    if (!password)     { toast.error('Please enter your password'); return; }
    setIsLoading(true);
    try {
      const data = await loginUser({ email: email.toLowerCase(), password });
      if (data.message === '2FA_REQUIRED') {
        setIs2FaRequired(true);
        setOtpEmail(data.email || email.toLowerCase());
        setOtpTimer(300);
        toast.success('2FA verification code sent to your email! ✉️');
        setIsLoading(false);
        return;
      }
      try { const me = await api.get('/users/me'); if (me.data?.user) login(me.data.user); } catch (_) {}
      toast.success(data.message || 'Welcome back! 🎉');
      if (rememberMe) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');
      setEmail(''); setPassword(''); setRememberMe(false);
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* 2FA submit */
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) { toast.error('Please enter a 6-digit verification code'); return; }
    setIsLoading(true);
    try {
      const data = await verify2Fa({ email: otpEmail, otp: otpCode });
      try { const me = await api.get('/users/me'); if (me.data?.user) login(me.data.user); } catch (_) {}
      toast.success(data.message || 'Welcome back! 🎉');
      if (rememberMe) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');
      setEmail(''); setPassword(''); setOtpCode(''); setIs2FaRequired(false);
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* Resend OTP */
  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await loginUser({ email: otpEmail, password });
      setOtpTimer(300);
      toast.success('A new 2FA verification code has been sent! ✉️');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => { window.location.href = 'http://localhost:4000/api/auth/google'; };
  const handleGithubSignIn = () => { window.location.href = 'http://localhost:4000/api/auth/github'; };

  const inp =
    'w-full pl-11 pr-11 py-3.5 rounded-2xl border bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all';

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ── Left visual panel ── */}
      <div
        ref={panelRef}
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 sticky top-0 h-screen flex-col overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #f0f4ff 0%, #ede9fe 55%, #e0f2fe 100%)' }}
      >
        {/* Three.js canvas */}
        <div className="absolute inset-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.5]}>
            <AuthScene />
          </Canvas>
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right,rgba(99,102,241,0.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(99,102,241,0.07) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
            opacity: 0.7,
          }}
        />

        {/* Ambient blobs */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.14) 0%,transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Brand */}
          <Link to="/" className="login-brand inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900">
              TaskForge <span className="text-indigo-600">AI</span>
            </span>
          </Link>

          {/* Headline + features */}
          <div>
            <h2 className="login-heading text-3xl xl:text-4xl font-black text-gray-900 leading-tight mb-3">
              Manage smarter.<br />
              <span className="text-indigo-600">Ship faster.</span>
            </h2>
            <p className="login-sub text-gray-500 text-sm leading-relaxed mb-8 max-w-xs">
              The AI-native project management platform built for high-performing teams.
            </p>
            <div className="space-y-3.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="login-feat flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm border border-indigo-100 flex-shrink-0">
                    <Icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b'].map((c, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: c }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">2,400+</span> teams trust TaskForge AI
            </p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white overflow-y-auto min-h-screen">
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <motion.div
            className="lg:hidden text-center mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="inline-flex items-center gap-2 justify-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900">
                TaskForge <span className="text-indigo-600">AI</span>
              </span>
            </Link>
          </motion.div>

          <AnimatePresence mode="wait">
            {is2FaRequired ? (
              /* ── 2FA view ── */
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Two-Factor Auth</h1>
                  <p className="text-sm text-gray-500">
                    Code sent to <span className="font-semibold text-indigo-600">{otpEmail}</span>
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Verification Code
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-300 tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-lg"
                        placeholder="000000"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-between items-center mt-3 text-xs">
                      <span className="text-gray-400">
                        {otpTimer > 0 ? (
                          <>Expires in <span className="text-indigo-600 font-semibold">{fmt(otpTimer)}</span></>
                        ) : (
                          <span className="text-red-500">Code expired</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpTimer > 0 || isLoading}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    isLoading={isLoading}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setIs2FaRequired(false); setOtpCode(''); }}
                    className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ── Login view ── */
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h1>
                  <p className="text-sm text-gray-500">Sign in to continue to your workspace</p>
                </motion.div>

                {/* OAuth */}
                <motion.div
                  className="grid grid-cols-2 gap-3 mb-6"
                  variants={formWrap}
                  initial="hidden"
                  animate="show"
                >
                  <motion.button
                    variants={fieldItem}
                    type="button"
                    onClick={handleGoogleSignIn}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold text-gray-700 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </motion.button>
                  <motion.button
                    variants={fieldItem}
                    type="button"
                    onClick={handleGithubSignIn}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold text-gray-700 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </motion.button>
                </motion.div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      or continue with email
                    </span>
                  </div>
                </div>

                {/* Form */}
                <motion.form
                  onSubmit={handleSubmit}
                  variants={formWrap}
                  initial="hidden"
                  animate="show"
                  className="space-y-5"
                >
                  {/* Email */}
                  <motion.div variants={fieldItem}>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inp} ${
                          email && !isEmailValid
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                            : isEmailValid
                              ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-400'
                              : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-400'
                        }`}
                        placeholder="you@example.com"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {email && isEmailValid  && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {email && !isEmailValid && <XCircle     className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>
                  </motion.div>

                  {/* Password */}
                  <motion.div variants={fieldItem}>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inp} border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-400`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  {/* Remember / Forgot */}
                  <motion.div variants={fieldItem} className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer accent-indigo-600"
                      />
                      <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-semibold"
                    >
                      Forgot password?
                    </button>
                  </motion.div>

                  {/* Submit */}
                  <motion.div variants={fieldItem}>
                    <Button
                      type="submit"
                      disabled={isLoading || !isEmailValid || !password}
                      isLoading={isLoading}
                      icon={ArrowRight}
                      iconPosition="right"
                      className="w-full"
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </motion.div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer links */}
          <motion.p
            className="text-center text-sm text-gray-400 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
              Sign up
            </Link>
          </motion.p>
          <motion.p
            className="text-center text-xs text-gray-300 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            By signing in, you agree to our{' '}
            <span className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">Terms of Service</span>
          </motion.p>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
