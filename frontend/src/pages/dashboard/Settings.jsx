import React, { useState, useEffect } from 'react';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Switch } from '../../components/ui/Switch.jsx'; // Switch is visual only for now
import { User, Shield, Bell } from 'lucide-react';
import { userService } from '../../services/user.js';
import { useAuth } from '../../lib/auth.jsx';
import { API_ORIGIN } from '../../lib/api.js';

export default function Settings() {
  const { refreshUser } = useAuth();
  const [profileData, setProfileData] = useState({ email: '' });
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  ];

  useEffect(() => {
      const fetchProfile = async () => {
          try {
              const u = await userService.getProfile();
              setProfileData({ email: u.email, full_name: u.full_name, avatar_url: u.avatar_url });
          } catch (err) {
              console.error(err);
          }
      };
      fetchProfile();
  }, []);

  const handleProfileUpdate = async (e) => {
      e.preventDefault();
      setMessage({ type: '', text: '' });
      try {
          await userService.updateProfile({ 
              email: profileData.email,
              full_name: profileData.full_name
          });
          await refreshUser();
          setMessage({ type: 'success', text: 'Profile updated successfully.' });
      } catch (err) {
          setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile.' });
      }
  };

  const handleAvatarChange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
          setMessage({ type: 'error', text: 'File too large. Maximum size is 5MB.' });
          return;
      }

      setMessage({ type: '', text: '' });
      try {
          const formData = new FormData();
          formData.append('file', file);
          
          await userService.uploadAvatar(formData);
          await refreshUser();
          
          // Update local state to show new avatar immediately
          const updatedProfile = await userService.getProfile();
          setProfileData({ ...profileData, avatar_url: updatedProfile.avatar_url });
          
          setMessage({ type: 'success', text: 'Avatar updated successfully.' });
      } catch (err) {
          setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to upload avatar.' });
      }
  };

  const handlePasswordChange = async (e) => {
      e.preventDefault();
      setMessage({ type: '', text: '' });
      if (passwordData.new_password !== passwordData.confirm_password) {
          setMessage({ type: 'error', text: "New passwords don't match." });
          return;
      }
      try {
          await userService.changePassword({ 
              old_password: passwordData.old_password, 
              new_password: passwordData.new_password 
          });
          setMessage({ type: 'success', text: 'Password changed successfully.' });
          setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      } catch (err) {
          setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to change password.' });
      }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-display">Settings</h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">Manage your account preferences and settings.</p>
      </div>

      {message.text && (
          <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {message.text}
          </div>
      )}

      <Tabs tabs={tabs} defaultTab="profile">
        {(activeTab) => (
          <>
            {activeTab === 'profile' && (
              <div className="grid gap-6">
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 mb-8">
                      <div className="relative">
                        {profileData.avatar_url ? (
                          <img 
                            src={`${API_ORIGIN}${profileData.avatar_url}`}
                            alt="Avatar"
                            className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            {profileData.full_name?.[0]?.toUpperCase() || profileData.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          id="avatar-upload"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleAvatarChange}
                        />
                        <Button 
                          variant="outline" 
                          className="border-zinc-700 text-white hover:bg-zinc-800"
                          onClick={() => document.getElementById('avatar-upload').click()}
                        >
                          Change Avatar
                        </Button>
                      </div>
                    </div>
                    
                    <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Email Address</label>
                            <Input 
                                value={profileData.email} 
                                onChange={e => setProfileData({...profileData, email: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Full Name</label>
                            <Input 
                                value={profileData.full_name || ''} 
                                onChange={e => setProfileData({...profileData, full_name: e.target.value})}
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div className="pt-4">
                            <Button variant="gradient" type="submit">Save Changes</Button>
                        </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'notifications' && (
              <Card className="bg-zinc-900/40 border-white/5">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose what updates you want to receive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-medium text-white">Email Notifications</h4>
                      <p className="text-sm text-zinc-400">Receive daily summaries and alerts via email.</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="bg-zinc-900/40 border-white/5">
                <CardHeader>
                   <CardTitle>Security</CardTitle>
                   <CardDescription>Manage your password and security settings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Current Password</label>
                            <Input 
                                type="password" 
                                required
                                value={passwordData.old_password}
                                onChange={e => setPasswordData({...passwordData, old_password: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">New Password</label>
                            <Input 
                                type="password" 
                                required
                                value={passwordData.new_password}
                                onChange={e => setPasswordData({...passwordData, new_password: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Confirm New Password</label>
                            <Input 
                                type="password" 
                                required
                                value={passwordData.confirm_password}
                                onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})}
                            />
                        </div>
                         <div className="pt-4">
                          <Button variant="gradient" type="submit">Update Password</Button>
                        </div>
                    </form>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
