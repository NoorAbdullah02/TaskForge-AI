import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut, Settings, Bell, Search, Building2, ChevronDown,
  Menu, X, Zap, LayoutDashboard, FolderKanban, CheckSquare,
  MessageSquare, BookOpen, Clock, Calendar, Users, Plane,
  BarChart2, SlidersHorizontal, ShieldCheck, Bot
} from 'lucide-react';
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
  const { user, login, logout, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const [profileOpen,      setProfileOpen]      = useState(false);
  const [workspaceOpen,    setWorkspaceOpen]     = useState(false);
  const [moreOpen,         setMoreOpen]          = useState(false);
  const [workspaces,       setWorkspaces]        = useState([]);
  const [searchOpen,       setSearchOpen]        = useState(false);
  const [searchQuery,      setSearchQuery]       = useState('');
  const [notifOpen,        setNotifOpen]         = useState(false);
  const [unreadCount,      setUnreadCount]       = useState(0);
  const [mobileOpen,       setMobileOpen]        = useState(false);
  const [scrolled,         setScrolled]          = useState(false);

  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const workspaceRef = useRef(null);
  const moreMenuRef = useRef(null);

  /* scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close all menus on route change */
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setWorkspaceOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  /* close dropdowns on click outside */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (workspaceRef.current && !workspaceRef.current.contains(e.target)) {
        setWorkspaceOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* unread notifications */
  const fetchUnread = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await getNotifications({ status: 'all', limit: 1 });
      setUnreadCount(res?.unreadCount ?? 0);
    } catch { /* non-critical */ }
  }, [isLoggedIn]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  useEffect(() => {
    if (!socket) return;
    const inc = () => setUnreadCount(p => p + 1);
    socket.on('notification', inc);
    return () => socket.off('notification', inc);
  }, []);

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

  const corePaths = ['/projects', '/tasks', '/chat', '/ai-workspace', '/executive-dashboard'];
  const coreItems = allNavItems.filter(item => corePaths.includes(item.to));
  const secondaryItems = allNavItems.filter(item => !corePaths.includes(item.to));
  const isSecondaryActive = secondaryItems.some(item => isActive(item.to));


  return (
    <>
      <header className={[
        'sticky top-0 z-50 w-full transition-all duration-300',
        'bg-white/90 backdrop-blur-xl border-b',
        scrolled
          ? 'border-slate-200 shadow-[0_2px_20px_rgba(0,0,0,0.08)]'
          : 'border-slate-100 shadow-none',
      ].join(' ')}>

        <div className="w-full px-4 sm:px-6 h-16 flex items-center gap-4">

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

          {/* ── Desktop Nav (responsive core/secondary/more) ── */}
          {isLoggedIn && (
            <nav className="hidden lg:flex items-center flex-1 min-w-0">
              <div className="flex items-center gap-1 xl:gap-1.5 px-1 w-full">
                {/* Core Items (always visible) */}
                {coreItems.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={[
                        'flex items-center gap-2 px-2 xl:px-2.5 2xl:px-3 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all',
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

                {/* Secondary Items (visible on 3xl+) */}
                {secondaryItems.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={[
                        'hidden 3xl:flex items-center gap-2 px-2 xl:px-2.5 3xl:px-3 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all',
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

                {/* 'More' dropdown button (visible only on lg, hidden on 3xl) */}
                {secondaryItems.length > 0 && (
                  <div className="relative hidden lg:flex 3xl:hidden" ref={moreMenuRef}>
                    <button
                      onClick={() => setMoreOpen(v => !v)}
                      className={[
                        'flex items-center gap-1.5 px-2 xl:px-2.5 2xl:px-3 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all cursor-pointer',
                        isSecondaryActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      More
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {moreOpen && (
                      <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1.5 z-50 animate-scale-in">
                        <div className="px-3.5 py-1.5 border-b border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">More Pages</span>
                        </div>
                        <div className="p-1 space-y-0.5 max-h-72 overflow-y-auto">
                          {secondaryItems.map(({ to, label, icon: Icon }) => {
                            const active = isActive(to);
                            return (
                              <Link
                                key={to}
                                to={to}
                                onClick={() => setMoreOpen(false)}
                                className={[
                                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition',
                                  active
                                    ? 'bg-blue-50 text-blue-600 font-bold'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                ].join(' ')}
                              >
                                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                                {label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  <div className="relative hidden sm:block" ref={workspaceRef}>
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
                <div className="relative" ref={profileRef}>
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
};

export default Header;
