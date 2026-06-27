import { useState, useEffect, useRef } from 'react';
import { X, Check, Trash2, Archive, Inbox, Bell, Settings, Search, CheckSquare, Mail, BellOff, ArrowRight } from 'lucide-react';
import { 
  getNotifications, 
  markAsRead, 
  markAllRead, 
  archiveNotification, 
  deleteNotification, 
  clearAllNotifications, 
  getNotificationPreferences, 
  updateNotificationPreferences 
} from '../Services/notificationApi';
import { socket } from '../Services/socket';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const NotificationCenter = ({ isOpen, onClose, onUnreadCountChange }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'preferences'
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'archived'
  const [searchQuery, setSearchQuery] = useState('');
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const audioRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      const res = await getNotifications({
        status: filter,
        search: searchQuery,
        limit: 50,
      });
      setNotifications(res?.data || []);
      // Update unread count from the response directly
      if (onUnreadCountChange) {
        onUnreadCountChange(res?.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch preferences
  const fetchPreferences = async () => {
    if (activeTab !== 'preferences') return;
    try {
      setLoading(true);
      const data = await getNotificationPreferences();
      setPreferences(data || null);
    } catch (err) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  // Keep track of unread count to report to header (uses cached unreadCount from notifications response)
  const updateUnreadCount = async () => {
    try {
      const res = await getNotifications({ status: 'all', limit: 1 });
      if (onUnreadCountChange) {
        onUnreadCountChange(res?.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('Failed to get unread count:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'notifications') {
        fetchNotifications();
      } else {
        fetchPreferences();
      }
    }
  }, [isOpen, activeTab, filter, searchQuery]);

  useEffect(() => {
    updateUnreadCount();
  }, [notifications, isOpen]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      // Prepend to list
      setNotifications((prev) => [notif, ...prev]);
      
      // Play sound
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      
      // Show toast
      toast.success(
        <div className="flex flex-col gap-0.5">
          <span className="font-extrabold text-[11px] text-slate-800">{notif.title}</span>
          <span className="text-[9px] text-slate-500 leading-tight line-clamp-1">{notif.message}</span>
        </div>,
        { duration: 4000, icon: '🔔' }
      );
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  // Actions
  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      // Decrement badge — only if it was unread
      setNotifications((prev) => {
        const wasUnread = prev.find((n) => n.id === id && !n.isRead);
        if (wasUnread && onUnreadCountChange) {
          onUnreadCountChange((c) => Math.max(0, c - 1));
        }
        return prev;
      });
    } catch (err) {
      toast.error('Failed to mark read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed to mark all read');
    }
  };

  const handleArchive = async (id) => {
    try {
      await archiveNotification(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isArchived: true } : n))
      );
      toast.success('Notification archived');
    } catch (err) {
      toast.error('Failed to archive');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await clearAllNotifications();
      setNotifications([]);
      if (onUnreadCountChange) onUnreadCountChange(0);
      toast.success('All cleared');
    } catch (err) {
      toast.error('Failed to clear');
    }
  };

  const handlePrefChange = (field, val) => {
    setPreferences((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: val };
    });
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;
    try {
      setPrefSaving(true);
      await updateNotificationPreferences(preferences);
      toast.success('Preferences saved successfully!');
    } catch (err) {
      toast.error('Failed to save preferences');
    } finally {
      setPrefSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Sound effect */}
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav" 
        preload="auto" 
      />

      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight">Notification Center</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise Alert Suite</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/50 rounded-xl transition text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 pt-3 border-b border-slate-100 bg-slate-50/20">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 text-xs font-black uppercase tracking-wider relative cursor-pointer mr-6 transition-all ${
              activeTab === 'notifications' 
                ? 'text-blue-600 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Inbox
            {activeTab === 'notifications' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 text-xs font-black uppercase tracking-wider relative cursor-pointer transition-all ${
              activeTab === 'preferences' 
                ? 'text-blue-600 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Preferences
            {activeTab === 'preferences' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Body */}
        {activeTab === 'notifications' ? (
          <>
            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-50 space-y-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {['all', 'unread', 'archived'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                        filter === f
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    disabled={notifications.length === 0}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600 disabled:opacity-50 transition cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Read All
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 hover:text-red-500 disabled:opacity-50 transition cursor-pointer"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 px-2">
              {loading && notifications.length === 0 ? (
                <div className="h-full flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300 gap-3">
                  <Inbox className="w-12 h-12 stroke-[1.2]" />
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wide">Inbox is empty</p>
                    <p className="text-[10px] mt-0.5">We'll alert you when something happens</p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-4 rounded-xl my-1 flex gap-3 transition-all relative group ${
                      !notif.isRead 
                        ? 'bg-blue-50/30 border-l-4 border-blue-500' 
                        : 'bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Event Icon Decorator */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase ${
                        notif.type?.startsWith('task') 
                          ? 'bg-purple-50 text-purple-600'
                          : notif.type?.startsWith('leave')
                          ? 'bg-amber-50 text-amber-600'
                          : notif.type?.startsWith('attendance')
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {notif.type?.startsWith('task') 
                          ? '📋' 
                          : notif.type?.startsWith('leave') 
                          ? '🌴' 
                          : notif.type?.startsWith('attendance') 
                          ? '🕒' 
                          : '🔔'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-10">
                      <h4 className="text-[11px] font-black text-slate-800 truncate leading-snug">
                        {notif.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1 break-words">
                        {notif.message}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 text-[8px] font-bold text-slate-400">
                        <span className="uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                          {notif.type}
                        </span>
                        <span>
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {notif.link && (
                        notif.link.startsWith('http') ? (
                          <a 
                            href={notif.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 mt-2.5 text-[9px] font-black text-blue-600 hover:underline uppercase tracking-wider"
                          >
                            Details <ArrowRight className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <Link 
                            to={notif.link}
                            onClick={onClose}
                            className="inline-flex items-center gap-0.5 mt-2.5 text-[9px] font-black text-blue-600 hover:underline uppercase tracking-wider"
                          >
                            Details <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        )
                      )}
                    </div>

                    {/* Action buttons (Absolute positioned inside group) */}
                    <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1.5 bg-white/90 shadow-md border border-slate-100 rounded-lg p-1 backdrop-blur-sm transition-all">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded transition cursor-pointer"
                          title="Mark Read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!notif.isArchived && (
                        <button
                          onClick={() => handleArchive(notif.id)}
                          className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition cursor-pointer"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Preferences Tab */
          <div className="flex-1 flex flex-col h-full bg-slate-50/30 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Notification Preferences</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Control how and when you receive alerts from TaskForge AI</p>
            </div>

            {loading && !preferences ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : !preferences ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">Failed to load preference settings.</div>
            ) : (
              <div className="space-y-6 pb-20">
                {/* Channel settings */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-50 pb-2">Global Channels</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-700 block">Email Alerts</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Send digests and summaries to {user?.email}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.emailEnabled}
                        onChange={(e) => handlePrefChange('emailEnabled', e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-700 block">Push Notifications</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Show real-time dashboard notifications</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.pushEnabled}
                        onChange={(e) => handlePrefChange('pushEnabled', e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Event toggles */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-50 pb-2">Event Subscription</h4>
                  
                  {/* Task assign */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">Task Assignment</span>
                      <span className="text-[9px] text-slate-400">Alert me when a task is assigned to me</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.taskAssign}
                        onChange={(e) => handlePrefChange('taskAssign', e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Task deadline */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">Task Deadlines</span>
                      <span className="text-[9px] text-slate-400">Reminders when task deadlines approach</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.taskDeadline}
                        onChange={(e) => handlePrefChange('taskDeadline', e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Comments */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">Comments & Mentions</span>
                      <span className="text-[9px] text-slate-400">Alert me on comments to my tasks</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.taskComment}
                        onChange={(e) => handlePrefChange('taskComment', e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Leave approval */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">Leave Updates</span>
                      <span className="text-[9px] text-slate-400">Alerts on leave request submissions & reviews</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.leaveApproval}
                        onChange={(e) => handlePrefChange('leaveApproval', e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Attendance alerts */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">Attendance remiders</span>
                      <span className="text-[9px] text-slate-400">Alert me about check-ins and late arrivals</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.attendanceAlert}
                        onChange={(e) => handlePrefChange('attendanceAlert', e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Project updates */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">Project & Workspace Updates</span>
                      <span className="text-[9px] text-slate-400">Project setups, assignments, milestones</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.projectUpdate}
                        onChange={(e) => handlePrefChange('projectUpdate', e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Weekly Digest */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">Weekly Digest Reports</span>
                      <span className="text-[9px] text-slate-400">Receive productivity analysis digests</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={preferences.weeklyDigest}
                        onChange={(e) => handlePrefChange('weeklyDigest', e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={handleSavePreferences}
                  disabled={prefSaving}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition cursor-pointer"
                >
                  {prefSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
