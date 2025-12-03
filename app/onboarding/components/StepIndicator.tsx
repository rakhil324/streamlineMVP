'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { OnboardingStep } from '@/lib/profileTypes';

interface StepIndicatorProps {
  steps: OnboardingStep[];
  currentStep: number;
  stepTitles: Record<OnboardingStep, string>;
}

export default function StepIndicator({ 
  steps, 
  currentStep, 
  stepTitles 
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Mobile: Simple progress bar */}
      <div className="sm:hidden mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {stepTitles[steps[currentStep]]}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Step circles */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <React.Fragment key={step}>
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-300 font-semibold text-sm
                      ${isCompleted 
                        ? 'bg-indigo-600 text-white' 
                        : isCurrent 
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' 
                          : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span 
                    className={`
                      mt-2 text-xs font-medium text-center max-w-[80px]
                      ${isCurrent ? 'text-indigo-600' : 'text-gray-500'}
                    `}
                  >
                    {stepTitles[step]}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div 
                      className={`
                        h-1 rounded transition-all duration-300
                        ${index < currentStep ? 'bg-indigo-600' : 'bg-gray-200'}
                      `}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

