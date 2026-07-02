import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Bell, Search, Building2, ChevronDown, Menu, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { logoutUser } from '../Services/authApi.js';
import { getUserWorkspaces, switchWorkspace } from '../Services/workspaceApi.js';
import NotificationCenter from './NotificationCenter.jsx';
import { socket } from '../Services/socket';
import api from '../Services/api';
import { getNotifications } from '../Services/notificationApi';

const Header = () => {
    const { user, login, logout, isLoggedIn } = useAuth();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState(null);
    const navigate = useNavigate();

    // Banglish: ekta jaygate nav links rakhi, mobile + desktop duitatei use korbo
    const navLinks = [
        { to: '/projects', label: 'Projects' },
        { to: '/tasks', label: 'Tasks' },
        { to: '/chat', label: '💬 Chat' },
        { to: '/kb', label: '📚 Wiki' },
        { to: '/time-tracker', label: '⏱️ Timer' },
        { to: '/calendar', label: '🗓️ Calendar' },
        { to: '/attendance', label: 'Attendance' },
        { to: '/leaves', label: 'Leaves' },
        { to: '/ai-workspace', label: 'AI Workspace' },
        { to: '/executive-dashboard', label: 'Executive Dashboard' },
        ...(user?.role === 'super_admin' ? [{ to: '/super-admin', label: 'Super Admin Portal' }] : []),
        ...((user?.role === 'admin' || user?.role === 'manager' || user?.role === 'owner')
            ? [{ to: '/reports', label: 'Reports' }, { to: '/admin-settings', label: 'Admin Settings' }]
            : []),
    ];

    const fetchUnreadCount = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await getNotifications({ status: 'all', limit: 1 });
            setUnreadCount(res?.unreadCount ?? 0);
        } catch {
            // silently ignore — non-critical UI feature
        }
    }, [isLoggedIn]);

    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    useEffect(() => {
        if (!socket) return;
        const handleNewNotification = () => {
            setUnreadCount((prev) => prev + 1);
        };
        socket.on('notification', handleNewNotification);
        return () => {
            socket.off('notification', handleNewNotification);
        };
    }, []);

    // Fetch workspaces on login
    useEffect(() => {
        if (isLoggedIn) {
            getUserWorkspaces()
                .then(data => {
                    const extracted = (data || []).map(item => item.workspace).filter(Boolean);
                    setWorkspaces(extracted);
                })
                .catch(err => {
                    console.error('Failed to fetch workspaces:', err);
                });
        }
    }, [isLoggedIn, user?.activeWorkspaceId]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logoutUser();
            logout();
            toast.success('Logged out successfully');
            navigate('/login');
            setProfileMenuOpen(false);
            setShowLogoutConfirm(false);
        } catch (err) {
            console.error('Logout error:', err);
            toast.error(err.response?.data?.message || 'Logout failed');
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleSwitch = async (workspaceId) => {
        if (workspaceId === user?.activeWorkspaceId) return;
        setWorkspaceMenuOpen(false);
        setSwitchingWorkspaceId(workspaceId);
        try {
            const res = await switchWorkspace(workspaceId);
            toast.success(res.message || 'Switched workspace!');

            // Re-fetch current user profile to update AuthContext state and re-render pages!
            const meRes = await api.get('/users/me');
            if (meRes?.data?.user) {
                login(meRes.data.user);
                navigate('/dashboard');
                window.location.reload(); // Full reload to reset all query and socket contexts
            }
        } catch (err) {
            console.error('Switch error:', err);
            toast.error(err.response?.data?.message || 'Failed to switch workspace');
            setSwitchingWorkspaceId(null);
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
                                {/* Mobile menu toggle */}
                                <button
                                    onClick={() => setMobileMenuOpen((v) => !v)}
                                    className="lg:hidden p-2.5 hover:bg-blue-100/50 rounded-xl transition cursor-pointer"
                                    aria-label="Toggle menu"
                                >
                                    {mobileMenuOpen ? <X className="w-5 h-5 text-ink-soft" /> : <Menu className="w-5 h-5 text-ink-soft" />}
                                </button>

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
                                                            disabled={switchingWorkspaceId != null}
                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                w.id === user?.activeWorkspaceId
                                                                    ? 'bg-blue-50 text-blue-600 font-extrabold'
                                                                    : 'text-ink-soft hover:bg-slate-50 font-bold'
                                                            }`}
                                                        >
                                                            <span className="truncate pr-2">{w.name}</span>
                                                            {switchingWorkspaceId === w.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                                                            ) : (
                                                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/50">/{w.slug}</span>
                                                            )}
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
                                            <Search className="w-4 h-4 text-ink-soft" />
                                        </button>
                                    )}
                                </div>

                                 {/* Notifications */}
                                 <button 
                                     onClick={() => setNotificationCenterOpen(true)}
                                     className="relative p-2.5 hover:bg-blue-100/50 rounded-xl transition group cursor-pointer"
                                 >
                                     <Bell className={`w-4 h-4 transition ${unreadCount > 0 ? 'text-brand' : 'text-ink-soft'}`} />
                                     {unreadCount > 0 && (
                                         <span className="absolute top-1.5 right-1.5 bg-red-500 text-white font-extrabold text-[8px] flex items-center justify-center min-w-[12px] h-[12px] rounded-full border border-white animate-pulse">
                                             {unreadCount}
                                         </span>
                                     )}
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
                                                    onClick={() => {
                                                        setProfileMenuOpen(false);
                                                        setShowLogoutConfirm(true);
                                                    }}
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
            {/* Mobile nav drawer */}
            {isLoggedIn && mobileMenuOpen && (
                <div className="lg:hidden border-t border-blue-100/60 bg-white/95 backdrop-blur-xl shadow-lg">
                    <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
                        {navLinks.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-3 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}

            <NotificationCenter
                                                isOpen={notificationCenterOpen}
                                                onClose={() => setNotificationCenterOpen(false)}
                                                onUnreadCountChange={setUnreadCount}
                                            />

                                            {/* LOGOUT CONFIRMATION MODAL */}
                                            {showLogoutConfirm && (
                                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                                    <div className="bg-card border border-line w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-center">
                                                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
                                                            <LogOut className="w-6 h-6" />
                                                        </div>
                                                        <h3 className="text-base font-extrabold text-ink mb-2">
                                                            Confirm Logout
                                                        </h3>
                                                        <p className="text-xs text-ink-soft mb-6 leading-relaxed">
                                                            Are you sure you want to log out of your TaskForge AI account?
                                                        </p>
                                                        <div className="flex gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowLogoutConfirm(false)}
                                                                disabled={isLoggingOut}
                                                                className="flex-1 py-3 bg-surface-2 hover:bg-surface-3 border border-line text-xs font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-ink disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleLogout}
                                                                disabled={isLoggingOut}
                                                                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-xs font-bold text-white rounded-2xl hover:shadow-lg hover:shadow-red-500/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                                                            >
                                                                {isLoggingOut ? (
                                                                    <>
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        Logging out...
                                                                    </>
                                                                ) : 'Logout'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </header>
    );
};

export default Header;