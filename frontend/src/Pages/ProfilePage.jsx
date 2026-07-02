import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../context/AuthContext';
import { 
    Mail, Lock, CheckCircle, X, Camera, Edit2, Save, User, Shield, 
    Bell, Paintbrush, Globe, Cpu, Key, Activity, Trash2, Plus, 
    AlertTriangle, RefreshCw, ShieldCheck, Laptop, Chrome, 
    LogOut, Check, ChevronRight, Settings, Eye, EyeOff, ShieldAlert, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    getUserProfile, sendVerificationEmail, verifyEmailToken,
    updateUserPassword, updateUserAvatar,
    updateUserProfile, getDepartments, toggle2Fa,
    getUserSessions, revokeSession, getUserActivityLogs,
    getApiKeys, createApiKey, revokeApiKey
} from '../Services/authApi';
import { uploadFile } from '../Services/uploadApi';
import { getWorkspaceInfo } from '../Services/workspaceApi';
import { isPasswordStrong, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

export default function ProfilePage() {
    const { user, login } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [, setEditingProfile] = useState(false);
    const [editData, setEditData] = useState({});
    
    // Tab States
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const headerRef = useRef(null);

    useEffect(() => {
        if (!loading && headerRef.current) {
            gsap.from([...headerRef.current.children], {
                y: -28, opacity: 0, stagger: 0.1, duration: 0.85, ease: 'power3.out',
            });
        }
    }, [loading]);
    
    // Data List States
    const [sessions, setSessions] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [apiKeysList, setApiKeysList] = useState([]);
    const [, setWorkspaceInfo] = useState(null);

    // Form Loading States
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [copiedKey, setCopiedKey] = useState('');
    const [newKeyName, setNewKeyName] = useState('');
    const [justCreatedKey, setJustCreatedKey] = useState(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isVerifyingToken, setIsVerifyingToken] = useState(false);
    const [isTogglingTwoFa, setIsTogglingTwoFa] = useState(false);
    const [revokingSessionId, setRevokingSessionId] = useState(null);
    const [revokingKeyId, setRevokingKeyId] = useState(null);

    // Passwords Form
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false
    });

    // Verify Email states
    const [isSendingVerify, setIsSendingVerify] = useState(false);
    const [verifyTokenInput, setVerifyTokenInput] = useState('');
    const [showVerifyInput, setShowVerifyInput] = useState(false);

    // Settings Defaults
    const [settings, setSettings] = useState({
        notifications: {
            emailAlerts: true,
            pushAlerts: false,
            slackAlerts: false,
            sprintUpdates: true
        },
        theme: localStorage.getItem('tf_theme') || 'light',
        language: 'en',
        privacy: {
            profilePublic: true,
            shareAnalytics: false
        }
    });

    // Fetch initial profile
    const loadProfile = async () => {
        try {
            setLoading(true);
            const [profile, depts] = await Promise.all([
                getUserProfile(),
                getDepartments()
            ]);
            setProfileData(profile);
            setEditData(profile);
            setDepartments(depts);
            if (profile.avatarUrl) {
                setProfileImage(profile.avatarUrl.split('#')[0]);
            }

            // If workspace owner, load workspace info too
            if (profile.role === 'owner' || user?.role === 'owner') {
                try {
                    const wsInfo = await getWorkspaceInfo();
                    setWorkspaceInfo(wsInfo);
                } catch (wsErr) {
                    console.error('Failed to load workspace info:', wsErr);
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    // Load tab-specific lists on demand
    useEffect(() => {
        if (activeTab === 'sessions') {
            fetchSessions();
        } else if (activeTab === 'logs') {
            fetchLogs();
        } else if (activeTab === 'api') {
            fetchApiKeys();
        }
    }, [activeTab]);

    const fetchSessions = async () => {
        try {
            const data = await getUserSessions();
            setSessions(data);
        } catch (err) {
            console.error('Failed to load sessions:', err);
        }
    };

    const fetchLogs = async () => {
        try {
            const data = await getUserActivityLogs();
            setActivityLogs(data);
        } catch (err) {
            console.error('Failed to load activity logs:', err);
        }
    };

    const fetchApiKeys = async () => {
        try {
            const data = await getApiKeys();
            setApiKeysList(data);
        } catch (err) {
            console.error('Failed to load API keys:', err);
        }
    };

    // Actions
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        const toastId = toast.loading('Uploading avatar...');
        setIsUploadingAvatar(true);
        try {
            const res = await uploadFile(file, 'avatars');
            const fileUrlWithId = `${res.url}#${res.fileId}`;
            const updated = await updateUserAvatar({ avatarUrl: fileUrlWithId });
            setProfileImage(res.url);
            if (login) login(updated);
            toast.success('Profile image updated!', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Failed to upload image', { id: toastId });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!editData.name?.trim()) {
            toast.error('Name is required');
            return;
        }
        setIsSavingProfile(true);
        try {
            const res = await updateUserProfile({
                name: editData.name.trim(),
                position: editData.position || null,
                phone: editData.phone || null,
                departmentId: editData.departmentId || null
            });
            setProfileData(res.user);
            if (login) login(res.user);
            setEditingProfile(false);
            toast.success('Profile updated successfully');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error('All password fields are required');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (!isPasswordStrong(passwordData.newPassword)) {
            toast.error(PASSWORD_POLICY_MESSAGE);
            return;
        }

        setIsChangingPassword(true);
        try {
            await updateUserPassword({
                currentPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password changed successfully');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleSendVerification = async () => {
        setIsSendingVerify(true);
        try {
            await sendVerificationEmail();
            setShowVerifyInput(true);
            toast.success('Verification code sent to your email');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to send verification email');
        } finally {
            setIsSendingVerify(false);
        }
    };

    const handleVerifyToken = async () => {
        if (!verifyTokenInput.trim()) {
            toast.error('Please enter the verification code');
            return;
        }
        setIsVerifyingToken(true);
        try {
            await verifyEmailToken({ email: profileData.email, token: verifyTokenInput.trim() });
            toast.success('Email verified successfully! 🎉');
            setShowVerifyInput(false);
            setVerifyTokenInput('');
            loadProfile();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to verify email code');
        } finally {
            setIsVerifyingToken(false);
        }
    };

    const handleToggle2FA = async (checked) => {
        const toastId = toast.loading(`${checked ? 'Enabling' : 'Disabling'} 2FA...`);
        setIsTogglingTwoFa(true);
        try {
            const res = await toggle2Fa(checked);
            setProfileData(prev => ({ ...prev, is2faEnabled: res.is2faEnabled }));
            if (login) login({ ...user, is2faEnabled: res.is2faEnabled });
            toast.success(res.message || `2FA ${checked ? 'enabled' : 'disabled'}`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Failed to change 2FA setting', { id: toastId });
        } finally {
            setIsTogglingTwoFa(false);
        }
    };

    const handleRevokeSession = async (id) => {
        if (!confirm('Are you sure you want to log out of this device?')) return;
        setRevokingSessionId(id);
        try {
            await revokeSession(id);
            toast.success('Device session revoked successfully');
            fetchSessions();
        } catch (err) {
            console.error(err);
            toast.error('Failed to revoke session');
        } finally {
            setRevokingSessionId(null);
        }
    };

    const handleCreateApiKey = async (e) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;
        setIsCreatingKey(true);
        try {
            const res = await createApiKey(newKeyName.trim());
            setJustCreatedKey(res.key);
            setNewKeyName('');
            fetchApiKeys();
            toast.success('API Key generated successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to create API key');
        } finally {
            setIsCreatingKey(false);
        }
    };

    const handleRevokeApiKey = async (id) => {
        if (!confirm('Are you sure you want to revoke this API key? Applications using it will break.')) return;
        setRevokingKeyId(id);
        try {
            await revokeApiKey(id);
            toast.success('API key revoked successfully');
            fetchApiKeys();
        } catch (err) {
            console.error(err);
            toast.error('Failed to revoke API key');
        } finally {
            setRevokingKeyId(null);
        }
    };

    const handleToggleTheme = (themeName) => {
        setSettings(prev => ({ ...prev, theme: themeName }));
        localStorage.setItem('tf_theme', themeName);
        toast.success(`Theme updated to ${themeName}`);
    };

    const getRoleBadge = (role) => {
        switch (role?.toLowerCase()) {
            case 'super_admin':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md uppercase tracking-wider">
                        🛡️ Super Admin
                    </span>
                );
            case 'owner':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md uppercase tracking-wider">
                        👑 Workspace Owner
                    </span>
                );
            case 'manager':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md uppercase tracking-wider">
                        💼 Project Manager
                    </span>
                );
            case 'leader':
            case 'team_leader':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md uppercase tracking-wider">
                        ⚡ Team Leader
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md uppercase tracking-wider">
                        👤 Employee
                    </span>
                );
        }
    };

    if (loading || !profileData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-ink-soft text-xs font-semibold">Decrypting settings instance...</p>
                </div>
            </div>
        );
    }

    const isOwner = profileData.role === 'owner';
    const isSuperAdmin = profileData.role === 'super_admin';
    const isManager = profileData.role === 'manager';
    const isLeader = profileData.role === 'leader' || profileData.role === 'team_leader';

    const getSettingsTitle = () => {
        if (isSuperAdmin) return "Super Admin System Configuration";
        if (isOwner) return "Workspace Owner Settings Center";
        if (isManager) return "Project Management Settings Control";
        if (isLeader) return "Team Leader Command Dashboard";
        return "Employee Personal Preferences";
    };

    return (
        <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
            settings.theme === 'dark' ? 'bg-card text-ink' : 'bg-gradient-to-br from-slate-50 via-blue-50/20 to-white text-ink-faint'
        }`}>
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div ref={headerRef} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/60 pb-6 mb-8">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-gradient-member shadow-md shadow-glow-teal">
                                <Settings className="w-5 h-5 text-white" />
                            </span>
                            {getSettingsTitle()}
                        </h1>
                        <p className={`text-xs mt-1 font-medium ${settings.theme === 'dark' ? 'text-ink-soft' : 'text-ink-soft'}`}>
                            Adjust role settings, manage active login tokens, generate API access codes, and customize workspace viewports.
                        </p>
                    </div>
                    <div>
                        {getRoleBadge(profileData.role)}
                    </div>
                </div>

                {/* Left navigation + Content block grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left tabs selector */}
                    <div className="lg:col-span-1 space-y-2">
                        <div className={`backdrop-blur-xl border p-4 rounded-3xl shadow-xl space-y-1 ${
                            settings.theme === 'dark' ? 'bg-surface-2 border-line' : 'bg-surface-2 border-blue-100/50 shadow-blue-100/10'
                        }`}>
                            {[
                                { id: 'profile', label: 'My Profile', icon: User },
                                { id: 'password', label: 'Password & Auth', icon: Lock },
                                { id: 'email', label: 'Email Control', icon: Mail },
                                { id: 'security', label: 'Security Center', icon: Shield },
                                { id: 'notifications', label: 'Notifications', icon: Bell },
                                { id: 'language', label: 'Language Options', icon: Globe },
                                { id: 'sessions', label: 'Active Sessions', icon: Laptop },
                                { id: 'logs', label: 'Activity Logs', icon: Activity }
                            ].map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                                : settings.theme === 'dark'
                                                    ? 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                                                    : 'text-ink-faint hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right tab panel contents */}
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className={`border p-6 sm:p-8 rounded-3xl shadow-xl backdrop-blur-xl ${
                                    settings.theme === 'dark' ? 'bg-surface-2 border-line' : 'bg-surface-2 border-blue-100/50 shadow-blue-100/10'
                                }`}
                            >
                                {/* TAB 1: PROFILE */}
                                {activeTab === 'profile' && (
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-line">
                                            {/* Avatar Box */}
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-3xl bg-blue-600 text-white text-3xl font-extrabold flex items-center justify-center shadow-md border-2 border-blue-400 overflow-hidden shrink-0">
                                                    {profileImage ? (
                                                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        profileData.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <label className={`absolute inset-0 bg-surface-2 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity ${isUploadingAvatar ? 'opacity-100 pointer-events-none' : ''}`}>
                                                    <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={isUploadingAvatar} className="hidden" />
                                                    {isUploadingAvatar ? <Loader2 className="w-5 h-5 text-ink animate-spin" /> : <Camera className="w-5 h-5 text-ink" />}
                                                </label>
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <h3 className="text-lg font-bold">{profileData.name}</h3>
                                                <p className="text-xs text-ink-soft mt-1">{profileData.position || 'Professional Specialist'}</p>
                                                <div className="mt-2">{getRoleBadge(profileData.role)}</div>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSaveProfile} className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-ink-soft uppercase mb-2">Display Name</label>
                                                    <input
                                                        type="text"
                                                        value={editData.name || ''}
                                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                        className={`w-full px-4 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                            settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                        }`}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-ink-soft uppercase mb-2">Professional Position</label>
                                                    <input
                                                        type="text"
                                                        value={editData.position || ''}
                                                        onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                                                        placeholder="e.g. Lead Devops Architect"
                                                        className={`w-full px-4 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                            settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-ink-soft uppercase mb-2">Mobile Phone</label>
                                                    <input
                                                        type="text"
                                                        value={editData.phone || ''}
                                                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                                        placeholder="+1 (555) 019-2834"
                                                        className={`w-full px-4 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                            settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-ink-soft uppercase mb-2">Department Division</label>
                                                    <select
                                                        value={editData.departmentId || ''}
                                                        onChange={(e) => setEditData({ ...editData, departmentId: parseInt(e.target.value, 10) || null })}
                                                        className={`w-full px-4 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                            settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                        }`}
                                                    >
                                                        <option value="">Not Assigned / Operations</option>
                                                        {departments.map((dept) => (
                                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={isSavingProfile}
                                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-md transition hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
                                                >
                                                    {isSavingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                    Save Changes
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* TAB 2: PASSWORD */}
                                {activeTab === 'password' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Security Credentials</h3>
                                            <p className="text-xs text-ink-soft mt-1">Change your login passcode to keep your active workspace secure.</p>
                                        </div>

                                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                            {/* Old Pass */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-ink-soft uppercase mb-2">Current Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords.old ? 'text' : 'password'}
                                                        value={passwordData.oldPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                                        className={`w-full pl-4 pr-10 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                            settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                        }`}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                                                    >
                                                        {showPasswords.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* New Pass */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-ink-soft uppercase mb-2">New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords.new ? 'text' : 'password'}
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                        className={`w-full pl-4 pr-10 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                            settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                        }`}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                                                    >
                                                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                {passwordData.newPassword && !isPasswordStrong(passwordData.newPassword) && (
                                                    <p className="text-[10px] text-ink-faint leading-relaxed mt-1.5">
                                                        {PASSWORD_POLICY_MESSAGE}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Confirm Pass */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-ink-soft uppercase mb-2">Confirm New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords.confirm ? 'text' : 'password'}
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                        className={`w-full pl-4 pr-10 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                            settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                        }`}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                                                    >
                                                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-2 flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={isChangingPassword}
                                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-md transition hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
                                                >
                                                    {isChangingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                                    Update Passcode
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* TAB 3: EMAIL CONTROL */}
                                {activeTab === 'email' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Email Address & Verification</h3>
                                            <p className="text-xs text-ink-soft mt-1">Check email delivery configurations or verify your communication channel.</p>
                                        </div>

                                        <div className={`p-5 rounded-2xl border ${
                                            settings.theme === 'dark' ? 'bg-surface-2 border-line' : 'bg-blue-50/30 border-blue-100/60'
                                        }`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div>
                                                    <span className="text-[10px] font-extrabold text-ink-soft uppercase">Primary Workspace Email</span>
                                                    <p className="text-sm font-extrabold mt-1">{profileData.email}</p>
                                                </div>
                                                <div>
                                                    {profileData.isEmailVerified ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full border border-emerald-500/25">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Verified Channel
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full border border-amber-500/25">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            Unverified Email
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {!profileData.isEmailVerified && (
                                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200/40">
                                                    <p className="text-xs text-ink-soft mb-3 font-medium">Click the button below to request an OTP code or link to complete verification.</p>
                                                    {!showVerifyInput ? (
                                                        <button
                                                            onClick={handleSendVerification}
                                                            disabled={isSendingVerify}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                                                        >
                                                            {isSendingVerify ? 'Sending...' : 'Send Verification Token'}
                                                        </button>
                                                    ) : (
                                                        <div className="flex gap-2 max-w-sm">
                                                            <input
                                                                type="text"
                                                                value={verifyTokenInput}
                                                                onChange={(e) => setVerifyTokenInput(e.target.value)}
                                                                placeholder="Enter 8-char OTP"
                                                                maxLength={8}
                                                                className={`px-3 py-2 rounded-xl border text-xs font-bold font-mono focus:outline-none focus:border-blue-500 ${
                                                                    settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                                }`}
                                                            />
                                                            <button
                                                                onClick={handleVerifyToken}
                                                                disabled={isVerifyingToken}
                                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                                                            >
                                                                {isVerifyingToken ? (
                                                                    <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...</span>
                                                                ) : 'Verify Code'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: SECURITY CENTER */}
                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Security Center</h3>
                                            <p className="text-xs text-ink-soft mt-1">Configure advanced identity verification features to protect against spoofing.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Security Strength */}
                                            <div className={`p-5 rounded-2xl border ${
                                                settings.theme === 'dark' ? 'bg-surface-2 border-line' : 'bg-white border-slate-100'
                                            }`}>
                                                <h4 className="text-xs font-extrabold flex items-center gap-1.5">
                                                    <ShieldCheck className="text-emerald-500 w-4 h-4" />
                                                    Identity Health
                                                </h4>
                                                <p className="text-xs text-ink-soft mt-1 font-semibold leading-relaxed">
                                                    Your account security level is currently: <span className="text-emerald-500 font-extrabold">Good</span>. 
                                                    Password was initialized securely.
                                                </p>
                                            </div>

                                            {/* 2FA Card */}
                                            <div className={`p-5 rounded-2xl border ${
                                                settings.theme === 'dark' ? 'bg-surface-2 border-line' : 'bg-white border-slate-100'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-xs font-extrabold">Two-Factor Authentication (2FA)</h4>
                                                        <p className="text-[10px] text-ink-soft font-medium mt-1">Requires an OTP sent to your verified email address on login.</p>
                                                    </div>
                                                    <label className={`relative inline-flex items-center ${isTogglingTwoFa ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!profileData.is2faEnabled}
                                                            onChange={(e) => handleToggle2FA(e.target.checked)}
                                                            disabled={isTogglingTwoFa}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 5: NOTIFICATIONS */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Notification Channels</h3>
                                            <p className="text-xs text-ink-soft mt-1">Toggle which delivery mechanisms receive system status alerts.</p>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { key: 'emailAlerts', title: 'Email Dispatcher', desc: 'Receive critical task allocation and comments directly in inbox.' },
                                                { key: 'pushAlerts', title: 'Browser Push Notifications', desc: 'Display sliding notifications inside browser viewport on updates.' },
                                                { key: 'slackAlerts', title: 'Slack Neural Hook', desc: 'Forward task status changes to linked team Slack webhooks.' },
                                                { key: 'sprintUpdates', title: 'Sprint Report Summary', desc: 'Get automated weekly productivity and sprint risk assessments.' }
                                            ].map((item) => (
                                                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl hover:bg-blue-50/20 transition-colors">
                                                    <div>
                                                        <h4 className="text-xs font-bold">{item.title}</h4>
                                                        <p className="text-[10px] text-ink-soft font-medium mt-0.5">{item.desc}</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={settings.notifications[item.key]} 
                                                            onChange={() => setSettings({
                                                                ...settings,
                                                                notifications: {
                                                                    ...settings.notifications,
                                                                    [item.key]: !settings.notifications[item.key]
                                                                }
                                                            })}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

<<<<<<< HEAD
                                {/* TAB 6: THEME & STYLE */}
                                {activeTab === 'theme' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Theme Preference</h3>
                                            <p className="text-xs text-ink-soft mt-1">Adjust workspace theme styling to protect eye health during extended operations.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 max-w-sm">
                                            <button
                                                onClick={() => handleToggleTheme('light')}
                                                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                                                    settings.theme === 'light' 
                                                        ? 'border-blue-500 bg-blue-500/10 text-blue-500 font-extrabold shadow-md' 
                                                        : 'border-gray-300/40 text-ink-soft'
                                                }`}
                                            >
                                                <Paintbrush className="w-6 h-6" />
                                                <span className="text-xs font-bold">Light Aesthetic</span>
                                            </button>
                                            <button
                                                onClick={() => handleToggleTheme('dark')}
                                                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                                                    settings.theme === 'dark' 
                                                        ? 'border-blue-400 bg-blue-400/10 text-blue-400 font-extrabold shadow-md' 
                                                        : 'border-line text-ink-soft'
                                                }`}
                                            >
                                                <Paintbrush className="w-6 h-6" />
                                                <span className="text-xs font-bold">Dark Aesthetic</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

=======
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)
                                {/* TAB 7: LANGUAGE */}
                                {activeTab === 'language' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Language Preferences</h3>
                                            <p className="text-xs text-ink-soft mt-1">Choose your preferred localized interface dialect.</p>
                                        </div>

                                        <div className="max-w-xs">
                                            <select
                                                value={settings.language}
                                                onChange={(e) => {
                                                    setSettings({ ...settings, language: e.target.value });
                                                    toast.success(`Language changed to ${e.target.value.toUpperCase()}`);
                                                }}
                                                className={`w-full px-4 py-3 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                    settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                }`}
                                            >
                                                <option value="en">English (US)</option>
                                                <option value="es">Español (ES)</option>
                                                <option value="fr">Français (FR)</option>
                                                <option value="de">Deutsch (DE)</option>
                                                <option value="hi">हिन्दी (IN)</option>
                                                <option value="ar">العربية (AE)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 8: ACTIVE SESSIONS */}
                                {activeTab === 'sessions' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Active Token Sessions</h3>
                                            <p className="text-xs text-ink-soft mt-1">Manage active device connections authorized to request workspace information.</p>
                                        </div>

                                        <div className="overflow-hidden rounded-2xl border border-gray-100/10 shadow-md">
                                            <table className="min-w-full divide-y divide-gray-100/10 text-xs">
                                                <thead className={settings.theme === 'dark' ? 'bg-surface-2' : 'bg-slate-50'}>
                                                    <tr>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Device / Agent</th>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">IP Location</th>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Established</th>
                                                        <th className="px-6 py-3.5 text-right font-extrabold text-ink-soft">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100/10 font-medium">
                                                    {sessions.map((sess) => (
                                                        <tr key={sess.id} className="hover:bg-blue-50/10 transition-colors">
                                                            <td className="px-6 py-4 truncate max-w-xs font-bold">
                                                                <div className="flex items-center gap-2">
                                                                    <Chrome className="w-4 h-4 text-blue-400 shrink-0" />
                                                                    <span className="truncate">{sess.userAgent || 'Web browser client'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-[10px] text-ink-soft">
                                                                {sess.ip || 'Localhost (Loopback)'}
                                                            </td>
                                                            <td className="px-6 py-4 text-ink-soft">
                                                                {new Date(sess.createdAt).toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleRevokeSession(sess.id)}
                                                                    disabled={revokingSessionId === sess.id}
                                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer disabled:opacity-50"
                                                                    title="Revoke Session"
                                                                >
                                                                    {revokingSessionId === sess.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {sessions.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-8 text-center text-ink-soft italic font-medium">
                                                                No active sessions retrieved.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

<<<<<<< HEAD
                                {/* TAB 9: DEVELOPER API KEYS */}
                                {activeTab === 'api' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">Developer API Integrations</h3>
                                            <p className="text-xs text-ink-soft mt-1">Provision neural tokens to make programatic calls directly into TaskForge pipelines.</p>
                                        </div>

                                        {/* Generation Form */}
                                        <form onSubmit={handleCreateApiKey} className="flex gap-2 max-w-md bg-surface-2 border border-line p-4 rounded-2xl">
                                            <input
                                                type="text"
                                                value={newKeyName}
                                                onChange={(e) => setNewKeyName(e.target.value)}
                                                placeholder="e.g. CI/CD Deployment Token"
                                                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                                                    settings.theme === 'dark' ? 'bg-surface-2 border-line text-ink' : 'bg-white border-blue-100 text-ink-faint'
                                                }`}
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={isCreatingKey || !newKeyName.trim()}
                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-500 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                                            >
                                                {isCreatingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                Generate Key
                                            </button>
                                        </form>

                                        {/* Display key immediately on creation */}
                                        {justCreatedKey && (
                                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs font-medium text-emerald-400 space-y-2">
                                                <p className="font-bold flex items-center gap-1">
                                                    <Check className="w-4 h-4" />
                                                    Copy key immediately. For security, it will not be shown again.
                                                </p>
                                                <div className="flex items-center gap-2 bg-surface-2 border border-emerald-500/20 p-2 rounded-xl">
                                                    <span className="font-mono flex-1 select-all select-none truncate text-[10px] tracking-wider font-extrabold">{justCreatedKey}</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(justCreatedKey);
                                                            setCopiedKey('just');
                                                            toast.success('API Key copied to clipboard');
                                                            setTimeout(() => setCopiedKey(''), 2000);
                                                        }}
                                                        className="p-1.5 hover:bg-emerald-500/25 rounded-lg text-emerald-400 transition"
                                                    >
                                                        {copiedKey === 'just' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* API Keys List */}
                                        <div className="overflow-hidden rounded-2xl border border-gray-100/10 shadow-md">
                                            <table className="min-w-full divide-y divide-gray-100/10 text-xs">
                                                <thead className={settings.theme === 'dark' ? 'bg-surface-2' : 'bg-slate-50'}>
                                                    <tr>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Token Description</th>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Key Hash Preview</th>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Provisioned</th>
                                                        <th className="px-6 py-3.5 text-right font-extrabold text-ink-soft">Revocation</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100/10 font-medium">
                                                    {apiKeysList.map((key) => (
                                                        <tr key={key.id} className="hover:bg-blue-50/10 transition-colors">
                                                            <td className="px-6 py-4 font-bold">{key.name}</td>
                                                            <td className="px-6 py-4 font-mono text-[10px] text-ink-soft">
                                                                {key.key ? `${key.key.substring(0, 12)}...` : 'tf_live_************************'}
                                                            </td>
                                                            <td className="px-6 py-4 text-ink-soft">
                                                                {new Date(key.createdAt).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleRevokeApiKey(key.id)}
                                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                                                                    title="Revoke Key"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {apiKeysList.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-8 text-center text-ink-soft italic font-medium">
                                                                No authorized API keys retrieved.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 10: ACTIVITY LOGS */}
=======
                                {/* TAB 9: ACTIVITY LOGS */}
>>>>>>> bc9044b (PMS 100: Notification pannel fixed, and optimized the full website also)
                                {activeTab === 'logs' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-500">User Audit Tracker</h3>
                                            <p className="text-xs text-ink-soft mt-1">Audit trail tracking all account edits, authentication triggers, and workspace sessions.</p>
                                        </div>

                                        <div className="overflow-hidden rounded-2xl border border-gray-100/10 shadow-md">
                                            <table className="min-w-full divide-y divide-gray-100/10 text-xs">
                                                <thead className={settings.theme === 'dark' ? 'bg-surface-2' : 'bg-slate-50'}>
                                                    <tr>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Operation Action</th>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Execution Description</th>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Client IP</th>
                                                        <th className="px-6 py-3.5 text-left font-extrabold text-ink-soft">Timestamp</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100/10 font-medium">
                                                    {activityLogs.map((log) => (
                                                        <tr key={log.id} className="hover:bg-blue-50/10 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold uppercase tracking-wide text-[9px]">
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-ink-soft font-semibold">{log.details}</td>
                                                            <td className="px-6 py-4 font-mono text-[10px] text-ink-soft">{log.ipAddress || 'Loopback'}</td>
                                                            <td className="px-6 py-4 text-ink-soft">{new Date(log.createdAt).toLocaleString()}</td>
                                                        </tr>
                                                    ))}

                                                    {activityLogs.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-8 text-center text-ink-soft italic font-medium">
                                                                No audit logs recorded for this account.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}