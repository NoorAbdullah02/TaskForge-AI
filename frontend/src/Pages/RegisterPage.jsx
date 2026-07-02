import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mail, Lock, User, Eye, EyeOff, CheckCircle, XCircle,
  ArrowRight, Building, Key, Zap, Users, GitBranch, Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { checkEmailExists, registerUser, getSetupStatus } from '../Services/authApi';
import { createWorkspace, joinWorkspace } from '../Services/workspaceApi';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../design-system/primitives';
import { isPasswordStrong, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

/* ── 3D: distorted orb ── */
function Orb({ position, color, scale = 1, speed = 1.5, distort = 0.35 }) {
  const mesh = useRef(null);
  useFrame((s) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = s.clock.getElapsedTime() * 0.13 * speed;
    mesh.current.rotation.y = s.clock.getElapsedTime() * 0.18 * speed;
  });
  return (
    <Float speed={speed} rotationIntensity={0.35} floatIntensity={0.65}>
      <mesh ref={mesh} position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={1.8}
          roughness={0.06}
          metalness={0.28}
          transparent
          opacity={0.2}
        />
      </mesh>
    </Float>
  );
}

/* ── 3D: wireframe torus knot ── */
function WireKnot() {
  const mesh = useRef(null);
  useFrame((s) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = s.clock.getElapsedTime() * 0.1;
    mesh.current.rotation.y = s.clock.getElapsedTime() * 0.14;
  });
  return (
    <Float speed={1.1} floatIntensity={0.5} rotationIntensity={0.25}>
      <mesh ref={mesh} position={[0.5, 0, -1.5]}>
        <torusKnotGeometry args={[1.1, 0.3, 120, 14]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.14} />
      </mesh>
    </Float>
  );
}

/* ── 3D: particle field ── */
function Particles({ count = 120 }) {
  const ref = useRef(null);
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      const c = new THREE.Color();
      c.setHSL(0.72 + Math.random() * 0.14, 0.6, 0.64);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count]);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.getElapsedTime() * 0.016;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.048} vertexColors transparent opacity={0.48} sizeAttenuation />
    </points>
  );
}

/* ── 3D: cursor-reactive parallax group ── */
function ParallaxGroup({ children }) {
  const group = useRef(null);
  const { pointer } = useThree();
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += (pointer.x * 0.3 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-pointer.y * 0.2 - group.current.rotation.x) * 0.04;
  });
  return <group ref={group}>{children}</group>;
}

/* ── 3D: scene for register ── */
function RegScene() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 7, 3]} intensity={0.85} />
      <ParallaxGroup>
        <Orb position={[1.6, 1.8, 0]} color="#8b5cf6" scale={2.2} speed={1.0} distort={0.4} />
        <Orb position={[-1.9, -0.7, -1]} color="#10b981" scale={1.5} speed={1.6} distort={0.32} />
        <Orb position={[0.1, -2.3, 0.4]} color="#e11d48" scale={1.0} speed={2.0} distort={0.48} />
        <WireKnot />
        <Particles count={120} />
      </ParallaxGroup>
    </>
  );
}

/* ── Framer Motion variants ── */
const formWrap = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fieldItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
};

const FEATURES = [
  { icon: Users, label: 'Collaborative workspaces for your team' },
  { icon: GitBranch, label: 'Sprint planning and backlog management' },
  { icon: Brain, label: 'AI assistant for smarter workflows' },
];

