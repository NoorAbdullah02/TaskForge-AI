<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Bell, Search, Building2, ChevronDown, Menu, X, Loader2 } from 'lucide-react';
=======
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut, Settings, Bell, Search, Building2, ChevronDown,
  Menu, X, Zap, LayoutDashboard, FolderKanban, CheckSquare,
  MessageSquare, BookOpen, Clock, Calendar, Users, Plane,
  BarChart2, SlidersHorizontal, ShieldCheck, Bot
} from 'lucide-react';
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { logoutUser } from '../Services/authApi.js';
import { getUserWorkspaces, switchWorkspace } from '../Services/workspaceApi.js';
import NotificationCenter from './NotificationCenter.jsx';
import { socket } from '../Services/socket';
import api from '../Services/api';
import { getNotifications } from '../Services/notificationApi';

/* ─── nav link definitions ───────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/projects',            label: 'Projects',        icon: FolderKanban },
  { to: '/tasks',               label: 'Tasks',           icon: CheckSquare  },
  { to: '/chat',                label: 'Chat',            icon: MessageSquare },
  { to: '/kb',                  label: 'Wiki',            icon: BookOpen     },
  { to: '/time-tracker',        label: 'Timer',           icon: Clock        },
  { to: '/calendar',            label: 'Calendar',        icon: Calendar     },
  { to: '/attendance',          label: 'Attendance',      icon: Users        },
  { to: '/leaves',              label: 'Leaves',          icon: Plane        },
  { to: '/ai-workspace',        label: 'AI',              icon: Bot          },
  { to: '/executive-dashboard', label: 'Executive',       icon: LayoutDashboard },
];

const ADMIN_ITEMS = [
  { to: '/reports',       label: 'Reports',       icon: BarChart2       },
  { to: '/admin-settings',label: 'Admin',         icon: SlidersHorizontal },
];

const SUPER_ITEMS = [
  { to: '/super-admin', label: 'Super Admin', icon: ShieldCheck },
];


const Header = () => {
<<<<<<< HEAD
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
=======
  const { user, login, logout, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)

  const [profileOpen,      setProfileOpen]      = useState(false);
  const [workspaceOpen,    setWorkspaceOpen]     = useState(false);
  const [workspaces,       setWorkspaces]        = useState([]);
  const [searchOpen,       setSearchOpen]        = useState(false);
  const [searchQuery,      setSearchQuery]       = useState('');
  const [notifOpen,        setNotifOpen]         = useState(false);
  const [unreadCount,      setUnreadCount]       = useState(0);
  const [mobileOpen,       setMobileOpen]        = useState(false);
  const [scrolled,         setScrolled]          = useState(false);

  const searchRef = useRef(null);

  /* scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close mobile menu on route change */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* unread notifications */
  const fetchUnread = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await getNotifications({ status: 'all', limit: 1 });
      setUnreadCount(res?.unreadCount ?? 0);
    } catch { /* non-critical */ }
  }, [isLoggedIn]);

