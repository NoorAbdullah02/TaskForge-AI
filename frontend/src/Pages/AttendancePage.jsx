import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getTodayStatus,
    checkIn,
    checkOut,
    getAttendanceHistory,
    getMonthlyReport
} from '../Services/attendanceApi';
import {
    Clock,
    MapPin,
    Calendar,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    UserCheck,
    Coffee,
    FileText,
    Globe,
    CheckCircle,
    Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const AttendancePage = () => {
    const { isLoggedIn, loading: authLoading, user } = useAuth();
    const navigate = useNavigate();

    // Today's Status State
    const [todayRecord, setTodayRecord] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Live Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    // Selected Location
    const [location, setLocation] = useState('Office'); // 'Office' or 'Remote'

    // History and Monthly Report State
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [monthlyReportData, setMonthlyReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    // Redirect unauthorized users
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate('/login');
        }
    }, [isLoggedIn, authLoading, navigate]);

    // Live Clock Interval
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load Today's Status & History
    const loadTodayAndHistory = async () => {
        if (!isLoggedIn) return;
        try {
            setCheckingStatus(true);
            setHistoryLoading(true);

            // Get local YYYY-MM-DD
            const localDateStr = new Date().toISOString().split('T')[0];
            const [statusData, historyData] = await Promise.all([
                getTodayStatus({ date: localDateStr }),
                getAttendanceHistory()
            ]);

            setTodayRecord(statusData);
            setHistory(historyData);
        } catch (error) {
            console.error('Error loading attendance logs:', error);
            toast.error('Failed to load attendance records');
        } finally {
            setCheckingStatus(false);
            setHistoryLoading(false);
        }
    };

    // Load Monthly Report
    const loadMonthlyReport = async () => {
        if (!isLoggedIn) return;
        try {
            setReportLoading(true);
            const report = await getMonthlyReport(reportYear, reportMonth);
            setMonthlyReportData(report);
        } catch (error) {
            console.error('Error fetching monthly report:', error);
            toast.error('Failed to load monthly report stats');
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            loadTodayAndHistory();
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn) {
            loadMonthlyReport();
        }
    }, [isLoggedIn, reportMonth, reportYear]);

    // Handle Check In
    const handleCheckIn = async () => {
        try {
            setActionLoading(true);
            const localDateStr = new Date().toISOString().split('T')[0];
            const data = await checkIn({
                date: localDateStr,
                location: location
            });
            toast.success('Successfully checked in! Have a great day! 🚀');
            setTodayRecord(data.record);
            loadTodayAndHistory();
            loadMonthlyReport();
        } catch (error) {
            console.error('Check in error:', error);
            toast.error(error.response?.data?.message || 'Check-in failed');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Check Out
    const handleCheckOut = async () => {
        try {
            setActionLoading(true);
            const localDateStr = new Date().toISOString().split('T')[0];
            const data = await checkOut({
                date: localDateStr
            });
            toast.success('Successfully checked out! Safe travels! 🏠');
            setTodayRecord(data.record);
            loadTodayAndHistory();
            loadMonthlyReport();
        } catch (error) {
            console.error('Check out error:', error);
            toast.error(error.response?.data?.message || 'Check-out failed');
        } finally {
            setActionLoading(false);
        }
    };

    // Formatter helpers
    const formatTime = (dateInput) => {
        if (!dateInput) return '--:--';
        return new Date(dateInput).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (authLoading || checkingStatus) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <Clock className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">Loading attendance workspace...</p>
                </div>
            </div>
        );
    }

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    // Status config
    const statusConfig = {
        present: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'On Time' },
        late: { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Late' },
        absent: { bg: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Absent' }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                            <UserCheck className="w-10 h-10 text-blue-600" />
                            Attendance Desk
                        </h1>
                        <p className="text-gray-600 font-medium">Log daily working hours and track monthly performance logs.</p>
                    </div>

                    {/* Server Time Display */}
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-150 flex items-center gap-3">
                        <Clock className="w-6 h-6 text-indigo-650" />
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Local Desk Time</p>
                            <p className="text-lg font-extrabold text-gray-800">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Interaction Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Clock In / Out Panel */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100/50 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        
                        <div className="relative z-10 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-1">Log Today</h3>
                                <p className="text-2xl font-extrabold text-gray-800">{formatDate(currentTime)}</p>
                            </div>

                            {/* Location Selector (Only when checking in) */}
                            {!todayRecord && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">Choose Work Location</label>
                                    <div className="flex gap-4">
                                        {['Office', 'Remote'].map((loc) => (
                                            <button
                                                key={loc}
                                                onClick={() => setLocation(loc)}
                                                className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                                                    location === loc
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                            >
                                                <MapPin className={`w-4 h-4 ${location === loc ? 'text-blue-600' : 'text-gray-400'}`} />
                                                {loc}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* State indicators */}
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
                                    <span className="text-xxs font-extrabold uppercase text-gray-400">Checked In</span>
                                    <p className="text-lg font-extrabold text-gray-800 mt-1">
                                        {todayRecord ? formatTime(todayRecord.checkIn) : '--:--'}
                                    </p>
                                    {todayRecord?.location && (
                                        <span className="text-xxs font-bold text-blue-600 flex items-center gap-1 mt-1">
                                            <MapPin className="w-3 h-3" /> {todayRecord.location}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
                                    <span className="text-xxs font-extrabold uppercase text-gray-400">Checked Out</span>
                                    <p className="text-lg font-extrabold text-gray-800 mt-1">
                                        {todayRecord?.checkOut ? formatTime(todayRecord.checkOut) : '--:--'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-6 relative z-10">
                            {actionLoading ? (
                                <button className="w-full py-4 bg-gray-200 text-gray-500 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-wait" disabled>
                                    <Clock className="w-5 h-5 animate-spin" /> Performing Action...
                                </button>
                            ) : !todayRecord ? (
                                <button
                                    onClick={handleCheckIn}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                >
                                    <UserCheck className="w-5 h-5" />
                                    Check In for Today
                                </button>
                            ) : !todayRecord.checkOut ? (
                                <button
                                    onClick={handleCheckOut}
                                    className="w-full py-4 bg-gradient-to-r from-amber-505 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                >
                                    <Coffee className="w-5 h-5" />
                                    Check Out for Today
                                </button>
                            ) : (
                                <div className="w-full py-4 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 font-extrabold rounded-2xl flex items-center justify-center gap-2 select-none">
                                    <CheckCircle className="w-5 h-5" />
                                    Workday Logged Successfully!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Summary Stats */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-2xl flex flex-col justify-between border border-slate-750">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-400 uppercase tracking-wider">Month Summary</h3>
                                <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                                    {months.find((m) => m.value === reportMonth)?.label}
                                </span>
                            </div>

                            {reportLoading ? (
                                <div className="space-y-4 py-8">
                                    <div className="h-6 bg-slate-700/50 rounded-lg animate-pulse w-3/4"></div>
                                    <div className="h-10 bg-slate-700/50 rounded-lg animate-pulse"></div>
                                    <div className="h-10 bg-slate-700/50 rounded-lg animate-pulse"></div>
                                </div>
                            ) : monthlyReportData ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold">Total Days Present</p>
                                            <p className="text-2xl font-bold">{monthlyReportData.stats.totalDays} Days</p>
                                        </div>
                                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                                    </div>

                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold">Late Arrivals</p>
                                            <p className="text-2xl font-bold text-amber-400">{monthlyReportData.stats.lateCount} Days</p>
                                        </div>
                                        <Info className="w-6 h-6 text-amber-400" />
                                    </div>

                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold">Hours Worked</p>
                                            <p className="text-2xl font-bold text-blue-400">{monthlyReportData.stats.totalHours} hrs</p>
                                        </div>
                                        <Clock className="w-6 h-6 text-blue-400" />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold">Avg. Check-In Time</p>
                                            <p className="text-2xl font-bold text-purple-400">{monthlyReportData.stats.avgCheckInTime}</p>
                                        </div>
                                        <Calendar className="w-6 h-6 text-purple-400" />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm py-12 text-center">No report stats available.</p>
                            )}
                        </div>

                        <div className="pt-6 mt-6 border-t border-white/5 text-center text-xs text-slate-400">
                            Updates live on log submits
                        </div>
                    </div>
                </div>

                {/* Attendance Analytics / Report Section */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-150">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-600" />
                                Monthly Logs & Reports
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">Verify your historical records and filter by monthly intervals.</p>
                        </div>

                        {/* Report Filter Controls */}
                        <div className="flex items-center gap-2">
                            <select
                                value={reportMonth}
                                onChange={(e) => setReportMonth(parseInt(e.target.value))}
                                className="px-3 py-2 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white"
                            >
                                {months.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>

                            <select
                                value={reportYear}
                                onChange={(e) => setReportYear(parseInt(e.target.value))}
                                className="px-3 py-2 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Monthly Log Tables */}
                    {reportLoading ? (
                        <div className="py-12 text-center">
                            <Clock className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                            <p className="text-gray-500 font-semibold">Generating report logs...</p>
                        </div>
                    ) : !monthlyReportData || monthlyReportData.records.length === 0 ? (
                        <div className="bg-gray-50/50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 font-bold">No logs recorded for this month</p>
                            <p className="text-xs text-gray-400">Please select another date range or log check-ins.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-150">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-150">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Date</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Status</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Check In</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Check Out</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Hours</th>
                                        <th className="px-6 py-4 text-xs font-extrabold uppercase text-gray-500">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyReportData.records.map((record) => {
                                        const config = statusConfig[record.status] || statusConfig.present;
                                        let hoursDiff = '--';
                                        if (record.checkIn && record.checkOut) {
                                            const diff = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
                                            hoursDiff = (diff / (1000 * 60 * 60)).toFixed(2) + ' hrs';
                                        }

                                        return (
                                            <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                                                <td className="px-6 py-4 font-bold text-gray-800">{record.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xxs font-extrabold uppercase border ${config.bg}`}>
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 font-semibold text-sm">
                                                    {formatTime(record.checkIn)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 font-semibold text-sm">
                                                    {formatTime(record.checkOut)}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                                                    {hoursDiff}
                                                </td>
                                                <td className="px-6 py-4 text-xxs text-gray-500">
                                                    <div className="flex flex-col gap-0.5">
                                                        {record.location && (
                                                            <span className="flex items-center gap-0.5">
                                                                <MapPin className="w-3 h-3 text-gray-400" /> {record.location}
                                                            </span>
                                                        )}
                                                        {record.ipAddress && (
                                                            <span className="flex items-center gap-0.5">
                                                                <Globe className="w-3 h-3 text-gray-400" /> {record.ipAddress}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendancePage;
