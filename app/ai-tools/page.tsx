'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Sparkles, FileText, MessageSquare, Zap, Loader2, CheckCircle, Download, X, Play, RotateCcw, Search, Building2, Upload, AlertCircle, Copy } from 'lucide-react';
import { Job } from '@/lib/mockData';

export default function AIToolsPage() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobSelector, setShowJobSelector] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{
    sanitizedText: string;
    encryptedOriginal: string;
    encryptionKey: string;
    removedData: any;
  } | null>(null);
  const [uploadedCoverLetterFile, setUploadedCoverLetterFile] = useState<File | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState<string | null>(null);
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [profileResume, setProfileResume] = useState<{
    fileName: string;
    sanitizedText: string;
    encryptedOriginal: string;
    encryptionKey: string;
    removedData: any;
  } | null>(null);
  const [useProfileCoverLetter, setUseProfileCoverLetter] = useState(false);
  const [profileCoverLetter, setProfileCoverLetter] = useState<{
    fileName: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedResumeNotification, setSavedResumeNotification] = useState<string | null>(null);

  interface InterviewQuestion {
    question: string;
    answer: string;
    status: 'pending' | 'answered';
  }

  const [generatedContent, setGeneratedContent] = useState<{
    resume?: string;
    coverLetter?: string;
    interviewQuestions?: InterviewQuestion[];
    selectedJobId?: string;
    pdfBase64?: string;
    tailoredData?: any;
    originalData?: any;
  }>({});

  // Jobs loaded from the tracker (/api/jobs)
  const [trackerJobs, setTrackerJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState<boolean>(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const tools = [
    {
      id: 'resume',
      icon: <FileText className="w-8 h-8" />,
      title: 'Resume Builder',
      description: 'AI-powered resume builder with industry-specific templates',
      action: 'Build Resume',
      requiresJob: true,
    },
    {
      id: 'cover',
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'Cover Letter Writer',
      description: 'Generate personalized cover letters in seconds',
      action: 'Write Cover Letter',
      requiresJob: true,
    },
    {
      id: 'interview',
      icon: <Zap className="w-8 h-8" />,
      title: 'Interview Prep',
      description: 'Practice with AI interview questions and get feedback',
      action: 'Start Practice',
      requiresJob: false,
    },
  ];

  const mockInterviewQuestions: InterviewQuestion[] = [
    {
      question: "Tell me about a challenging project you worked on and how you overcame obstacles.",
      answer: "I led a project to rebuild our main application using React. The challenge was migrating legacy code while maintaining functionality. I created a phased migration plan, built a component library for consistency, and collaborated closely with the backend team.",
      status: 'pending',
    },
    {
      question: "How do you stay updated with the latest frontend technologies?",
      answer: "I regularly read technical blogs, contribute to open-source projects, and attend conferences. I also experiment with new frameworks in side projects to understand their strengths and use cases.",
      status: 'pending',
    },
    {
      question: "Describe a time when you had to optimize a slow-performing application.",
      answer: "I identified performance bottlenecks using React DevTools and Chrome Profiler. I implemented code splitting, lazy loading, and memoization strategies that reduced initial load time by 60% and improved user experience significantly.",
      status: 'pending',
    },
  ];

  const generationStepsMap = {
    resume: [
      'Analyzing job description...',
      'Extracting key requirements...',
      'Matching your skills to job requirements...',
      'Tailoring resume sections...',
      'Optimizing keywords...',
      'Finalizing resume format...',
    ],
    cover: [
      'Analyzing job description...',
      'Understanding company culture...',
      'Identifying key talking points...',
      'Crafting personalized introduction...',
      'Highlighting relevant experience...',
      'Finalizing cover letter...',
    ],
  };

  const handleToolClick = (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (tool?.requiresJob) {
      setShowJobSelector(toolId);
    } else {
      handleGenerate(toolId, null);
    }
  };

  const handleJobSelect = (job: Job, toolId: string) => {
    setSelectedJob(job);
    setShowJobSelector(null);
    setActiveTool(toolId);
    handleGenerate(toolId, job);
  };

  // Track if we've auto-loaded the resume to show a notification
  const [autoLoadedResume, setAutoLoadedResume] = useState(false);

  // Fetch profile documents and tracker jobs on mount
  useEffect(() => {
    fetchProfileDocuments();
    fetchTrackerJobs();
  }, []);

  const fetchTrackerJobs = async () => {
    try {
      setJobsLoading(true);
      setJobsError(null);

      const response = await fetch('/api/jobs');
      if (!response.ok) {
        if (response.status === 401) {
          setJobsError('Please log in to view your tracked jobs.');
        } else {
          setJobsError('Failed to load jobs from tracker.');
        }
        return;
      }

      const data = await response.json();
      const appliedJobs = (data.jobs || []).filter((job: Job) => job.status === 'Applied');
      setTrackerJobs(appliedJobs);
    } catch (error) {
      console.error('Error fetching tracker jobs:', error);
      setJobsError('Failed to load jobs from tracker.');
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchProfileDocuments = async () => {
    try {
      const response = await fetch('/api/user/documents?full=true');
      if (response.ok) {
        const data = await response.json();
        if (data.resume) {
          setProfileResume({
            fileName: data.resume.fileName,
            sanitizedText: data.resume.sanitizedText,
            encryptedOriginal: data.resume.encryptedOriginal,
            encryptionKey: data.resume.encryptionKey,
            removedData: data.resume.removedData,
          });
          
          // AUTOMATIC: Use profile resume if available and no file has been uploaded
          // Check both state variables to ensure we don't override user's manual upload
          if (!uploadedFile && !fileData) {
            setUseProfileResume(true);
            setFileData({
              sanitizedText: data.resume.sanitizedText,
              encryptedOriginal: data.resume.encryptedOriginal,
              encryptionKey: data.resume.encryptionKey,
              removedData: data.resume.removedData,
            });
            setAutoLoadedResume(true);
            // Clear the notification after 5 seconds
            setTimeout(() => setAutoLoadedResume(false), 5000);
          }
        }
        if (data.coverLetter) {
          setProfileCoverLetter({
            fileName: data.coverLetter.fileName,
            content: data.coverLetter.content,
          });
          
          // AUTOMATIC: Use profile cover letter if available and no file has been uploaded
          if (!uploadedCoverLetterFile && !coverLetterContent) {
            setUseProfileCoverLetter(true);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profile documents:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setUploadedFile(file);
    setUseProfileResume(false); // Switch to uploaded file mode
    setUseProfileCoverLetter(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      setFileData({
        sanitizedText: data.sanitizedText,
        encryptedOriginal: data.encryptedOriginal,
        encryptionKey: data.encryptionKey,
        removedData: data.removedData,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setUploadedFile(null);
    }
  };

  const handleCoverLetterUpload = async (file: File) => {
    setError(null);
    setUploadedCoverLetterFile(file);
    setUseProfileCoverLetter(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload cover letter');
      }

      const data = await response.json();
      // For cover letter, we just need the text content (restore PII if available)
      let content = data.sanitizedText;
      if (data.encryptedOriginal && data.encryptionKey && data.removedData) {
        try {
          const { decrypt } = await import('@/lib/encryption');
          const { restorePII } = await import('@/lib/dataSanitization');
          const originalText = decrypt(data.encryptedOriginal, data.encryptionKey);
          content = restorePII(originalText, data.removedData);
        } catch (err) {
          console.error('Failed to restore PII in cover letter:', err);
        }
      }
      setCoverLetterContent(content);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover letter');
      setUploadedCoverLetterFile(null);
    }
  };

  const handleUseProfileResume = () => {
    setError(null);
    setUseProfileResume(true);
    setUploadedFile(null);
    if (profileResume) {
      setFileData({
        sanitizedText: profileResume.sanitizedText,
        encryptedOriginal: profileResume.encryptedOriginal,
        encryptionKey: profileResume.encryptionKey,
        removedData: profileResume.removedData,
      });
    }
  };

  const handleUseProfileCoverLetter = () => {
    setError(null);
    setUseProfileCoverLetter(!useProfileCoverLetter);
    setUploadedCoverLetterFile(null);
    setCoverLetterContent(null);
    // Note: Cover letter is used as template, but we still need resume data
    // Resume data should already be set via useProfileResume or file upload
  };

  // Save tailored resume to database
  const saveTailoredResume = async (jobTitle: string, companyName: string, pdfBase64: string, textContent: string) => {
    try {
      const response = await fetch('/api/tailored-resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTitle,
          companyName,
          fileName: `Resume - ${companyName} - ${jobTitle}.pdf`,
          pdfBase64,
          textContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedResumeNotification(`Resume saved for ${companyName}`);
        setTimeout(() => setSavedResumeNotification(null), 5000);
        console.log('Tailored resume saved:', data);
      } else {
        console.error('Failed to save tailored resume');
      }
    } catch (error) {
      console.error('Error saving tailored resume:', error);
    }
  };

  const handleGenerate = async (toolId: string, job: Job | null) => {
    setError(null);
    setActiveTool(toolId);
    setGenerating(toolId);
    setGenerationSteps(generationStepsMap[toolId as keyof typeof generationStepsMap] || []);
    setCurrentStep(0);

    // For resume and cover letter, require file data (either uploaded or from profile)
    if ((toolId === 'resume' || toolId === 'cover') && !fileData) {
      setError('Please upload a resume file or use your saved resume from profile');
      setGenerating(null);
      return;
    }

    if ((toolId === 'resume' || toolId === 'cover') && !job) {
      setError('Please select a job');
      setGenerating(null);
      return;
    }

    // Simulate generation steps
    const steps = generationStepsMap[toolId as keyof typeof generationStepsMap] || [];
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
      }, (index + 1) * 500);
    });

    try {
      if (toolId === 'resume' && job && fileData) {
        const response = await fetch('/api/tailor/resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sanitizedResume: fileData.sanitizedText,
            jobDescription: job.description || '',
            jobTitle: job.title,
            companyName: job.company,
            encryptedOriginal: fileData.encryptedOriginal,
            encryptionKey: fileData.encryptionKey,
            removedData: fileData.removedData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to tailor resume');
        }

        const data = await response.json();
        setGenerating(null);
        setCurrentStep(0);
        
        console.log('Resume API response:', data);
        
        setGeneratedContent(prev => ({ 
          ...prev, 
          resume: data.content,
          pdfBase64: data.pdf,
          selectedJobId: job.id 
        }));

        // Automatically save the tailored resume
        if (data.pdf) {
          await saveTailoredResume(job.title, job.company, data.pdf, data.content);
        }
      } else if (toolId === 'cover' && job && fileData) {
        const response = await fetch('/api/tailor/cover-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sanitizedResume: fileData.sanitizedText,
            jobDescription: job.description || '',
            jobTitle: job.title,
            companyName: job.company,
            coverLetterTemplate: useProfileCoverLetter && profileCoverLetter 
              ? profileCoverLetter.content 
              : coverLetterContent || undefined,
            encryptedOriginal: fileData.encryptedOriginal,
            encryptionKey: fileData.encryptionKey,
            removedData: fileData.removedData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to tailor cover letter');
        }

        const data = await response.json();
        setGenerating(null);
        setCurrentStep(0);
        
        // Log for debugging
        console.log('Cover letter API response:', { 
          hasContent: !!data.content, 
          hasPdf: !!data.pdf, 
          pdfLength: data.pdf?.length || 0,
          format: data.format,
          error: data.error,
          fullResponse: data
        });
        
        setGeneratedContent(prev => ({ 
          ...prev, 
          coverLetter: data.content,
          pdfBase64: data.pdf || undefined,
          selectedJobId: job.id 
        }));
      } else if (toolId === 'interview') {
        // Keep mock for interview prep for now
        setTimeout(() => {
          setGenerating(null);
          setCurrentStep(0);
        setGeneratedContent(prev => ({ ...prev, interviewQuestions: mockInterviewQuestions }));
        }, steps.length * 500 + 500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate content');
      setGenerating(null);
      setCurrentStep(0);
    }
  };

  const downloadPDF = (content: string, filename: string, pdfBase64?: string) => {
    console.log('Download PDF called:', { hasPdfBase64: !!pdfBase64, filename });
    
    if (pdfBase64 && pdfBase64.length > 0) {
      try {
        // Download PDF
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('PDF downloaded successfully');
      } catch (error) {
        console.error('Error downloading PDF:', error);
        // Fallback to text
        downloadAsText(content, filename);
      }
    } else {
      console.warn('No PDF data available, downloading as text');
      downloadAsText(content, filename);
    }
  };

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = (toolId: string) => {
    if (toolId === 'resume') {
      setGeneratedContent(prev => {
        const { resume, selectedJobId, pdfBase64, ...rest } = prev;
        return rest;
      });
    } else if (toolId === 'cover') {
      setGeneratedContent(prev => {
        const { coverLetter, selectedJobId, pdfBase64, ...rest } = prev;
        return rest;
      });
    } else if (toolId === 'interview') {
      setGeneratedContent(prev => {
        const { interviewQuestions, ...rest } = prev;
        return rest;
      });
    }
    setActiveTool(null);
    setSelectedJob(null);
    setError(null);
  };

  return (
    <MainLayout title="AI Tools">
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-textPrimary mb-2">
            AI-Powered Tools
          </h2>
          <p className="text-textSecondary">
            Supercharge your job search with our intelligent AI tools
          </p>
        </div>

        {/* Job Selector Modal - uses jobs from tracker */}
        {showJobSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-textPrimary">
                  Select a Job to {tools.find(t => t.id === showJobSelector)?.action}
                </h3>
                <button
                  onClick={() => setShowJobSelector(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {jobsLoading && (
                  <div className="py-8 text-center text-textSecondary text-sm">
                    Loading jobs from your tracker...
                  </div>
                )}
                {!jobsLoading && jobsError && (
                  <div className="py-4 text-center text-red-600 text-sm">
                    {jobsError}
                  </div>
                )}
                {!jobsLoading && !jobsError && trackerJobs.length === 0 && (
                  <div className="py-8 text-center text-textSecondary text-sm">
                    No applied jobs found in your tracker yet.
                    <br />
                    Use the extension autofill on a job application to add jobs here.
                  </div>
                )}
                {!jobsLoading && !jobsError && trackerJobs.length > 0 && trackerJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-4 border rounded-lg transition-all ${
                      selectedJob?.id === job.id
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-primary hover:bg-blue-50'
                    }`}
                  >
                    <div 
                      onClick={() => handleJobSelect(job, showJobSelector!)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-textPrimary">{job.title}</h4>
                          <p className="text-sm text-textSecondary">{job.company}</p>
                          <p className="text-xs text-textSecondary mt-1">{job.location}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/jobs/${job.id}`);
                        }}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View Job Details →
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJobSelect(job, showJobSelector!);
                        }}
                        className="text-sm text-white bg-primary px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Use This Job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* File Upload Section - Always visible for resume/cover letter tools */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resume Source Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-textPrimary">Resume Source</h3>
              {(uploadedFile || useProfileResume) && (
                <span className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {useProfileResume ? 'Profile' : 'Uploaded'}
                </span>
              )}
            </div>
            
            {/* Auto-loaded notification */}
            {autoLoadedResume && useProfileResume && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Resume automatically loaded from your profile</span>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {/* Option to use profile resume */}
            {profileResume && (
              <div className="mb-3">
                <Button
                  variant={useProfileResume ? "primary" : "outline"}
                  size="sm"
                  onClick={handleUseProfileResume}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Use Resume from Profile
                </Button>
                <p className="text-xs text-textSecondary mt-1">{profileResume.fileName}</p>
              </div>
            )}

            {/* Divider */}
            {profileResume && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-xs text-textSecondary">OR</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
            )}

            {/* Upload new resume file */}
            <div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="block w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
              />
            </div>
            <p className="text-xs text-textSecondary mt-2">
              PDF, Word, or Text (max 10MB)
            </p>
          </Card>

          {/* Cover Letter Source Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-textPrimary">Cover Letter Template</h3>
              {(useProfileCoverLetter || coverLetterContent) && (
                <span className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              )}
            </div>
            
            {/* Option to use profile cover letter */}
            {profileCoverLetter && (
              <div className="mb-3">
                <Button
                  variant={useProfileCoverLetter ? "primary" : "outline"}
                  size="sm"
                  onClick={handleUseProfileCoverLetter}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Use Cover Letter from Profile
                </Button>
                <p className="text-xs text-textSecondary mt-1">{profileCoverLetter.fileName}</p>
              </div>
            )}

            {/* Divider */}
            {profileCoverLetter && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-xs text-textSecondary">OR</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
            )}

            {/* Upload cover letter file */}
            <div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCoverLetterUpload(file);
                  }
                }}
                className="block w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
              />
              {uploadedCoverLetterFile && (
                <p className="text-xs text-textSecondary mt-1">{uploadedCoverLetterFile.name}</p>
              )}
            </div>
            <p className="text-xs text-textSecondary mt-2">
              {profileCoverLetter 
                ? 'Upload a cover letter file or use your saved one from profile. This will be used as a template to match your writing style.'
                : 'Upload a cover letter file to use as a template (optional)'}
            </p>
          </Card>
        </div>

        {/* Clear button */}
        {(uploadedFile || useProfileResume || useProfileCoverLetter || coverLetterContent) && (
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUploadedFile(null);
                setFileData(null);
                setUploadedCoverLetterFile(null);
                setCoverLetterContent(null);
                setUseProfileResume(false);
                setUseProfileCoverLetter(false);
                setError(null);
              }}
            >
              Clear All Selections
            </Button>
          </div>
        )}

        {/* Global Error Message - Shows prominently */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Saved Resume Notification */}
        {savedResumeNotification && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{savedResumeNotification} - Available for autofill in extension</span>
            <button
              onClick={() => setSavedResumeNotification(null)}
              className="ml-auto p-1 hover:bg-green-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Card key={tool.id} className="p-6 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center text-primary mb-4">
                {tool.icon}
              </div>
              <h3 className="text-lg font-semibold text-textPrimary mb-2">
                {tool.title}
              </h3>
              <p className="text-sm text-textSecondary mb-4">
                {tool.description}
              </p>
              
              {generating === tool.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </div>
                  <div className="space-y-2">
                    {generationSteps.slice(0, currentStep).map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>{step}</span>
                      </div>
                    ))}
                    {currentStep < generationSteps.length && (
                      <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{generationSteps[currentStep]}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : generatedContent.resume && tool.id === 'resume' ? (
                <Button
                  variant="primary"
                  onClick={() => setActiveTool('resume')}
                  className="w-full"
                >
                  View Resume
                </Button>
              ) : generatedContent.coverLetter && tool.id === 'cover' ? (
                <Button
                  variant="primary"
                  onClick={() => setActiveTool('cover')}
                  className="w-full"
                >
                  View Cover Letter
                </Button>
              ) : generatedContent.interviewQuestions && tool.id === 'interview' ? (
                <Button
                  variant="primary"
                  onClick={() => setActiveTool('interview')}
                  className="w-full"
                >
                  View Questions
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleToolClick(tool.id)}
                  className="w-full"
                >
                  {tool.action}
                </Button>
              )}
              {tool.requiresJob && generatedContent.selectedJobId && tool.id === (showJobSelector || activeTool) && (
                <p className="text-xs text-textSecondary mt-2 text-center">
                  Tailored for: {trackerJobs.find(j => j.id === generatedContent.selectedJobId)?.company}
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Resume Builder Demo */}
        {activeTool === 'resume' && generatedContent.resume && (
          <Card className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-textPrimary">Generated Resume</h3>
                {selectedJob && (
                  <p className="text-sm text-textSecondary mt-1">
                    Tailored for: <span className="font-medium">{selectedJob.title} at {selectedJob.company}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReset('resume')}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    downloadPDF(
                      generatedContent.resume!,
                      `resume-${selectedJob?.company || 'tailored'}.pdf`,
                      generatedContent.pdfBase64
                    );
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {generatedContent.pdfBase64 ? 'Download PDF' : 'Download Text'}
                </Button>
                <button
                  onClick={() => setActiveTool(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-textPrimary">
                {generatedContent.resume}
              </pre>
            </div>
          </Card>
        )}

        {/* Cover Letter Demo */}
        {activeTool === 'cover' && generatedContent.coverLetter && (
          <Card className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-textPrimary">Generated Cover Letter</h3>
                {selectedJob && (
                  <p className="text-sm text-textSecondary mt-1">
                    Tailored for: <span className="font-medium">{selectedJob.title} at {selectedJob.company}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReset('cover')}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!generatedContent.pdfBase64) {
                      setError('PDF generation failed. The file will download as text. Check server logs for details.');
                      downloadPDF(
                        generatedContent.coverLetter!,
                        `cover-letter-${selectedJob?.company || 'cover-letter'}.pdf`,
                        generatedContent.pdfBase64
                      );
                    } else {
                      downloadPDF(
                        generatedContent.coverLetter!,
                        `cover-letter-${selectedJob?.company || 'cover-letter'}.pdf`,
                        generatedContent.pdfBase64
                      );
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {generatedContent.pdfBase64 ? 'Download PDF' : 'Download Text (PDF Failed)'}
                </Button>
                <button
                  onClick={() => setActiveTool(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="prose max-w-none">
                <p className="text-sm text-textPrimary leading-relaxed whitespace-pre-wrap">
                  {generatedContent.coverLetter}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Interview Prep Demo */}
        {activeTool === 'interview' && generatedContent.interviewQuestions && (
          <Card className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-textPrimary">Interview Practice Questions</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReset('interview')}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                <button
                  onClick={() => setActiveTool(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {generatedContent.interviewQuestions.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <h4 className="font-semibold text-textPrimary">Question {index + 1}</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Practice
                    </Button>
                  </div>
                  <p className="text-sm text-textPrimary mb-3 font-medium">
                    {item.question}
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-textSecondary mb-2 font-medium">Sample Answer:</p>
                    <p className="text-sm text-textSecondary leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* How It Works Section */}
        {!activeTool && !showJobSelector && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-textPrimary">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary mx-auto mb-3">
                    <span className="font-bold">1</span>
                  </div>
                  <h4 className="font-medium text-textPrimary mb-1">Select a Tool</h4>
                  <p className="text-sm text-textSecondary">
                    Choose from resume builder, cover letter writer, or interview prep
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary mx-auto mb-3">
                    <span className="font-bold">2</span>
                  </div>
                  <h4 className="font-medium text-textPrimary mb-1">AI Processing</h4>
                  <p className="text-sm text-textSecondary">
                    Our AI analyzes the job description and your profile
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary mx-auto mb-3">
                    <span className="font-bold">3</span>
                  </div>
                  <h4 className="font-medium text-textPrimary mb-1">Get Results</h4>
                  <p className="text-sm text-textSecondary">
                    Receive tailored content ready to use for your application
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
