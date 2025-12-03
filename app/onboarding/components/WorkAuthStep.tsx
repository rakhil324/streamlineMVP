'use client';

import React from 'react';
import { UserProfile } from '@/lib/profileTypes';
import { Shield, ArrowRight, ArrowLeft } from 'lucide-react';

interface WorkAuthStepProps {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function WorkAuthStep({
  profile,
  updateProfile,
  onNext,
  onBack,
}: WorkAuthStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const updateWorkAuth = (field: string, value: boolean | string) => {
    updateProfile({
      workAuthorization: { ...profile.workAuthorization, [field]: value },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Work Authorization
        </h2>
        <p className="text-sm text-gray-500">
          This information is commonly asked on job applications
        </p>
      </div>

      {/* Authorized to Work */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-3">
              Are you legally authorized to work in the United States?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="authorizedToWork"
                  checked={profile.workAuthorization.authorizedToWork === true}
                  onChange={() => updateWorkAuth('authorizedToWork', true)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="authorizedToWork"
                  checked={profile.workAuthorization.authorizedToWork === false}
                  onChange={() => updateWorkAuth('authorizedToWork', false)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-700">No</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Requires Sponsorship */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-3">
              Will you now or in the future require sponsorship for employment visa status?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="requiresSponsorship"
                  checked={profile.workAuthorization.requiresSponsorship === true}
                  onChange={() => updateWorkAuth('requiresSponsorship', true)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="requiresSponsorship"
                  checked={profile.workAuthorization.requiresSponsorship === false}
                  onChange={() => updateWorkAuth('requiresSponsorship', false)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-700">No</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Citizenship Status (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Citizenship/Immigration Status (Optional)
        </label>
        <select
          value={profile.workAuthorization.citizenshipStatus || ''}
          onChange={(e) => updateWorkAuth('citizenshipStatus', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Prefer not to say</option>
          <option value="citizen">U.S. Citizen</option>
          <option value="permanent_resident">Permanent Resident (Green Card)</option>
          <option value="h1b">H-1B Visa</option>
          <option value="opt">OPT (F-1 Visa)</option>
          <option value="ead">Employment Authorization Document (EAD)</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Why we ask:</strong> Many job applications require this information. 
          Your responses help us autofill these fields accurately on your behalf.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-colors"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

