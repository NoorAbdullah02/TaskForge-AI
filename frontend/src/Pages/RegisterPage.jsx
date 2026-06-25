import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { registerUser, checkEmailExists } from '../Services/authApi';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordStrength = getPasswordStrength(password);
    const isEmailValid = email && !emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const navigate = useNavigate();

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
            setEmailError('Unable to verify email. Please try again.');
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
            const data = await registerUser({ name, email, password });

            toast.success(`Welcome ${data.user?.name || name}! 🎉`);

            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');

            navigate('/after-register');

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';

            if (err.response?.data?.message?.includes('email')) {
                setEmailError(errorMessage);
                toast.error(errorMessage);
            } else {
                toast.error(errorMessage);
            }
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
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            </div>

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
                        Create your account
                    </h1>
                    <p className="text-gray-400">
                        Start building with AI-powered project management
                    </p>
                </motion.div>

                {/* Card */}
                <motion.div
                    className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="you@example.com"
                                    className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-white/[0.03] text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all text-sm ${emailError
                                        ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500'
                                        : isEmailValid
                                            ? 'border-emerald-500/50 focus:ring-emerald-500/20 focus:border-emerald-500'
                                            : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-500/50'
                                        }`}
                                    required
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {checkingEmail ? (
                                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                    ) : emailError ? (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                    ) : isEmailValid ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    ) : null}
                                </div>
                            </div>
                            {emailError && (
                                <div className="mt-2 flex items-center gap-2">
                                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                    <span className="text-xs text-red-400">{emailError}</span>
                                </div>
                            )}
                            {isEmailValid && !emailError && (
                                <div className="mt-2 flex items-center gap-2">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span className="text-xs text-emerald-400">Email is available</span>
                                </div>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
                                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {password && (
                                <div className="mt-3 space-y-2">
                                    {/* Strength bar */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1 flex-1">
                                            {[1, 2, 3, 4].map((bar) => (
                                                <div
                                                    key={bar}
                                                    className={`h-1 flex-1 rounded-full transition-all ${bar <= passwordStrength.level
                                                        ? passwordStrength.color
                                                        : 'bg-white/10'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className={`text-xs font-medium ${strengthColors[passwordStrength.level] || 'text-gray-500'}`}>
                                            {passwordStrength.text}
                                        </span>
                                    </div>
                                    {/* Requirements */}
                                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                                        {[
                                            { check: password.length >= 8, label: '8+ characters' },
                                            { check: /[A-Z]/.test(password), label: 'Uppercase' },
                                            { check: /[0-9]/.test(password), label: 'Number' },
                                            { check: /[!@#$%^&*]/.test(password), label: 'Special char' },
                                        ].map((req, i) => (
                                            <div key={i} className="flex items-center gap-1.5">
                                                {req.check ? (
                                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                ) : (
                                                    <XCircle className="w-3 h-3 text-gray-600" />
                                                )}
                                                <span className={req.check ? 'text-gray-400' : 'text-gray-600'}>{req.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-white/[0.03] text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all text-sm ${confirmPassword
                                        ? passwordsMatch
                                            ? 'border-emerald-500/50 focus:ring-emerald-500/20 focus:border-emerald-500'
                                            : 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500'
                                        : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-500/50'
                                        }`}
                                    required
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

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !passwordsMatch || !name || !isEmailValid || !password || emailError || checkingEmail}
                            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm shadow-lg shadow-white/5 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Footer */}
                <motion.p
                    className="text-center text-gray-500 text-sm mt-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </motion.p>

                <motion.p
                    className="text-center text-gray-600 text-xs mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    By registering, you agree to our{' '}
                    <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>
                </motion.p>
            </div>
        </div>
    );
};

export default RegisterPage;