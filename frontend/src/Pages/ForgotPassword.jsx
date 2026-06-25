import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
            // Optionally redirect or keep on same page
            setEmail('');
        } catch (err) {
            console.error('Forgot password error:', err);
            toast.error(err?.response?.data?.message || 'Failed to send reset email.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Forgot Password</h2>
                <p className="text-gray-600 mb-6">Enter your email and we'll send a reset token to your inbox.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                            placeholder="you@example.com"
                        />
                    </div>

                    {previewUrl && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                            Preview URL (dev): <a href={previewUrl} target="_blank" rel="noreferrer" className="underline">Open preview</a>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;
