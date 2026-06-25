import React, { useState, useEffect } from 'react';
import { 
    FileText, Download, Loader2, Calendar, Users, Building, 
    CheckSquare, BarChart3, TrendingUp, Sparkles, HelpCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getProjects } from '../Services/projectApi';
import { getTeams } from '../Services/agileApi';
import { getAdminUsers } from '../Services/adminApi';
import { getAttendanceHistory } from '../Services/attendanceApi';

export default function ReportsPage() {
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

    const [exporting, setExporting] = useState(false);

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

    // CSV Download Helper
    const downloadCSV = (filename, headers, rows) => {
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 1. Export Attendance Report
    const handleExportAttendance = async () => {
        setExporting(true);
        try {
            // Get attendance logs
            const allHistory = await getAttendanceHistory();
            
            // Filter by month/year and user
            const filtered = allHistory.filter(r => {
                const date = new Date(r.checkIn || r.date);
                const matchesUser = attendanceUser === 'all' || r.userId.toString() === attendanceUser;
                const matchesMonth = (date.getMonth() + 1) === parseInt(attendanceMonth, 10);
                const matchesYear = date.getFullYear() === parseInt(attendanceYear, 10);
                return matchesUser && matchesMonth && matchesYear;
            });

            if (filtered.length === 0) {
                toast.error('No attendance records found for the selected duration.');
                return;
            }

            const headers = ['Record ID', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Status', 'Location', 'IP Address'];
            const rows = filtered.map(r => [
                r.id,
                r.userId,
                r.date,
                r.checkIn ? new Date(r.checkIn).toLocaleString() : 'N/A',
                r.checkOut ? new Date(r.checkOut).toLocaleString() : 'N/A',
                r.status,
                r.location || 'Default Office',
                r.ipAddress || 'unknown'
            ]);

            downloadCSV(`Attendance_Report_${attendanceYear}_${attendanceMonth}.csv`, headers, rows);
            toast.success('Attendance report exported successfully');
        } catch (error) {
            console.error('Attendance export failed:', error);
            toast.error('Failed to export attendance data');
        } finally {
            setExporting(false);
        }
    };

    // 2. Export Project Report
    const handleExportProject = () => {
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

        downloadCSV(`Project_Report_${proj.name.replace(/\s+/g, '_')}.csv`, headers, rows);
        toast.success('Project report exported successfully');
    };

    // 3. Export Team Report
    const handleExportTeam = () => {
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

        downloadCSV(`Team_Report_${team.name.replace(/\s+/g, '_')}.csv`, headers, rows);
        toast.success('Team report exported successfully');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-semibold animate-pulse">Loading Reports Control Panel...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="pb-6 border-b border-gray-200/60 mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Executive Reports & Data Export
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Download audit tracks, attendance reports, and project statistics in spreadsheet formats.</p>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Card 1: Attendance Log Export */}
                    <div className="bg-white border border-blue-100/60 rounded-3xl p-6 shadow-xl shadow-blue-100/10 flex flex-col justify-between h-[360px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-gray-800">Attendance Log Export</h2>
                            </div>
                            <p className="text-xs text-gray-400 font-medium mb-6">Download check-in metrics, late percentages, and active operating days logs.</p>
                            
                            <div className="space-y-3.5">
                                {/* Employee Selector */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">Employee</label>
                                        <select
                                            value={attendanceUser}
                                            onChange={(e) => setAttendanceUser(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none"
                                        >
                                            <option value="all">All Employees</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">Month</label>
                                        <select
                                            value={attendanceMonth}
                                            onChange={(e) => setAttendanceMonth(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>
                                                    {new Date(2026, m - 1).toLocaleString('en-US', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleExportAttendance}
                            disabled={exporting}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold text-xs rounded-2xl hover:shadow-lg hover:shadow-blue-500/20 transition cursor-pointer disabled:opacity-50 mt-4"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Export Attendance (CSV)
                        </button>
                    </div>

                    {/* Card 2: Project Performance */}
                    <div className="bg-white border border-blue-100/60 rounded-3xl p-6 shadow-xl shadow-blue-100/10 flex flex-col justify-between h-[360px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <CheckSquare className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-gray-800">Project Performance Report</h2>
                            </div>
                            <p className="text-xs text-gray-400 font-medium mb-6">Retrieve milestones, epic status counts, and completed sprint velocities.</p>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-455 uppercase mb-1">Select Project</label>
                                <select
                                    value={projectSelected}
                                    onChange={(e) => setProjectSelected(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none font-semibold text-gray-700"
                                >
                                    <option value="">Select Project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleExportProject}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold text-xs rounded-2xl hover:shadow-lg hover:shadow-indigo-500/20 transition cursor-pointer mt-4"
                        >
                            <Download className="w-4 h-4" />
                            Export Project Metrics (CSV)
                        </button>
                    </div>

                    {/* Card 3: Team Roster Summary */}
                    <div className="bg-white border border-blue-100/60 rounded-3xl p-6 shadow-xl shadow-blue-100/10 flex flex-col justify-between h-[360px]">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-gray-800">Team Squad Statistics</h2>
                            </div>
                            <p className="text-xs text-gray-400 font-medium mb-6">Export headcount breakdown, division structure, and squad leader assignments.</p>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-455 uppercase mb-1">Select Team</label>
                                <select
                                    value={teamSelected}
                                    onChange={(e) => setTeamSelected(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none font-semibold text-gray-700"
                                >
                                    <option value="">Select Team...</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleExportTeam}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl hover:shadow-lg hover:shadow-emerald-500/20 transition cursor-pointer mt-4"
                        >
                            <Download className="w-4 h-4" />
                            Export Team Metrics (CSV)
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
