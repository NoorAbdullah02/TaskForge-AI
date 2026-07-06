import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    applyLeave,
    getLeaveHistory,
    getAllLeaveRequests,
    approveLeave,
    rejectLeave
} from '../Services/leaveApi';
import {
    Calendar,
    FileText,
    FileSpreadsheet,
    Plus,
    X,
    Loader,
    Check,
    AlertTriangle,
    Clock,
    User,
    ClipboardList,
    ThumbsUp,
    ThumbsDown,
    MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

const LeavePage = () => {
    const { isLoggedIn, loading: authLoading, user } = useAuth();
    // Tabs: 'my-leaves' or 'approvals'
    const [activeTab, setActiveTab] = useState('my-leaves');

    // Data lists
    const [history, setHistory] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal Control
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form inputs
    const [leaveType, setLeaveType] = useState('casual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // Fetch lists
    const fetchLeavesData = async () => {
        if (!isLoggedIn) return;
        try {
            setIsLoading(true);
            const [historyData, allRequestsData] = await Promise.all([
                getLeaveHistory(),
                getAllLeaveRequests()
            ]);
            setHistory(historyData);
            setAllRequests(allRequestsData);
        } catch (error) {
            console.error('Error fetching leave details:', error);
            toast.error('Failed to load leave records');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchLeavesData();
        }
    }, [isLoggedIn]);

    // Handle Leave Application
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            toast.error('Start date cannot be after end date');
            return;
        }

        try {
            setSubmitting(true);
            await applyLeave({
                leaveType,
                startDate,
                endDate,
                reason: reason.trim()
            });

            toast.success('Leave application submitted successfully! 📄');
            setIsModalOpen(false);
            
            // Reset form
            setLeaveType('casual');
            setStartDate('');
            setEndDate('');
            setReason('');

            // Reload data
            fetchLeavesData();
        } catch (error) {
            console.error('Apply leave error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    // Action handlers (Approve / Reject)
    const [processingApprovalId, setProcessingApprovalId] = useState(null);
    const [processingRejectionId, setProcessingRejectionId] = useState(null);

    const handleApprove = async (id) => {
        try {
            setProcessingApprovalId(id);
            // Optimistic update
            setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'approved' } : req));
            setHistory(prev => prev.map(req => req.id === id ? { ...req, status: 'approved', approverName: user?.name } : req));

            await approveLeave(id);
            toast.success('Leave request approved! 👍');
            fetchLeavesData();
        } catch {
            toast.error('Approval failed');
            fetchLeavesData();
        } finally {
            setProcessingApprovalId(null);
        }
    };

    const handleReject = async (id) => {
        try {
            setProcessingRejectionId(id);
            // Optimistic update
            setAllRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
            setHistory(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected', approverName: user?.name } : req));

            await rejectLeave(id);
            toast.success('Leave request rejected! 👎');
            fetchLeavesData();
        } catch {
            toast.error('Rejection failed');
            fetchLeavesData();
        } finally {
            setProcessingRejectionId(null);
        }
    };

    // Helper formats
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const calculateDays = (start, end) => {
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 0;
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading leave desk...</p>
                </div>
            </div>
        );
    }

    const pendingRequests = allRequests.filter(r => r.status === 'pending');

    // Counts for stats
    const stats = {
        totalRequests: history.length,
        approved: history.filter(r => r.status === 'approved').length,
        pending: history.filter(r => r.status === 'pending').length,
        daysTaken: history
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0)
    };

    // Leave badge configs
    const statusBadges = {
        pending: 'bg-amber-50 text-amber-700 border-amber-100',
        approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        rejected: 'bg-rose-50 text-rose-700 border-rose-100'
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                            <ClipboardList className="w-10 h-10 text-blue-600" />
                            Leave Center
                        </h1>
                        <p className="text-gray-600 font-medium">Apply for time off and manage system-wide leave requests.</p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2 hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        Apply for Leave
                    </button>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Applications', value: stats.totalRequests, color: 'from-blue-500 to-blue-600', icon: ClipboardList },
                        { label: 'Days Approved', value: stats.daysTaken, color: 'from-emerald-500 to-emerald-600', icon: Check },
                        { label: 'Pending Requests', value: stats.pending, color: 'from-amber-500 to-amber-600', icon: Clock },
                        { label: 'Rejected Requests', value: history.filter(r => r.status === 'rejected').length, color: 'from-rose-500 to-rose-600', icon: AlertTriangle }
                    ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div key={i} className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-lg bg-gradient-to-br ${card.color}`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">{card.label}</p>
                                        <p className="text-3xl font-extrabold">{card.value}</p>
                                    </div>
                                    <Icon className="w-8 h-8 opacity-80" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Navigation and Main Layout */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-150 space-y-6">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('my-leaves')}
                            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                                activeTab === 'my-leaves'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            My Leave Log
                        </button>
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all relative ${
                                activeTab === 'approvals'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            Team Approval Inbox
                            {pendingRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xxs font-bold h-5 w-5 flex items-center justify-center border-2 border-white animate-bounce">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab 1: My History */}
                    {activeTab === 'my-leaves' && (
                        <div>
                            {history.length === 0 ? (
                                <div className="bg-gray-50/50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 max-w-xl mx-auto my-6">
                                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-bold">No leave applications filed</p>
                                    <p className="text-xs text-gray-400 mb-6">Click the apply button above to submit your first leave request.</p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition"
                                    >
                                        Apply Now
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-gray-150">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-gray-150">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Dates</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Days</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Type</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Reason</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Status</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Approver</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((req) => (
                                                <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                                                    <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                                                        <div className="flex items-center gap-1">
                                                            <span>{formatDate(req.startDate)}</span>
                                                            <span className="text-gray-400">→</span>
                                                            <span>{formatDate(req.endDate)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-700 text-sm">
                                                        {calculateDays(req.startDate, req.endDate)} Days
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-indigo-600 bg-indigo-50/30 w-fit px-2 py-0.5 rounded capitalize">
                                                        {req.leaveType}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 text-sm font-medium max-w-xs truncate" title={req.reason}>
                                                        {req.reason}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xxs font-extrabold uppercase border ${statusBadges[req.status] || statusBadges.pending}`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-semibold text-gray-500">
                                                        {req.approverName || '--'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: System Approvals (Manager Inbox) */}
                    {activeTab === 'approvals' && (
                        <div>
                            {allRequests.length === 0 ? (
                                <div className="bg-gray-50/50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 max-w-xl mx-auto my-6">
                                    <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-bold">No leave requests in system</p>
                                    <p className="text-xs text-gray-400">System is clean of any submitted applications.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-gray-150">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-gray-150">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Team Member</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Leave Details</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Reason</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Status</th>
                                                <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allRequests.map((req) => (
                                                <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-100 text-blue-700 font-bold text-xs rounded-full flex items-center justify-center">
                                                                {req.userName?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-gray-800">{req.userName}</p>
                                                                <p className="text-xxs text-gray-400">{req.userEmail}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-gray-800 text-sm">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <span>{formatDate(req.startDate)}</span>
                                                                <span className="text-gray-400">→</span>
                                                                <span>{formatDate(req.endDate)}</span>
                                                            </div>
                                                            <p className="text-xxs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 w-fit capitalize">
                                                                {req.leaveType} ({calculateDays(req.startDate, req.endDate)} Days)
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 text-sm font-medium max-w-xs truncate" title={req.reason}>
                                                        {req.reason}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xxs font-extrabold uppercase border ${statusBadges[req.status] || statusBadges.pending}`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {req.status === 'pending' ? (
                                                            user?.role === 'owner' ? (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleApprove(req.id)}
                                                                        disabled={processingApprovalId === req.id || processingRejectionId === req.id}
                                                                        className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition rounded-xl flex items-center gap-1 text-xxs font-bold cursor-pointer disabled:opacity-50"
                                                                        title="Approve Leave"
                                                                    >
                                                                        {processingApprovalId === req.id ? (
                                                                            <><Loader className="w-3.5 h-3.5 animate-spin" /> Approving...</>
                                                                        ) : (
                                                                            <><ThumbsUp className="w-3.5 h-3.5" /> Approve</>
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleReject(req.id)}
                                                                        disabled={processingApprovalId === req.id || processingRejectionId === req.id}
                                                                        className="p-1.5 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition rounded-xl flex items-center gap-1 text-xxs font-bold cursor-pointer disabled:opacity-50"
                                                                        title="Reject Leave"
                                                                    >
                                                                        {processingRejectionId === req.id ? (
                                                                            <><Loader className="w-3.5 h-3.5 animate-spin" /> Rejecting...</>
                                                                        ) : (
                                                                            <><ThumbsDown className="w-3.5 h-3.5" /> Reject</>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xxs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded font-bold">Pending Review</span>
                                                            )
                                                        ) : (
                                                            <span className="text-xxs text-gray-400 font-bold">Closed</span>
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
                </div>
            </div>

            {/* Leave Request Dialog / Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white/95 rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full border border-gray-100 relative overflow-hidden backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                                <FileText className="w-7 h-7 text-blue-600" />
                                Apply for Time Off
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 pr-2">
                            {/* Leave Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">Leave Category</label>
                                <select
                                    value={leaveType}
                                    onChange={(e) => setLeaveType(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-bold text-gray-700 bg-white"
                                >
                                    <option value="casual">Casual Leave</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="annual">Annual Leave</option>
                                    <option value="maternity/paternity">Maternity/Paternity</option>
                                    <option value="unpaid">Unpaid Leave</option>
                                </select>
                            </div>

                            {/* Date select row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">Start Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">End Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-semibold text-gray-800"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Reason for Leave */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">Detailed Reason</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Briefly describe the reason for your time-off request..."
                                    rows={3}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 font-medium text-gray-700"
                                ></textarea>
                            </div>

                            {/* Submit Row */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-2xl hover:bg-gray-200 transition font-bold text-base"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !startDate || !endDate || !reason.trim()}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-705 transition font-bold text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        'Submit Application'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavePage;
