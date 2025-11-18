'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import JobCard from '@/components/ui/JobCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Search, Filter, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import { mockJobs } from '@/lib/mockData';

export default function SavedJobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [savedJobs, setSavedJobs] = useState(mockJobs.slice(0, 8));
  const [removedJobs, setRemovedJobs] = useState<Set<string>>(new Set());

  const handleRemove = (jobId: string) => {
    setRemovedJobs(prev => {
      const newSet = new Set(prev);
      newSet.add(jobId);
      return newSet;
    });
    setTimeout(() => {
      setSavedJobs(prev => prev.filter(job => job.id !== jobId));
      setRemovedJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }, 300);
  };

  const filteredJobs = savedJobs.filter(job => {
    if (removedJobs.has(job.id)) return false;
    return (
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} saved
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
              <div key={job.id} className="relative group">
                <JobCard {...job} />
                <button
                  onClick={() => handleRemove(job.id)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  title="Remove from saved"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-16">
              {searchQuery ? (
                <>
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-textSecondary mb-2">
                    No jobs match your search criteria
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-textSecondary mb-2">No saved jobs yet</p>
                  <p className="text-sm text-textSecondary mb-4">
                    Save jobs while browsing to view them here
                  </p>
                  <Button variant="primary" onClick={() => window.location.href = '/search'}>
                    Browse Jobs
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        {filteredJobs.length > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-textPrimary mb-1">Quick Actions</h3>
                <p className="text-sm text-textSecondary">Manage your saved jobs</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4" />
                  Apply to All
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
