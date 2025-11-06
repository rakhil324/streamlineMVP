'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import JobCard from '@/components/ui/JobCard';
import { mockJobs } from '@/lib/mockData';
import { motion, AnimatePresence } from 'framer-motion';

const statusTabs = ['All', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

export default function TrackerPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [jobs, setJobs] = useState(mockJobs);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);

  const filteredJobs = activeTab === 'All' 
    ? jobs 
    : jobs.filter(job => job.status === activeTab);

  const jobsByStatus = {
    Applied: jobs.filter(job => job.status === 'Applied'),
    Interviewing: jobs.filter(job => job.status === 'Interviewing'),
    Offer: jobs.filter(job => job.status === 'Offer'),
    Rejected: jobs.filter(job => job.status === 'Rejected'),
  };

  const handleDragStart = (jobId: string) => {
    setDraggedJob(jobId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (newStatus: 'Applied' | 'Interviewing' | 'Offer' | 'Rejected') => {
    if (draggedJob) {
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === draggedJob ? { ...job, status: newStatus } : job
        )
      );
      setDraggedJob(null);
    }
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
          <p className="text-sm text-textSecondary mb-4">
            Drag and drop jobs to change their status (demo)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(jobsByStatus).map(([status, statusJobs]) => (
              <div
                key={status}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status as 'Applied' | 'Interviewing' | 'Offer' | 'Rejected')}
                className="flex flex-col"
              >
                <Card className="flex-1 p-4 min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-textPrimary">{status}</h4>
                    <span className="bg-gray-100 text-textSecondary text-xs px-2 py-1 rounded-full">
                      {statusJobs.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {statusJobs.length > 0 ? (
                        statusJobs.map((job) => (
                          <motion.div
                            key={job.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            draggable
                            onDragStart={() => handleDragStart(job.id)}
                            className={`p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-move ${
                              draggedJob === job.id ? 'opacity-50' : ''
                            }`}
                          >
                            <h5 className="font-medium text-textPrimary text-sm mb-1">
                              {job.title}
                            </h5>
                            <p className="text-xs text-textSecondary">{job.company}</p>
                            <p className="text-xs text-textSecondary mt-1">
                              {job.location}
                            </p>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-textSecondary text-sm border-2 border-dashed border-gray-200 rounded-lg">
                          Drop jobs here
                        </div>
                      )}
                    </AnimatePresence>
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
