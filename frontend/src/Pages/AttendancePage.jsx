import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getTodayStatus,
    checkIn,
    checkOut,
    getAttendanceHistory,
    getMonthlyReport,
    generateQR,
    verifyQR
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
    Info,
    QrCode,
    Scan,
    Camera,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const AttendancePage = () => {
    const { isLoggedIn, loading: authLoading, user } = useAuth();
    const navigate = useNavigate();

    // Today's Status State
    const [todayRecord, setTodayRecord] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Mode: 'daily' (standard buttons) or 'qr' (QR code scanner & generator)
    const [activeMode, setActiveMode] = useState('daily');
    const [qrToken, setQrToken] = useState('');
    const [qrLoading, setQrLoading] = useState(false);
    const [scannedToken, setScannedToken] = useState('');
    const [qrSubTab, setQrSubTab] = useState('show'); // 'show' or 'scan'
    const [timeLeft, setTimeLeft] = useState(300);

    // Live Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    const isQRActive = () => {
        const hour = currentTime.getHours();
        const minute = currentTime.getMinutes();
        const currentTimeMinutes = hour * 60 + minute;
        return currentTimeMinutes >= 11 * 60 && currentTimeMinutes <= 20 * 60; // 11:00 AM to 8:00 PM
    };

    // Auto-refresh countdown for QR Code
    useEffect(() => {
        if (!qrToken || activeMode !== 'qr') return;
        if (!isQRActive()) return;
        setTimeLeft(300);
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleGenerateQR();
                    return 300;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [qrToken, activeMode]);

    const formatTimeLeft = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Selected Location
    const [location, setLocation] = useState('Office'); // 'Office' or 'Remote'

    // History and Monthly Report State
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const handleGenerateQR = async () => {
        if (!isQRActive()) {
            toast.error('QR code generation is disabled outside 11:00 AM - 08:00 PM');
            return;
        }
        setQrLoading(true);
        try {
            const data = await generateQR();
            setQrToken(data.token);
            toast.success('New check-in token generated!');
        } catch (error) {
            console.error('Failed to generate QR token:', error);
            toast.error('Failed to generate check-in token');
        } finally {
            setQrLoading(false);
        }
    };

    const handleVerifyQR = async () => {
        if (!isQRActive()) {
            toast.error('QR check-in verification is disabled outside 11:00 AM - 08:00 PM');
            return;
        }
        const tokenToVerify = scannedToken || qrToken;
        if (!tokenToVerify) {
            toast.error('No QR token is active or scanned');
            return;
        }
        setActionLoading(true);
        try {
            await verifyQR(tokenToVerify, 'QR Scanner Terminal');
            toast.success('QR Attendance successfully verified! 🚀');
            setQrToken('');
            setScannedToken('');
            loadTodayAndHistory();
            loadMonthlyReport();
        } catch (error) {
            console.error('QR validation error:', error);
            toast.error(error.response?.data?.message || 'QR Verification failed');
        } finally {
            setActionLoading(false);
        }
    };

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

                    <div className="flex items-center gap-3">
                        {/* Assigned Shift Display */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-155 flex items-center gap-3">
                            <Coffee className="w-5 h-5 text-emerald-600" />
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assigned Shift</p>
                                <p className="text-sm font-extrabold text-gray-800 capitalize">
                                    {user?.shiftType || 'Morning'}
                                </p>
                            </div>
                        </div>

                        {/* Server Time Display */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-155 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Local Desk Time</p>
                                <p className="text-sm font-extrabold text-gray-850">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Selector */}
                <div className="flex bg-white/60 backdrop-blur-md p-1 border border-gray-150 rounded-2xl max-w-sm shadow-sm">
                    <button
                        onClick={() => setActiveMode('daily')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeMode === 'daily' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-500 hover:text-blue-650'
                        }`}
                    >
                        <UserCheck className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
                        Daily Log-in
                    </button>
                    <button
                        onClick={() => {
                            setActiveMode('qr');
                            if (!qrToken) handleGenerateQR();
                        }}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeMode === 'qr' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-gray-500 hover:text-blue-655'
                        }`}
                    >
                        <QrCode className="w-4 h-4 inline-block mr-1.5 align-text-bottom" />
                        QR Check-in
                    </button>
                </div>

                {/* Main Interaction Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {activeMode === 'daily' ? (
                        /* Clock In / Out Panel */
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
                    ) : (
                        /* QR Code Panel */
                        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100/50 flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            
                            {!isQRActive() ? (
                                <div className="relative z-10 space-y-6 h-full flex flex-col justify-center items-center text-center py-12">
                                    <div className="p-4 bg-amber-50 rounded-full border border-amber-100 text-amber-600 mb-2">
                                        <AlertCircle className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">QR Attendance is Offline</h3>
                                    <p className="text-sm text-gray-500 max-w-md">
                                        Secure QR badge check-ins and simulator scanning are restricted to official operating hours: 
                                        <span className="block mt-1 font-bold text-blue-605">11:00 AM to 08:00 PM</span>
                                    </p>
                                    <div className="text-xs text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-xl border border-gray-150">
                                        Current Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-10 space-y-6 h-full flex flex-col justify-between">
                                    {/* Header and Sub-tabs */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                                <QrCode className="w-5 h-5 text-blue-600" />
                                                QR Badge Attendance
                                            </h3>
                                            <p className="text-xs text-gray-500 font-medium">Generate your badge or simulate scanner logins.</p>
                                        </div>
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button 
                                                onClick={() => setQrSubTab('show')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                                    qrSubTab === 'show' ? 'bg-white text-gray-850 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                My QR Code
                                            </button>
                                            <button 
                                                onClick={() => setQrSubTab('scan')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                                    qrSubTab === 'scan' ? 'bg-white text-gray-850 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                Scanner Simulator
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sub-tab content */}
                                    {qrSubTab === 'show' ? (
                                        <div className="flex flex-col items-center py-4 space-y-4">
                                            {qrLoading ? (
                                                <div className="w-[180px] h-[180px] flex items-center justify-center border border-gray-200 rounded-2xl bg-gray-50">
                                                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                                                </div>
                                            ) : qrToken ? (
                                                <div className="p-3 bg-white border border-gray-150 rounded-3xl shadow-sm flex flex-col items-center">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrToken)}`} 
                                                        alt="Attendance QR Code"
                                                        className="w-[180px] h-[180px] rounded-xl object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-[180px] h-[180px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 text-center p-4">
                                                    <QrCode className="w-8 h-8 text-gray-300 mb-2" />
                                                    <p className="text-xxs text-gray-400 font-bold">No Active Token</p>
                                                </div>
                                            )}

                                            {/* Expiry / Info */}
                                            {qrToken && (
                                                <div className="text-center space-y-1">
                                                    <p className="text-xs font-bold text-gray-700 flex items-center gap-1 justify-center">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                                                        Active Check-in Code
                                                    </p>
                                                    <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider">
                                                        Expires in: <span className="text-blue-650 font-extrabold">{formatTimeLeft(timeLeft)}</span>
                                                    </p>
                                                    <div className="max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap bg-gray-50 text-gray-500 text-[10px] font-mono p-1.5 rounded-lg border border-gray-150 select-all" title="Click to select token">
                                                        {qrToken}
                                                    </div>
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleGenerateQR}
                                                disabled={qrLoading}
                                                className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-650 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Regenerate Badge
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
                                            {/* Scan Camera Feed Mockup */}
                                            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-video flex flex-col justify-center items-center text-white p-4 group">
                                                {/* Scanner target box overlay */}
                                                <div className="absolute inset-8 border border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                                                    {/* Green horizontal scanner line */}
                                                    <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-md shadow-emerald-500/50 animate-bounce"></div>
                                                </div>
                                                
                                                <div className="relative z-10 text-center space-y-2 pointer-events-none">
                                                    <Camera className="w-8 h-8 text-gray-400 mx-auto animate-pulse" />
                                                    <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider">Simulated Camera Feed</p>
                                                    <p className="text-[10px] text-emerald-400 font-mono">Ready to scan badge...</p>
                                                </div>
                                            </div>

                                            {/* Scanner controls */}
                                            <div className="space-y-4 flex flex-col justify-between">
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Scanned QR Token</label>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text"
                                                                placeholder="Paste QR token string here..."
                                                                value={scannedToken}
                                                                onChange={(e) => setScannedToken(e.target.value)}
                                                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
                                                            />
                                                            {qrToken && (
                                                                <button 
                                                                    onClick={() => setScannedToken(qrToken)}
                                                                    className="px-2.5 py-2 bg-blue-50 border-2 border-blue-100 hover:border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                                                    title="Autofill current generated token"
                                                                >
                                                                    Autofill
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Scan Location</label>
                                                        <select 
                                                            value={location}
                                                            onChange={(e) => setLocation(e.target.value)}
                                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-blue-500"
                                                        >
                                                            <option value="Office">Office Main Lobby</option>
                                                            <option value="HQ Reception">HQ Reception</option>
                                                            <option value="Engineering Block">Engineering Block</option>
                                                            <option value="Remote">Home Office Desk</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={handleVerifyQR}
                                                    disabled={actionLoading || (!scannedToken && !qrToken)}
                                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <Scan className="w-4 h-4" />
                                                    Submit Scanned Badge
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

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
