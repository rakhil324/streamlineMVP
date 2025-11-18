'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, Mail, MapPin, Briefcase, Download, Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [resume, setResume] = useState<DocumentInfo | null>(null);
  const [coverLetter, setCoverLetter] = useState<DocumentInfo | null>(null);
  const [uploading, setUploading] = useState<'resume' | 'coverLetter' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch user documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/user/documents');
      if (response.ok) {
        const data = await response.json();
        setResume(data.resume);
        setCoverLetter(data.coverLetter);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleFileUpload = async (file: File, type: 'resume' | 'coverLetter') => {
    setError(null);
    setSuccess(null);
    setUploading(type);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/user/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const data = await response.json();
      setSuccess(data.message);
      
      // Refresh documents
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDocument = async (type: 'resume' | 'coverLetter') => {
    if (!confirm(`Are you sure you want to delete your ${type === 'resume' ? 'resume' : 'cover letter'}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/user/documents?type=${type}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      setSuccess(`${type === 'resume' ? 'Resume' : 'Cover letter'} deleted successfully`);
      
      // Update state
      if (type === 'resume') {
        setResume(null);
      } else {
        setCoverLetter(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <MainLayout title="Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-textPrimary mb-1">
                {session?.user?.name || 'User'}
              </h2>
              <p className="text-textSecondary mb-4">Senior Frontend Developer</p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-textSecondary">
                  <Mail className="w-4 h-4" />
                  <span>{session?.user?.email || 'user@example.com'}</span>
                </div>
                <div className="flex items-center gap-2 text-textSecondary">
                  <MapPin className="w-4 h-4" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2 text-textSecondary">
                  <Briefcase className="w-4 h-4" />
                  <span>Available for opportunities</span>
                </div>
              </div>
            </div>
            {resume && (
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Resume
              </Button>
            )}
          </div>
        </Card>

        {/* Documents Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">My Documents</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="space-y-6">
            {/* Resume Upload */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-textPrimary flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume
                </h4>
                {resume && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDocument('resume')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              
              {resume ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-textPrimary">{resume.fileName}</p>
                      <p className="text-sm text-textSecondary mt-1">
                        {formatFileSize(resume.fileSize)} • Uploaded {formatDate(resume.uploadedAt)}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, 'resume');
                      }
                    }}
                    disabled={uploading !== null}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {uploading === 'resume' ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    )}
                    <p className="text-sm text-textSecondary text-center">
                      {uploading === 'resume' ? 'Uploading...' : 'Click to upload resume'}
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                      PDF, Word, or Text file (max 10MB)
                    </p>
                  </label>
                </div>
              )}
            </div>

            {/* Cover Letter Upload */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-textPrimary flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Cover Letter
                </h4>
                {coverLetter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteDocument('coverLetter')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              
              {coverLetter ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-textPrimary">{coverLetter.fileName}</p>
                      <p className="text-sm text-textSecondary mt-1">
                        {formatFileSize(coverLetter.fileSize)} • Uploaded {formatDate(coverLetter.uploadedAt)}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, 'coverLetter');
                      }
                    }}
                    disabled={uploading !== null}
                    className="hidden"
                    id="cover-letter-upload"
                  />
                  <label
                    htmlFor="cover-letter-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {uploading === 'coverLetter' ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    )}
                    <p className="text-sm text-textSecondary text-center">
                      {uploading === 'coverLetter' ? 'Uploading...' : 'Click to upload cover letter'}
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                      PDF, Word, or Text file (max 10MB)
                    </p>
                  </label>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* About Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">About</h3>
          <p className="text-textSecondary leading-relaxed">
            Experienced frontend developer with a passion for building intuitive and performant web applications. 
            Skilled in React, TypeScript, and modern web technologies. Always eager to learn and contribute to 
            innovative projects.
          </p>
        </Card>

        {/* Skills Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Node.js', 'Git', 'Figma'].map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>

        {/* Experience Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Experience</h3>
          <div className="space-y-4">
            <div className="border-l-2 border-gray-200 pl-4">
              <h4 className="font-semibold text-textPrimary">Senior Frontend Developer</h4>
              <p className="text-sm text-textSecondary">Tech Company • 2021 - Present</p>
              <p className="text-sm text-textSecondary mt-2">
                Led frontend development for multiple products, improved performance by 40%, and mentored junior developers.
              </p>
            </div>
            <div className="border-l-2 border-gray-200 pl-4">
              <h4 className="font-semibold text-textPrimary">Frontend Developer</h4>
              <p className="text-sm text-textSecondary">Startup Inc. • 2019 - 2021</p>
              <p className="text-sm text-textSecondary mt-2">
                Built and maintained multiple web applications, collaborated with cross-functional teams.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

