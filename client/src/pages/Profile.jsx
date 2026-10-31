import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateProfileThunk } from '../redux/slices/authSlice.js';
import { addToast } from '../redux/slices/uiSlice.js';
import authService from '../services/authService.js';
import { formatDate } from '../utils/format.js';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { User, Lock, Activity, ShieldCheck } from 'lucide-react';

export function Profile() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // Account Stats
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
    // Fetch account stats
    authService
      .getAccountStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, [user]);

  // Update Profile Name & Email
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setUpdatingProfile(true);
    try {
      await dispatch(
        updateProfileThunk({
          name: name.trim(),
          email: email.trim().toLowerCase()
        })
      ).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: 'Profile information updated successfully!'
        })
      );
    } catch (err) {
      setProfileError(String(err) || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword
      });

      dispatch(
        addToast({
          type: 'success',
          message: 'Password changed successfully!'
        })
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || 'Failed to update password. Verify your current password.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Account & Security</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your profile identity, authentication credentials, and ledger metadata
        </p>
      </div>

      {/* Account Statistics Banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm text-center">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Member Since</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {stats.createdAt ? formatDate(stats.createdAt) : '2026'}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Transactions</span>
            <p className="text-sm font-bold text-indigo-600 mt-0.5">
              {stats.transactionCount || 0}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Learned Memory Rules</span>
            <p className="text-sm font-bold text-teal-600 mt-0.5">
              {stats.memoryCount || 0}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Security</span>
            <p className="text-sm font-bold text-emerald-600 mt-0.5 flex items-center justify-center gap-1">
              <ShieldCheck className="h-4 w-4" /> JWT Auth
            </p>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Personal Identity</h3>
        </div>

        <ErrorBanner message={profileError} />

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
          <Input
            label="Full Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" size="md" loading={updatingProfile}>
            Update Profile
          </Button>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Lock className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Change Password</h3>
        </div>

        <ErrorBanner message={passwordError} />

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <Input
            label="Current Password"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="New Password (min 8 characters)"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" size="md" loading={changingPassword}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Profile;

