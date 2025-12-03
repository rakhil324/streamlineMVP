'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  User, Mail, MapPin, Briefcase, Download, Upload, FileText, X, 
  CheckCircle, AlertCircle, Loader2, GraduationCap, Phone, 
  Globe, Linkedin, Edit2, Wrench
} from 'lucide-react';
import { UserProfile } from '@/lib/profileTypes';

interface DocumentInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resume, setResume] = useState<DocumentInfo | null>(null);
  const [coverLetter, setCoverLetter] = useState<DocumentInfo | null>(null);
  const [uploading, setUploading] = useState<'resume' | 'coverLetter' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch profile and documents on mount
  useEffect(() => {
    async function loadData() {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        // Load profile
        const profileRes = await fetch('/api/profile');
        const profileData = await profileRes.json();
        
        if (profileData.profileData) {
          setProfile(profileData.profileData);
        } else {
          // No profile, redirect to onboarding
          router.push('/onboarding');
          return;
        }

        // Load documents
        const docsRes = await fetch('/api/user/documents');
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setResume(docsData.resume);
          setCoverLetter(docsData.coverLetter);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [session, status, router]);

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
      const docsRes = await fetch('/api/user/documents');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setResume(docsData.resume);
        setCoverLetter(docsData.coverLetter);
      }
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

  if (isLoading || status === 'loading') {
    return (
      <MainLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return null;
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || session?.user?.name || 'User';
  const location = profile.address?.city && profile.address?.state 
    ? `${profile.address.city}, ${profile.address.state}` 
    : profile.address?.city || profile.address?.state || '';

  return (
    <MainLayout title="Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex items-start gap-6 flex-col sm:flex-row">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-textPrimary mb-1">
                    {fullName}
                  </h2>
                  {profile.preferredTitles?.[0] && (
                    <p className="text-textSecondary mb-4">{profile.preferredTitles[0]}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/onboarding?edit=true')}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-textSecondary">
                  <Mail className="w-4 h-4" />
                  <span>{profile.email || session?.user?.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 text-textSecondary">
                    <Phone className="w-4 h-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-2 text-textSecondary">
                    <MapPin className="w-4 h-4" />
                    <span>{location}</span>
                  </div>
                )}
                {profile.linkedIn && (
                  <a 
                    href={profile.linkedIn.startsWith('http') ? profile.linkedIn : `https://${profile.linkedIn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {profile.portfolio && (
                  <a 
                    href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Portfolio</span>
                  </a>
                )}
              </div>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resume Upload */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-textPrimary flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume
                </h4>
                {resume && (
                  <button
                    onClick={() => handleDeleteDocument('resume')}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {resume ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-textPrimary text-sm">{resume.fileName}</p>
                      <p className="text-xs text-textSecondary mt-1">
                        {formatFileSize(resume.fileSize)} • {formatDate(resume.uploadedAt)}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'resume');
                    }}
                    disabled={uploading !== null}
                    className="hidden"
                  />
                  {uploading === 'resume' ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm text-textSecondary">
                    {uploading === 'resume' ? 'Uploading...' : 'Click to upload'}
                  </p>
                </label>
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
                  <button
                    onClick={() => handleDeleteDocument('coverLetter')}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {coverLetter ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-textPrimary text-sm">{coverLetter.fileName}</p>
                      <p className="text-xs text-textSecondary mt-1">
                        {formatFileSize(coverLetter.fileSize)} • {formatDate(coverLetter.uploadedAt)}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'coverLetter');
                    }}
                    disabled={uploading !== null}
                    className="hidden"
                  />
                  {uploading === 'coverLetter' ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm text-textSecondary">
                    {uploading === 'coverLetter' ? 'Uploading...' : 'Click to upload'}
                  </p>
                </label>
              )}
            </div>
          </div>
        </Card>

        {/* Skills Section */}
        {profile.skills && profile.skills.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-textPrimary" />
              <h3 className="text-lg font-semibold text-textPrimary">Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
            {profile.languages && profile.languages.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-textSecondary mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.certifications && profile.certifications.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-textSecondary mb-2">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Experience Section */}
        {profile.experience && profile.experience.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-textPrimary" />
              <h3 className="text-lg font-semibold text-textPrimary">Experience</h3>
            </div>
            <div className="space-y-4">
              {profile.experience.map((exp) => (
                <div key={exp.id} className="border-l-2 border-indigo-200 pl-4">
                  <h4 className="font-semibold text-textPrimary">{exp.title}</h4>
                  <p className="text-sm text-textSecondary">
                    {exp.company} {exp.location && `• ${exp.location}`}
                  </p>
                  <p className="text-xs text-textSecondary mt-1">
                    {exp.startDate && new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {' - '}
                    {exp.current ? 'Present' : exp.endDate && new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-textSecondary mt-2">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Education Section */}
        {profile.education && profile.education.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-textPrimary" />
              <h3 className="text-lg font-semibold text-textPrimary">Education</h3>
            </div>
            <div className="space-y-4">
              {profile.education.map((edu) => (
                <div key={edu.id} className="border-l-2 border-green-200 pl-4">
                  <h4 className="font-semibold text-textPrimary">{edu.school}</h4>
                  <p className="text-sm text-textSecondary">
                    {edu.degree} in {edu.fieldOfStudy}
                  </p>
                  {edu.graduationDate && (
                    <p className="text-xs text-textSecondary mt-1">
                      {edu.current ? 'Expected ' : ''}
                      {new Date(edu.graduationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  {edu.gpa && (
                    <p className="text-xs text-textSecondary">GPA: {edu.gpa}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Work Authorization */}
        {profile.workAuthorization && (
          <Card>
            <h3 className="text-lg font-semibold text-textPrimary mb-4">Work Authorization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {profile.workAuthorization.authorizedToWork ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm text-textPrimary">
                  {profile.workAuthorization.authorizedToWork 
                    ? 'Authorized to work in the US' 
                    : 'Not authorized to work in the US'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {profile.workAuthorization.requiresSponsorship ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <span className="text-sm text-textPrimary">
                  {profile.workAuthorization.requiresSponsorship 
                    ? 'Requires visa sponsorship' 
                    : 'Does not require sponsorship'}
                </span>
              </div>
              {profile.workAuthorization.citizenshipStatus && (
                <div className="col-span-2">
                  <span className="text-sm text-textSecondary">Status: </span>
                  <span className="text-sm text-textPrimary">{profile.workAuthorization.citizenshipStatus}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Job Preferences */}
        {(profile.preferredTitles?.length > 0 || profile.preferredLocations?.length > 0 || profile.preferredJobTypes?.length > 0) && (
          <Card>
            <h3 className="text-lg font-semibold text-textPrimary mb-4">Job Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.preferredTitles && profile.preferredTitles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-textSecondary mb-2">Preferred Roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferredTitles.map((title) => (
                      <span key={title} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.preferredLocations && profile.preferredLocations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-textSecondary mb-2">Preferred Locations</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferredLocations.map((loc) => (
                      <span key={loc} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.preferredJobTypes && profile.preferredJobTypes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-textSecondary mb-2">Job Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferredJobTypes.map((type) => (
                      <span key={type} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.salaryExpectation && (profile.salaryExpectation.min || profile.salaryExpectation.max) && (
                <div>
                  <h4 className="text-sm font-medium text-textSecondary mb-2">Salary Expectation</h4>
                  <p className="text-sm text-textPrimary">
                    {profile.salaryExpectation.currency || 'USD'} {profile.salaryExpectation.min?.toLocaleString()} - {profile.salaryExpectation.max?.toLocaleString()} / year
                  </p>
                </div>
              )}
              {profile.availability && (
                <div>
                  <h4 className="text-sm font-medium text-textSecondary mb-2">Availability</h4>
                  <p className="text-sm text-textPrimary">{profile.availability}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Debug: Raw Profile Data (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-yellow-200 bg-yellow-50">
            <details>
              <summary className="text-sm font-semibold text-yellow-800 cursor-pointer mb-2">
                🔧 Debug: View Raw Profile Data
              </summary>
              <pre className="text-xs text-yellow-900 overflow-auto max-h-96 p-3 bg-yellow-100 rounded">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </details>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
