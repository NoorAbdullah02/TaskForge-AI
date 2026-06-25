import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { confirmResetPassword } from '../Services/authApi';
import { Lock, Shield, Eye, EyeOff, CheckCircle, XCircle, Loader, KeyRound, Sparkles } from 'lucide-react';

const ResetPassword = () => {
    const navigate = useNavigate();
    // Get URL params
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

    // Password strength checker
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
        if (strength <= 2) return { text: 'Weak', color: 'text-red-600', bg: 'bg-red-500' };
        if (strength <= 3) return { text: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-500' };
        if (strength <= 4) return { text: 'Good', color: 'text-blue-600', bg: 'bg-blue-500' };
        return { text: 'Strong', color: 'text-green-600', bg: 'bg-green-500' };
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

    return (
        <div className="min-h-screen bg-white overflow-hidden flex items-center justify-center p-4 relative">
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute top-0 left-20 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-20 w-96 h-96 bg-gradient-to-tl from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/15 to-pink-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-2xl w-full relative z-10">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="relative inline-block mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Lock className="w-12 h-12 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <Shield className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                        <Sparkles className="absolute -bottom-2 -left-3 w-7 h-7 text-yellow-400 animate-pulse" />
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 leading-tight">
                        Reset Password
                    </h1>
                    <p className="text-xl text-gray-600 max-w-lg mx-auto">
                        Create a strong new password for your account
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-xl">
                    <div className="p-8 md:p-12">
                        {/* Info Banner */}
                        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border border-indigo-100">
                            <div className="flex items-start gap-4">
                                <KeyRound className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2 text-lg">Security First</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        Enter your reset token and create a strong password. Make sure it's unique and hard to guess.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-3">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all bg-white text-gray-800 font-medium text-base"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {/* Token Field */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-3">
                                    Reset Token
                                </label>
                                <input
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all bg-white text-gray-800 font-mono text-base"
                                    placeholder="Enter your reset token"
                                />
                            </div>

                            {/* New Password Field */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-3">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-6 py-4 pr-12 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all bg-white text-gray-800 font-medium text-base"
                                        placeholder="Create a strong password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Password Strength Indicator */}
                                {newPassword && (
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-gray-700">Password Strength</span>
                                            <span className={`text-sm font-bold ${strengthInfo.color}`}>
                                                {strengthInfo.text}
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${strengthInfo.bg} transition-all duration-500`}
                                                style={{ width: `${(Object.values(passwordStrength).filter(Boolean).length / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="space-y-2">
                                            {[
                                                { key: 'hasMinLength', label: 'At least 8 characters' },
                                                { key: 'hasUpperCase', label: 'One uppercase letter' },
                                                { key: 'hasLowerCase', label: 'One lowercase letter' },
                                                { key: 'hasNumber', label: 'One number' },
                                                { key: 'hasSpecial', label: 'One special character (!@#$...)' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className="flex items-center gap-2 text-sm">
                                                    {passwordStrength[key] ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-gray-300" />
                                                    )}
                                                    <span className={passwordStrength[key] ? 'text-green-700' : 'text-gray-500'}>
                                                        {label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-3">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-6 py-4 pr-12 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all bg-white text-gray-800 font-medium text-base"
                                        placeholder="Confirm your new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && confirmPassword !== newPassword && (
                                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" />
                                        Passwords do not match
                                    </p>
                                )}
                                {confirmPassword && confirmPassword === newPassword && (
                                    <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Passwords match
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/login'}
                                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-800 font-bold rounded-2xl hover:bg-gray-200 transition-all text-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isLoading || newPassword !== confirmPassword || !newPassword || !confirmPassword}
                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2 group"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            Reset Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Footer Link */}
                        <div className="text-center mt-8 pt-6 border-t border-gray-200">
                            <p className="text-gray-600 text-sm">
                                Remember your password?{' '}
                                <a
                                    href="/login"
                                    className="text-indigo-600 font-bold hover:underline"
                                >
                                    Back to Login
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;