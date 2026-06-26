import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Shield, KeyRound, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { confirmResetPassword } from '../Services/authApi';
import DSAppShell from '../design-system/DSAppShell.jsx';
import { GlassCard, Button } from '../design-system/primitives';

const ResetPassword = () => {
    const navigate = useNavigate();
    const params = new URLSearchParams(window.location.search);
    const preEmail = params.get('email') || '';
    const preToken = params.get('token') || '';

    const [email, setEmail] = useState(preEmail);
    const [token, setToken] = useState(preToken);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [passwordStrength, setPasswordStrength] = useState({
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecial: false
    });

    useEffect(() => {
        if (preEmail) setEmail(preEmail);
        if (preToken) setToken(preToken);
    }, [preEmail, preToken]);

    useEffect(() => {
        setPasswordStrength({
            hasMinLength: newPassword.length >= 8,
            hasUpperCase: /[A-Z]/.test(newPassword),
            hasLowerCase: /[a-z]/.test(newPassword),
            hasNumber: /[0-9]/.test(newPassword),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
        });
    }, [newPassword]);

    const getPasswordStrengthText = () => {
        const strength = Object.values(passwordStrength).filter(Boolean).length;
        if (strength <= 2) return { text: 'Weak', color: 'text-red-400', bg: 'bg-red-500' };
        if (strength <= 3) return { text: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-500' };
        if (strength <= 4) return { text: 'Good', color: 'text-blue-400', bg: 'bg-blue-500' };
        return { text: 'Strong', color: 'text-emerald-400', bg: 'bg-emerald-500' };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !token || !newPassword || !confirmPassword) {
            toast.error('Please fill all fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        try {
            setIsLoading(true);
            const res = await confirmResetPassword({ email: email.toLowerCase(), token, newPassword });
            toast.success(res?.message || 'Password reset successfully!');
            navigate('/login');
        } catch (err) {
            console.error('Reset error:', err);
            toast.error(err?.response?.data?.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    const strengthInfo = getPasswordStrengthText();
    const passwordsMatch = confirmPassword && newPassword === confirmPassword;

    return (
        <DSAppShell backgroundMode="auth">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md relative z-10">
                    {/* Header */}
                    <motion.div
                        className="text-center mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link to="/" className="inline-block mb-5">
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                                TaskForge AI
                            </span>
                        </Link>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                            Reset password
                        </h1>
                        <p className="text-gray-400">
                            Create a strong new password for your account
                        </p>
                    </motion.div>

                    {/* Info banner */}
                    <motion.div
                        className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 mb-6 flex items-start gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                    >
                        <KeyRound className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-indigo-300/80 leading-relaxed">
                            Enter your reset token from the email and create a strong, unique password.
                        </p>
                    </motion.div>

                    {/* Card */}
                    <GlassCard
                        padding="p-8"
                        hoverEffect={false}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {/* Token */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2">Reset Token</label>
                                <input
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm font-mono tracking-wider"
                                    placeholder="Enter your reset token"
                                />
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 pr-11 rounded-xl border border-white/10 bg-white/[0.02] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm"
                                        placeholder="Create a strong password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {newPassword && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">Password Strength</span>
                                            <span className={`text-xs font-medium ${strengthInfo.color}`}>{strengthInfo.text}</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${strengthInfo.bg} transition-all duration-500`}
                                                style={{ width: `${(Object.values(passwordStrength).filter(Boolean).length / 5) * 100}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5 text-xs mt-2">
                                            {[
                                                { key: 'hasMinLength', label: '8+ characters' },
                                                { key: 'hasUpperCase', label: 'Uppercase' },
                                                { key: 'hasLowerCase', label: 'Lowercase' },
                                                { key: 'hasNumber', label: 'Number' },
                                                { key: 'hasSpecial', label: 'Special char' },
                                            ].map(({ key, label }) => (
                                                <div key={key} className="flex items-center gap-1.5">
                                                    {passwordStrength[key] ? (
                                                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3 text-gray-600" />
                                                    )}
                                                    <span className={passwordStrength[key] ? 'text-gray-400' : 'text-gray-600'}>{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white/[0.02] text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all text-sm ${confirmPassword
                                            ? passwordsMatch
                                                ? 'border-emerald-500/50 focus:ring-emerald-500/20 focus:border-emerald-500'
                                                : 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500'
                                            : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-500/50'
                                            }`}
                                        placeholder="Confirm your new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {confirmPassword && (
                                    <div className="mt-2 flex items-center gap-2">
                                        {passwordsMatch ? (
                                            <>
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="text-xs text-emerald-400">Passwords match</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                                                <span className="text-xs text-red-400">Passwords do not match</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/login')}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading || newPassword !== confirmPassword || !newPassword || !confirmPassword || !email || !token}
                                    isLoading={isLoading}
                                    icon={isLoading ? undefined : Shield}
                                    iconPosition="left"
                                    className="flex-1"
                                >
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </Button>
                            </div>
                        </form>
                    </GlassCard>

                    {/* Footer */}
                    <motion.p
                        className="text-center text-gray-600 text-xs mt-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Remember your password?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                            Sign in
                        </Link>
                    </motion.p>
                </div>
            </div>
        </DSAppShell>
    );
};

export default ResetPassword;