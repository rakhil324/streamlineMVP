'use client';

import React, { useState } from 'react';
import { Settings, Flag, X, Zap, Info, Eye, Briefcase, Clock, RefreshCw, Edit, Copy, Check } from 'lucide-react';

const ExtensionPage = () => {
  const [activeTab, setActiveTab] = useState<'autofill' | 'keywords' | 'profile'>('autofill');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [autofillDemo, setAutofillDemo] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const [isTailoring, setIsTailoring] = useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const startAutofillDemo = () => {
    setAutofillDemo(true);
    setAutofilledFields(new Set());
    
    // Simulate autofilling fields one by one
    const fields = ['name', 'email', 'phone', 'location', 'resume', 'coverLetter'];
    fields.forEach((field, index) => {
      setTimeout(() => {
        setAutofilledFields(prev => {
          const newSet = new Set(prev);
          newSet.add(field);
          return newSet;
        });
      }, (index + 1) * 500);
    });
  };

  const handleTailorApplication = () => {
    setIsTailoring(true);
    setTimeout(() => {
      setIsTailoring(false);
      setAutofillDemo(true);
      startAutofillDemo();
    }, 1500);
  };

  const mockApplicationFields = [
    { id: 'name', label: 'Full Name', value: 'Hriday Sainathuni', filled: autofilledFields.has('name') },
    { id: 'email', label: 'Email', value: 'sainathunih@gmail.com', filled: autofilledFields.has('email') },
    { id: 'phone', label: 'Phone', value: '+15713513185', filled: autofilledFields.has('phone') },
    { id: 'location', label: 'Location', value: 'Ashburn, VA, USA', filled: autofilledFields.has('location') },
    { id: 'resume', label: 'Resume', value: 'Hriday_Sainathuni_resume.pdf', filled: autofilledFields.has('resume') },
    { id: 'coverLetter', label: 'Cover Letter', value: 'Custom tailored cover letter...', filled: autofilledFields.has('coverLetter') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-8">
      {/* Extension Popup Container */}
      <div className="w-[420px] h-[680px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-textPrimary text-sm">Simplify</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-textSecondary" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Flag className="w-4 h-4 text-textSecondary" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-textSecondary" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('autofill')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'autofill'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Autofill
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'keywords'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Keywords Score
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Profile
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-custom">
          {activeTab === 'autofill' && (
            <div className="p-5 space-y-6">
              {!autofillDemo ? (
                <>
                  {/* Status Banner */}
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-textPrimary text-sm mb-1">
                        We support autofill on this website! Click into the application to get started.
                      </p>
                      <p className="text-xs text-textSecondary">
                        We'll help you autofill and custom tailor your resume and cover letter for this application.
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200"></div>

                  {/* Help Box */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-textPrimary text-sm mb-1">Still need help?</p>
                        <a href="#" className="text-primary text-sm hover:underline">
                          Check out our tutorial here →
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="space-y-3">
                    <a href="#" className="text-primary text-sm hover:underline">
                      Save Job Instead
                    </a>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-textSecondary">Get referrals →</span>
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="w-8 h-8 bg-primary rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-white text-xs font-medium">U{i}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Primary Button */}
                  <div className="pt-4">
                    <button 
                      onClick={handleTailorApplication}
                      disabled={isTailoring}
                      className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isTailoring ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Tailoring...
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4" />
                          Tailor Application
                        </>
                      )}
                    </button>
                    <a href="#" className="block text-center text-xs text-textSecondary mt-2 hover:underline">
                      View all options
                    </a>
                  </div>
                </>
              ) : (
                <>
                  {/* Autofill Demo */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-textPrimary text-sm">Autofill Demo</h3>
                        <p className="text-xs text-textSecondary">Watch as we fill in your application</p>
                      </div>
                      <button
                        onClick={() => {
                          setAutofillDemo(false);
                          setAutofilledFields(new Set());
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Mock Application Form */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 border-2 border-dashed border-gray-300">
                      <p className="text-xs font-medium text-textSecondary mb-3">Mock Application Form:</p>
                      {mockApplicationFields.map((field) => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-xs font-medium text-textSecondary">{field.label}</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={field.filled ? field.value : ''}
                              readOnly
                              className={`w-full px-3 py-2 text-sm border rounded-lg transition-all ${
                                field.filled
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-300 bg-white'
                              }`}
                            />
                            {field.filled && (
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Progress Indicator */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-textSecondary">Progress</span>
                        <span className="font-medium text-textPrimary">
                          {autofilledFields.size} / {mockApplicationFields.length} fields filled
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(autofilledFields.size / mockApplicationFields.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {autofilledFields.size === mockApplicationFields.length && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-medium text-green-800">
                            Application tailored and ready to submit!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="p-5 space-y-6">
              {/* Resume Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-textPrimary">Resume</label>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Info className="w-4 h-4 text-textSecondary" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-textSecondary">
                    Hriday_Sainathuni_resume (default)
                  </div>
                  <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Eye className="w-4 h-4 text-textSecondary" />
                  </button>
                </div>
              </div>

              {/* Score Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-textPrimary text-sm">Keyword Match</h3>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                    Needs Work
                  </span>
                </div>
                <p className="text-sm text-textSecondary mb-4">
                  Your resume has <span className="font-semibold text-textPrimary">0 out of 0 (0%)</span> keywords that appear in the job description.
                </p>
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-600 text-lg">💡</span>
                  <p className="text-xs text-textSecondary">
                    Try to get your score above 70% to increase your chances!
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:opacity-90 transition-all">
                  Tailor Resume
                </button>
                <button className="w-full border border-gray-300 text-textSecondary py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Add Job Description
                </button>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="p-5 space-y-5">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <span className="text-xs text-primary font-medium">→</span>
                  </div>
                  <p className="text-xs text-textPrimary font-medium mt-2">View my matches</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">→</span>
                  </div>
                  <p className="text-xs text-textPrimary font-medium mt-2">View all my jobs</p>
                </div>
              </div>

              {/* Instruction Banner */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-textPrimary">
                  Click any block of text below to copy it! Reference your profile to fill out your application.
                </p>
              </div>

              {/* Profile Card */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-textPrimary">Profile</h3>
                  <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-gray-100 rounded">
                      <RefreshCw className="w-4 h-4 text-textSecondary" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4 text-textSecondary" />
                    </button>
                  </div>
                </div>

                {/* Avatar & Basic Info */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">HS</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-textPrimary">Hriday Sainathuni</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  {[
                    { label: 'Location', value: 'Ashburn, VA, USA' },
                    { label: 'Email', value: 'sainathunih@gmail.com' },
                    { label: 'Phone', value: '+15713513185' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleCopy(item.value, item.label)}
                      className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs text-textSecondary">{item.label}</p>
                        <p className="text-sm text-textPrimary font-medium">{item.value}</p>
                      </div>
                      {copiedField === item.label ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Education */}
                <div>
                  <h4 className="font-semibold text-textPrimary text-sm mb-3">Education</h4>
                  <div className="space-y-2">
                    {[
                      { school: 'University of Virginia', degree: "Bachelor's, Computer Science", years: '2024 – 2027' },
                    ].map((edu, i) => (
                      <div
                        key={i}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleCopy(JSON.stringify(edu), `edu-${i}`)}
                      >
                        <p className="text-sm font-medium text-textPrimary">{edu.school}</p>
                        <p className="text-xs text-textSecondary">{edu.degree}</p>
                        <p className="text-xs text-textSecondary mt-1">{edu.years}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <h4 className="font-semibold text-textPrimary text-sm mb-3">Experience</h4>
                  <div className="space-y-2">
                    {[
                      { title: 'Software Engineer', company: 'Tech Corp', duration: '2022 – Present' },
                      { title: 'Junior Developer', company: 'Startup Inc', duration: '2020 – 2022' },
                    ].map((exp, i) => (
                      <div
                        key={i}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleCopy(JSON.stringify(exp), `exp-${i}`)}
                      >
                        <p className="text-sm font-medium text-textPrimary">{exp.title}</p>
                        <p className="text-xs text-textSecondary">{exp.company}</p>
                        <p className="text-xs text-textSecondary mt-1">{exp.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Background Info Text */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-sm text-textSecondary text-center">
          This is a prototype of the Streamline.ai Extension popup interface
        </p>
      </div>
    </div>
  );
};

export default ExtensionPage;

