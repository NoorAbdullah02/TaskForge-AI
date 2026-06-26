import { useState, useEffect } from 'react';
import {
    Mail, Lock, User, Eye, EyeOff, CheckCircle, XCircle,
    ArrowRight, Building, Key, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { checkEmailExists, registerUser, getSetupStatus } from '../Services/authApi';
import { createWorkspace, joinWorkspace } from '../Services/workspaceApi';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import DSAppShell from '../design-system/DSAppShell.jsx';
import { GlassCard, Button } from '../design-system/primitives';

const RegisterPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Setup Status
    const [firstTimeSetup, setFirstTimeSetup] = useState(false);

    // Tab Selection: 'create' or 'join'
    const [activeTab, setActiveTab] = useState('create');

    // Shared Form Fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Tab-Specific Fields
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceSlug, setWorkspaceSlug] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [workspacePassword, setWorkspacePassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Pre-fill invite code from URL if present
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setInviteCode(code);
            setActiveTab('join');
        }
    }, [searchParams]);

    // Check setup status
    useEffect(() => {
        const checkSetup = async () => {
            try {
                const data = await getSetupStatus();
                setFirstTimeSetup(data.firstTimeSetup);
            } catch (err) {
                console.error('Failed to check setup status:', err);
            }
        };
        checkSetup();
    }, []);

    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordStrength = getPasswordStrength(password);
    const isEmailValid = email && !emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    function getPasswordStrength(pwd) {
        if (!pwd) return { level: 0, text: '', color: '' };
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (pwd.length >= 12) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[!@#$%^&*]/.test(pwd)) strength++;

        if (strength <= 2) return { level: 1, text: 'Weak', color: 'bg-red-500' };
        if (strength <= 3) return { level: 2, text: 'Fair', color: 'bg-yellow-500' };
        if (strength <= 4) return { level: 3, text: 'Good', color: 'bg-blue-500' };
        return { level: 4, text: 'Strong', color: 'bg-emerald-500' };
    }

    const validateEmail = (emailValue) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailValue);
    };

    const handleEmailChange = async (e) => {
        const value = e.target.value;
        setEmail(value);
        setEmailError('');

        if (!value) {
            setEmailError('');
            return;
        }

        if (!validateEmail(value)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setCheckingEmail(true);
        try {
            const exists = await checkEmailExists(value);
            if (exists) {
                setEmailError('Email already registered. Please use a different email.');
            } else {
                setEmailError('');
            }
        } catch (err) {
            const errorMessage = err?.message || 'Unable to verify email. Please try again.';
            setEmailError(errorMessage);
        } finally {
            setCheckingEmail(false);
        }
    };

    async function handleSubmit(e) {
        e.preventDefault();

        if (emailError) {
            toast.error('Please fix the email error');
            return;
        }

        if (!passwordsMatch) {
            toast.error('Passwords do not match!');
            return;
        }

        setIsLoading(true);

        try {
            if (firstTimeSetup) {
                const res = await registerUser({ name, email, password });
                toast.success('Super Admin account created successfully! 🎉');
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
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
                    name,
                    email,
                    password,
                    workspaceName: workspaceName.trim(),
                    workspaceSlug: workspaceSlug.toLowerCase().trim()
                });
                toast.success(res.message || 'Workspace created successfully! 🎉');
            } else {
                if (!inviteCode.trim()) {
                    toast.error('Invite code is required');
                    setIsLoading(false);
                    return;
                }
                const res = await joinWorkspace({
                    name,
                    email,
                    password,
                    inviteCode: inviteCode.trim(),
                    workspacePassword: workspacePassword.trim() || undefined
                });
                toast.success(res.message || 'Join request submitted! Pending approval. ⏳');
            }

            // Save email before cleanup for the after-register page
            const registeredEmail = email;
            localStorage.setItem('registrationEmail', registeredEmail);

            // Cleanup fields
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setWorkspaceName('');
            setWorkspaceSlug('');
            setInviteCode('');
            setWorkspacePassword('');

            navigate(`/after-register?email=${encodeURIComponent(registeredEmail)}`);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }

    const strengthColors = {
        1: 'text-red-400',
        2: 'text-yellow-400',
        3: 'text-blue-400',
        4: 'text-emerald-400',
    };

    return (
        <DSAppShell backgroundMode="auth">
            <div className="min-h-screen flex items-center justify-center p-4 text-slate-100">
                <div className="w-full max-w-lg relative z-10 my-10">
                    {/* Header */}
                    <motion.div
                        className="text-center mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link to="/" className="inline-block mb-3">
                            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-blue-400" />
                                TaskForge AI
                            </span>
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                            {firstTimeSetup ? 'Initialize Platform' : 'Initialize Workspace'}
                        </h1>
                        <p className="text-slate-400 text-xs mt-1 font-sans">
                            {firstTimeSetup
                                ? 'Configure the primary administrative entity (Super Admin).'
                                : 'Deploy an isolated neural collaboration instance or request access to a squad.'}
                        </p>
                    </motion.div>

                    {/* Tab Switcher */}
                    {!firstTimeSetup && (
                        <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-2xl mb-6">
                            <button
                                type="button"
                                onClick={() => setActiveTab('create')}
                                className={`flex-1 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'create'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Create New Workspace
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('join')}
                                className={`flex-1 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === 'join'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                Join Existing Workspace
                            </button>
                        </div>
                    )}

                    {/* Registration Card */}
                    <GlassCard
                        padding="p-8"
                        hoverEffect={false}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Profile Info Sub-heading */}
                            <div className="pb-3 border-b border-white/5">
                                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Personal Details</span>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Sarah Chen"
                                        className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-xs font-semibold text-slate-200 placeholder-slate-500"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email Address */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder="you@example.com"
                                        className={`w-full pl-11 pr-11 py-3 bg-white/[0.03] border rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-xs font-semibold text-slate-200 placeholder-slate-500 ${emailError ? 'border-red-500/50' : isEmailValid ? 'border-emerald-500/50' : 'border-white/10'
                                            }`}
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {checkingEmail ? (
                                            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                        ) : emailError ? (
                                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                                        ) : isEmailValid ? (
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : null}
                                    </div>
                                </div>
                                {emailError && (
                                    <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1 font-semibold font-sans">
                                        <XCircle className="w-3 h-3 flex-shrink-0" />
                                        {emailError}
                                    </p>
                                )}
                            </div>

                            {/* Passwords */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-10 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-200"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition"
                                        >
                                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`w-full pl-11 pr-10 py-3 bg-white/[0.03] border rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-200 ${confirmPassword ? (passwordsMatch ? 'border-emerald-500/50' : 'border-red-500/50') : 'border-white/10'
                                                }`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-355 transition"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Password strength & requirements */}
                            {password && (
                                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl space-y-2 mt-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-slate-400">Security Strength:</span>
                                        <span className={strengthColors[passwordStrength.level]}>{passwordStrength.text}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map(idx => (
                                            <div key={idx} className={`h-1 flex-1 rounded-full transition ${idx <= passwordStrength.level ? passwordStrength.color : 'bg-white/5'
                                                }`} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Workspace Details Section (only if not firstTimeSetup) */}
                            {!firstTimeSetup && (
                                <>
                                    {/* Workspace Section Sub-heading */}
                                    <div className="pb-3 border-b border-white/5 pt-4">
                                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                                            {activeTab === 'create' ? 'Workspace Details' : 'Invite Validation'}
                                        </span>
                                    </div>

                                    {/* TAB 1: CREATE WORKSPACE FIELDS */}
                                    {activeTab === 'create' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Workspace Name</label>
                                                <div className="relative">
                                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        value={workspaceName}
                                                        onChange={(e) => {
                                                            setWorkspaceName(e.target.value);
                                                            // auto slugify
                                                            setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                                                        }}
                                                        placeholder="e.g. Acme Corporation"
                                                        className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-200"
                                                        required={activeTab === 'create' && !firstTimeSetup}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Workspace Slug (URL Part)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold font-mono">/</span>
                                                    <input
                                                        type="text"
                                                        value={workspaceSlug}
                                                        onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                                                        placeholder="acme-corp"
                                                        className="w-full pl-8 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-bold font-mono focus:outline-none focus:border-blue-500 text-slate-200"
                                                        required={activeTab === 'create' && !firstTimeSetup}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: JOIN WORKSPACE FIELDS */}
                                    {activeTab === 'join' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Invite Code</label>
                                                <div className="relative">
                                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        value={inviteCode}
                                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                                        placeholder="TF-XXXXXX"
                                                        className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-bold font-mono focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                                                        required={activeTab === 'join' && !firstTimeSetup}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Join Passcode (Optional)</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input
                                                        type="password"
                                                        value={workspacePassword}
                                                        onChange={(e) => setWorkspacePassword(e.target.value)}
                                                        placeholder="Passcode if required"
                                                        className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-200"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isLoading || !passwordsMatch || !name || !isEmailValid || !password || !!emailError || checkingEmail}
                                isLoading={isLoading}
                                icon={ArrowRight}
                                iconPosition="right"
                                className="w-full mt-4"
                            >
                                {isLoading
                                    ? (firstTimeSetup ? 'Creating Super Admin Account...' : 'Initializing Workspace...')
                                    : (firstTimeSetup
                                        ? 'Create Super Admin Account'
                                        : activeTab === 'create'
                                            ? 'Create Workspace Instance'
                                            : 'Submit Membership Request')}
                            </Button>
                        </form>
                    </GlassCard>

                    {/* Footer links */}
                    <motion.p
                        className="text-center text-slate-500 text-xs mt-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Already possess active credentials?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                            Sign in
                        </Link>
                    </motion.p>
                </div>
            </div>
        </DSAppShell>
    );
};

export default RegisterPage;