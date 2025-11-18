'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import { ArrowLeft, MapPin, Briefcase, Building2, CheckCircle } from 'lucide-react';
import { Job } from '@/lib/mockData';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch job from API
  useEffect(() => {
    async function fetchJob() {
      if (!jobId) {
        setError('Invalid job ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/jobs');
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to view job details');
          } else {
            setError('Failed to load job');
          }
          return;
        }
        const data = await response.json();
        if (data.success) {
          const foundJob = (data.jobs || []).find((j: Job) => j.id === jobId);
          if (foundJob) {
            setJob(foundJob);
          } else {
            setError('Job not found');
          }
        }
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    }
    
    fetchJob();
  }, [jobId]);

  if (loading) {
    return (
      <MainLayout title="Job Details">
        <Card>
          <div className="text-center py-12">
            <p className="text-textSecondary">Loading job details...</p>
          </div>
        </Card>
      </MainLayout>
    );
  }

  if (error || !job) {
    return (
      <MainLayout title="Job Details">
        <Card>
          <div className="text-center py-12">
            <p className="text-textSecondary mb-4">{error || 'Job not found'}</p>
            <Button variant="primary" onClick={() => router.push('/tracker')}>
              Back to Tracker
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
          onClick={() => router.push('/tracker')}
          className="flex items-center gap-2 text-textSecondary hover:text-textPrimary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tracker</span>
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
                  variant="default"
                />
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-textSecondary">
                  <MapPin className="w-5 h-5" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-textSecondary">
                  <Briefcase className="w-5 h-5" />
                  <span>{job.type}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-textSecondary">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Applied: {job.appliedDate}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Brief Description */}
        <Card>
          <h2 className="text-xl font-semibold text-textPrimary mb-4">Description</h2>
          <div className="prose max-w-none">
            {job.description ? (
              <p className="text-textPrimary leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            ) : (
              <p className="text-textSecondary italic">
              No description available for this job.
              </p>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

