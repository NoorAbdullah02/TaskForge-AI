import React, { useState, useEffect } from 'react';
import {
    Building2, Calendar, ClipboardList, Settings, Plus, Edit2, Trash2,
    Search, ShieldAlert, Check, X, Clock, HelpCircle, Save, Loader2,
    ArrowRight, UserCheck, Shield, Users, Globe, FileText, CheckSquare, ListFilter,
    Share2, Copy, RefreshCw, Link
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    getSystemSettings,
    updateSystemSettings,
    getAdminDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getAdminUsers,
    updateUserRoleDept,
    getAuditLogs
} from '../Services/adminApi';
import { getWorkspaceInfo, regenerateInviteCode, getPendingRequests, approveMember, bulkApproveMembers, getWorkspaceMembers, inviteWorkspaceMembers } from '../Services/workspaceApi';
import { getProjects, assignProjectManager } from '../Services/projectApi';


const TIMEZONES = [
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
    { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
    { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
    { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney Standard Time (AEST/AEDT)' }
];

const DAYS_OF_WEEK = [
    { id: '1', name: 'Monday' },
    { id: '2', name: 'Tuesday' },
    { id: '3', name: 'Wednesday' },
    { id: '4', name: 'Thursday' },
    { id: '5', name: 'Friday' },
    { id: '6', name: 'Saturday' },
    { id: '7', name: 'Sunday' }
];

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin';
    const isManager = user?.role === 'manager';

    // Tabs
    const [activeTab, setActiveTab] = useState('departments');

    // Loading States
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [submittingDept, setSubmittingDept] = useState(false);

    // Workspace Info / Invite states
    const [workspaceInfo, setWorkspaceInfo] = useState(null);
    const [regenerating, setRegenerating] = useState(false);
    const [copied, setCopied] = useState('');
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteNote, setInviteNote] = useState('');
    const [sendingInvites, setSendingInvites] = useState(false);
    const [inviteResultMessage, setInviteResultMessage] = useState('');

    // Pending requests states
    const [pendingRequests, setPendingRequests] = useState([]);
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    // Data States
    const [settings, setSettings] = useState({
        orgName: 'TaskForge AI',
        orgLogo: '',
        timeZone: 'UTC',
        officeStart: '09:00',
        officeEnd: '17:00',
        workingDays: '1,2,3,4,5',
        holidays: [],
        leavePolicy: { sick: 14, casual: 10, annual: 15 }
    });
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);

    // SaaS Project Manager Assignment States
    const [workspaceMembersList, setWorkspaceMembersList] = useState([]);
    const [projectsList, setProjectsList] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [isAssignPmModalOpen, setIsAssignPmModalOpen] = useState(false);
    const [selectedUserForPm, setSelectedUserForPm] = useState(null);
    const [selectedProjectIdForPm, setSelectedProjectIdForPm] = useState('');
    const [assigningPm, setAssigningPm] = useState(false);


    // Department Modals & Editing
    const [deptModalOpen, setDeptModalOpen] = useState(false);
    const [currentDept, setCurrentDept] = useState(null); // null for create, otherwise editing object
    const [deptForm, setDeptForm] = useState({ name: '', description: '', managerId: '' });

    // Holiday Modal
    const [holidayModalOpen, setHolidayModalOpen] = useState(false);
    const [holidayForm, setHolidayForm] = useState({ name: '', date: '' });

    // User Editing States
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({ role: 'employee', departmentId: '', position: '', phone: '' });
    const [userUpdatingId, setUserUpdatingId] = useState(null);

    // Search and Filter states
    const [userSearch, setUserSearch] = useState('');
    const [logSearch, setLogSearch] = useState('');
    const [logFilterAction, setLogFilterAction] = useState('ALL');
    const [logFilterEntity, setLogFilterEntity] = useState('ALL');

    // Load initial data
    const loadAllData = async () => {
        setLoading(true);
        try {
            const settingsData = await getSystemSettings();

            // Parse JSON fields
            const holidays = settingsData.holidays ? (typeof settingsData.holidays === 'string' ? JSON.parse(settingsData.holidays) : settingsData.holidays) : [];
            const leavePolicy = settingsData.leavePolicy ? (typeof settingsData.leavePolicy === 'string' ? JSON.parse(settingsData.leavePolicy) : settingsData.leavePolicy) : { sick: 14, casual: 10, annual: 15 };

            setSettings({
                ...settingsData,
                holidays,
                leavePolicy
            });

            const deptsData = await getAdminDepartments();
            setDepartments(deptsData);

            if (isAdmin || isManager) {
                const usersData = await getAdminUsers();
                setUsers(usersData);

                const logsData = await getAuditLogs();
                setAuditLogs(logsData);

                // Fetch Workspace Info (invite link & code)
                try {
                    const info = await getWorkspaceInfo();
                    setWorkspaceInfo(info);
                } catch (err) {
                    console.error('Failed to load workspace info:', err);
                }
            }
        } catch (error) {
            console.error('Error loading admin settings data:', error);
            toast.error('Failed to load settings data. Please verify your permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'owner' && user.role !== 'super_admin') {
            toast.error('Access denied. Admin, Manager or Owner role required.');
            navigate('/');
            return;
        }
        loadAllData();
    }, [user, navigate]);

    // Handle regenerating workspace invite code
    const handleRegenerateInvite = async () => {
        if (!workspaceInfo?.id) {
            toast.error('No workspace loaded');
            return;
        }
        setRegenerating(true);
        try {
            const data = await regenerateInviteCode(workspaceInfo.id);
            setWorkspaceInfo(prev => ({
                ...prev,
                inviteCode: data.inviteCode,
                inviteLink: data.inviteLink
            }));
            toast.success('Invite link/code regenerated successfully!');
        } catch (error) {
            console.error('Failed to regenerate invite link:', error);
            toast.error(error.response?.data?.message || 'Failed to regenerate invite link');
        } finally {
            setRegenerating(false);
        }
    };

    // Copy to clipboard helper
    const handleCopy = (text, type) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(type);
        toast.success(`${type === 'code' ? 'Invite code' : 'Invite link'} copied to clipboard`);
        setTimeout(() => setCopied(''), 2000);
    };

    // Load Pending Join Requests
    const loadPendingRequests = async () => {
        if (!workspaceInfo?.id) return;
        setLoadingRequests(true);
        try {
            const data = await getPendingRequests(workspaceInfo.id);
            setPendingRequests(data);
            setSelectedRequests([]);
        } catch (err) {
            console.error('Failed to load pending requests:', err);
        } finally {
            setLoadingRequests(false);
        }
    };

    const handleSendInvites = async () => {
        if (!workspaceInfo?.id) {
            toast.error('No workspace loaded');
            return;
        }

        const rawEmails = inviteEmails
            .split(/[,\n;]/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

        if (rawEmails.length === 0) {
            toast.error('Please enter at least one email address');
            return;
        }

        setSendingInvites(true);
        setInviteResultMessage('');

        try {
            const response = await inviteWorkspaceMembers(workspaceInfo.id, {
                emails: rawEmails,
                note: inviteNote.trim() || undefined
            });

            toast.success(response.message || 'Invitation emails sent successfully!');
            setInviteResultMessage(response.message || 'Invitation emails sent successfully.');
            setInviteEmails('');
            setInviteNote('');
        } catch (error) {
            console.error('Failed to send invites:', error);
            const msg = error.response?.data?.message || 'Failed to send invite emails';
            toast.error(msg);
            setInviteResultMessage(msg);
        } finally {
            setSendingInvites(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'invite' && workspaceInfo?.id) {
            loadPendingRequests();
        }
    }, [activeTab, workspaceInfo]);

    const loadWorkspaceMembersAndProjects = async () => {
        setLoadingMembers(true);
        try {
            const members = await getWorkspaceMembers();
            setWorkspaceMembersList(members);
            const projs = await getProjects();
            // Filter out archived projects
            setProjectsList(Array.isArray(projs) ? projs.filter(p => !p.isArchived) : []);
        } catch (err) {
            console.error('Failed to load workspace members/projects:', err);
            toast.error('Failed to load workspace members or projects');
        } finally {
            setLoadingMembers(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'members') {
            loadWorkspaceMembersAndProjects();
        }
    }, [activeTab]);

    const handleAssignPmSave = async () => {
        if (!selectedUserForPm || !selectedProjectIdForPm) return;
        setAssigningPm(true);
        try {
            await assignProjectManager(selectedUserForPm.id, parseInt(selectedProjectIdForPm, 10));
            toast.success(`Successfully appointed ${selectedUserForPm.name} as Project Manager`);
            setIsAssignPmModalOpen(false);
            setSelectedUserForPm(null);
            setSelectedProjectIdForPm('');
            loadWorkspaceMembersAndProjects();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to assign project manager');
        } finally {
            setAssigningPm(false);
        }
    };


    // Handle Individual Action
    const handleApproveReject = async (membershipId, action) => {
        if (!workspaceInfo?.id) return;
        const toastId = toast.loading(`Processing join request...`);
        try {
            await approveMember(workspaceInfo.id, membershipId, action);
            toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`, { id: toastId });
            loadPendingRequests();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Action failed', { id: toastId });
        }
    };

    // Handle Bulk Action
    const handleBulkApproveReject = async (action) => {
        if (!workspaceInfo?.id || selectedRequests.length === 0) return;
        const toastId = toast.loading(`Performing bulk ${action}...`);
        try {
            await bulkApproveMembers(workspaceInfo.id, selectedRequests, action);
            toast.success(`Selected requests ${action === 'approve' ? 'approved' : 'rejected'} successfully`, { id: toastId });
            loadPendingRequests();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Bulk action failed', { id: toastId });
        }
    };


    // Handle settings updates (Time, days, name, leave policy)
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            toast.error('Access denied: Only Admins can modify settings.');
            return;
        }

        setSavingSettings(true);
        try {
            await updateSystemSettings({
                orgName: settings.orgName,
                orgLogo: settings.orgLogo,
                timeZone: settings.timeZone,
                officeStart: settings.officeStart,
                officeEnd: settings.officeEnd,
                workingDays: settings.workingDays,
                holidays: JSON.stringify(settings.holidays),
                leavePolicy: JSON.stringify(settings.leavePolicy)
            });
            toast.success('System settings saved successfully');
            loadAllData(); // Refresh to ensure synchronization
        } catch (error) {
            console.error('Failed to update system settings:', error);
            toast.error(error.response?.data?.message || 'Failed to update system settings');
        } finally {
            setSavingSettings(false);
        }
    };

    // Toggle working day
    const handleWorkingDayToggle = (dayId) => {
        if (!isAdmin) return;
        const currentDays = settings.workingDays ? settings.workingDays.split(',') : [];
        let newDays;
        if (currentDays.includes(dayId)) {
            newDays = currentDays.filter(d => d !== dayId);
        } else {
            newDays = [...currentDays, dayId].sort();
        }
        setSettings({
            ...settings,
            workingDays: newDays.join(',')
        });
    };

    // Holidays handlers
    const handleAddHoliday = (e) => {
        e.preventDefault();
        if (!isAdmin) return;
        if (!holidayForm.name || !holidayForm.date) {
            toast.error('Holiday name and date are required');
            return;
        }

        // Check if date already has a holiday
        if (settings.holidays.some(h => h.date === holidayForm.date)) {
            toast.error('A holiday already exists on this date');
            return;
        }

        const updatedHolidays = [...settings.holidays, { ...holidayForm }].sort((a, b) => new Date(a.date) - new Date(b.date));
        setSettings({
            ...settings,
            holidays: updatedHolidays
        });
        setHolidayForm({ name: '', date: '' });
        setHolidayModalOpen(false);
        toast.success('Holiday added to current configuration (Save changes to persist)');
    };

    const handleRemoveHoliday = (index) => {
        if (!isAdmin) return;
        const updatedHolidays = settings.holidays.filter((_, i) => i !== index);
        setSettings({
            ...settings,
            holidays: updatedHolidays
        });
        toast.success('Holiday removed from configuration (Save changes to persist)');
    };

    // Department crud handlers
    const openDeptModal = (dept = null) => {
        if (!isAdmin) {
            toast.error('Only administrators can modify departments');
            return;
        }
        if (dept) {
            setCurrentDept(dept);
            setDeptForm({
                name: dept.name,
                description: dept.description || '',
                managerId: dept.managerId || ''
            });
        } else {
            setCurrentDept(null);
            setDeptForm({ name: '', description: '', managerId: '' });
        }
        setDeptModalOpen(true);
    };

    const handleDeptSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;
        if (!deptForm.name.trim()) {
            toast.error('Department name is required');
            return;
        }

        setSubmittingDept(true);
        try {
            const body = {
                name: deptForm.name.trim(),
                description: deptForm.description,
                managerId: deptForm.managerId ? parseInt(deptForm.managerId, 10) : null
            };

            if (currentDept) {
                await updateDepartment(currentDept.id, body);
                toast.success('Department updated successfully');
            } else {
                await createDepartment(body);
                toast.success('Department created successfully');
            }
            setDeptModalOpen(false);
            loadAllData();
        } catch (error) {
            console.error('Department write failed:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmittingDept(false);
        }
    };

    const handleDeleteDept = async (id, name, headcount) => {
        if (!isAdmin) return;
        if (headcount > 0) {
            if (!confirm(`Warning: There are ${headcount} employee(s) assigned to ${name}. Deleting this department will unassign them. Do you want to continue?`)) {
                return;
            }
        } else {
            if (!confirm(`Are you sure you want to delete the department "${name}"?`)) {
                return;
            }
        }

        try {
            await deleteDepartment(id);
            toast.success('Department deleted successfully');
            loadAllData();
        } catch (error) {
            console.error('Department deletion failed:', error);
            toast.error(error.response?.data?.message || 'Failed to delete department');
        }
    };

    // User/Employee Management
    const openUserEdit = (u) => {
        if (!isAdmin) {
            toast.error('Only administrators can modify employee configurations');
            return;
        }
        setEditingUser(u);
        setUserForm({
            role: u.role,
            departmentId: u.departmentId || '',
            position: u.position || '',
            phone: u.phone || ''
        });
    };

    const handleUserUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin || !editingUser) return;

        setUserUpdatingId(editingUser.id);
        try {
            await updateUserRoleDept(editingUser.id, {
                role: userForm.role,
                departmentId: userForm.departmentId ? parseInt(userForm.departmentId, 10) : null,
                position: userForm.position,
                phone: userForm.phone
            });
            toast.success(`Updated permissions for ${editingUser.name}`);
            setEditingUser(null);
            loadAllData();
        } catch (error) {
            console.error('User update failed:', error);
            toast.error(error.response?.data?.message || 'Failed to update user profile');
        } finally {
            setUserUpdatingId(null);
        }
    };

    // Filters for User search and logs
    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.position?.toLowerCase().includes(userSearch.toLowerCase())
    );

    const filteredLogs = auditLogs.filter(log => {
        const matchesSearch =
            log.details?.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.operatorName?.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.operatorEmail?.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.ipAddress?.toLowerCase().includes(logSearch.toLowerCase());

        const matchesAction = logFilterAction === 'ALL' || log.action === logFilterAction;
        const matchesEntity = logFilterEntity === 'ALL' || log.entityType?.toLowerCase() === logFilterEntity.toLowerCase();

        return matchesSearch && matchesAction && matchesEntity;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-semibold animate-pulse">Loading administrative settings panel...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Header Title */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 border-b border-gray-200/60 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                            <Settings className="w-8 h-8 text-blue-600 animate-spin-slow" />
                            Admin & Settings Control Panel
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">
                            Configure workspace rules, manage organizational divisions, schedule operating calendar, and monitor audit tracks.
                        </p>
                    </div>
                    {isManager && !isAdmin && (
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm font-semibold shadow-sm">
                            <ShieldAlert className="w-5 h-5 text-amber-600" />
                            <span>View-Only Mode (Managers)</span>
                        </div>
                    )}
                </div>

                {/* Main Glassmorphic Wrapper */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Left Navigation Tabs Menu */}
                    <div className="lg:col-span-1 space-y-2">
                        <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-4 shadow-xl shadow-blue-100/30 space-y-1">
                            <button
                                onClick={() => setActiveTab('departments')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'departments'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <Building2 className="w-5 h-5" />
                                Departments & Users
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'schedule'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <Calendar className="w-5 h-5" />
                                Work Schedule
                            </button>
                            <button
                                onClick={() => setActiveTab('policies')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'policies'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <ClipboardList className="w-5 h-5" />
                                Leaves & Organization
                            </button>
                            <button
                                onClick={() => setActiveTab('audit')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'audit'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <FileText className="w-5 h-5" />
                                Audit Logs
                            </button>
                            <button
                                onClick={() => setActiveTab('invite')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'invite'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <Share2 className="w-5 h-5" />
                                Invite Members
                            </button>
                            <button
                                onClick={() => setActiveTab('members')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'members'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <Users className="w-5 h-5" />
                                Workspace Members
                            </button>
                        </div>
                    </div>

                    {/* Right Content Panels */}
                    <div className="lg:col-span-3">

                        {/* DEPARTMENTS & USERS TAB */}
                        {activeTab === 'departments' && (
                            <div className="space-y-8">

                                {/* Departments Card Section */}
                                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                <Building2 className="text-blue-600 w-5 h-5" />
                                                Departments Management
                                            </h2>
                                            <p className="text-xs text-gray-500 font-medium">Create and adjust departments, assign managers, and view headcount.</p>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                onClick={() => openDeptModal(null)}
                                                className="flex items-center gap-1.5 px-4.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Create Department
                                            </button>
                                        )}
                                    </div>

                                    {/* Grid of Departments */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {departments.map((dept) => (
                                            <div key={dept.id} className="relative group bg-gradient-to-br from-white to-blue-50/10 border border-blue-100 rounded-3xl p-5 hover:shadow-lg hover:border-blue-200 transition-all flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h3 className="font-extrabold text-gray-800 text-base group-hover:text-blue-600 transition-colors">
                                                                {dept.name}
                                                            </h3>
                                                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                                <Users className="w-3 h-3" />
                                                                {dept.employeeCount} Employee{dept.employeeCount !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => openDeptModal(dept)}
                                                                    className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                                                                    title="Edit Department"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteDept(dept.id, dept.name, dept.employeeCount)}
                                                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                                                                    title="Delete Department"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-500 text-xs font-medium line-clamp-2 leading-relaxed">
                                                        {dept.description || 'No description provided.'}
                                                    </p>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                                                    <span className="text-gray-400 font-medium">Department Manager</span>
                                                    <span className="font-bold text-gray-700">
                                                        {dept.manager ? dept.manager.name : <span className="text-gray-400 font-normal italic">Unassigned</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {departments.length === 0 && (
                                            <div className="col-span-2 text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-3xl">
                                                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                                <p className="text-gray-500 font-semibold text-sm">No departments created yet</p>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => openDeptModal(null)}
                                                        className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                                                    >
                                                        Click here to create the first department
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Employees Management Card */}
                                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                <UserCheck className="text-blue-600 w-5 h-5" />
                                                Employees Role & Dept Assignment
                                            </h2>
                                            <p className="text-xs text-gray-500 font-medium">Quickly align employees to their department structure and grant credentials.</p>
                                        </div>

                                        {/* Search Filter */}
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                placeholder="Search employees..."
                                                className="pl-9 pr-4 py-2 w-full md:w-64 bg-white border border-blue-100 rounded-2xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-gray-800"
                                            />
                                        </div>
                                    </div>

                                    {/* Table of Employees */}
                                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Employee</th>
                                                    <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Title / Position</th>
                                                    <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Role</th>
                                                    <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Department</th>
                                                    {isAdmin && <th className="px-6 py-3.5 text-right text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100 text-xs">
                                                {filteredUsers.map((u) => (
                                                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center shadow-inner overflow-hidden">
                                                                    {u.avatarUrl ? (
                                                                        <img src={u.avatarUrl.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        u.name?.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-800 text-sm">{u.name}</div>
                                                                    <div className="text-gray-400 text-[10px] font-medium">{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                                            <span className="font-semibold text-gray-700">{u.position || <span className="text-gray-400 font-normal italic">None</span>}</span>
                                                        </td>
                                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin'
                                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                                : u.role === 'manager'
                                                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                                }`}>
                                                                {u.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                                                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                                                {u.departmentName}
                                                            </span>
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="px-6 py-4.5 whitespace-nowrap text-right font-medium">
                                                                <button
                                                                    onClick={() => openUserEdit(u)}
                                                                    className="px-3.5 py-1.5 hover:bg-blue-100 text-blue-600 border border-blue-100 hover:border-blue-200 rounded-xl transition text-[10px] font-bold"
                                                                >
                                                                    Edit Assignment
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}

                                                {filteredUsers.length === 0 && (
                                                    <tr>
                                                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-10 text-center text-gray-400 italic">
                                                            No matching employees found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* WORK SCHEDULE TAB */}
                        {activeTab === 'schedule' && (
                            <form onSubmit={handleSaveSettings} className="space-y-8">

                                {/* Office Hours Config */}
                                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                                        <Clock className="text-blue-600 w-5 h-5" />
                                        Standard Work Shift Config
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Start hour */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Office Start Time</label>
                                            <div className="relative">
                                                <input
                                                    type="time"
                                                    value={settings.officeStart}
                                                    onChange={(e) => setSettings({ ...settings, officeStart: e.target.value })}
                                                    disabled={!isAdmin}
                                                    className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50 text-gray-800"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium">Standard start time. Check-ins after this will be marked late.</p>
                                        </div>

                                        {/* End hour */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Office End Time</label>
                                            <div className="relative">
                                                <input
                                                    type="time"
                                                    value={settings.officeEnd}
                                                    onChange={(e) => setSettings({ ...settings, officeEnd: e.target.value })}
                                                    disabled={!isAdmin}
                                                    className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50 text-gray-800"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium">Standard close time. Check-outs before this are flagged early departure.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Working Days config */}
                                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
                                        <CheckSquare className="text-blue-600 w-5 h-5" />
                                        Weekly Operating Days
                                    </h2>
                                    <p className="text-xs text-gray-500 mb-6 font-medium">Define which days are considered business days for attendance tracking.</p>

                                    <div className="flex flex-wrap gap-3">
                                        {DAYS_OF_WEEK.map((day) => {
                                            const activeDays = settings.workingDays ? settings.workingDays.split(',') : [];
                                            const isSelected = activeDays.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    disabled={!isAdmin}
                                                    onClick={() => handleWorkingDayToggle(day.id)}
                                                    className={`px-4.5 py-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${isSelected
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm shadow-blue-100/50'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600'
                                                        } disabled:cursor-not-allowed`}
                                                >
                                                    {day.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Holidays list config */}
                                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                <Calendar className="text-blue-600 w-5 h-5" />
                                                Organizational Holidays
                                            </h2>
                                            <p className="text-xs text-gray-500 font-medium">Standard office holiday dates. Attendance calculations automatically skip holidays.</p>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHolidayForm({ name: '', date: '' });
                                                    setHolidayModalOpen(true);
                                                }}
                                                className="flex items-center gap-1 px-4 py-2 border border-blue-200 text-blue-600 text-xs font-bold rounded-2xl hover:bg-blue-50/50 transition cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Holiday
                                            </button>
                                        )}
                                    </div>

                                    {/* Holidays grid list */}
                                    <div className="overflow-hidden rounded-2xl border border-gray-100">
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Holiday Name</th>
                                                    <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Date</th>
                                                    {isAdmin && <th className="px-6 py-3.5 text-right text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Action</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100 text-xs font-medium text-gray-700">
                                                {settings.holidays.map((hol, idx) => (
                                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-6 py-4.5 text-sm font-bold text-gray-800">{hol.name}</td>
                                                        <td className="px-6 py-4.5 font-semibold text-gray-500">
                                                            {new Date(hol.date).toLocaleDateString('en-US', {
                                                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                                            })}
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="px-6 py-4.5 text-right whitespace-nowrap">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveHoliday(idx)}
                                                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                                                                    title="Remove Holiday"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}

                                                {settings.holidays.length === 0 && (
                                                    <tr>
                                                        <td colSpan={isAdmin ? 3 : 2} className="px-6 py-10 text-center text-gray-400 italic">
                                                            No holidays configured yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Save Button */}
                                {isAdmin && (
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={savingSettings}
                                            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-sm rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {savingSettings ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving Configuration...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Save Schedule Configuration
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}

                        {/* LEAVES & ORGANIZATION INFO TAB */}
                        {activeTab === 'policies' && (
                            <form onSubmit={handleSaveSettings} className="space-y-8">

                                {/* Org Info Config */}
                                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                                        <Globe className="text-blue-600 w-5 h-5" />
                                        Organization Profile Settings
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Org Name */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Organization Name</label>
                                            <input
                                                type="text"
                                                value={settings.orgName}
                                                onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
                                                disabled={!isAdmin}
                                                placeholder="e.g. TaskForge AI"
                                                className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50 text-gray-800 font-semibold"
                                            />
                                        </div>

                                        {/* Timezone */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Primary System Time Zone</label>
                                            <select
                                                value={settings.timeZone}
                                                onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                                                disabled={!isAdmin}
                                                className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50 text-gray-800 font-semibold"
                                            >
                                                {TIMEZONES.map((tz) => (
                                                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Mock Logo Display */}
                                        <div className="col-span-2 space-y-3 pt-2">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Organization Branding Logo</label>
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md border-2 border-white">
                                                    {settings.orgName?.charAt(0).toUpperCase() || 'T'}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={settings.orgLogo || ''}
                                                        onChange={(e) => setSettings({ ...settings, orgLogo: e.target.value })}
                                                        disabled={!isAdmin}
                                                        placeholder="Mock URL for logo image"
                                                        className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-xs focus:outline-none focus:border-blue-500 transition disabled:bg-gray-50 text-gray-700"
                                                    />
                                                    <p className="text-[10px] text-gray-400 font-medium">Input a logo image URL to brand your workspace. E.g. https://domain.com/logo.png</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Leave Policies Rule settings */}
                                <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
                                        <ClipboardList className="text-blue-600 w-5 h-5" />
                                        Standard Leave Policy Allocations
                                    </h2>
                                    <p className="text-xs text-gray-500 mb-6 font-medium">Define standard annual allowances (in days) that apply to each employee.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        {/* Sick leave */}
                                        <div className="space-y-2 bg-rose-50/20 border border-rose-100/40 p-4 rounded-3xl">
                                            <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider">Sick Leave Days</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={settings.leavePolicy?.sick || 0}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    leavePolicy: { ...settings.leavePolicy, sick: parseInt(e.target.value, 10) || 0 }
                                                })}
                                                disabled={!isAdmin}
                                                className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-rose-500 text-rose-800"
                                            />
                                            <p className="text-[9px] text-rose-600/80 font-medium">Granted for medical leaves per year.</p>
                                        </div>

                                        {/* Casual Leave */}
                                        <div className="space-y-2 bg-emerald-50/20 border border-emerald-100/40 p-4 rounded-3xl">
                                            <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">Casual Leave Days</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={settings.leavePolicy?.casual || 0}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    leavePolicy: { ...settings.leavePolicy, casual: parseInt(e.target.value, 10) || 0 }
                                                })}
                                                disabled={!isAdmin}
                                                className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500 text-emerald-800"
                                            />
                                            <p className="text-[9px] text-emerald-600/80 font-medium">Standard short notice personal leave pool.</p>
                                        </div>

                                        {/* Annual Leave */}
                                        <div className="space-y-2 bg-blue-50/20 border border-blue-100/40 p-4 rounded-3xl">
                                            <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider">Annual Leave Days</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={settings.leavePolicy?.annual || 0}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    leavePolicy: { ...settings.leavePolicy, annual: parseInt(e.target.value, 10) || 0 }
                                                })}
                                                disabled={!isAdmin}
                                                className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 text-blue-800"
                                            />
                                            <p className="text-[9px] text-blue-600/80 font-medium">Accrued long vacation days per year.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                {isAdmin && (
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={savingSettings}
                                            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-sm rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {savingSettings ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving Policies...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Save Organization & Policies
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}

                        {/* AUDIT LOGS TAB */}
                        {activeTab === 'audit' && (
                            <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30 space-y-6">

                                {/* Header Controls */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                            <FileText className="text-blue-600 w-5 h-5" />
                                            Administrative Audit Logs
                                        </h2>
                                        <p className="text-xs text-gray-500 font-medium">Security tracks for all system mutations, showing operator, IP, and timestamp.</p>
                                    </div>

                                    {/* Action Filters */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Search Filter */}
                                        <div className="relative">
                                            <Search className="w-4.5 h-4.5 text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={logSearch}
                                                onChange={(e) => setLogSearch(e.target.value)}
                                                placeholder="Search logs (Details, User, IP)..."
                                                className="pl-10 pr-4 py-2.5 w-60 bg-white border border-blue-100 rounded-2xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-gray-800 font-medium"
                                            />
                                        </div>

                                        {/* Entity Dropdown */}
                                        <div className="flex items-center gap-1.5">
                                            <ListFilter className="w-4 h-4 text-gray-400" />
                                            <select
                                                value={logFilterEntity}
                                                onChange={(e) => setLogFilterEntity(e.target.value)}
                                                className="px-3.5 py-2.5 bg-white border border-blue-100 rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-700"
                                            >
                                                <option value="ALL">All Entities</option>
                                                <option value="settings">Settings</option>
                                                <option value="department">Departments</option>
                                                <option value="user">Users</option>
                                            </select>
                                        </div>

                                        {/* Action Type Dropdown */}
                                        <select
                                            value={logFilterAction}
                                            onChange={(e) => setLogFilterAction(e.target.value)}
                                            className="px-3.5 py-2.5 bg-white border border-blue-100 rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-700"
                                        >
                                            <option value="ALL">All Actions</option>
                                            <option value="CREATE">CREATE</option>
                                            <option value="UPDATE">UPDATE</option>
                                            <option value="DELETE">DELETE</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Table layout for Audit Logs */}
                                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Operator</th>
                                                <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Action</th>
                                                <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Target</th>
                                                <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Description</th>
                                                <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">IP Address</th>
                                                <th className="px-6 py-3.5 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100 text-xs font-medium text-gray-700">
                                            {filteredLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-6 py-4.5 whitespace-nowrap">
                                                        <div>
                                                            <div className="font-bold text-gray-800">{log.operatorName}</div>
                                                            <div className="text-gray-400 text-[10px] font-medium">{log.operatorEmail || 'System / Automatic'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4.5 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${log.action === 'CREATE'
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            : log.action === 'DELETE'
                                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                            }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4.5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                                                            {log.entityType || 'system'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4.5 max-w-xs truncate font-semibold text-gray-600" title={log.details}>
                                                        {log.details}
                                                    </td>
                                                    <td className="px-6 py-4.5 whitespace-nowrap font-mono text-[10px] text-gray-400">
                                                        {log.ipAddress || 'unknown'}
                                                    </td>
                                                    <td className="px-6 py-4.5 whitespace-nowrap font-semibold text-gray-500">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}

                                            {filteredLogs.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                                        No matching audit records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* INVITE MEMBERS TAB */}
                        {activeTab === 'invite' && (
                            <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <Share2 className="text-blue-600 w-5.5 h-5.5" />
                                        Workspace Invitations & Share Link
                                    </h2>
                                    <p className="text-xs text-gray-500 font-medium mt-1">
                                        Invite new users to collaborate in your active workspace. Share the link or the code to let them join.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    {/* Invite Link Card */}
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/60 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Link className="w-5 h-5 text-blue-600" />
                                                <span className="text-sm font-bold text-gray-800">Invitation URL</span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
                                                Users who click this link will be redirected to registration with the invite code automatically pre-filled.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white border border-blue-100 rounded-xl p-2 pl-3">
                                            <span className="text-xs font-mono font-bold text-gray-600 truncate flex-1 select-all">
                                                {workspaceInfo?.inviteLink || 'Generating link...'}
                                            </span>
                                            <button
                                                onClick={() => handleCopy(workspaceInfo?.inviteLink, 'link')}
                                                disabled={!workspaceInfo?.inviteLink}
                                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                                title="Copy Link"
                                            >
                                                {copied === 'link' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Invite Code Card */}
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100/60 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users className="w-5 h-5 text-indigo-600" />
                                                <span className="text-sm font-bold text-gray-800">Workspace Code</span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
                                                Users can enter this code manually during registration to join this specific workspace.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white border border-indigo-100 rounded-xl p-2 pl-3">
                                            <span className="text-sm font-mono font-extrabold text-indigo-700 tracking-wider flex-1 select-all">
                                                {workspaceInfo?.inviteCode || 'Generating code...'}
                                            </span>
                                            <button
                                                onClick={() => handleCopy(workspaceInfo?.inviteCode, 'code')}
                                                disabled={!workspaceInfo?.inviteCode}
                                                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                                title="Copy Code"
                                            >
                                                {copied === 'code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="max-w-md">
                                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                            Regenerate Invitation Credentials
                                        </h3>
                                        <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">
                                            Warning: Regenerating will instantly invalidate the current invite code and link. Any users attempting to join using the old credentials will fail to register.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleRegenerateInvite}
                                        disabled={regenerating || !workspaceInfo?.id}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-400 text-xs font-bold rounded-2xl shadow-md transition-all shrink-0 hover:scale-[1.02]"
                                    >
                                        {regenerating ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                Regenerating...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Regenerate Invite Code
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Pending join requests list */}
                                <div className="grid gap-6 md:grid-cols-[1fr_420px]">
                                    <div className="space-y-6">
                                        <div className="rounded-3xl border border-blue-100/80 bg-slate-50/70 p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Share2 className="w-5 h-5 text-blue-600" />
                                                <h3 className="text-lg font-bold text-gray-800">Invite workspace members by email</h3>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-4">
                                                Enter one or more email addresses separated by commas, semicolons, or new lines. Each recipient will receive a workspace invitation email with your workspace join link.
                                            </p>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email addresses</label>
                                                    <textarea
                                                        rows={4}
                                                        value={inviteEmails}
                                                        onChange={(e) => setInviteEmails(e.target.value)}
                                                        placeholder="team.member@example.com, hr@example.com"
                                                        className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:border-blue-500 focus:ring-blue-500/20 outline-none bg-white text-gray-800"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Optional note</label>
                                                    <textarea
                                                        rows={2}
                                                        value={inviteNote}
                                                        onChange={(e) => setInviteNote(e.target.value)}
                                                        placeholder="Add a short message to your invite"
                                                        className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:border-blue-500 focus:ring-blue-500/20 outline-none bg-white text-gray-800"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleSendInvites}
                                                    disabled={sendingInvites || !inviteEmails.trim()}
                                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                >
                                                    {sendingInvites ? 'Sending invites...' : 'Send workspace invitations'}
                                                </button>
                                                {inviteResultMessage && (
                                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-700">
                                                        {inviteResultMessage}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 pt-6 mt-8">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                                        <UserCheck className="w-4 h-4 text-blue-600" />
                                                        Pending Join Requests
                                                    </h3>
                                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                                        Select pending members to approve or reject their access requests to join this workspace.
                                                    </p>
                                                </div>
                                                {selectedRequests.length > 0 && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleBulkApproveReject('approve')}
                                                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold rounded-xl shadow-sm transition"
                                                        >
                                                            Approve Selected ({selectedRequests.length})
                                                        </button>
                                                        <button
                                                            onClick={() => handleBulkApproveReject('reject')}
                                                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold rounded-xl shadow-sm transition"
                                                        >
                                                            Reject Selected ({selectedRequests.length})
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {loadingRequests ? (
                                                <div className="py-12 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                                                    <table className="min-w-full divide-y divide-gray-100 text-xs">
                                                        <thead className="bg-gray-50/50">
                                                            <tr>
                                                                <th className="w-12 px-6 py-3.5 text-left">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={pendingRequests.length > 0 && selectedRequests.length === pendingRequests.length}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedRequests(pendingRequests.map(r => r.membershipId));
                                                                            } else {
                                                                                setSelectedRequests([]);
                                                                            }
                                                                        }}
                                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </th>
                                                                <th className="px-6 py-3.5 text-left font-extrabold text-gray-500 uppercase tracking-wider text-[10px]">Name</th>
                                                                <th className="px-6 py-3.5 text-left font-extrabold text-gray-500 uppercase tracking-wider text-[10px]">Email Address</th>
                                                                <th className="px-6 py-3.5 text-left font-extrabold text-gray-500 uppercase tracking-wider text-[10px]">Requested Date</th>
                                                                <th className="px-6 py-3.5 text-right font-extrabold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-100 font-medium text-gray-700">
                                                            {pendingRequests.map((req) => (
                                                                <tr key={req.membershipId} className="hover:bg-blue-50/30 transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedRequests.includes(req.membershipId)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedRequests([...selectedRequests, req.membershipId]);
                                                                                } else {
                                                                                    setSelectedRequests(selectedRequests.filter(id => id !== req.membershipId));
                                                                                }
                                                                            }}
                                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-6 py-4 font-bold text-gray-800">{req.name}</td>
                                                                    <td className="px-6 py-4 text-gray-500">{req.email}</td>
                                                                    <td className="px-6 py-4 text-gray-400">{new Date(req.joinedAt).toLocaleString()}</td>
                                                                    <td className="px-6 py-4 text-right flex justify-end gap-1.5">
                                                                        <button
                                                                            onClick={() => handleApproveReject(req.membershipId, 'approve')}
                                                                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition cursor-pointer"
                                                                            title="Approve request"
                                                                        >
                                                                            <Check className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleApproveReject(req.membershipId, 'reject')}
                                                                            className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition cursor-pointer"
                                                                            title="Reject request"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}

                                                            {pendingRequests.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic font-medium">
                                                                        No pending join requests active currently.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                        )}

                        {activeTab === 'members' && (
                                        <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-3xl p-6 shadow-xl shadow-blue-100/30">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                        <Users className="text-blue-600 w-5 h-5" />
                                                        Workspace Members
                                                    </h2>
                                                    <p className="text-xs text-gray-500 font-medium">Manage members, appoint project managers, and oversee roles.</p>
                                                </div>
                                            </div>

                                            {loadingMembers ? (
                                                <div className="py-12 text-center">
                                                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-2" />
                                                    <p className="text-gray-500 font-semibold">Loading members...</p>
                                                </div>
                                            ) : workspaceMembersList.length === 0 ? (
                                                <div className="py-12 text-center text-gray-500 font-medium animate-fade-in">
                                                    No active workspace members found.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-blue-50/40 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                <th className="py-3 px-4">Name</th>
                                                                <th className="py-3 px-4">Email</th>
                                                                <th className="py-3 px-4">Workspace Role</th>
                                                                <th className="py-3 px-4 text-right pr-6">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                                                            {workspaceMembersList.map(member => (
                                                                <tr key={member.id} className="hover:bg-blue-50/20 transition-colors">
                                                                    <td className="py-4 px-4 flex items-center gap-3">
                                                                        {member.avatarUrl ? (
                                                                            <img src={member.avatarUrl} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                                                                        ) : (
                                                                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-xs">
                                                                                {member.name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <p className="font-extrabold text-gray-800">{member.name}</p>
                                                                            {member.position && <p className="text-xs text-gray-500 font-medium">{member.position}</p>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-4 text-gray-500">{member.email}</td>
                                                                    <td className="py-4 px-4">
                                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border uppercase ${member.role === 'owner' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                                                            member.role === 'admin' ? 'bg-red-50 border-red-200 text-red-700' :
                                                                                member.role === 'manager' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                                                    'bg-gray-50 border-gray-200 text-gray-700'
                                                                            }`}>
                                                                            {member.role}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right pr-6">
                                                                        {member.id !== user?.id && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedUserForPm(member);
                                                                                    setIsAssignPmModalOpen(true);
                                                                                }}
                                                                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                                                                            >
                                                                                <UserCheck className="w-4 h-4" />
                                                                                Assign PM
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ASSIGN PROJECT MANAGER MODAL */}
                                    {isAssignPmModalOpen && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm animate-fade-in">
                                            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all scale-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                                        <UserCheck className="text-blue-600 w-6 h-6" />
                                                        Assign Project Manager
                                                    </h3>
                                                    <button
                                                        onClick={() => setIsAssignPmModalOpen(false)}
                                                        className="p-2 hover:bg-gray-100 rounded-full transition cursor-pointer"
                                                    >
                                                        <X className="w-5 h-5 text-gray-500" />
                                                    </button>
                                                </div>

                                                <div className="space-y-4 mb-6">
                                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                                        <p className="text-sm font-semibold text-gray-700">Appointee:</p>
                                                        <p className="text-base font-extrabold text-blue-800">{selectedUserForPm?.name}</p>
                                                        <p className="text-xs text-gray-500 font-medium">{selectedUserForPm?.email}</p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Project</label>
                                                        <select
                                                            value={selectedProjectIdForPm}
                                                            onChange={(e) => setSelectedProjectIdForPm(e.target.value)}
                                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700 cursor-pointer"
                                                        >
                                                            <option value="">-- Choose a project --</option>
                                                            {projectsList.map(proj => (
                                                                <option key={proj.id} value={proj.id}>{proj.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => setIsAssignPmModalOpen(false)}
                                                        className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition cursor-pointer"
                                                        disabled={assigningPm}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleAssignPmSave}
                                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition shadow flex items-center gap-2 cursor-pointer"
                                                        disabled={assigningPm || !selectedProjectIdForPm}
                                                    >
                                                        {assigningPm ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : 'Save'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                </div>
                            </div>
            </div>

                    {/* CREATE/EDIT DEPARTMENT DIALOG MODAL */}
                    {deptModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all">
                            <div className="bg-white rounded-3xl border border-blue-100 shadow-2xl p-6 w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <Building2 className="text-blue-600 w-5 h-5" />
                                        {currentDept ? 'Edit Department' : 'Create Department'}
                                    </h3>
                                    <button
                                        onClick={() => setDeptModalOpen(false)}
                                        className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleDeptSubmit} className="mt-4 space-y-4">
                                    {/* Dept Name */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={deptForm.name}
                                            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                            placeholder="e.g. Engineering, Human Resources"
                                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 font-semibold"
                                        />
                                    </div>

                                    {/* Dept Description */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</label>
                                        <textarea
                                            value={deptForm.description}
                                            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                                            placeholder="Describe the responsibilities of this department"
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800"
                                        />
                                    </div>

                                    {/* Manager Assignment */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assign Department Manager</label>
                                        <select
                                            value={deptForm.managerId}
                                            onChange={(e) => setDeptForm({ ...deptForm, managerId: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-700 font-semibold"
                                        >
                                            <option value="">No Manager Assigned</option>
                                            {users.map((u) => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Submit & Cancel */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setDeptModalOpen(false)}
                                            className="px-5 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-2xl hover:bg-gray-50 transition cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submittingDept}
                                            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {submittingDept ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                'Save Department'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ADD HOLIDAY DIALOG MODAL */}
                    {holidayModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all">
                            <div className="bg-white rounded-3xl border border-blue-100 shadow-2xl p-6 w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <Calendar className="text-blue-600 w-5 h-5" />
                                        Add Organization Holiday
                                    </h3>
                                    <button
                                        onClick={() => setHolidayModalOpen(false)}
                                        className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddHoliday} className="mt-4 space-y-4">
                                    {/* Holiday Name */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Holiday Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={holidayForm.name}
                                            onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                                            placeholder="e.g. Independence Day, Christmas Holiday"
                                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800 font-semibold"
                                        />
                                    </div>

                                    {/* Holiday Date */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={holidayForm.date}
                                            onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800 font-semibold"
                                        />
                                    </div>

                                    {/* Submit & Cancel */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setHolidayModalOpen(false)}
                                            className="px-5 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-2xl hover:bg-gray-50 transition cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
                                        >
                                            Add to Schedule
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* EDIT EMPLOYEE ASSIGNMENTS MODAL */}
                    {editingUser && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all">
                            <div className="bg-white rounded-3xl border border-blue-100 shadow-2xl p-6 w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            <UserCheck className="text-blue-600 w-5 h-5" />
                                            Edit Employee Assignment
                                        </h3>
                                        <p className="text-xs text-gray-400 font-medium">Target user: {editingUser.name} ({editingUser.email})</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleUserUpdateSubmit} className="mt-4 space-y-4">

                                    {/* Position */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Job Title / Position</label>
                                        <input
                                            type="text"
                                            value={userForm.position}
                                            onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                                            placeholder="e.g. Senior Software Engineer"
                                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800 font-semibold"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Role Selection */}
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Access Role</label>
                                            <select
                                                value={userForm.role}
                                                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-700 font-semibold"
                                            >
                                                <option value="employee">Employee</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>

                                        {/* Department selection */}
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department</label>
                                            <select
                                                value={userForm.departmentId}
                                                onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-700 font-semibold"
                                            >
                                                <option value="">Not Assigned</option>
                                                {departments.map((d) => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Contact Phone */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Phone</label>
                                        <input
                                            type="text"
                                            value={userForm.phone}
                                            onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                                            placeholder="e.g. +1 555-0199"
                                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                        />
                                    </div>

                                    {/* Submit & Cancel */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setEditingUser(null)}
                                            className="px-5 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-2xl hover:bg-gray-50 transition cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={userUpdatingId !== null}
                                            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {userUpdatingId !== null ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
                );
}
