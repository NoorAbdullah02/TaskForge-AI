import { useState } from 'react';
import { Mail, Inbox, RefreshCw, CheckCircle, AlertCircle, Sparkles, Loader, ArrowRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resendVerificationEmail } from '../Services/authApi';
import toast from 'react-hot-toast';
import { GlassCard } from '../design-system/primitives';

const AfterRegister = () => {
    const [searchParams] = useSearchParams();
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [error, setError] = useState('');

    const email = searchParams.get('email') || localStorage.getItem('registrationEmail') || '';

    const handleResendEmail = async () => {
        if (!email) {
            setError('No email address found. Please register again.');
            return;
        }

        setIsResending(true);
        setError('');
        setResendSuccess(false);

        try {
            await resendVerificationEmail(email);
            setResendSuccess(true);
            toast.success('Verification email sent!');
            setTimeout(() => setResendSuccess(false), 8000);
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to resend email. Please try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="w-full max-w-2xl relative z-10">
                {/* Header */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.div
                        className="relative inline-block mb-8"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        <div className="w-32 h-32 bg-gradient-to-br from-brand via-brand-soft to-accent rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.30)]">
                            <Mail className="w-16 h-16 text-white" strokeWidth={2.5} />
                        </div>
                        <motion.div
                            className="absolute -top-2 -right-2 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                        >
                            <CheckCircle className="w-7 h-7 text-white" strokeWidth={3} />
                        </motion.div>
                        <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-amber-400 animate-pulse" />
                        <Sparkles className="absolute -bottom-2 -right-6 w-6 h-6 text-brand animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </motion.div>

                    <h1 className="text-4xl sm:text-5xl font-black text-gradient-brand mb-3">Check Your Email!</h1>
                    <p className="text-ink-soft text-lg">We've sent a verification link to</p>
                    <p className="text-xl font-bold text-ink mt-2">{email || 'your email address'}</p>
                </motion.div>

                {/* Main Card */}
                <GlassCard
                    hoverEffect={false}
                    padding="p-8 md:p-10"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    {/* Steps */}
                    <div className="space-y-3 mb-8">
                        {[
                            { icon: Inbox, title: 'Check your inbox', desc: 'Open your email and look for our message', color: 'from-brand to-brand-soft' },
                            { icon: ArrowRight, title: 'Click the verification link', desc: 'Click the button in the email — instant verification!', color: 'from-accent to-pink-500' },
                            { icon: CheckCircle, title: 'Start using your account', desc: 'You\'ll be redirected to login automatically', color: 'from-emerald-500 to-green-500' }
                        ].map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.15 }}
                                className="flex gap-4 p-4 rounded-xl hover:bg-surface-2 transition-all group"
                            >
                                <div className="flex-shrink-0">
                                    <div className={`w-12 h-12 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform`}>
                                        <step.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-ink text-lg mb-0.5">{index + 1}. {step.title}</h3>
                                    <p className="text-ink-soft text-sm">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Important Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-amber-700 mb-2">Can't find the email?</h4>
                                <ul className="space-y-1.5 text-amber-700/80 text-sm">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                        Check your <strong className="text-amber-700">spam or junk</strong> folder
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                        Make sure you entered the correct email address
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                        Wait a few minutes — emails can be delayed
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Success Message */}
                    {resendSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6"
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-emerald-700 mb-0.5">Email Sent!</h4>
                                    <p className="text-emerald-700/80 text-sm">A new verification email has been sent. Check your inbox!</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-red-700 mb-0.5">Oops!</h4>
                                    <p className="text-red-700/80 text-sm">{error}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleResendEmail}
                            disabled={isResending}
                            className="w-full px-6 py-4 bg-gradient-to-r from-brand to-accent text-white font-bold rounded-xl hover:opacity-95 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.25)] disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-3 group"
                        >
                            {isResending ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                    Resend Verification Email
                                </>
                            )}
                        </button>

                        <Link
                            to={`/verify-email-token?email=${encodeURIComponent(email)}`}
                            className="w-full px-6 py-3 border border-line text-ink-soft font-semibold rounded-xl hover:bg-surface-2 transition-all flex items-center justify-center gap-2"
                        >
                            <Mail className="w-5 h-5" />
                            Enter Verification Code Manually
                        </Link>
                    </div>
                </GlassCard>

                {/* Footer Links */}
                <div className="text-center mt-8 space-y-3">
                    <p className="text-ink-faint text-sm">
                        Wrong email?{' '}
                        <Link to="/register" className="text-brand font-semibold hover:underline">Sign up again</Link>
                    </p>
                    <p className="text-ink-faint text-sm">
                        Already verified?{' '}
                        <Link to="/login" className="text-brand font-semibold hover:underline">Go to Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AfterRegister;
