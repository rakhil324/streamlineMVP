'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Sparkles, FileText, MessageSquare, Zap, Loader2, CheckCircle, Download, X, Play, RotateCcw, Search, Building2 } from 'lucide-react';
import { mockJobs, Job } from '@/lib/mockData';

export default function AIToolsPage() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobSelector, setShowJobSelector] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

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
  }>({});

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

  const generateJobSpecificResume = (job: Job) => {
    return `HRIDAY SAINATHUNI
${job.title} | ${job.company}

PROFESSIONAL SUMMARY
Experienced frontend developer with 5+ years building scalable web applications using ${job.keywords?.join(', ')}. Proven track record of delivering high-performance applications and improving user experiences. Specialized in ${job.keywords?.[0]} and modern JavaScript frameworks.

TECHNICAL SKILLS
• Frontend: ${job.keywords?.join(', ')}
• Tools: Git, Webpack, Jest, Cypress
• Design: Figma, Adobe XD

EXPERIENCE
Senior Frontend Developer | Tech Corp | 2022 - Present
• Led development of major product features using ${job.keywords?.[0]}, improving user engagement by 40%
• Architected and implemented component library using ${job.keywords?.[1]} for ${job.company}-style applications
• Built scalable web applications serving 100K+ daily users with focus on ${job.description}

Frontend Developer | Startup Inc | 2020 - 2022
• Developed user-facing features using ${job.keywords?.[0]} and modern JavaScript frameworks
• Collaborated with cross-functional teams to deliver features aligned with ${job.company} standards

EDUCATION
Bachelor's in Computer Science | University of Virginia | 2024 - 2027
`;
  };

  const generateJobSpecificCoverLetter = (job: Job) => {
    return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With over 5 years of experience building scalable web applications using ${job.keywords?.join(', ')}, I am excited about the opportunity to contribute to your innovative team.

In my current role, I've focused on ${job.description?.toLowerCase()}, which aligns perfectly with ${job.company}'s mission. I have extensive experience with ${job.keywords?.[0]} and ${job.keywords?.[1]}, which are essential for this role.

${job.company}'s commitment to ${job.description?.toLowerCase()} resonates with my passion for creating exceptional user experiences. I am particularly drawn to your innovative approach and would be thrilled to bring my expertise in ${job.keywords?.slice(0, 2).join(' and ')} to your team.

I am confident that my technical skills in ${job.keywords?.join(', ')}, combined with my collaborative approach and problem-solving mindset, would make me a valuable addition to your team. I look forward to discussing how I can contribute to ${job.company}'s continued success.

Sincerely,
Hriday Sainathuni`;
  };

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

  const handleGenerate = (toolId: string, job: Job | null) => {
    setActiveTool(toolId);
    setGenerating(toolId);
    setGenerationSteps(generationStepsMap[toolId as keyof typeof generationStepsMap] || []);
    setCurrentStep(0);

    // Simulate generation steps
    const steps = generationStepsMap[toolId as keyof typeof generationStepsMap] || [];
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
      }, (index + 1) * 500);
    });

    setTimeout(() => {
      setGenerating(null);
      setCurrentStep(0);
      if (toolId === 'resume' && job) {
        setGeneratedContent(prev => ({ 
          ...prev, 
          resume: generateJobSpecificResume(job),
          selectedJobId: job.id 
        }));
      } else if (toolId === 'cover' && job) {
        setGeneratedContent(prev => ({ 
          ...prev, 
          coverLetter: generateJobSpecificCoverLetter(job),
          selectedJobId: job.id 
        }));
      } else if (toolId === 'interview') {
        setGeneratedContent(prev => ({ ...prev, interviewQuestions: mockInterviewQuestions }));
      }
    }, steps.length * 500 + 500);
  };

  const handleReset = (toolId: string) => {
    if (toolId === 'resume') {
      setGeneratedContent(prev => {
        const { resume, selectedJobId, ...rest } = prev;
        return rest;
      });
    } else if (toolId === 'cover') {
      setGeneratedContent(prev => {
        const { coverLetter, selectedJobId, ...rest } = prev;
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

        {/* Job Selector Modal */}
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
                {mockJobs.map((job) => (
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
                        {job.keywords && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.keywords.slice(0, 3).map((keyword) => (
                              <span key={keyword} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-textSecondary">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
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
                  Tailored for: {mockJobs.find(j => j.id === generatedContent.selectedJobId)?.company}
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
                    const blob = new Blob([generatedContent.resume!], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `resume-${selectedJob?.company || 'resume'}.txt`;
                    a.click();
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
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
                    const blob = new Blob([generatedContent.coverLetter!], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cover-letter-${selectedJob?.company || 'cover-letter'}.txt`;
                    a.click();
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
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
