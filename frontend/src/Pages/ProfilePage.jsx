import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, CheckCircle, X, Camera, Edit2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUserProfile, sendVerificationEmail, verifyEmailToken, updateUserName, updateUserPassword, updateUserAvatar, updateUserProfile, getDepartments, toggle2Fa } from '../Services/authApi';
import { uploadFile } from '../Services/uploadApi';


const ProfilePage = () => {
    const { user, logout, login } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [editData, setEditData] = useState({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [verifyEmail, setVerifyEmail] = useState('');
    const [verifyTokenInput, setVerifyTokenInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isVerifyingToken, setIsVerifyingToken] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);

    // track if a verification link was sent and any preview url returned by backend
    const [linkSent, setLinkSent] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Fetch user profile and departments
    useEffect(() => {
        const fetchProfileAndDepartments = async () => {
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
            } catch (err) {
                console.error('Error fetching profile or departments:', err);
                toast.error('Failed to load profile settings');
            } finally {
                setLoading(false);
            }
        };
        fetchProfileAndDepartments();
    }, []);

    const getRoleBadge = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm uppercase tracking-wider">
                        🛡️ Admin
                    </span>
                );
            case 'manager':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm uppercase tracking-wider">
                        💼 Manager
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm uppercase tracking-wider">
                        👤 Employee
                    </span>
                );
        }
    };

    const getDepartmentName = (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        return dept ? dept.name : 'Not Assigned';
    };

    const handleToggle2Fa = async (e) => {
        const checked = e.target.checked;
        const toastId = toast.loading(`${checked ? 'Enabling' : 'Disabling'} 2FA...`);
        try {
            const res = await toggle2Fa(checked);
            setProfileData((prev) => ({ ...prev, is2faEnabled: res.is2faEnabled }));
            setEditData((prev) => ({ ...prev, is2faEnabled: res.is2faEnabled }));
            if (login) {
                login({ ...user, is2faEnabled: res.is2faEnabled });
            }
            toast.success(res.message || `2FA ${checked ? 'enabled' : 'disabled'} successfully`, { id: toastId });
        } catch (err) {
            console.error('Toggle 2FA error:', err);
            toast.error(err?.response?.data?.message || 'Failed to toggle 2FA', { id: toastId });
        }
    };

    const handleProfileImageChange = async (e) => {
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

        try {
            const toastId = toast.loading('Uploading photo...');
            const res = await uploadFile(file, 'avatars');
            const fileUrlWithId = `${res.url}#${res.fileId}`;
            
            const updated = await updateUserAvatar({ avatarUrl: fileUrlWithId });
            setProfileImage(res.url);
            
            if (login) login(updated);
            toast.success('Profile photo updated successfully!', { id: toastId });
        } catch (err) {
            console.error('Profile photo upload error:', err);
            toast.error('Failed to upload image');
        }
    };

    const handleEditProfile = async () => {
        if (!editData?.name || editData.name.trim().length === 0) {
            return toast.error('Name cannot be empty');
        }

        try {
            setIsSaving(true);
            const res = await updateUserProfile({
                name: editData.name.trim(),
                position: editData.position || null,
                phone: editData.phone || null,
                departmentId: editData.departmentId || null
            });

            const updatedUser = res.user;

            setProfileData(updatedUser);
            setEditData(updatedUser);
            setEditingProfile(false);

            if (login) login(updatedUser);
            toast.success('Profile updated successfully');
        } catch (err) {
            console.error('Update profile error:', err);
            toast.error(err?.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error('Please fill all fields');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }

        try {
            setIsChanging(true);
            const res = await updateUserPassword({ currentPassword: passwordData.oldPassword, newPassword: passwordData.newPassword });
            toast.success(res?.message || 'Password changed successfully');
            setShowPasswordModal(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            console.error('Change password error:', err);
            toast.error(err?.response?.data?.message || 'Failed to change password');
        } finally {
            setIsChanging(false);
        }
    };

    const handleVerifyEmail = async () => {
        try {
            setIsSending(true);
            const res = await sendVerificationEmail();
            // keep the modal open so user can paste token without reopening
            toast.success(res?.message || 'Verification email sent');
            setLinkSent(true);
            setPreviewUrl(res?.previewUrl || null);
            // refresh profile (still useful), but do not close the modal
            const updated = await getUserProfile();
            setProfileData(updated);
        } catch (err) {
            console.error('Send verification error:', err);
            toast.error(err?.response?.data?.message || 'Failed to send verification email');
        } finally {
            setIsSending(false);
        }
    };

    const handleVerifyToken = async () => {
        if (!verifyTokenInput) return toast.error('Please enter the verification token');
        try {
            setIsVerifyingToken(true);
            const res = await verifyEmailToken({ email: profileData.email, token: verifyTokenInput });
            toast.success(res?.message || 'Email verified');
            setShowVerifyModal(false);
            setVerifyTokenInput('');
            const updated = await getUserProfile();
            setProfileData(updated);
        } catch (err) {
            console.error('Token verification error:', err);
            toast.error(err?.response?.data?.message || 'Verification failed');
        } finally {
            setIsVerifyingToken(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user || !profileData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800 mb-2">You are not logged in</p>
                    <p className="text-gray-600">Please login to view your profile</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">My Profile</h1>
                    <p className="text-gray-600">Manage your account information and settings</p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 mb-8">
                    {/* Profile Content */}
                    <div className="p-8">
                        {/* Avatar Section */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8">
                            {/* Profile Photo */}
                            <div className="relative group">
                                <div className="w-40 h-40 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center text-white text-6xl font-bold shadow-2xl border-4 border-white overflow-hidden">
                                    {profileImage ? (
                                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        profileData?.name?.charAt(0).toUpperCase() || 'U'
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfileImageChange}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <Camera className="w-8 h-8 text-white" />
                                        <span className="text-sm text-white font-semibold">Change Photo</span>
                                    </div>
                                </label>
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 text-center sm:text-left">
                                {editingProfile ? (
                                    <div className="space-y-4 w-full sm:max-w-md">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={editData.name || ''}
                                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg font-semibold"
                                                placeholder="Full Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Job Title</label>
                                            <input
                                                type="text"
                                                value={editData.position || ''}
                                                onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg font-semibold"
                                                placeholder="e.g. Lead Developer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                                            <input
                                                type="text"
                                                value={editData.phone || ''}
                                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg font-semibold"
                                                placeholder="e.g. +1 (555) 123-4567"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                                            <select
                                                value={editData.departmentId || ''}
                                                onChange={(e) => setEditData({ ...editData, departmentId: e.target.value ? parseInt(e.target.value, 10) : null })}
                                                className="w-full px-4 py-2 border-2 border-gray-300 bg-white rounded-xl focus:outline-none focus:border-blue-500 text-lg font-semibold"
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                                            <h2 className="text-4xl font-bold text-gray-800">{profileData?.name}</h2>
                                            {getRoleBadge(profileData?.role)}
                                        </div>
                                        {profileData?.position && (
                                            <p className="text-lg font-semibold text-gray-500 mb-3 text-center sm:text-left">
                                                {profileData.position}
                                            </p>
                                        )}
                                        <p className="text-gray-600 flex items-center justify-center sm:justify-start gap-2 text-lg">
                                            <Mail className="w-5 h-5" />
                                            {profileData?.email}
                                            {profileData?.isEmailVerified ? (
                                                <span className="ml-3 inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                    <CheckCircle className="w-4 h-4" /> Verified
                                                </span>
                                            ) : (
                                                <span className="ml-3 inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                                                    <span className="font-semibold">Not Verified</span>
                                                </span>
                                            )}
                                        </p>
                                    </>
                                )}

                                {/* Info Grid */}
                                {!editingProfile && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                                        <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-100 shadow-sm">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Department</p>
                                            <p className="font-bold text-gray-800 mt-1 text-base">{getDepartmentName(profileData?.departmentId)}</p>
                                        </div>
                                        <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-100 shadow-sm">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Phone Number</p>
                                            <p className="font-bold text-gray-800 mt-1 text-base">{profileData?.phone || 'Not Provided'}</p>
                                        </div>
                                        <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-100 shadow-sm">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Account Role</p>
                                            <p className="font-bold text-gray-800 mt-1 text-base capitalize">{profileData?.role}</p>
                                        </div>
                                        <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-100 shadow-sm">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Member Since</p>
                                            <p className="font-bold text-gray-800 mt-1 text-base">{profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200">
                            {editingProfile ? (
                                <>
                                    <button
                                        onClick={() => setEditingProfile(false)}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleEditProfile}
                                        disabled={isSaving}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                    >
                                        <Save className="w-5 h-5" />
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setEditingProfile(true)}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={() => setShowPasswordModal(true)}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        <Lock className="w-5 h-5" />
                                        Change Password
                                    </button>
                                    {!profileData?.isEmailVerified && (
                                        <button
                                            onClick={() => { setShowVerifyModal(true); setLinkSent(false); setPreviewUrl(null); setVerifyTokenInput(''); }}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Verify Email
                                        </button>
                                    )}
                                    {profileData?.isEmailVerified && (
                                        <button
                                            disabled
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-300 text-gray-600 font-semibold rounded-xl transition-all"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Verified
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Info Card */}
                {!editingProfile && (
                    <div className="space-y-8">
                        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Account Information</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                    <span className="text-gray-600 font-medium">Full Name</span>
                                    <span className="font-semibold text-gray-800">{profileData?.name}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                    <span className="text-gray-600 font-medium">Email Address</span>
                                    <span className="font-semibold text-gray-800">{profileData?.email}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                    <span className="text-gray-600 font-medium">Department</span>
                                    <span className="font-semibold text-gray-800">{getDepartmentName(profileData?.departmentId)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                    <span className="text-gray-600 font-medium">Job Title</span>
                                    <span className="font-semibold text-gray-800">{profileData?.position || 'Not Set'}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                    <span className="text-gray-600 font-medium">Phone Number</span>
                                    <span className="font-semibold text-gray-800">{profileData?.phone || 'Not Set'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Joined Date</span>
                                    <span className="font-semibold text-gray-800">{profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Security & 2FA Card */}
                        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Security & Two-Factor Auth (2FA)</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Two-factor authentication adds an extra layer of security to your account by requiring an OTP code sent to your email during login.
                            </p>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
                                <div>
                                    <span className="font-bold text-gray-800 block text-base">Two-Factor Authentication</span>
                                    <span className="text-xs text-gray-500 font-medium">
                                        {profileData?.is2faEnabled ? '2FA is currently active on your account' : 'Enable 2FA for extra login security'}
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!profileData?.is2faEnabled}
                                        onChange={handleToggle2Fa}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Lock className="w-6 h-6 text-blue-600" />
                                Change Password
                            </h2>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.oldPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition"
                                    placeholder="Enter current password"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition"
                                    placeholder="Enter new password"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition"
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChanging}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                                >
                                    {isChanging ? 'Changing...' : 'Change'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Verify Email Modal */}
            {showVerifyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                Verify Email
                            </h2>
                            <button
                                onClick={() => setShowVerifyModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <p className="text-gray-600 mb-6">Enter your email address to receive a verification link</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                {profileData?.email ? (
                                    <div className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800">{profileData.email}</div>
                                ) : (
                                    <input
                                        type="email"
                                        value={verifyEmail}
                                        onChange={(e) => setVerifyEmail(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                                        placeholder="you@example.com"
                                    />
                                )}
                            </div>

                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                                {linkSent ? (
                                    <>
                                        <p className="text-sm text-blue-800 font-semibold">✅ Verification link sent. Check your inbox or spam folder.</p>
                                        {previewUrl && (
                                            <p className="text-sm mt-2">
                                                Preview URL (dev): <a className="text-indigo-600 underline" href={previewUrl} target="_blank" rel="noreferrer">Open preview</a>
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-blue-800">
                                        ℹ️ We'll send you a verification link to confirm your email address. Check your inbox or spam folder.
                                    </p>
                                )}

                                <div className="space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Have a token? Enter it here</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={verifyTokenInput}
                                            onChange={(e) => setVerifyTokenInput(e.target.value)}
                                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                                            placeholder="Enter token"
                                        />
                                        <button
                                            onClick={handleVerifyToken}
                                            disabled={isVerifyingToken}
                                            className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50"
                                        >
                                            {isVerifyingToken ? 'Verifying...' : 'Verify Token'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowVerifyModal(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleVerifyEmail}
                                        disabled={isSending}
                                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold disabled:opacity-50"
                                    >
                                        {isSending ? 'Sending...' : (linkSent ? 'Resend Link' : 'Send Link')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;