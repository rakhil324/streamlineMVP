'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserProfile, 
  defaultProfile, 
  ONBOARDING_STEPS, 
  STEP_TITLES,
  OnboardingStep 
} from '@/lib/profileTypes';
import StepIndicator from './components/StepIndicator';
import PersonalInfoStep from './components/PersonalInfoStep';
import WorkAuthStep from './components/WorkAuthStep';
import EducationStep from './components/EducationStep';
import ExperienceStep from './components/ExperienceStep';
import SkillsStep from './components/SkillsStep';
import PreferencesStep from './components/PreferencesStep';
import { Loader2, CheckCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const currentStep = ONBOARDING_STEPS[currentStepIndex];

  // Load existing profile data
  useEffect(() => {
    async function loadProfile() {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.profileData) {
            setProfile({ ...defaultProfile, ...data.profileData });
            
            // If onboarding is already completed, redirect to dashboard
            if (data.profileData.onboardingCompleted) {
              router.push('/');
              return;
            }
          }
        }
        
        // Pre-fill email from session
        if (session.user?.email) {
          setProfile(prev => ({ ...prev, email: session.user?.email || '' }));
        }
        if (session.user?.name) {
          const nameParts = session.user.name.split(' ');
          setProfile(prev => ({
            ...prev,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
          }));
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [session, status, router]);

  // Update profile data
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  // Navigate to next step
  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  // Navigate to previous step
  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Save and complete onboarding
  const handleComplete = async () => {
    setIsSaving(true);
    setError('');

    try {
      const finalProfile: UserProfile = {
        ...profile,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: finalProfile }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      // Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Skip onboarding (can complete later)
  const handleSkip = async () => {
    setIsSaving(true);
    
    try {
      const partialProfile: UserProfile = {
        ...profile,
        onboardingCompleted: false,
        lastUpdated: new Date().toISOString(),
      };

      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: partialProfile }),
      });

      router.push('/');
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Render current step component
  const renderStep = () => {
    const props = {
      profile,
      updateProfile,
      onNext: handleNext,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 'personal':
        return <PersonalInfoStep {...props} />;
      case 'work-auth':
        return <WorkAuthStep {...props} />;
      case 'education':
        return <EducationStep {...props} />;
      case 'experience':
        return <ExperienceStep {...props} />;
      case 'skills':
        return <SkillsStep {...props} />;
      case 'preferences':
        return (
          <PreferencesStep 
            {...props} 
            onComplete={handleComplete}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            This information will be used to autofill your job applications
          </p>
        </div>

        {/* Progress Indicator */}
        <StepIndicator
          steps={ONBOARDING_STEPS}
          currentStep={currentStepIndex}
          stepTitles={STEP_TITLES}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Skip Link */}
        <div className="text-center mt-6">
          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip for now (complete later in settings)
          </button>
        </div>
      </div>
    </div>
  );
}

