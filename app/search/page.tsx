'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import JobCard from '@/components/ui/JobCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Search, MapPin, Briefcase, Filter, X } from 'lucide-react';
import { mockJobs, Job } from '@/lib/mockData';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('all');
  const [filteredJobs, setFilteredJobs] = useState<Job[]>(mockJobs);
  const [showFilters, setShowFilters] = useState(false);
  
  // Check if there's a job parameter in the URL
  useEffect(() => {
    const jobParam = searchParams.get('job');
    if (jobParam) {
      const job = mockJobs.find(j => j.id === jobParam);
      if (job) {
        router.replace(`/jobs/${jobParam}`);
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    let results = mockJobs;

    // Search filter
    if (searchQuery) {
      results = results.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Location filter
    if (location) {
      results = results.filter(job =>
        job.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Type filter
    if (jobType !== 'all') {
      results = results.filter(job =>
        job.type.toLowerCase() === jobType.toLowerCase()
      );
    }

    setFilteredJobs(results);
  }, [searchQuery, location, jobType]);

  const clearFilters = () => {
    setSearchQuery('');
    setLocation('');
    setJobType('all');
  };

  const hasActiveFilters = searchQuery || location || jobType !== 'all';

  return (
    <MainLayout title="Job Search">
      <div className="space-y-6">
        {/* Search Bar */}
        <Card>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
              <input
                type="text"
                placeholder="Search by job title, company, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm text-textSecondary">
                  {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
                </span>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Results */}
        {filteredJobs.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-textPrimary">
                Search Results
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} {...job} />
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-textPrimary mb-2">
                No jobs found
              </h3>
              <p className="text-textSecondary mb-4">
                Try adjusting your search criteria or filters
              </p>
              {hasActiveFilters && (
                <Button variant="primary" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Job Search">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-textSecondary">Loading...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <SearchContent />
    </Suspense>
  );
}

