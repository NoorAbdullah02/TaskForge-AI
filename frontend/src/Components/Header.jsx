import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Bell, Search, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { logoutUser } from '../Services/authApi.js';
import { getUserWorkspaces, switchWorkspace } from '../Services/workspaceApi.js';

const Header = () => {
    const { user, login, logout, isLoggedIn } = useAuth();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const navigate = useNavigate();

    // Fetch workspaces on login
    useEffect(() => {
        if (isLoggedIn) {
            getUserWorkspaces()
                .then(data => {
                    setWorkspaces(data || []);
                })
                .catch(err => {
                    console.error('Failed to fetch workspaces:', err);
                });
        }
    }, [isLoggedIn, user?.activeWorkspaceId]);

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

    const handleSwitch = async (workspaceId) => {
        if (workspaceId === user?.activeWorkspaceId) return;
        setWorkspaceMenuOpen(false);
        try {
            const res = await switchWorkspace(workspaceId);
            toast.success(res.message || 'Switched workspace!');
            
            // Re-fetch current user profile to update AuthContext state and re-render pages!
            const { default: api } = await import('../Services/api');
            const meRes = await api.get('/users/me');
            if (meRes?.data?.user) {
                login(meRes.data.user); 
                navigate('/dashboard');
                window.location.reload(); // Full reload to reset all query and socket contexts
            }
        } catch (err) {
            console.error('Switch error:', err);
            toast.error(err.response?.data?.message || 'Failed to switch workspace');
        }
    };

    return (
        <header className="bg-gradient-to-r from-white via-blue-50/30 to-white sticky top-0 z-50 shadow-lg border-b border-blue-100/60">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex justify-between items-center">
                    {/* Logo Section */}
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div>
                                <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                                    TaskForge AI
                                </h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Neural Platform</p>
                            </div>
                        </Link>

                        {isLoggedIn && (
                            <div className="hidden lg:flex items-center gap-6">
                                <Link
                                    to="/projects"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                >
                                    Projects
                                </Link>
                                <Link
                                    to="/tasks"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                >
                                    Tasks
                                </Link>
                                <Link
                                    to="/chat"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider font-semibold bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100"
                                >
                                    💬 Chat
                                </Link>
                                <Link
                                    to="/kb"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider font-semibold bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100"
                                >
                                    📚 Wiki
                                </Link>
                                <Link
                                    to="/time-tracker"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider font-semibold bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100"
                                >
                                    ⏱️ Timer
                                </Link>
                                <Link
                                    to="/calendar"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider font-semibold bg-purple-50/50 px-2 py-1 rounded-lg border border-purple-100"
                                >
                                    🗓️ Calendar
                                </Link>
                                <Link
                                    to="/attendance"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                >
                                    Attendance
                                </Link>
                                <Link
                                    to="/leaves"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                >
                                    Leaves
                                </Link>
                                <Link
                                    to="/ai-workspace"
                                    className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                >
                                    AI Workspace
                                </Link>
                                <Link
                                    to="/executive-dashboard"
                                    className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                                >
                                    Executive Dashboard
                                </Link>

                                {user?.role === 'super_admin' && (
                                    <Link
                                        to="/super-admin"
                                        className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                                    >
                                        Super Admin Portal
                                    </Link>
                                )}
                                {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'owner') && (
                                    <>
                                        <Link
                                            to="/reports"
                                            className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                        >
                                            Reports
                                        </Link>
                                        <Link
                                            to="/admin-settings"
                                            className="text-xs font-extrabold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                        >
                                            Admin Settings
                                        </Link>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        {isLoggedIn ? (
                            <>
                                {/* Workspace Selector */}
                                {user?.role !== 'super_admin' && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold hover:bg-slate-100 transition cursor-pointer"
                                        >
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                            <span className="max-w-[120px] truncate text-slate-700">{user?.workspaceName || 'Select Workspace'}</span>
                                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                        </button>

                                        {workspaceMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Switch Active Workspace</span>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto px-1 space-y-1">
                                                    {workspaces.map(w => (
                                                        <button
                                                            key={w.id}
                                                            onClick={() => handleSwitch(w.id)}
                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                                                                w.id === user?.activeWorkspaceId
                                                                    ? 'bg-blue-50 text-blue-600 font-extrabold'
                                                                    : 'text-slate-650 hover:bg-slate-50 font-bold'
                                                            }`}
                                                        >
                                                            <span className="truncate pr-2">{w.name}</span>
                                                            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/50">/{w.slug}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="border-t border-slate-100 mt-2 pt-2 px-3">
                                                    <Link
                                                        to="/register"
                                                        onClick={() => setWorkspaceMenuOpen(false)}
                                                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                                    >
                                                        Create / Join Workspace
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Search Bar */}
                                <div className="relative hidden sm:block">
                                    {searchOpen ? (
                                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search..."
                                                className="px-4 py-2 pl-4 pr-10 w-64 bg-white border-2 border-blue-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-xs"
                                                onBlur={() => setSearchOpen(false)}
                                            />
                                            <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setSearchOpen(true)}
                                            className="p-2.5 hover:bg-blue-100/50 rounded-xl transition cursor-pointer"
                                        >
                                            <Search className="w-4 h-4 text-gray-650" />
                                        </button>
                                    )}
                                </div>

                                {/* Notifications */}
                                <button className="relative p-2.5 hover:bg-blue-100/50 rounded-xl transition group cursor-pointer">
                                    <Bell className="w-4 h-4 text-gray-650 group-hover:text-blue-600 transition animate-pulse" />
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                </button>

                                {/* Profile Section */}
                                <div className="relative">
                                    <button
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-100/30 rounded-2xl transition group cursor-pointer"
                                    >
                                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:shadow-lg transition overflow-hidden">
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                user?.name?.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="hidden sm:flex flex-col items-start text-left">
                                            <span className="text-xs font-extrabold text-gray-800 leading-none">{user?.name}</span>
                                            <span className="text-[9px] text-gray-500 capitalize mt-1 font-bold">
                                                {user?.role === 'super_admin' ? '🛡️ Super Admin' : (user?.role || 'User')}
                                            </span>
                                        </div>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    </button>

                                    {/* Profile Dropdown */}
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-blue-100/60 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {/* Header */}
                                            <div className="px-6 py-5 bg-gradient-to-r from-blue-50/50 to-blue-100/50 border-b border-blue-100/40">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                                                        {user?.avatarUrl ? (
                                                            <img src={user.avatarUrl.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            user?.name?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-800 font-extrabold text-xs truncate max-w-[120px]">{user?.name}</p>
                                                        <p className="text-gray-500 text-[10px] truncate max-w-[120px]">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="p-3 space-y-1">
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setProfileMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 rounded-xl transition group"
                                                >
                                                    <Settings className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
                                                    <span className="font-bold text-xs">Settings</span>
                                                </Link>

                                                <hr className="border-slate-100 my-1" />

                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition group cursor-pointer"
                                                >
                                                    <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                                                    <span className="font-bold text-xs">Logout</span>
                                                </button>
                                            </div>

                                            {/* Footer */}
                                            <div className="px-6 py-2 bg-gray-50 text-center text-[9px] text-gray-400 border-t border-gray-100">
                                                v2.0.0 • TaskForge AI
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            // Not Logged In
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/login"
                                    className="px-5 py-2 text-blue-600 font-extrabold hover:bg-blue-50 rounded-xl text-xs transition"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition text-xs"
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