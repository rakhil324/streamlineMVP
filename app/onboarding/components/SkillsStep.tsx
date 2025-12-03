'use client';

import React, { useState } from 'react';
import { UserProfile, COMMON_SKILLS } from '@/lib/profileTypes';
import { Wrench, X, Plus, ArrowRight, ArrowLeft } from 'lucide-react';

interface SkillsStepProps {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SkillsStep({
  profile,
  updateProfile,
  onNext,
  onBack,
}: SkillsStepProps) {
  const [skillInput, setSkillInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');
  const [certInput, setCertInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  // Skills
  const addSkill = (skill: string) => {
    if (skill.trim() && !profile.skills.includes(skill.trim())) {
      updateProfile({ skills: [...profile.skills, skill.trim()] });
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    updateProfile({ skills: profile.skills.filter((s) => s !== skill) });
  };

  // Languages
  const addLanguage = () => {
    if (languageInput.trim() && !profile.languages.includes(languageInput.trim())) {
      updateProfile({ languages: [...profile.languages, languageInput.trim()] });
    }
    setLanguageInput('');
  };

  const removeLanguage = (lang: string) => {
    updateProfile({ languages: profile.languages.filter((l) => l !== lang) });
  };

  // Certifications
  const addCertification = () => {
    if (certInput.trim() && !profile.certifications.includes(certInput.trim())) {
      updateProfile({ certifications: [...profile.certifications, certInput.trim()] });
    }
    setCertInput('');
  };

  const removeCertification = (cert: string) => {
    updateProfile({ certifications: profile.certifications.filter((c) => c !== cert) });
  };

  // Suggested skills that aren't already added
  const suggestedSkills = COMMON_SKILLS.filter(
    (skill) => !profile.skills.includes(skill)
  ).slice(0, 12);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Skills & Languages
        </h2>
        <p className="text-sm text-gray-500">
          Add your technical skills, languages, and certifications
        </p>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Wrench className="inline w-4 h-4 mr-1" />
          Skills
        </label>
        
        {/* Skills Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill(skillInput);
              }
            }}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Type a skill and press Enter"
          />
          <button
            type="button"
            onClick={() => addSkill(skillInput)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Added Skills */}
        {profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggested Skills */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Click to add:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:border-indigo-500 hover:text-indigo-600 transition-colors"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Languages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Languages Spoken
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLanguage();
              }
            }}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., English, Spanish"
          />
          <button
            type="button"
            onClick={addLanguage}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {profile.languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => removeLanguage(lang)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Certifications (Optional)
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCertification();
              }
            }}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., AWS Solutions Architect"
          />
          <button
            type="button"
            onClick={addCertification}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {profile.certifications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.certifications.map((cert) => (
              <span
                key={cert}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                {cert}
                <button
                  type="button"
                  onClick={() => removeCertification(cert)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}
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

