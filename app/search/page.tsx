'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import { Search, MapPin, Briefcase } from 'lucide-react';

export default function SearchPage() {
  return (
    <MainLayout title="Job Search">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-8 text-center">
          <Search className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-semibold text-textPrimary mb-2">
            Job Search
          </h2>
          <p className="text-textSecondary mb-6">
            Search and discover new job opportunities
          </p>
          <div className="max-w-xl mx-auto space-y-4">
            <input
              type="text"
              placeholder="Search by job title, company, or keyword..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
                <input
                  type="text"
                  placeholder="Location"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
                <select className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Job Type</option>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