/* ── Password strength helper ── */
function getPasswordStrength(pwd) {
  if (!pwd) return { level: 0, text: '', color: '' };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[!@#$%^&*]/.test(pwd)) s++;
  if (s <= 2) return { level: 1, text: 'Weak', color: 'bg-red-500' };
  if (s <= 3) return { level: 2, text: 'Fair', color: 'bg-amber-500' };
  if (s <= 4) return { level: 3, text: 'Good', color: 'bg-blue-500' };
  return { level: 4, text: 'Strong', color: 'bg-emerald-500' };
}

/* ── Main component ── */
const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [firstTimeSetup, setFirstTimeSetup] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [workspacePassword, setWorkspacePassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const panelRef = useRef(null);

  /* Pre-fill invite code from URL */
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) { setInviteCode(code); setActiveTab('join'); }
  }, [searchParams]);

  /* Check setup status */
  useEffect(() => {
    const check = async () => {
      try {
        const data = await getSetupStatus();
        setFirstTimeSetup(data.firstTimeSetup);
      } catch (_) { }
    };
    check();
  }, []);

  /* GSAP entrance for left panel */
  useEffect(() => {
    if (!panelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ delay: 0.2 })
        .from('.reg-brand', { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' })
        .from('.reg-heading', { opacity: 0, y: 22, duration: 0.75, ease: 'power3.out' }, '-=0.4')
        .from('.reg-sub', { opacity: 0, y: 14, duration: 0.6, ease: 'power2.out' }, '-=0.35')
        .from('.reg-feat', { opacity: 0, x: -20, duration: 0.55, stagger: 0.1, ease: 'power2.out' }, '-=0.25');
    }, panelRef);
    return () => ctx.revert();
  }, []);

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordStrength = getPasswordStrength(password);
  const isEmailValid = email && !emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleEmailChange = async (e) => {
    const v = e.target.value;
    setEmail(v);
    setEmailError('');
    if (!v) return;
    if (!validateEmail(v)) { setEmailError('Please enter a valid email address'); return; }
    setCheckingEmail(true);
    try {
      const exists = await checkEmailExists(v);
      if (exists) setEmailError('Email already registered. Please use a different email.');
      else setEmailError('');
    } catch (err) {
      setEmailError(err?.message || 'Unable to verify email. Please try again.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError) { toast.error('Please fix the email error'); return; }
    if (!isPasswordStrong(password)) { toast.error(PASSWORD_POLICY_MESSAGE); return; }
    if (!passwordsMatch) { toast.error('Passwords do not match!'); return; }
    setIsLoading(true);
    try {
      if (firstTimeSetup) {
        await registerUser({ name, email, password });
        toast.success('Super Admin account created successfully! 🎉');
        setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
        navigate('/login');
        return;
      }
      if (activeTab === 'create') {
        if (!workspaceName.trim() || !workspaceSlug.trim()) {
          toast.error('Workspace details are required');
          setIsLoading(false);
          return;
        }
        const res = await createWorkspace({
          name, email, password,
          workspaceName: workspaceName.trim(),
          workspaceSlug: workspaceSlug.toLowerCase().trim(),
        });
        toast.success(res.message || 'Workspace created successfully! 🎉');
      } else {
        if (!inviteCode.trim()) {
          toast.error('Invite code is required');
          setIsLoading(false);
          return;
        }
        const res = await joinWorkspace({
          name, email, password,
          inviteCode: inviteCode.trim(),
          workspacePassword: workspacePassword.trim() || undefined,
        });
        toast.success(res.message || 'Workspace joined successfully! 🎉');
      }
      const registeredEmail = email;
      localStorage.setItem('registrationEmail', registeredEmail);
      setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
      setWorkspaceName(''); setWorkspaceSlug(''); setInviteCode(''); setWorkspacePassword('');
      navigate(`/after-register?email=${encodeURIComponent(registeredEmail)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* Input base class */
  const inp = 'w-full bg-white border text-sm text-gray-900 placeholder-gray-400 rounded-2xl focus:outline-none focus:ring-2 transition-all';
  const inpDefault = `${inp} border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-400`;

  /* Strength color for label */
  const strColor = { 1: 'text-red-500', 2: 'text-amber-500', 3: 'text-blue-500', 4: 'text-emerald-500' };

  return (
    <div className="min-h-screen lg:flex bg-white overflow-x-hidden">

      {/* ── Left visual panel (sticky) ── */}
      <div
        ref={panelRef}
        className="hidden lg:flex lg:w-5/12 xl:w-[42%] sticky top-0 h-screen flex-col overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(145deg, #f5f3ff 0%, #ede9fe 45%, #ecfdf5 100%)' }}
      >
        {/* Three.js canvas */}
        <div className="absolute inset-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 6.5], fov: 50 }} dpr={[1, 1.5]}>
            <RegScene />
          </Canvas>
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right,rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(139,92,246,0.06) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
            opacity: 0.8,
          }}
        />

        {/* Ambient blobs */}
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.16) 0%,transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -right-16 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Brand */}
          <Link to="/" className="reg-brand inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900">
              TaskForge <span className="text-violet-600">AI</span>
            </span>
          </Link>

          {/* Headline + features */}
          <div>
            <h2 className="reg-heading text-3xl xl:text-4xl font-black text-gray-900 leading-tight mb-3">
              Start building.<br />
              <span className="text-violet-600">Together.</span>
            </h2>
            <p className="reg-sub text-gray-500 text-sm leading-relaxed mb-8 max-w-xs">
              Create your team workspace in minutes and supercharge collaboration with AI.
            </p>
            <div className="space-y-3.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="reg-feat flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm border border-violet-100 flex-shrink-0">
                    <Icon className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Setup steps */}
          <div className="bg-white/50 backdrop-blur-sm border border-violet-100 rounded-2xl p-4 space-y-2">
            {['Create account', 'Set up workspace', 'Invite team', 'Start shipping'].map((step, i) => (
              <div key={step} className="flex items-center gap-2.5 text-xs font-medium text-gray-600">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel (scrollable) ── */}
      <div className="flex-1 flex justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-lg py-8">

          {/* Mobile brand */}
          <motion.div
            className="lg:hidden text-center mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="inline-flex items-center gap-2 justify-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900">
                TaskForge <span className="text-violet-600">AI</span>
              </span>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
              {firstTimeSetup ? 'Initialize Platform' : 'Create your workspace'}
            </h1>
            <p className="text-sm text-gray-500">
              {firstTimeSetup
                ? 'Configure the primary administrative account (Super Admin).'
                : 'Spin up a new workspace or join your team.'}
            </p>
          </motion.div>

          {/* Tab switcher */}
          <AnimatePresence>
            {!firstTimeSetup && (
              <motion.div
                className="flex bg-gray-50 border border-gray-200 p-1 rounded-2xl mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'create'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Create New Workspace
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'join'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Join Existing Workspace
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            variants={formWrap}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {/* ── Personal Details ── */}
            <motion.div variants={fieldItem} className="border-b border-gray-100 pb-3">
              <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">
                Personal Details
              </span>
            </motion.div>

            {/* Full Name */}
            <motion.div variants={fieldItem}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className={`${inpDefault} pl-11 pr-4 py-3.5`}
                  required
                />
              </div>
            </motion.div>

            {/* Email */}
            <motion.div variants={fieldItem}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@example.com"
                  className={`${inp} pl-11 pr-11 py-3.5 ${emailError
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                      : isEmailValid
                        ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-400'
                        : 'border-gray-200 focus:ring-violet-500/20 focus:border-violet-400'
                    }`}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {checkingEmail ? (
                    <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  ) : emailError ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : isEmailValid ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : null}
                </div>
              </div>
              {emailError && (
                <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1 font-semibold">
                  <XCircle className="w-3 h-3 flex-shrink-0" />
                  {emailError}
                </p>
              )}
            </motion.div>

            {/* Passwords */}
            <motion.div variants={fieldItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inpDefault} pl-11 pr-10 py-3.5`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inp} pl-11 pr-10 py-3.5 ${confirmPassword
                        ? passwordsMatch
                          ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-400'
                          : 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                        : 'border-gray-200 focus:ring-violet-500/20 focus:border-violet-400'
                      }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Password strength meter */}
            <AnimatePresence>
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-gray-400">Security Strength:</span>
                    <span className={strColor[passwordStrength.level]}>{passwordStrength.text}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((idx) => (
                      <div
                        key={idx}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= passwordStrength.level ? passwordStrength.color : 'bg-gray-200'
                          }`}
                      />
                    ))}
                  </div>
                  {!isPasswordStrong(password) && (
                    <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                      Needs 8+ characters with uppercase, lowercase, a number, and a special character.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Workspace Section ── */}
            <AnimatePresence>
              {!firstTimeSetup && (
                <motion.div
                  variants={fieldItem}
                  className="space-y-4 pt-2"
                >
                  <div className="border-b border-gray-100 pb-3">
                    <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">
                      {activeTab === 'create' ? 'Workspace Details' : 'Invite Validation'}
                    </span>
                  </div>

                  {/* Create workspace fields */}
                  {activeTab === 'create' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Workspace Name
                        </label>
                        <div className="relative">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={workspaceName}
                            onChange={(e) => {
                              setWorkspaceName(e.target.value);
                              setWorkspaceSlug(
                                e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                              );
                            }}
                            placeholder="e.g. Acme Corp"
                            className={`${inpDefault} pl-11 pr-4 py-3.5`}
                            required={activeTab === 'create' && !firstTimeSetup}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Workspace Slug
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold font-mono">/</span>
                          <input
                            type="text"
                            value={workspaceSlug}
                            onChange={(e) =>
                              setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
                            }
                            placeholder="acme-corp"
                            className={`${inpDefault} pl-8 pr-4 py-3.5 font-mono`}
                            required={activeTab === 'create' && !firstTimeSetup}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Join workspace fields */}
                  {activeTab === 'join' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Invite Code
                        </label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="TF-XXXXXX"
                            className={`${inpDefault} pl-11 pr-4 py-3.5 font-mono`}
                            required={activeTab === 'join' && !firstTimeSetup}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Join Passcode <span className="normal-case font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="password"
                            value={workspacePassword}
                            onChange={(e) => setWorkspacePassword(e.target.value)}
                            placeholder="Passcode if required"
                            className={`${inpDefault} pl-11 pr-4 py-3.5`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div variants={fieldItem} className="pt-2">
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !passwordsMatch ||
                  !isPasswordStrong(password) ||
                  !name ||
                  !isEmailValid ||
                  !password ||
                  !!emailError ||
                  checkingEmail
                }
                isLoading={isLoading}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full"
              >
                {isLoading
                  ? firstTimeSetup
                    ? 'Creating Super Admin Account...'
                    : 'Initializing Workspace...'
                  : firstTimeSetup
                    ? 'Create Super Admin Account'
                    : activeTab === 'create'
                      ? 'Create Workspace'
                      : 'Join Workspace'}
              </Button>
            </motion.div>
          </motion.form>

          {/* Footer */}
          <motion.p
            className="text-center text-sm text-gray-400 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 hover:text-violet-800 font-semibold transition-colors">
              Sign in
            </Link>
          </motion.p>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
