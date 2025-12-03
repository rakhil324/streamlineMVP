'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader2, User, Mail, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { UserProfile } from '@/lib/profileTypes';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        
        if (data.profileData) {
          setProfile(data.profileData);
          setFormData({
            firstName: data.profileData.firstName || '',
            lastName: data.profileData.lastName || '',
            email: data.profileData.email || session?.user?.email || '',
            phone: data.profileData.phone || '',
          });
        } else {
          // Pre-fill from session
          setFormData({
            firstName: session?.user?.name?.split(' ')[0] || '',
            lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
            email: session?.user?.email || '',
            phone: '',
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [session, status, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedProfile: UserProfile = {
        ...profile,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        lastUpdated: new Date().toISOString(),
      } as UserProfile;

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: updatedProfile }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setProfile(updatedProfile);
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }

    try {
      // Delete profile
      await fetch('/api/profile', { method: 'DELETE' });
      
      // Sign out
      signOut({ callbackUrl: '/login' });
    } catch (err) {
      setError('Failed to delete account. Please try again.');
    }
  };

  if (isLoading || status === 'loading') {
    return (
      <MainLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Settings">
      <div className="space-y-6 max-w-3xl">
        {/* Success/Error Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Profile Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-6">Profile Settings</h3>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-textPrimary mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-textPrimary mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-textPrimary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-textPrimary mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Edit Full Profile Link */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Want to update your education, experience, or skills?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/onboarding')}
                  className="font-medium underline hover:no-underline"
                >
                  Edit your full profile
                </button>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (profile) {
                    setFormData({
                      firstName: profile.firstName || '',
                      lastName: profile.lastName || '',
                      email: profile.email || '',
                      phone: profile.phone || '',
                    });
                  }
                }}
              >
                Reset
              </Button>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Preferences Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-6">Preferences</h3>
          <div className="space-y-4">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between py-4 border-b border-gray-200">
              <div>
                <h4 className="font-medium text-textPrimary">Dark Mode</h4>
                <p className="text-sm text-textSecondary">Switch to dark theme</p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center justify-between py-4 border-b border-gray-200">
              <div>
                <h4 className="font-medium text-textPrimary">Email Notifications</h4>
                <p className="text-sm text-textSecondary">Receive notifications about your applications</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h4 className="font-medium text-textPrimary">Weekly Summary</h4>
                <p className="text-sm text-textSecondary">Get a weekly summary of your job search</p>
              </div>
              <button
                onClick={() => setWeeklySummary(!weeklySummary)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  weeklySummary ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    weeklySummary ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-textSecondary">Account Created</span>
              <span className="text-textPrimary">
                {session?.user?.email ? new Date().toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Profile Status</span>
              <span className={profile?.onboardingCompleted ? 'text-green-600' : 'text-yellow-600'}>
                {profile?.onboardingCompleted ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Last Updated</span>
              <span className="text-textPrimary">
                {profile?.lastUpdated 
                  ? new Date(profile.lastUpdated).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <h3 className="text-lg font-semibold text-red-600 mb-6">Danger Zone</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-textPrimary mb-1">Sign Out</h4>
              <p className="text-sm text-textSecondary mb-3">
                Sign out of your account on this device.
              </p>
              <Button 
                variant="outline" 
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                Sign Out
              </Button>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-textPrimary mb-1">Delete Account</h4>
              <p className="text-sm text-textSecondary mb-3">
                Permanently delete your account and all associated data.
              </p>
              <Button 
                variant="outline" 
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