<<<<<<< HEAD
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
=======
  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  useEffect(() => {
    if (!socket) return;
    const inc = () => setUnreadCount(p => p + 1);
    socket.on('notification', inc);
    return () => socket.off('notification', inc);
  }, []);
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)

  /* workspaces */
  useEffect(() => {
    if (!isLoggedIn) return;
    getUserWorkspaces()
      .then(data => setWorkspaces((data || []).map(i => i.workspace).filter(Boolean)))
      .catch(() => {});
  }, [isLoggedIn, user?.activeWorkspaceId]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
      toast.success('Logged out successfully');
      navigate('/login');
      setProfileOpen(false);
    } catch { toast.error('Logout failed'); }
  };

  const handleSwitch = async (id) => {
    if (id === user?.activeWorkspaceId) return;
    setWorkspaceOpen(false);
    try {
      const res = await switchWorkspace(id);
      toast.success(res.message || 'Switched workspace');
      const me = await api.get('/users/me');
      if (me?.data?.user) { login(me.data.user); navigate('/dashboard'); window.location.reload(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to switch workspace');
    }
  };

  /* active link helper */
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  /* build full nav for this role */
  const allNavItems = [
    ...NAV_ITEMS,
    ...((user?.role === 'admin' || user?.role === 'manager' || user?.role === 'owner') ? ADMIN_ITEMS : []),
    ...(user?.role === 'super_admin' ? SUPER_ITEMS : []),
  ];


  return (
    <>
      <header className={[
        'sticky top-0 z-50 w-full transition-all duration-300',
        'bg-white/90 backdrop-blur-xl border-b',
        scrolled
          ? 'border-slate-200 shadow-[0_2px_20px_rgba(0,0,0,0.08)]'
          : 'border-slate-100 shadow-none',
      ].join(' ')}>

        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group mr-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md group-hover:shadow-blue-500/40 transition-shadow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <span className="block text-[17px] font-black bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                TaskForge
              </span>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                AI Platform
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav (scrollable strip) ───────────────── */}
          {isLoggedIn && (
            <nav className="hidden lg:flex items-center flex-1 min-w-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 px-1">
                {allNavItems.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={[
                        'flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all',
                        active
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}

          {/* spacer when not logged in */}
          {!isLoggedIn && <div className="flex-1" />}


          {/* ── Right action cluster ─────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0">

            {isLoggedIn ? (
              <>
                {/* Mobile toggle */}
                <button
                  onClick={() => setMobileOpen(v => !v)}
                  className="lg:hidden p-2.5 rounded-xl hover:bg-slate-100 transition cursor-pointer text-slate-500"
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {/* Search */}
                <div className="relative hidden sm:flex items-center">
                  {searchOpen ? (
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 w-56 animate-scale-in">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        ref={searchRef}
                        autoFocus
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search…"
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        onBlur={() => { setSearchOpen(false); setSearchQuery(''); }}
                        onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="p-2.5 rounded-xl hover:bg-slate-100 transition cursor-pointer text-slate-400 hover:text-slate-700"
                      aria-label="Search"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Notifications */}
                <button
                  onClick={() => setNotifOpen(true)}
                  className="relative p-2.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Workspace selector */}
                {user?.role !== 'super_admin' && (
                  <div className="relative hidden sm:block">
                    <button
                      onClick={() => setWorkspaceOpen(v => !v)}
                      className="flex items-center gap-2 pl-3 pr-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition cursor-pointer max-w-[160px]"
                    >
                      <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate">{user?.workspaceName || 'Workspace'}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>

                    {workspaceOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1.5 z-50 animate-scale-in">
                        <div className="px-4 py-2.5 border-b border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Switch Workspace</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                          {workspaces.map(w => (
                            <button
                              key={w.id}
                              onClick={() => handleSwitch(w.id)}
                              className={[
                                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition',
                                w.id === user?.activeWorkspaceId
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'text-slate-600 hover:bg-slate-50 font-medium',
                              ].join(' ')}
                            >
                              <span className="truncate pr-2">{w.name}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${w.id === user?.activeWorkspaceId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>/{w.slug}</span>
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-slate-100 p-2">
                          <Link
                            to="/register"
                            onClick={() => setWorkspaceOpen(false)}
                            className="flex items-center justify-center w-full py-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold rounded-xl hover:opacity-90 transition"
                          >
                            + Create / Join Workspace
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Profile */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(v => !v)}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden shrink-0">
                      {user?.avatarUrl
                        ? <img src={user.avatarUrl.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                        : user?.name?.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="hidden sm:block text-left leading-none">
                      <span className="block text-sm font-bold text-slate-700">{user?.name}</span>
                      <span className="block text-[10px] text-slate-400 capitalize font-medium mt-0.5">
                        {user?.role === 'super_admin' ? 'Super Admin' : user?.role || 'User'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-scale-in">
                      {/* user info strip */}
                      <div className="px-4 py-3.5 bg-linear-to-br from-blue-600 to-indigo-600 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                          {user?.avatarUrl
                            ? <img src={user.avatarUrl.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                            : user?.name?.charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold text-xs truncate">{user?.name}</p>
                          <p className="text-blue-200 text-[10px] truncate">{user?.email}</p>
                        </div>
                      </div>

                      <div className="p-2 space-y-0.5">
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition group"
                        >
                          <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                          Profile & Settings
                        </Link>

                        <div className="my-1 border-t border-slate-100" />

<<<<<<< HEAD
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
=======
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>

                      <div className="px-4 py-2 bg-slate-50 text-center text-[9px] text-slate-400 border-t border-slate-100">
                        v2.0.0 · TaskForge AI
                      </div>
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl hover:opacity-90 shadow-sm transition">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

<<<<<<< HEAD
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
=======

        {/* ── Mobile menu drawer ──────────────────────────────── */}
        {isLoggedIn && mobileOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl shadow-lg">
            {/* workspace pill on mobile */}
            {user?.role !== 'super_admin' && (
              <div className="px-4 pt-3 pb-1">
                <button
                  onClick={() => setWorkspaceOpen(v => !v)}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="flex-1 text-left truncate">{user?.workspaceName || 'Select Workspace'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            )}
            <nav className="px-3 py-3 grid grid-cols-3 gap-1">
              {allNavItems.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold text-center transition',
                      active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                    ].join(' ')}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <NotificationCenter
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)
};

export default Header;
