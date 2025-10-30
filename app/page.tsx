'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/layout/MainLayout';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import JobCard from '@/components/ui/JobCard';
import { FileText, Mic, Briefcase, Bookmark, Plus } from 'lucide-react';
import { mockJobs, mockStats } from '@/lib/mockData';

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'there';
  const firstName = userName.split(' ')[0];
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const upcomingJobs = mockJobs.filter(job => job.deadline).slice(0, 3);
  const recentJobs = mockJobs.slice(0, 2);

  return (
    <MainLayout title="Dashboard">
      <motion.div 
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Header */}
        <motion.div 
          className="flex items-center justify-between flex-col md:flex-row gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="text-3xl font-bold text-textPrimary mb-2">
              Welcome back, {firstName} 👋
            </h2>
            <p className="text-textSecondary">
              Here's a quick look at your job search progress.
            </p>
          </div>
          <Button variant="primary" size="lg" className="flex items-center gap-2 w-full md:w-auto">
            <Plus className="w-5 h-5" />
            Add Job
          </Button>
        </motion.div>

        {/* Metrics Overview */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            title="Total Applications"
            value={mockStats.totalApplications}
            icon={FileText}
            trend="↑ 12% this month"
          />
          <StatCard
            title="Interviews"
            value={mockStats.interviews}
            icon={Mic}
            trend="3 scheduled"
          />
          <StatCard
            title="Offers"
            value={mockStats.offers}
            icon={Briefcase}
          />
          <StatCard
            title="Saved Jobs"
            value={mockStats.savedJobs}
            icon={Bookmark}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-textPrimary">Upcoming Deadlines</h3>
              <button className="text-sm text-primary hover:underline">View all</button>
            </div>
            <div className="space-y-4">
              {upcomingJobs.length > 0 ? (
                upcomingJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer">
                    <div className="flex-1">
                      <h4 className="font-medium text-textPrimary mb-1">{job.title}</h4>
                      <p className="text-sm text-textSecondary">{job.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-textPrimary">{job.deadline}</p>
                      <span className="inline-block text-xs text-textSecondary mt-1">
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-textSecondary text-center py-4">No upcoming deadlines</p>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-textPrimary">Recent Activity</h3>
              <button className="text-sm text-primary hover:underline">View all</button>
            </div>
            <div className="space-y-4">
              {mockJobs.slice(0, 4).map((job) => (
                <div key={job.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-textPrimary">
                      Applied to <span className="font-medium">{job.title}</span> at {job.company}
                    </p>
                    <p className="text-xs text-textSecondary">{job.appliedDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Saved Jobs Preview */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-textPrimary">Saved Jobs</h3>
            <button className="text-sm text-primary hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentJobs.map((job) => (
              <JobCard key={job.id} {...job} />
            ))}
          </div>
        </Card>
      </motion.div>
    </MainLayout>
  );
}

