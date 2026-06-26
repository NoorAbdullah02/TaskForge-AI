import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { requestPasswordReset } from '../Services/authApi';
import DSAppShell from '../design-system/DSAppShell.jsx';
import { GlassCard, Input, Button } from '../design-system/primitives';

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
                            Forgot password?
                        </h1>
                        <p className="text-gray-400">
                            No worries, we'll send you a reset token
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
                            <Input
                                label="Email Address"
                                type="email"
                                icon={Mail}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />

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

                            <Button
                                type="submit"
                                disabled={isLoading}
                                isLoading={isLoading}
                                icon={Send}
                                className="w-full"
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                icon={ArrowLeft}
                                onClick={() => navigate('/login')}
                                className="w-full"
                            >
                                Back to Sign In
                            </Button>
                        </form>
                    </GlassCard>

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

export default ForgotPassword;
