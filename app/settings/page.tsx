'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [formData, setFormData] = useState({
    name: 'Hriday Sainathuni',
    email: 'hriday@streamline.ai',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings saved!');
  };

  return (
    <MainLayout title="Settings">
      <div className="space-y-6 max-w-3xl">
        {/* Profile Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-6">Profile</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-textPrimary mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-textPrimary mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">
                Resume
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="block w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
                />
                <Button variant="outline" size="sm">
                  Upload New
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
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
              <input
                type="checkbox"
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <h3 className="text-lg font-semibold text-red-600 mb-6">Danger Zone</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-textPrimary mb-1">Delete Account</h4>
              <p className="text-sm text-textSecondary mb-3">
                Permanently delete your account and all associated data.
              </p>
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

