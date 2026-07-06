import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, CheckCircle, ArrowRight, Sparkles, AlertCircle, Loader } from 'lucide-react';
import { verifyEmailToken, resendVerificationEmail } from '../Services/authApi';
import { GlassCard } from '../design-system/primitives';
import toast from 'react-hot-toast';

const DIGIT_COUNT = 8;

const EmailVerificationPage = () => {
  const [step, setStep] = useState('verify');
  const [email, setEmail] = useState('');
  // digits stored as array of strings for individual box control
  const [digits, setDigits] = useState(Array(DIGIT_COUNT).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // one ref per digit input
  const inputRefs = useRef([]);

  // derived full token string
  const verificationToken = digits.join('');

  // helper: focus a box by index (clamped)
  const focusBox = useCallback((idx) => {
    const el = inputRefs.current[Math.max(0, Math.min(idx, DIGIT_COUNT - 1))];
    el?.focus();
  }, []);

  // fill all boxes from a string (e.g. from paste or URL param)
  const fillFromString = useCallback((str) => {
    const clean = str.replace(/\D/g, '').slice(0, DIGIT_COUNT);
    const next = Array(DIGIT_COUNT).fill('');
    clean.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError('');
    // focus last filled box or last box
    const focusIdx = Math.min(clean.length, DIGIT_COUNT - 1);
    setTimeout(() => focusBox(focusIdx), 0);
  }, [focusBox]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const tokenParam = urlParams.get('token');

    let finalEmail = emailParam
      ? decodeURIComponent(emailParam.trim())
      : localStorage.getItem('verificationEmail') || '';

    let finalToken = tokenParam?.trim()
      || localStorage.getItem('verificationToken') || '';

    if (emailParam?.trim()) localStorage.setItem('verificationEmail', finalEmail);
    if (tokenParam?.trim()) localStorage.setItem('verificationToken', finalToken);

    if (finalEmail) setEmail(finalEmail);
    if (finalToken) fillFromString(finalToken);
  }, [fillFromString]);

  const handleVerifyToken = async () => {
    console.log('Verify clicked with:', { email, token: verificationToken });

    if (!email || email.trim() === '') {
      setError('❌ Email not found. Please register first or check URL parameters.');
      return;
    }

    if (!verificationToken.trim()) {
      setError('Please enter an 8-digit code');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');

      const res = await verifyEmailToken({ email: email.trim(), token: verificationToken });

      setStep('success');
      toast.success(res?.message || 'Email verified successfully!');

      setTimeout(() => {
        localStorage.removeItem('verificationEmail');
        localStorage.removeItem('verificationToken');
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      console.error('Verification error:', err);
      const errorMessage = err?.response?.data?.message || err.message || 'Verification failed. Please check your code and try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendToken = async () => {
    console.log('Resend clicked with email:', email);

    if (!email || email.trim() === '') {
      setError('❌ Email not found. Please register first or refresh the page.');
      return;
    }

    try {
      setIsResending(true);
      setError('');
      setResendSuccess(false);
      setPreviewUrl('');

      const res = await resendVerificationEmail(email.trim());

      // API may return { message, previewUrl, error }
      if (res?.error || (res?.message && res.message.toLowerCase().includes('email send failed'))) {
        // Token was created but sending failed
        const serverMessage = res?.error || res?.message || 'Verification token created but email sending failed.';
        setError(serverMessage);
        toast.error(serverMessage);
        if (res?.previewUrl) setPreviewUrl(res.previewUrl);
      } else {
        // Successful send
        setResendSuccess(true);
        toast.success(res?.message || 'A new verification code has been sent!');
        if (res?.previewUrl) setPreviewUrl(res.previewUrl);
      }

      // Clear any entered token to avoid confusion
      setDigits(Array(DIGIT_COUNT).fill(''));
      setTimeout(() => focusBox(0), 50);

      setTimeout(() => {
        setResendSuccess(false);
        // keep preview link visible for a short period if present
        setPreviewUrl('');
      }, 8000);
    } catch (err) {
      console.error('Resend error:', err);
      const errorMessage = err?.response?.data?.message || err.message || 'Failed to resend verification email';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden flex items-center justify-center p-4 relative">
      <div className="max-w-2xl w-full relative z-10">
        {step === 'verify' && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl mb-8 shadow-2xl relative group">
                <Mail className="w-10 h-10 text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gradient-brand mb-4 leading-tight">
                Verify Your Email
              </h1>
              <p className="text-xl text-ink-soft max-w-lg mx-auto">
                Enter your verification code to activate your account
              </p>
            </div>

            <GlassCard hoverEffect={false} padding="p-8 md:p-12" className="rounded-3xl"><div>
                <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border border-blue-100">
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-gray-800 mb-2 text-lg">Verification Code Sent</h3>
                      <p className="text-gray-600 text-base">We've sent an 8-digit verification code to your email. Enter it below to activate your account and gain full access.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-3">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all bg-white text-gray-800 font-medium text-lg"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-4">8-Digit Verification Code</label>
                    <div className="flex gap-2 justify-center mb-4">
                      {Array.from({ length: DIGIT_COUNT }).map((_, index) => (
                        <input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el; }}
                          id={`digit-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digits[index]}
                          autoFocus={index === 0}
                          autoComplete="off"
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (!val) return; // handled by onKeyDown
                            const next = [...digits];
                            next[index] = val[val.length - 1]; // take last char (handles held-down key)
                            setDigits(next);
                            setError('');
                            if (index < DIGIT_COUNT - 1) focusBox(index + 1);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              e.preventDefault();
                              const next = [...digits];
                              if (next[index]) {
                                // clear current box
                                next[index] = '';
                                setDigits(next);
                              } else if (index > 0) {
                                // already empty — move back and clear previous
                                next[index - 1] = '';
                                setDigits(next);
                                focusBox(index - 1);
                              }
                            } else if (e.key === 'ArrowLeft') {
                              e.preventDefault();
                              focusBox(index - 1);
                            } else if (e.key === 'ArrowRight') {
                              e.preventDefault();
                              focusBox(index + 1);
                            } else if (e.key === 'Delete') {
                              e.preventDefault();
                              const next = [...digits];
                              next[index] = '';
                              setDigits(next);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text');
                            fillFromString(pasted);
                          }}
                          onFocus={(e) => e.target.select()}
                          className={`w-12 h-14 text-center border-2 rounded-2xl focus:outline-none transition-all bg-white text-gray-800 font-bold text-2xl select-all
                            ${digits[index]
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
                            }`}
                        />
                      ))}
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                      <p className="text-center text-sm text-gray-600">
                        Check your email inbox for an <span className="font-bold text-gray-800">8-digit code</span>
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-900 mb-1">Verification Failed</h4>
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    </div>
                  )}

                  {resendSuccess && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-green-900 mb-1">Email Sent</h4>
                        <p className="text-green-700 text-sm">A new verification code has been sent to your email.</p>
                      </div>
                    </div>
                  )}

                  {previewUrl && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex gap-3">
                      <div>
                        <h4 className="font-bold text-yellow-900 mb-1">Preview Link (dev)</h4>
                        <p className="text-yellow-700 text-sm mb-2">If email delivery failed, you can view the message here:</p>
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold break-words">{previewUrl}</a>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleVerifyToken}
                    disabled={isVerifying || verificationToken.length < DIGIT_COUNT || !email.trim()}
                    className="w-full px-6 py-4 bg-gradient-to-r from-brand to-accent text-white font-bold rounded-2xl hover:opacity-95 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.25)] disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2 group"
                  >
                    {isVerifying ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Verify Email
                      </>
                    )}
                  </button>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
                    <p className="text-gray-700 text-sm mb-3">
                      <span className="font-bold">Didn't receive your code?</span>
                    </p>
                    <button
                      onClick={handleResendToken}
                      disabled={isResending}
                      className="w-full px-4 py-2 border-2 border-blue-300 text-blue-600 font-bold rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        'Resend Verification Code'
                      )}
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-600 text-sm">
                      Already have an account?{' '}
                      <a
                        href="/login"
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Go to Login
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {step === 'success' && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-8 shadow-2xl animate-bounce">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-4">
                Email Verified!
              </h1>
              <p className="text-xl text-ink-soft max-w-lg mx-auto mb-4">
                Your account has been successfully verified.
              </p>
              <p className="text-lg text-ink-faint max-w-lg mx-auto mb-12">
                Redirecting to login page...
              </p>

              <GlassCard hoverEffect={false} padding="p-8 md:p-12" className="rounded-3xl mb-8">
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-lg text-gray-700 justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span>Email verified successfully</span>
                  </div>
                  <div className="flex items-center gap-3 text-lg text-gray-700 justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span>Account activated</span>
                  </div>
                  <div className="flex items-center gap-3 text-lg text-gray-700 justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span>Ready to use</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <a
                    href="/login"
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2 group"
                  >
                    Go to Login
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>

                <div className="mt-6 text-center text-sm text-ink-faint">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-ink-faint rounded-full animate-pulse"></div>
                    <span>Redirecting in 3 seconds...</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;