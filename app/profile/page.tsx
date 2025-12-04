'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  User, Mail, MapPin, Briefcase, Download, Upload, FileText, 
  CheckCircle, AlertCircle, Loader2, GraduationCap, Phone, 
  Globe, Linkedin, Edit2, Wrench, Calendar, DollarSign, Clock,
  Home, Languages, Award
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
  
  // Build full address string
  const addressParts = [];
  if (profile.address?.street) addressParts.push(profile.address.street);
  if (profile.address?.city) addressParts.push(profile.address.city);
  if (profile.address?.state) addressParts.push(profile.address.state);
  if (profile.address?.zip) addressParts.push(profile.address.zip);
  if (profile.address?.country && profile.address.country !== 'United States') {
    addressParts.push(profile.address.country);
  }
  const fullAddress = addressParts.join(', ');
  const shortLocation = profile.address?.city && profile.address?.state 
    ? `${profile.address.city}, ${profile.address.state}` 
    : '';

  return (
    <MainLayout title="Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex items-start gap-6 flex-col sm:flex-row">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              {session?.user?.image ? (
                <img src={session.user.image} alt={fullName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {profile.firstName?.[0]?.toUpperCase() || 'U'}{profile.lastName?.[0]?.toUpperCase() || ''}
                </span>
              )}
            </div>
            <div className="flex-1 w-full">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-textPrimary mb-1">
                    {fullName}
                  </h2>
                  {profile.preferredTitles?.[0] && (
                    <p className="text-lg text-textSecondary mb-3">{profile.preferredTitles[0]}</p>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/onboarding?edit=true')}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>
              
              {/* Contact Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {profile.email && (
                  <div className="flex items-center gap-2 text-sm text-textSecondary">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm text-textSecondary">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {shortLocation && (
                  <div className="flex items-center gap-2 text-sm text-textSecondary">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{shortLocation}</span>
                  </div>
                )}
                {profile.linkedIn && (
                  <a 
                    href={profile.linkedIn.startsWith('http') ? profile.linkedIn : `https://${profile.linkedIn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Linkedin className="w-4 h-4 flex-shrink-0" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {profile.portfolio && (
                  <a 
                    href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span>Portfolio</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Full Address (if street address exists) */}
        {profile.address?.street && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-5 h-5 text-textPrimary" />
              <h3 className="text-lg font-semibold text-textPrimary">Address</h3>
            </div>
            <p className="text-textSecondary">{fullAddress}</p>
          </Card>
        )}

        {/* Documents Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Documents</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
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

        {/* Work Authorization */}
        {profile.workAuthorization && (
          <Card>
            <h3 className="text-lg font-semibold text-textPrimary mb-4">Work Authorization</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                {profile.workAuthorization.authorizedToWork ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                )}
                <span className="text-sm text-textPrimary">
                  {profile.workAuthorization.authorizedToWork 
                    ? 'Authorized to work in the US' 
                    : 'Not authorized to work in the US'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {profile.workAuthorization.requiresSponsorship ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                <span className="text-sm text-textPrimary">
                  {profile.workAuthorization.requiresSponsorship 
                    ? 'Requires visa sponsorship' 
                    : 'Does not require sponsorship'}
                </span>
              </div>
              {profile.workAuthorization.citizenshipStatus && (
                <div className="sm:col-span-2">
                  <span className="text-sm text-textSecondary">Status: </span>
                  <span className="text-sm text-textPrimary font-medium">{profile.workAuthorization.citizenshipStatus}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Skills, Languages, Certifications */}
        {(profile.skills?.length > 0 || profile.languages?.length > 0 || profile.certifications?.length > 0) && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-textPrimary" />
              <h3 className="text-lg font-semibold text-textPrimary">Skills & Qualifications</h3>
            </div>
            
            {profile.skills && profile.skills.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-textSecondary mb-2">Skills</h4>
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
              </div>
            )}
            
            {profile.languages && profile.languages.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-textSecondary mb-2 flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  Languages
                </h4>
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
              <div>
                <h4 className="text-sm font-medium text-textSecondary mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Certifications
                </h4>
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
            <div className="space-y-6">
              {profile.experience.map((exp, index) => (
                <div key={exp.id} className={index > 0 ? 'pt-6 border-t border-gray-100' : ''}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-textPrimary">{exp.title}</h4>
                      <p className="text-sm text-textSecondary">
                        {exp.company} {exp.location && `• ${exp.location}`}
                      </p>
                      <p className="text-xs text-textSecondary mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {exp.startDate && new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        {' - '}
                        {exp.current ? 'Present' : exp.endDate && new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                      {exp.description && (
                        <p className="text-sm text-textSecondary mt-3 whitespace-pre-line">{exp.description}</p>
                      )}
                    </div>
                  </div>
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
            <div className="space-y-6">
              {profile.education.map((edu, index) => (
                <div key={edu.id} className={index > 0 ? 'pt-6 border-t border-gray-100' : ''}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-textPrimary">{edu.school}</h4>
                      <p className="text-sm text-textSecondary">
                        {edu.degree} in {edu.fieldOfStudy}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        {edu.graduationDate && (
                          <p className="text-xs text-textSecondary flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {edu.current ? 'Expected ' : ''}
                            {new Date(edu.graduationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {edu.gpa && (
                          <p className="text-xs text-textSecondary">GPA: {edu.gpa}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Job Preferences */}
        {(profile.preferredTitles?.length > 0 || profile.preferredLocations?.length > 0 || profile.preferredJobTypes?.length > 0 || profile.salaryExpectation || profile.availability) && (
          <Card>
            <h3 className="text-lg font-semibold text-textPrimary mb-4">Job Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.preferredTitles && profile.preferredTitles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-textSecondary mb-2">Target Roles</h4>
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
                  <h4 className="text-sm font-medium text-textSecondary mb-2 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Preferred Locations
                  </h4>
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
                  <h4 className="text-sm font-medium text-textSecondary mb-2 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Salary Expectation
                  </h4>
                  <p className="text-sm text-textPrimary">
                    {profile.salaryExpectation.currency || 'USD'} {profile.salaryExpectation.min?.toLocaleString()} - {profile.salaryExpectation.max?.toLocaleString()} / year
                  </p>
                </div>
              )}
              {profile.availability && (
                <div>
                  <h4 className="text-sm font-medium text-textSecondary mb-2 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Availability
                  </h4>
                  <p className="text-sm text-textPrimary">{profile.availability}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
