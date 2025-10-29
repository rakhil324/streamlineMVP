'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import JobCard from '@/components/ui/JobCard';
import Button from '@/components/ui/Button';
import { Search, Filter } from 'lucide-react';
import { mockJobs } from '@/lib/mockData';

export default function SavedJobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const savedJobs = mockJobs.slice(0, 6); // Mock saved jobs

  const filteredJobs = savedJobs.filter(
    job =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Saved Jobs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary mb-1">
              Saved Jobs
            </h2>
            <p className="text-textSecondary">
              {savedJobs.length} jobs saved
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
          <input
            type="text"
            placeholder="Search saved jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white transition-all"
          />
        </div>

        {/* Job Grid */}
        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-card shadow-card">
            <p className="text-textSecondary">
              {searchQuery 
                ? 'No jobs match your search criteria' 
                : 'No saved jobs yet'}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

