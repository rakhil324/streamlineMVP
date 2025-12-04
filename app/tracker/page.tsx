'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import JobCard from '@/components/ui/JobCard';
import { Job } from '@/lib/mockData';

export default function TrackerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs from API
  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        const response = await fetch('/api/jobs');
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to view your job tracker');
          } else {
            setError('Failed to load jobs');
          }
          return;
        }
        const data = await response.json();
        // Filter to only show jobs with "Applied" status
        const appliedJobs = (data.jobs || []).filter((job: Job) => job.status === 'Applied');
        setJobs(appliedJobs);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    }
    
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <MainLayout title="Job Tracker">
        <Card>
          <div className="text-center py-12">
            <p className="text-textSecondary">Loading jobs...</p>
          </div>
        </Card>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Job Tracker">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Job Tracker">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-textPrimary">Applied Jobs</h2>
          <span className="bg-gray-100 text-textSecondary text-sm px-3 py-1 rounded-full">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        </div>

        {/* Jobs List */}
        {jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <p className="text-textSecondary">No applied jobs yet</p>
              <p className="text-sm text-textSecondary mt-2">
                Use the autofill feature on job application pages to automatically add jobs here
              </p>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
