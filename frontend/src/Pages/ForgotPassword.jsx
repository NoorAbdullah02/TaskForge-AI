import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { requestPasswordReset } from '../Services/authApi';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return toast.error('Please enter a valid email address');
        }

        try {
            setIsLoading(true);
            const res = await requestPasswordReset(email.toLowerCase());
            toast.success(res?.message || 'Password reset link sent');
            if (res?.previewUrl) {
                setPreviewUrl(res.previewUrl);
                console.log('Preview URL:', res.previewUrl);
            }
            setEmail('');
        } catch (err) {
            console.error('Forgot password error:', err);
            toast.error(err?.response?.data?.message || 'Failed to send reset email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-purple-600/6 rounded-full blur-[100px]" />
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
                        Forgot password?
                    </h1>
                    <p className="text-gray-400">
                        No worries, we'll send you a reset token
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
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                                <p className="text-xs text-indigo-300">
                                    Preview URL (dev):{' '}
                                    <a href={previewUrl} target="_blank" rel="noreferrer" className="underline hover:text-indigo-200 transition-colors">
                                        Open preview
                                    </a>
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm shadow-lg shadow-white/5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Reset Link
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="w-full py-3 rounded-xl border border-white/10 bg-transparent text-gray-300 hover:bg-white/[0.03] hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Sign In
                        </button>
                    </form>
                </motion.div>

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
    );
};

export default ForgotPassword;
