'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import JobCard from '@/components/ui/JobCard';
import { mockJobs } from '@/lib/mockData';

const statusTabs = ['All', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

export default function TrackerPage() {
  const [activeTab, setActiveTab] = useState('All');

  const filteredJobs = activeTab === 'All' 
    ? mockJobs 
    : mockJobs.filter(job => job.status === activeTab);

  const jobsByStatus = {
    Applied: mockJobs.filter(job => job.status === 'Applied'),
    Interviewing: mockJobs.filter(job => job.status === 'Interviewing'),
    Offer: mockJobs.filter(job => job.status === 'Offer'),
    Rejected: mockJobs.filter(job => job.status === 'Rejected'),
  };

  return (
    <MainLayout title="Job Tracker">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-all relative ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
              )}
            </button>
          ))}
        </div>

        {/* List View */}
        {activeTab === 'All' ? (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
            {filteredJobs.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <p className="text-textSecondary">No jobs with status "{activeTab}"</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Kanban View */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-textPrimary mb-4">Kanban Board</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(jobsByStatus).map(([status, jobs]) => (
              <div key={status} className="flex flex-col">
                <Card className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-textPrimary">{status}</h4>
                    <span className="bg-gray-100 text-textSecondary text-xs px-2 py-1 rounded-full">
                      {jobs.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {jobs.length > 0 ? (
                      jobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                        >
                          <h5 className="font-medium text-textPrimary text-sm mb-1">
                            {job.title}
                          </h5>
                          <p className="text-xs text-textSecondary">{job.company}</p>
                          <p className="text-xs text-textSecondary mt-1">
                            {job.location}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-textSecondary text-sm">
                        No jobs
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

