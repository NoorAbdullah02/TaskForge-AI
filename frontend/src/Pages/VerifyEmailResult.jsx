import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ArrowRight, Sparkles, AlertCircle, Mail, Loader, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { resendVerificationEmail } from '../Services/authApi';
import toast from 'react-hot-toast';
import { GlassCard } from '../design-system/primitives';

const VerifyEmailResult = () => {
    const [searchParams] = useSearchParams();
    const status = searchParams.get('status');
    const message = searchParams.get('message');
    const email = searchParams.get('email');
    const [countdown, setCountdown] = useState(5);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (status === 'success' || status === 'already-verified') {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        window.location.href = '/login';
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status]);

    const handleResend = async () => {
        if (!email) {
            toast.error('No email address available');
            return;
        }
        setIsResending(true);
        try {
            await resendVerificationEmail(email);
            toast.success('Verification email sent! Check your inbox.');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to resend. Try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="w-full max-w-lg relative z-10">
                {/* SUCCESS */}
                {status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="relative inline-block mb-8"
                        >
                            <div className="w-28 h-28 bg-gradient-to-br from-emerald-500 to-green-600 rounded-[2rem] flex items-center justify-center shadow-[0_18px_45px_rgba(16,185,129,0.30)]">
                                <CheckCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
                            </div>
                            <motion.div
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                className="absolute -top-3 -right-3"
                            >
                                <Sparkles className="w-8 h-8 text-amber-400" />
                            </motion.div>
                        </motion.div>

                        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-3">
                            Email Verified!
                        </h1>
                        <p className="text-ink-soft text-lg mb-8">Your account has been successfully activated</p>

                        <GlassCard hoverEffect={false} padding="p-8" className="mb-6">
                            <div className="space-y-4 mb-8">
                                {[
                                    { icon: CheckCircle, text: 'Email verified successfully' },
                                    { icon: ShieldCheck, text: 'Account activated & secured' },
                                    { icon: Sparkles, text: 'Ready to use TaskForge AI' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + i * 0.15 }}
                                        className="flex items-center gap-3 text-ink-soft"
                                    >
                                        <item.icon className="w-5 h-5 text-emerald-500" />
                                        <span>{item.text}</span>
                                    </motion.div>
                                ))}
                            </div>

                            <Link
                                to="/login"
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl hover:opacity-95 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.25)] text-lg group"
                            >
                                Go to Login
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <div className="mt-5 flex items-center justify-center gap-2 text-ink-faint text-sm">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                Redirecting in {countdown} seconds...
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* ALREADY VERIFIED */}
                {status === 'already-verified' && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="w-28 h-28 bg-gradient-to-br from-brand to-accent rounded-[2rem] flex items-center justify-center shadow-[0_18px_45px_rgba(37,99,235,0.30)] mx-auto mb-8">
                            <ShieldCheck className="w-14 h-14 text-white" strokeWidth={2.5} />
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-black text-gradient-brand mb-3">Already Verified</h1>
                        <p className="text-ink-soft text-lg mb-8">
                            Your email <span className="text-ink font-semibold">{email}</span> is already verified
                        </p>

                        <GlassCard hoverEffect={false} padding="p-8">
                            <Link
                                to="/login"
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-brand to-accent text-white font-bold rounded-xl hover:opacity-95 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.25)] text-lg group"
                            >
                                Go to Login
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <div className="mt-5 flex items-center justify-center gap-2 text-ink-faint text-sm">
                                <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                                Redirecting in {countdown} seconds...
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* ERROR */}
                {status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="w-28 h-28 bg-gradient-to-br from-red-500 to-orange-500 rounded-[2rem] flex items-center justify-center shadow-[0_18px_45px_rgba(239,68,68,0.30)] mx-auto mb-8">
                            <XCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-3">
                            Verification Failed
                        </h1>
                        <p className="text-ink-soft text-lg mb-8">
                            {message || 'Something went wrong during verification'}
                        </p>

                        <GlassCard hoverEffect={false} padding="p-8">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                                    <p className="text-red-700 text-sm text-left">
                                        {message || 'The verification link may have expired or is invalid. Please request a new verification email.'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {email && (
                                    <button
                                        onClick={handleResend}
                                        disabled={isResending}
                                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-brand to-accent text-white font-bold rounded-xl hover:opacity-95 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isResending ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-5 h-5" />
                                                Resend Verification Email
                                            </>
                                        )}
                                    </button>
                                )}

                                <Link
                                    to="/verify-email-token"
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-line text-ink-soft font-semibold rounded-xl hover:bg-surface-2 transition-all"
                                >
                                    <Mail className="w-5 h-5" />
                                    Enter Code Manually
                                </Link>

                                <Link
                                    to="/register"
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-ink-faint font-medium rounded-xl hover:text-ink transition-all text-sm"
                                >
                                    Sign up again
                                </Link>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* FALLBACK — no status */}
                {!status && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="w-28 h-28 bg-gradient-to-br from-slate-400 to-slate-500 rounded-[2rem] flex items-center justify-center shadow-soft mx-auto mb-8">
                            <Mail className="w-14 h-14 text-white" strokeWidth={2.5} />
                        </div>

                        <h1 className="text-4xl font-black text-ink mb-3">Invalid Link</h1>
                        <p className="text-ink-soft text-lg mb-8">
                            This verification link appears to be invalid or incomplete.
                        </p>

                        <GlassCard hoverEffect={false} padding="p-8" className="space-y-3">
                            <Link
                                to="/verify-email-token"
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-brand to-accent text-white font-bold rounded-xl hover:opacity-95 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.25)]"
                            >
                                Enter Verification Code
                            </Link>
                            <Link
                                to="/login"
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-line text-ink-soft font-semibold rounded-xl hover:bg-surface-2 transition-all"
                            >
                                Go to Login
                            </Link>
                        </GlassCard>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailResult;
