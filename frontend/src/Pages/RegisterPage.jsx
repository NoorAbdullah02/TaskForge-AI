import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast'
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
    const isEmailValid = email && !emailError;

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
        return { level: 4, text: 'Strong', color: 'bg-green-500' };
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

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-40 -mr-48 -mt-48 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full blur-3xl opacity-40 -ml-48 -mb-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="w-full max-w-md z-10">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="relative h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-2 left-10 w-20 h-20 bg-white rounded-full blur-xl"></div>
                            <div className="absolute bottom-3 right-8 w-16 h-16 bg-white rounded-full blur-lg"></div>
                            <div className="absolute top-5 right-20 w-12 h-12 bg-white rounded-full blur-md"></div>
                        </div>
                        <div className="relative h-full flex items-center justify-center">
                            <div className="text-center">
                                <h1 className="text-3xl font-bold text-white mb-1">Join Us</h1>
                                <p className="text-indigo-100 text-sm">Create your account today</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-10">
                        <div className="space-y-5">
                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-500 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-300"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-500 w-5 h-5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder="Enter your email"
                                        className={`w-full pl-12 pr-12 py-3 bg-gray-50 border-2 rounded-lg focus:outline-none focus:bg-white transition-all duration-300 ${emailError
                                            ? 'border-red-500 focus:border-red-600'
                                            : isEmailValid
                                                ? 'border-green-500 focus:border-green-600'
                                                : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                        {checkingEmail ? (
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : emailError ? (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        ) : isEmailValid ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : null}
                                    </div>
                                </div>
                                {emailError && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        <span className="text-sm text-red-600 font-medium">{emailError}</span>
                                    </div>
                                )}
                                {isEmailValid && !emailError && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span className="text-sm text-green-600 font-medium">Email is available</span>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-500 w-5 h-5" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Create a password"
                                        className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-300"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-indigo-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1 flex-1">
                                                {[1, 2, 3, 4].map((bar) => (
                                                    <div
                                                        key={bar}
                                                        className={`h-1 flex-1 rounded-full transition-all ${bar <= passwordStrength.level
                                                            ? passwordStrength.color
                                                            : 'bg-gray-200'
                                                            }`}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className={`text-xs font-semibold ${passwordStrength.level === 1 ? 'text-red-500' :
                                                passwordStrength.level === 2 ? 'text-yellow-500' :
                                                    passwordStrength.level === 3 ? 'text-blue-500' :
                                                        'text-green-500'
                                                }`}>
                                                {passwordStrength.text}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div className="flex items-center gap-2">
                                                {password.length >= 8 ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-gray-300" />
                                                )}
                                                <span>At least 8 characters</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/[A-Z]/.test(password) ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-gray-300" />
                                                )}
                                                <span>One uppercase letter</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/[0-9]/.test(password) ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-gray-300" />
                                                )}
                                                <span>One number</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/[!@#$%^&*]/.test(password) ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-gray-300" />
                                                )}
                                                <span>One special character (!@#$%^&*)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-500 w-5 h-5" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        className={`w-full pl-12 pr-12 py-3 bg-gray-50 border-2 rounded-lg focus:outline-none focus:bg-white transition-all duration-300 ${confirmPassword
                                            ? passwordsMatch
                                                ? 'border-green-500 focus:border-green-600'
                                                : 'border-red-500 focus:border-red-600'
                                            : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-indigo-500 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && (
                                    <div className="mt-2 flex items-center gap-2">
                                        {passwordsMatch ? (
                                            <>
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                <span className="text-sm text-green-600 font-medium">Passwords match</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-5 h-5 text-red-500" />
                                                <span className="text-sm text-red-600 font-medium">Passwords do not match</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !passwordsMatch || !name || !isEmailValid || !password || emailError || checkingEmail}
                                    className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${isLoading || !passwordsMatch || !name || !isEmailValid || !password || emailError || checkingEmail
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/50 active:scale-98'
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Registering...
                                        </>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </div>

                            <div className="text-center pt-2">
                                <p className="text-gray-600 text-sm">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-500 text-xs mt-6">
                    By registering, you agree to our{' '}
                    <a href="/terms" className="text-indigo-600 hover:underline">
                        Terms of Service
                    </a>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;