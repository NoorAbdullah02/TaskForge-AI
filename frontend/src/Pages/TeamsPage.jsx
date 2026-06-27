import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, Trash2, Edit2, Shield, UserCheck, X, Building, 
    Search, Loader2, Award, Briefcase, ChevronRight, BarChart2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { getTeams, createTeam, updateTeam, deleteTeam, getTeamMembers, addTeamMember, removeTeamMember } from '../Services/agileApi';
import { getAdminDepartments, getAdminUsers } from '../Services/adminApi';

export default function TeamsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin';
    const isManager = user?.role === 'manager';

    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [usersList, setUsersList] = useState([]);

    // Selection
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Modals
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamForm, setTeamForm] = useState({ name: '', description: '', leaderId: '', departmentId: '' });
    const [submittingTeam, setSubmittingTeam] = useState(false);

    const [memberSearch, setMemberSearch] = useState('');
    const [selectedNewMember, setSelectedNewMember] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const teamsData = await getTeams();
            setTeams(teamsData);

            const deptsData = await getAdminDepartments();
            setDepartments(deptsData);

            const usersData = await getAdminUsers();
            setUsersList(usersData);

            if (teamsData.length > 0 && !selectedTeam) {
                handleSelectTeam(teamsData[0]);
            }
        } catch (error) {
            console.error('Failed to load teams data:', error);
            toast.error('Failed to load teams data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSelectTeam = async (team) => {
        setSelectedTeam(team);
        setLoadingMembers(true);
        try {
            const members = await getTeamMembers(team.id);
            setSelectedTeamMembers(members);
        } catch (error) {
            console.error('Failed to load team members:', error);
            toast.error('Failed to load team members');
        } finally {
            setLoadingMembers(false);
        }
    };

    const openTeamModal = (team = null) => {
        if (!isAdmin && !isManager) {
            toast.error('Unauthorized');
            return;
        }
        if (team) {
            setEditingTeam(team);
            setTeamForm({
                name: team.name,
                description: team.description || '',
                leaderId: team.leaderId || '',
                departmentId: team.departmentId || ''
            });
        } else {
            setEditingTeam(null);
            setTeamForm({ name: '', description: '', leaderId: '', departmentId: '' });
        }
        setTeamModalOpen(true);
    };

    const handleTeamSubmit = async (e) => {
        e.preventDefault();
        if (!teamForm.name.trim()) {
            toast.error('Team name is required');
            return;
        }

        setSubmittingTeam(true);
        try {
            const body = {
                name: teamForm.name.trim(),
                description: teamForm.description,
                leaderId: teamForm.leaderId ? parseInt(teamForm.leaderId, 10) : null,
                departmentId: teamForm.departmentId ? parseInt(teamForm.departmentId, 10) : null
            };

            if (editingTeam) {
                await updateTeam(editingTeam.id, body);
                toast.success('Team updated successfully');
            } else {
                await createTeam(body);
                toast.success('Team created successfully');
            }
            setTeamModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Team write failed:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmittingTeam(false);
        }
    };

    const handleDeleteTeam = async (id, name) => {
        if (!isAdmin) {
            toast.error('Only administrators can delete teams');
            return;
        }
        if (!confirm(`Are you sure you want to delete the team "${name}"?`)) {
            return;
        }

        try {
            await deleteTeam(id);
            toast.success('Team deleted successfully');
            setSelectedTeam(null);
            loadData();
        } catch (error) {
            console.error('Team deletion failed:', error);
            toast.error('Failed to delete team');
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!selectedTeam) return;
        if (!selectedNewMember) {
            toast.error('Please select an employee');
            return;
        }

        try {
            await addTeamMember(selectedTeam.id, selectedNewMember);
            toast.success('Member assigned to team');
            setSelectedNewMember('');
            handleSelectTeam(selectedTeam);
            // Refresh counts in list
            const updatedTeams = await getTeams();
            setTeams(updatedTeams);
            const teamRefreshed = updatedTeams.find(t => t.id === selectedTeam.id);
            if (teamRefreshed) setSelectedTeam(teamRefreshed);
        } catch (error) {
            console.error('Failed to add member:', error);
            toast.error('Failed to add member to team');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!selectedTeam) return;
        if (!confirm('Are you sure you want to remove this employee from the team?')) {
            return;
        }

        try {
            await removeTeamMember(selectedTeam.id, userId);
            toast.success('Member unassigned from team');
            handleSelectTeam(selectedTeam);
            // Refresh counts in list
            const updatedTeams = await getTeams();
            setTeams(updatedTeams);
            const teamRefreshed = updatedTeams.find(t => t.id === selectedTeam.id);
            if (teamRefreshed) setSelectedTeam(teamRefreshed);
        } catch (error) {
            console.error('Failed to remove member:', error);
            toast.error('Failed to remove member');
        }
    };

    // Filter out users that are already in the selected team
    const eligibleNewMembers = usersList.filter(u => 
        u.teamId !== selectedTeam?.id
    );

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-semibold animate-pulse">Loading Teams Management...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-gray-200/60 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600" />
                            Teams & Squads Management
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Divide departments into agile teams, designate team leaders, and coordinate project velocity.</p>
                    </div>
                    {(isAdmin || isManager) && (
                        <button
                            onClick={() => openTeamModal(null)}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Create New Team
                        </button>
                    )}
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Teams Directory List */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white border border-blue-100/60 rounded-3xl p-4 shadow-xl shadow-blue-100/10">
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 px-2">Active Squads ({teams.length})</h2>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {teams.map((t) => {
                                    const isSel = selectedTeam?.id === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => handleSelectTeam(t)}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                                                isSel 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                                : 'bg-white border-gray-100 text-gray-600 hover:bg-blue-50/50 hover:border-blue-100'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className={`font-bold text-sm ${isSel ? 'text-white' : 'text-gray-800'}`}>
                                                        {t.name}
                                                    </h3>
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${
                                                        isSel ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {t.departmentName}
                                                    </span>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 mt-0.5 ${isSel ? 'text-white' : 'text-gray-400'}`} />
                                            </div>
                                            
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-100/20 text-[11px]">
                                                <span className={`${isSel ? 'text-white/80' : 'text-gray-400'}`}>Leader</span>
                                                <span className="font-semibold">{t.leader ? t.leader.name : 'None'}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1 text-[11px]">
                                                <span className={`${isSel ? 'text-white/80' : 'text-gray-400'}`}>Members Count</span>
                                                <span className="font-bold">{t.memberCount} Employee{t.memberCount !== 1 ? 's' : ''}</span>
                                            </div>
                                        </button>
                                    );
                                })}

                                {teams.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 italic">
                                        No teams created yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Selected Team Management & Analytics */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedTeam ? (
                            <>
                                {/* Team Summary Card */}
                                <div className="bg-white border border-blue-100/60 rounded-3xl p-6 shadow-xl shadow-blue-100/10">
                                    <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">{selectedTeam.name}</h2>
                                            <p className="text-gray-500 text-xs mt-1 font-medium">{selectedTeam.description || 'No description provided.'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(isAdmin || isManager) && (
                                                <>
                                                    <button
                                                        onClick={() => openTeamModal(selectedTeam)}
                                                        className="p-2 border border-blue-100 hover:bg-blue-50 text-blue-600 rounded-xl transition cursor-pointer"
                                                        title="Edit Team"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleDeleteTeam(selectedTeam.id, selectedTeam.name)}
                                                            className="p-2 border border-red-100 hover:bg-red-50 text-red-600 rounded-xl transition cursor-pointer"
                                                            title="Delete Team"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="bg-blue-50/40 border border-blue-100/50 p-4 rounded-2xl flex items-center gap-3">
                                            <Award className="w-8 h-8 text-blue-600" />
                                            <div>
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase">Team Leader</span>
                                                <span className="font-extrabold text-sm text-gray-800">{selectedTeam.leader ? selectedTeam.leader.name : 'Unassigned'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-indigo-50/40 border border-indigo-100/50 p-4 rounded-2xl flex items-center gap-3">
                                            <Users className="w-8 h-8 text-indigo-600" />
                                            <div>
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase">Squad Members</span>
                                                <span className="font-extrabold text-sm text-gray-800">{selectedTeam.memberCount} Employee{selectedTeam.memberCount !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl flex items-center gap-3">
                                            <Building className="w-8 h-8 text-emerald-600" />
                                            <div>
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase">Department</span>
                                                <span className="font-extrabold text-sm text-gray-800">{selectedTeam.departmentName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Add Member section */}
                                    {(isAdmin || isManager) && (
                                        <form onSubmit={handleAddMember} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 mb-6">
                                            <div className="w-full flex-1">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign User to Squad</label>
                                                <select
                                                    value={selectedNewMember}
                                                    onChange={(e) => setSelectedNewMember(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-semibold"
                                                >
                                                    <option value="">Choose an employee...</option>
                                                    {eligibleNewMembers.map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name} - {u.position || 'No Title'} ({u.departmentName})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition cursor-pointer self-end"
                                            >
                                                Add to Team
                                            </button>
                                        </form>
                                    )}

                                    {/* Team Members List */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-blue-600" />
                                            Team Roster ({selectedTeamMembers.length})
                                        </h3>
                                        
                                        {loadingMembers ? (
                                            <div className="flex justify-center py-6">
                                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                                <table className="min-w-full divide-y divide-gray-100 text-xs">
                                                    <thead className="bg-gray-50/50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                                            <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Title / Position</th>
                                                            <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                                            {(isAdmin || isManager) && <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">Action</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
                                                        {selectedTeamMembers.map((m) => (
                                                            <tr key={m.id} className="hover:bg-blue-50/20 transition-colors">
                                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="w-8 h-8 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-xs overflow-hidden shadow-inner">
                                                                            {m.avatarUrl ? (
                                                                                <img src={m.avatarUrl.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                m.name?.charAt(0).toUpperCase()
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-bold text-gray-800">{m.name}</span>
                                                                            <span className="block text-[10px] text-gray-400">{m.email}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                                    <span className="font-medium">{m.position || <span className="text-gray-400 italic">None</span>}</span>
                                                                </td>
                                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                                        {m.role}
                                                                    </span>
                                                                </td>
                                                                {(isAdmin || isManager) && (
                                                                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                                                        <button
                                                                            onClick={() => handleRemoveMember(m.id)}
                                                                            className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition cursor-pointer"
                                                                            title="Remove from Team"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}

                                                        {selectedTeamMembers.length === 0 && (
                                                            <tr>
                                                                <td colSpan={(isAdmin || isManager) ? 4 : 3} className="px-6 py-8 text-center text-gray-400 italic">
                                                                    This team has no assigned members.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-16 text-center">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-700">Select a Squad</h3>
                                <p className="text-gray-400 text-xs mt-1">Choose a team from the squad directory list to view and coordinate roster details.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TEAM MODAL (CREATE / EDIT) */}
            {teamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all">
                    <div className="bg-white rounded-3xl border border-blue-100 shadow-2xl p-6 w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Users className="text-blue-600 w-5 h-5" />
                                {editingTeam ? 'Edit Squad Details' : 'Create Squad Team'}
                            </h3>
                            <button
                                onClick={() => setTeamModalOpen(false)}
                                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTeamSubmit} className="mt-4 space-y-4">
                            {/* Team Name */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Team Name</label>
                                <input
                                    type="text"
                                    required
                                    value={teamForm.name}
                                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                    placeholder="e.g. Agile Engineers, Design Syndicate"
                                    className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800 font-semibold"
                                />
                            </div>

                            {/* Team Description */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</label>
                                <textarea
                                    value={teamForm.description}
                                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                                    placeholder="Describe team mission or focus scope"
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Leader selection */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Squad Leader</label>
                                    <select
                                        value={teamForm.leaderId}
                                        onChange={(e) => setTeamForm({ ...teamForm, leaderId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-700 font-semibold"
                                    >
                                        <option value="">No Leader Assigned</option>
                                        {usersList.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Department selection */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department</label>
                                    <select
                                        value={teamForm.departmentId}
                                        onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-gray-700 font-semibold"
                                    >
                                        <option value="">No Department Assigned</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setTeamModalOpen(false)}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-2xl hover:bg-gray-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingTeam}
                                    className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
                                >
                                    {submittingTeam ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Squad'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
