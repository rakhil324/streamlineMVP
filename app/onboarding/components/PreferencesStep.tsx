'use client';

import React, { useState } from 'react';
import { 
  UserProfile, 
  JOB_TYPE_OPTIONS, 
  AVAILABILITY_OPTIONS,
  CURRENCY_OPTIONS 
} from '@/lib/profileTypes';
import { Target, X, Plus, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

interface PreferencesStepProps {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onBack: () => void;
  onComplete: () => void;
  isSaving: boolean;
}

export default function PreferencesStep({
  profile,
  updateProfile,
  onBack,
  onComplete,
  isSaving,
}: PreferencesStepProps) {
  const [titleInput, setTitleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete();
  };

  // Job Titles
  const addTitle = () => {
    if (titleInput.trim() && !profile.preferredTitles.includes(titleInput.trim())) {
      updateProfile({ preferredTitles: [...profile.preferredTitles, titleInput.trim()] });
    }
    setTitleInput('');
  };

  const removeTitle = (title: string) => {
    updateProfile({ preferredTitles: profile.preferredTitles.filter((t) => t !== title) });
  };

  // Locations
  const addLocation = () => {
    if (locationInput.trim() && !profile.preferredLocations.includes(locationInput.trim())) {
      updateProfile({ preferredLocations: [...profile.preferredLocations, locationInput.trim()] });
    }
    setLocationInput('');
  };

  const removeLocation = (loc: string) => {
    updateProfile({ preferredLocations: profile.preferredLocations.filter((l) => l !== loc) });
  };

  // Job Types
  const toggleJobType = (type: string) => {
    if (profile.preferredJobTypes.includes(type)) {
      updateProfile({ preferredJobTypes: profile.preferredJobTypes.filter((t) => t !== type) });
    } else {
      updateProfile({ preferredJobTypes: [...profile.preferredJobTypes, type] });
    }
  };

  // Salary
  const updateSalary = (field: string, value: string | number) => {
    updateProfile({
      salaryExpectation: {
        min: profile.salaryExpectation?.min || 0,
        max: profile.salaryExpectation?.max || 0,
        currency: profile.salaryExpectation?.currency || 'USD',
        [field]: value,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Job Preferences
        </h2>
        <p className="text-sm text-gray-500">
          Help us find the right opportunities for you
        </p>
      </div>

      {/* Preferred Job Titles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Target className="inline w-4 h-4 mr-1" />
          Preferred Job Titles
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTitle();
              }
            }}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Software Engineer, Product Manager"
          />
          <button
            type="button"
            onClick={addTitle}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {profile.preferredTitles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.preferredTitles.map((title) => (
              <span
                key={title}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
              >
                {title}
                <button
                  type="button"
                  onClick={() => removeTitle(title)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Preferred Locations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preferred Locations
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLocation();
              }
            }}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., San Francisco, Remote"
          />
          <button
            type="button"
            onClick={addLocation}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {profile.preferredLocations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.preferredLocations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {loc}
                <button
                  type="button"
                  onClick={() => removeLocation(loc)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Job Types */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Job Types (Select all that apply)
        </label>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPE_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleJobType(type)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                profile.preferredJobTypes.includes(type)
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Salary Expectations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Salary Expectations (Optional)
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <select
              value={profile.salaryExpectation?.currency || 'USD'}
              onChange={(e) => updateSalary('currency', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {CURRENCY_OPTIONS.map((curr) => (
                <option key={curr.value} value={curr.value}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="number"
              value={profile.salaryExpectation?.min || ''}
              onChange={(e) => updateSalary('min', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Min"
            />
          </div>
          <div>
            <input
              type="number"
              value={profile.salaryExpectation?.max || ''}
              onChange={(e) => updateSalary('max', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Max"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Annual salary range</p>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Availability
        </label>
        <select
          value={profile.availability || ''}
          onChange={(e) => updateProfile({ availability: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select your availability</option>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Success Message Box */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Almost done!</p>
            <p className="text-sm text-green-700">
              Click "Complete Setup" to save your profile and start using Streamline.ai
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Complete Setup
            </>
          )}
        </button>
      </div>
    </form>
  );
}

