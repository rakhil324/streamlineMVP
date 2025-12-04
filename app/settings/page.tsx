'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader2, AlertCircle, CheckCircle, Bell, Moon, Mail, Shield, Trash2, LogOut } from 'lucide-react';
import { UserProfile } from '@/lib/profileTypes';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Preferences state
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [applicationUpdates, setApplicationUpdates] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

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
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [session, status, router]);

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }

    try {
      await fetch('/api/profile', { method: 'DELETE' });
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
      <div className="space-y-6 max-w-2xl">
        {/* Success/Error Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Appearance */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Moon className="w-5 h-5 text-textPrimary" />
            <h3 className="text-lg font-semibold text-textPrimary">Appearance</h3>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="font-medium text-textPrimary">Dark Mode</h4>
              <p className="text-sm text-textSecondary">Use dark theme throughout the app</p>
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
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-textPrimary" />
            <h3 className="text-lg font-semibold text-textPrimary">Notifications</h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h4 className="font-medium text-textPrimary">Email Notifications</h4>
                <p className="text-sm text-textSecondary">Receive email updates</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailNotifications ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h4 className="font-medium text-textPrimary">Application Updates</h4>
                <p className="text-sm text-textSecondary">Get notified when application status changes</p>
              </div>
              <button
                onClick={() => setApplicationUpdates(!applicationUpdates)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  applicationUpdates ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    applicationUpdates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="font-medium text-textPrimary">Weekly Summary</h4>
                <p className="text-sm text-textSecondary">Receive a weekly job search summary</p>
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

        {/* Account */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-textPrimary" />
            <h3 className="text-lg font-semibold text-textPrimary">Account</h3>
          </div>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between py-2">
              <span className="text-textSecondary">Email</span>
              <span className="text-textPrimary font-medium">{session?.user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-textSecondary">Profile Status</span>
              <span className={`font-medium ${profile?.onboardingCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                {profile?.onboardingCompleted ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-textSecondary">Last Updated</span>
              <span className="text-textPrimary">
                {profile?.lastUpdated 
                  ? new Date(profile.lastUpdated).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50/30">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
          </div>
          <p className="text-sm text-textSecondary mb-4">
            Once you delete your account, there is no going back. All your data will be permanently removed.
          </p>
          <Button 
            variant="outline" 
            className="border-red-300 text-red-600 hover:bg-red-100"
            onClick={handleDeleteAccount}
          >
            Delete My Account
          </Button>
        </Card>
      </div>
    </MainLayout>
  );
}
