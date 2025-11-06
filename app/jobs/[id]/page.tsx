'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import { ArrowLeft, MapPin, Briefcase, DollarSign, Calendar, Building2, CheckCircle } from 'lucide-react';
import { mockJobs } from '@/lib/mockData';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;
  
  const job = mockJobs.find(j => j.id === jobId);

  // Debug: Log if job is not found
  if (!job && jobId) {
    console.log('Job not found for ID:', jobId);
    console.log('Available job IDs:', mockJobs.map(j => j.id));
  }

  if (!job) {
    return (
      <MainLayout title="Job Not Found">
        <Card>
          <div className="text-center py-12">
            <p className="text-textSecondary mb-4">Job not found</p>
            <Button variant="primary" onClick={() => router.push('/search')}>
              Back to Search
            </Button>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={job.title}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-textSecondary hover:text-textPrimary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Job Header */}
        <Card>
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-textPrimary mb-2">{job.title}</h1>
                  <p className="text-xl text-textSecondary mb-3">{job.company}</p>
                </div>
                <Tag 
                  label={job.status} 
                  variant={
                    job.status === 'Offer' ? 'success' : 
                    job.status === 'Rejected' ? 'danger' : 
                    job.status === 'Interviewing' ? 'info' : 
                    'default'
                  } 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-textSecondary">
                  <MapPin className="w-5 h-5" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-textSecondary">
                  <Briefcase className="w-5 h-5" />
                  <span>{job.type}</span>
                </div>
                {job.salary && (
                  <div className="flex items-center gap-2 text-textSecondary">
                    <DollarSign className="w-5 h-5" />
                    <span>{job.salary}</span>
                  </div>
                )}
              </div>

              {job.deadline && (
                <div className="flex items-center gap-2 text-textSecondary">
                  <Calendar className="w-5 h-5" />
                  <span>Application Deadline: {job.deadline}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Job Description */}
        <Card>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">Job Description</h2>
          <div className="prose max-w-none">
            <p className="text-textPrimary leading-relaxed mb-4">
              {job.description || `We are looking for a talented ${job.title} to join our team at ${job.company}. This role involves building innovative solutions and working with cutting-edge technologies.`}
            </p>
            
            <div className="mb-4">
              <h3 className="font-semibold text-textPrimary mb-2">Key Responsibilities:</h3>
              <ul className="list-disc list-inside space-y-1 text-textSecondary">
                <li>Develop and maintain scalable web applications</li>
                <li>Collaborate with cross-functional teams</li>
                <li>Write clean, maintainable code</li>
                <li>Participate in code reviews and technical discussions</li>
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-textPrimary mb-2">Requirements:</h3>
              <ul className="list-disc list-inside space-y-1 text-textSecondary">
                <li>5+ years of experience in frontend development</li>
                <li>Strong proficiency in React and TypeScript</li>
                <li>Experience with modern JavaScript frameworks</li>
                <li>Excellent problem-solving skills</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Skills/Keywords */}
        {job.keywords && job.keywords.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-textPrimary mb-4">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.keywords.map((keyword) => (
                <Tag key={keyword} label={keyword} variant="info" />
              ))}
            </div>
          </Card>
        )}

        {/* Application Info */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">Application Status</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-textSecondary">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Applied: {job.appliedDate}</span>
                </div>
                {job.status === 'Interviewing' && (
                  <div className="flex items-center gap-2 text-textSecondary">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span>Interview scheduled</span>
                  </div>
                )}
                {job.status === 'Offer' && (
                  <div className="flex items-center gap-2 text-textSecondary">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Offer received</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/tracker')}>
                View in Tracker
              </Button>
              <Button variant="primary">
                Apply Now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

