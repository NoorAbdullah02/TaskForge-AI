import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { logoutUser } from '../Services/authApi.js';

const Header = () => {
    const { user, logout, isLoggedIn } = useAuth();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            logout();
            toast.success('Logged out successfully');
            navigate('/login');
            setProfileMenuOpen(false);
        } catch (err) {
            console.error('Logout error:', err);
            toast.error('Logout failed');
        }
    };

    return (
        <header className="bg-gradient-to-r from-white via-blue-50 to-white sticky top-0 z-50 shadow-lg border-b-2 border-blue-100">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex justify-between items-center">
                    {/* Logo Section */}
                    <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-3 group">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                Dashboard
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">Control Panel</p>
                        </div>
                    </Link>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        {isLoggedIn ? (
                            <>
                                {/* Search Bar */}
                                <div className="relative hidden sm:block">
                                    {searchOpen ? (
                                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search..."
                                                className="px-4 py-2 pl-4 pr-10 w-64 bg-white border-2 border-blue-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                                onBlur={() => setSearchOpen(false)}
                                            />
                                            <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setSearchOpen(true)}
                                            className="p-2.5 hover:bg-blue-100 rounded-xl transition-all"
                                        >
                                            <Search className="w-5 h-5 text-gray-600" />
                                        </button>
                                    )}
                                </div>

                                {/* Notifications */}
                                <button className="relative p-2.5 hover:bg-blue-100 rounded-xl transition-all group">
                                    <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition" />
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                                </button>

                                {/* Profile Section */}
                                <div className="relative">
                                    <button
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-blue-100 rounded-2xl transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-all">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="hidden sm:flex flex-col items-start">
                                            <span className="text-sm font-semibold text-gray-800">{user?.name}</span>
                                            <span className="text-xs text-gray-500">User</span>
                                        </div>
                                        <svg
                                            className={`w-4 h-4 text-gray-600 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </button>

                                    {/* Profile Dropdown */}
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border-2 border-blue-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {/* Header */}
                                            <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                        {user?.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-800 font-bold text-sm">{user?.name}</p>
                                                        <p className="text-gray-600 text-xs">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="p-3 space-y-2">
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setProfileMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-100 rounded-xl transition-all group"
                                                >
                                                    <Settings className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
                                                    <span className="font-medium text-sm">Settings</span>
                                                    <span className="ml-auto text-xs text-gray-400">⚙️</span>
                                                </Link>

                                                <hr className="border-gray-200 my-2" />

                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all group"
                                                >
                                                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition" />
                                                    <span className="font-medium text-sm">Logout</span>
                                                </button>
                                            </div>

                                            {/* Footer */}
                                            <div className="px-6 py-3 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-200">
                                                v1.0.0 • Dashboard
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            // Not Logged In - Show Sign In & Sign Up
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/login"
                                    className="px-6 py-2 text-blue-600 font-semibold hover:bg-blue-50 rounded-2xl transition-all"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-blue-500/50 transition-all"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;