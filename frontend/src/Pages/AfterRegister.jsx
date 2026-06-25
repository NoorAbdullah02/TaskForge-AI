import { useState } from 'react';
import { Mail, Inbox, RefreshCw, CheckCircle, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const AfterRegister = () => {
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [error, setError] = useState('');

    // Get email from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || localStorage.getItem('registrationEmail') || '';

    const handleResendEmail = async () => {
        setIsResending(true);
        setError('');
        setResendSuccess(false);

        try {
            // Your API call here
            // await resendVerificationEmail(email);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 5000);
        } catch (err) {
            setError('Failed to resend email. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-white overflow-hidden flex items-center justify-center p-4 relative">
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-2xl w-full relative z-10">
                {/* Success Animation */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Floating Email Icon */}
                    <div className="relative inline-block mb-8">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                            <Mail className="w-16 h-16 text-white" strokeWidth={2.5} />
                        </div>
                        {/* Success Badge */}
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            <CheckCircle className="w-7 h-7 text-white" strokeWidth={3} />
                        </div>
                        {/* Sparkles */}
                        <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-yellow-400 animate-pulse" />
                        <Sparkles className="absolute -bottom-2 -right-6 w-6 h-6 text-blue-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 leading-tight">
                        Check Your Email!
                    </h1>
                    <p className="text-xl text-gray-600 max-w-xl mx-auto leading-relaxed">
                        We've sent a verification link to
                    </p>
                    <p className="text-2xl font-bold text-gray-800 mt-2 mb-6">
                        {email || 'your email address'}
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: '200ms' }}>
                    <div className="p-8 md:p-12">
                        {/* Steps */}
                        <div className="space-y-6 mb-8">
                            {[
                                { icon: Inbox, title: 'Check your inbox', desc: 'Open your email and look for our message' },
                                { icon: Mail, title: 'Click the verification link', desc: 'Click the button in the email to verify' },
                                { icon: CheckCircle, title: 'Start using your account', desc: 'You\'ll be redirected to login automatically' }
                            ].map((step, index) => (
                                <div
                                    key={index}
                                    className="flex gap-4 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 group"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <step.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 text-lg mb-1">
                                            {index + 1}. {step.title}
                                        </h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Important Notice */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-amber-900 mb-2 text-lg">Can't find the email?</h4>
                                    <ul className="space-y-2 text-amber-800 text-sm">
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                                            Check your <strong>spam or junk</strong> folder
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                                            Make sure you entered the correct email address
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                                            Wait a few minutes - emails can be delayed
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Success Message */}
                        {resendSuccess && (
                            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6 animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-green-900 mb-1">Email Sent!</h4>
                                        <p className="text-green-700 text-sm">Check your inbox again. Don't forget to check spam!</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-red-900 mb-1">Oops!</h4>
                                        <p className="text-red-700 text-sm">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Resend Button */}
                        <Link
                            to="/verify-email-token"
                            disabled={isResending}
                            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-3 group mb-6"
                        >
                            Enter Email Again & Resend Verification Email
                        </Link>

                        {/* Enter Code Link */}
                        <div className="text-center">
                            <p className="text-gray-600 text-sm mb-3">
                                Already have a verification code?
                            </p>

                        </div>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="text-center mt-8 space-y-3">
                    <p className="text-gray-600 text-sm">
                        Wrong email?{' '}
                        <a href="/register" className="text-blue-600 font-bold hover:underline">
                            Sign up again
                        </a>
                    </p>
                    <p className="text-gray-600 text-sm">
                        Already verified?{' '}
                        <a href="/login" className="text-blue-600 font-bold hover:underline">
                            Go to Login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AfterRegister;