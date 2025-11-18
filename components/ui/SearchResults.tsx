'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { mockJobs } from '@/lib/mockData';
import { Building2, MapPin, Briefcase } from 'lucide-react';

interface SearchResultsProps {
  query: string;
  onSelect?: () => void;
}

export default function SearchResults({ query, onSelect }: SearchResultsProps) {
  const router = useRouter();
  
  if (!query.trim()) return null;

  const filteredJobs = mockJobs.filter(job =>
    job.title.toLowerCase().includes(query.toLowerCase()) ||
    job.company.toLowerCase().includes(query.toLowerCase()) ||
    job.location.toLowerCase().includes(query.toLowerCase()) ||
    job.keywords?.some(k => k.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 5);

  if (filteredJobs.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
        <div className="p-4 text-center text-textSecondary text-sm">
          No jobs found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
      <div className="p-2">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            onClick={() => {
              router.push(`/jobs/${job.id}`);
              onSelect?.();
            }}
            className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-textSecondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-textPrimary text-sm truncate">{job.title}</h4>
                <p className="text-xs text-textSecondary">{job.company}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-textSecondary">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{job.type}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredJobs.length === 5 && (
          <div
            onClick={() => {
              router.push(`/search?q=${encodeURIComponent(query)}`);
              onSelect?.();
            }}
            className="p-3 text-center text-primary text-sm font-medium hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-t border-gray-200 mt-2"
          >
            View all results for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}

