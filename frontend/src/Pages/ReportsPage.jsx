import { useState, useEffect } from 'react';
import { 
    FileText, Download, Loader2, Calendar, Users, 
    CheckSquare, Mail, Send, Sparkles, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getProjects } from '../Services/projectApi';
import { getTeams } from '../Services/agileApi';
import { getAdminUsers } from '../Services/adminApi';
import { getAttendanceHistory } from '../Services/attendanceApi';
import { emailReport } from '../Services/reportsApi';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function ReportsPage() {
    const { isLoggedIn, user: authUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);

    // Export Selection States
    const [attendanceUser, setAttendanceUser] = useState('all');
    const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
    const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());

    const [projectSelected, setProjectSelected] = useState('');
    const [teamSelected, setTeamSelected] = useState('');

    // Emails and Exporting States
    const [emailAttendance, setEmailAttendance] = useState('');
    const [emailProject, setEmailProject] = useState('');
    const [emailTeam, setEmailTeam] = useState('');
    const [emailProductivity, setEmailProductivity] = useState('');

    const [actionLoading, setActionLoading] = useState({
        attendance: false,
        project: false,
        team: false,
        productivity: false
    });

    useEffect(() => {
        if (authUser?.email) {
            setEmailAttendance(authUser.email);
            setEmailProject(authUser.email);
            setEmailTeam(authUser.email);
            setEmailProductivity(authUser.email);
        }
    }, [authUser]);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const projectsData = await getProjects();
                setProjects(projectsData);
                if (projectsData.length > 0) setProjectSelected(projectsData[0].id.toString());

                const teamsData = await getTeams();
                setTeams(teamsData);
                if (teamsData.length > 0) setTeamSelected(teamsData[0].id.toString());

                const usersData = await getAdminUsers();
                setUsers(usersData);
            } catch (error) {
                console.error('Failed to load metadata:', error);
                toast.error('Failed to load metadata');
            } finally {
                setLoading(false);
            }
        };
        loadMetadata();
    }, []);

    // File Downloads Generator
    const downloadFile = (filename, content, type) => {
        const blob = new Blob([content], { type: type });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV Download Helper
    const downloadCSV = (filename, headers, rows) => {
        const csvContent = [
            headers.join(','), 
            ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
    };

    // Excel (XLS XML) Download Helper
    const downloadExcel = (filename, headers, rows) => {
        let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Sheet1"><Table>`;
        
        // Headers
        xml += '<Row>';
        headers.forEach(h => {
            xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
        });
        xml += '</Row>';

        // Rows
        rows.forEach(r => {
            xml += '<Row>';
            r.forEach(val => {
                xml += `<Cell><Data ss:Type="String">${val}</Data></Cell>`;
            });
            xml += '</Row>';
        });

        xml += '</Table></Worksheet></Workbook>';
        downloadFile(filename, xml, 'application/vnd.ms-excel');
    };

    // PDF Download (using structured HTML Print view window)
    const downloadPDF = (title, headers, rows) => {
        const printWindow = window.open('', '_blank');
        const html = `
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Helvetica Neue', sans-serif; color: #1e293b; padding: 40px; }
                    h1 { color: #2563eb; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: left; font-size: 12px; }
                    th { bg-color: #f1f5f9; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .footer { margin-top: 45px; text-align: center; font-size: 10px; color: #94a3b8; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `<tr>${r.map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
                <div class="footer">Executive Reports Transmission Vector | TaskForge AI</div>
                <script>window.print();</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // ==========================================
    // 1. Export Attendance Reports
    // ==========================================
    const handleExportAttendance = async (format) => {
        try {
            const allHistory = await getAttendanceHistory();
            const filtered = allHistory.filter(r => {
                const date = new Date(r.checkIn || r.date);
                const matchesUser = attendanceUser === 'all' || r.userId.toString() === attendanceUser;
                const matchesMonth = (date.getMonth() + 1) === parseInt(attendanceMonth, 10);
                const matchesYear = date.getFullYear() === parseInt(attendanceYear, 10);
                return matchesUser && matchesMonth && matchesYear;
            });

            if (filtered.length === 0) {
                toast.error('No attendance records found for selection.');
                return;
            }

            const headers = ['Record ID', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Status', 'Location', 'IP Address'];
            const rows = filtered.map(r => [
                r.id,
                r.userId,
                r.date,
                r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : 'N/A',
                r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : 'N/A',
                r.status,
                r.location || 'Office Base',
                r.ipAddress || 'unknown'
            ]);

            const filename = `Attendance_Report_${attendanceYear}_${attendanceMonth}`;
            if (format === 'csv') downloadCSV(`${filename}.csv`, headers, rows);
            else if (format === 'excel') downloadExcel(`${filename}.xls`, headers, rows);
            else if (format === 'pdf') downloadPDF(`Attendance Report (${attendanceYear}/${attendanceMonth})`, headers, rows);
            toast.success(`Attendance report exported as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Attendance export failed:', error);
            toast.error('Failed to export attendance data');
        }
    };

    const handleEmailAttendance = async () => {
        if (!emailAttendance.trim()) {
            toast.error('Please enter a recipient email');
            return;
        }
        setActionLoading(prev => ({ ...prev, attendance: true }));
        try {
            await emailReport({
                reportType: 'attendance',
                recipientEmail: emailAttendance.trim(),
                filters: {
                    year: attendanceYear,
                    month: attendanceMonth,
                    userId: attendanceUser === 'all' ? authUser.id : parseInt(attendanceUser, 10)
                }
            });
            toast.success(`Monthly Attendance Report dispatched to ${emailAttendance}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to dispatch email report');
        } finally {
            setActionLoading(prev => ({ ...prev, attendance: false }));
        }
    };

    // ==========================================
    // 2. Export Project Reports
    // ==========================================
    const handleExportProject = (format) => {
        const proj = projects.find(p => p.id.toString() === projectSelected);
        if (!proj) {
            toast.error('Please select a project');
            return;
        }

        const headers = ['Project Field', 'Value Details'];
        const rows = [
            ['Project Name', proj.name],
            ['Description', proj.description || 'N/A'],
            ['Status', proj.status],
            ['Start Date', proj.startDate ? new Date(proj.startDate).toLocaleDateString() : 'N/A'],
            ['End Date', proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'N/A'],
            ['Created At', new Date(proj.createdAt).toLocaleDateString()]
        ];

        const filename = `Project_Report_${proj.name.replace(/\s+/g, '_')}`;
        if (format === 'csv') downloadCSV(`${filename}.csv`, headers, rows);
        else if (format === 'excel') downloadExcel(`${filename}.xls`, headers, rows);
        else if (format === 'pdf') downloadPDF(`Project Performance: ${proj.name}`, headers, rows);
        toast.success(`Project report exported as ${format.toUpperCase()}`);
    };

    const handleEmailProject = async () => {
        if (!projectSelected) {
            toast.error('Please select a project');
            return;
        }
        if (!emailProject.trim()) {
            toast.error('Please enter a recipient email');
            return;
        }
        setActionLoading(prev => ({ ...prev, project: true }));
        try {
            await emailReport({
                reportType: 'project',
                recipientEmail: emailProject.trim(),
                filters: { projectId: parseInt(projectSelected, 10) }
            });
            toast.success(`Project Report dispatched to ${emailProject}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to dispatch email report');
        } finally {
            setActionLoading(prev => ({ ...prev, project: false }));
        }
    };

    // ==========================================
    // 3. Export Team Reports
    // ==========================================
    const handleExportTeam = (format) => {
        const team = teams.find(t => t.id.toString() === teamSelected);
        if (!team) {
            toast.error('Please select a team');
            return;
        }

        const headers = ['Team Attribute', 'Value Details'];
        const rows = [
            ['Team Name', team.name],
            ['Description', team.description || 'N/A'],
            ['Department', team.departmentName],
            ['Team Leader', team.leader ? team.leader.name : 'Unassigned'],
            ['Roster Headcount', team.memberCount],
            ['Created At', new Date(team.createdAt).toLocaleDateString()]
        ];

        const filename = `Team_Report_${team.name.replace(/\s+/g, '_')}`;
        if (format === 'csv') downloadCSV(`${filename}.csv`, headers, rows);
        else if (format === 'excel') downloadExcel(`${filename}.xls`, headers, rows);
        else if (format === 'pdf') downloadPDF(`Team Squad Performance: ${team.name}`, headers, rows);
        toast.success(`Team report exported as ${format.toUpperCase()}`);
    };

    const handleEmailTeam = async () => {
        if (!teamSelected) {
            toast.error('Please select a team');
            return;
        }
        if (!emailTeam.trim()) {
            toast.error('Please enter a recipient email');
            return;
        }
        setActionLoading(prev => ({ ...prev, team: true }));
        try {
            await emailReport({
                reportType: 'team',
                recipientEmail: emailTeam.trim(),
                filters: { teamId: parseInt(teamSelected, 10) }
            });
            toast.success(`Team Report dispatched to ${emailTeam}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to dispatch email report');
        } finally {
            setActionLoading(prev => ({ ...prev, team: false }));
        }
    };

    // ==========================================
    // 4. Productivity Summary Reports (Email Only)
    // ==========================================
    const handleEmailProductivity = async () => {
        if (!emailProductivity.trim()) {
            toast.error('Please enter a recipient email');
            return;
        }
        setActionLoading(prev => ({ ...prev, productivity: true }));
        try {
            await emailReport({
                reportType: 'productivity',
                recipientEmail: emailProductivity.trim()
            });
            toast.success(`Global Productivity Report dispatched to ${emailProductivity}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to dispatch email report');
        } finally {
            setActionLoading(prev => ({ ...prev, productivity: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-semibold animate-pulse">Loading Reports Control Panel...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080d1a] py-10 px-4 sm:px-6 lg:px-8 text-slate-100 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-white/10 mb-8">
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-400 animate-pulse" />
                        Executive Reports & Data Export
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium font-sans">Compile, download, and email workspace metrics in CSV, XLS, or PDF formats.</p>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    
                    {/* Card 1: Attendance Log Export */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[400px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-200">Attendance Log Export</h2>
                            </div>
                            <p className="text-xs text-slate-400 font-sans leading-relaxed mb-6">Download check-in metrics, late percentages, and active operating days logs.</p>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Employee</label>
                                        <select
                                            value={attendanceUser}
                                            onChange={(e) => setAttendanceUser(e.target.value)}
                                            className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                                        >
                                            <option value="all" className="bg-slate-900">All Employees</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Month</label>
                                        <select
                                            value={attendanceMonth}
                                            onChange={(e) => setAttendanceMonth(e.target.value)}
                                            className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m} className="bg-slate-900">
                                                    {new Date(2026, m - 1).toLocaleString('en-US', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleExportAttendance('csv')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                    <button onClick={() => handleExportAttendance('excel')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> XLS
                                    </button>
                                    <button onClick={() => handleExportAttendance('pdf')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-6">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Direct Email Dispatch</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="recipient@example.com"
                                    value={emailAttendance}
                                    onChange={(e) => setEmailAttendance(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
                                />
                                <button
                                    onClick={handleEmailAttendance}
                                    disabled={actionLoading.attendance}
                                    className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition disabled:opacity-50"
                                >
                                    {actionLoading.attendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Project Performance */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[400px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                                    <CheckSquare className="w-5 h-5" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-200">Project Performance</h2>
                            </div>
                            <p className="text-xs text-slate-400 font-sans leading-relaxed mb-6">Retrieve milestones, epic status counts, and completed sprint velocities.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Project</label>
                                    <select
                                        value={projectSelected}
                                        onChange={(e) => setProjectSelected(e.target.value)}
                                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                                    >
                                        <option value="" className="bg-slate-900">Select Project...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleExportProject('csv')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                    <button onClick={() => handleExportProject('excel')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> XLS
                                    </button>
                                    <button onClick={() => handleExportProject('pdf')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-6">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Direct Email Dispatch</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="recipient@example.com"
                                    value={emailProject}
                                    onChange={(e) => setEmailProject(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
                                />
                                <button
                                    onClick={handleEmailProject}
                                    disabled={actionLoading.project}
                                    className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition disabled:opacity-50"
                                >
                                    {actionLoading.project ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Team Squad Summary */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[400px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-200">Team Squad Statistics</h2>
                            </div>
                            <p className="text-xs text-slate-400 font-sans leading-relaxed mb-6">Export headcount breakdown, division structure, and squad leader assignments.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Team</label>
                                    <select
                                        value={teamSelected}
                                        onChange={(e) => setTeamSelected(e.target.value)}
                                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none"
                                    >
                                        <option value="" className="bg-slate-900">Select Team...</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleExportTeam('csv')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                    <button onClick={() => handleExportTeam('excel')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> XLS
                                    </button>
                                    <button onClick={() => handleExportTeam('pdf')} className="flex-1 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-xxs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                                        <Download className="w-3 h-3" /> PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-6">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Direct Email Dispatch</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="recipient@example.com"
                                    value={emailTeam}
                                    onChange={(e) => setEmailTeam(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
                                />
                                <button
                                    onClick={handleEmailTeam}
                                    disabled={actionLoading.team}
                                    className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition disabled:opacity-50"
                                >
                                    {actionLoading.team ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Workspace Productivity Report (Email Only) */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[400px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-200">Global Productivity</h2>
                            </div>
                            <p className="text-xs text-slate-400 font-sans leading-relaxed mb-6">Generates productivity efficiency logs by mapping completed project tasks inside the active workspace and emails it to directors.</p>
                            
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                                <span className="text-xxs font-bold text-slate-300 uppercase tracking-wide">Multi-Project Analysis</span>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-6">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Direct Email Dispatch</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="recipient@example.com"
                                    value={emailProductivity}
                                    onChange={(e) => setEmailProductivity(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none"
                                />
                                <button
                                    onClick={handleEmailProductivity}
                                    disabled={actionLoading.productivity}
                                    className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition disabled:opacity-50"
                                >
                                    {actionLoading.productivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
