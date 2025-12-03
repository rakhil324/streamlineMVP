'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { FileText, Mic, Briefcase, Bookmark, Plus, Loader2, UserCircle } from 'lucide-react';
import { UserProfile } from '@/lib/profileTypes';

interface DashboardStats {
  totalApplications: number;
  interviews: number;
  offers: number;
  savedJobs: number;
}

interface Application {
  id: string;
  company: string;
  jobTitle: string;
  status: string;
  deadline?: string;
  appliedDate: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    interviews: 0,
    offers: 0,
    savedJobs: 0,
  });
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Application[]>([]);

  // Load profile and check onboarding status
  useEffect(() => {
    async function loadData() {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        // Load profile to check onboarding status
        const profileRes = await fetch('/api/profile');
        const profileData = await profileRes.json();
        
        // If no profile or onboarding not completed, redirect to onboarding
        if (!profileData.profileData || !profileData.profileData.onboardingCompleted) {
          router.push('/onboarding');
          return;
        }
        
        setProfile(profileData.profileData);

        // Load applications
        const appsRes = await fetch('/api/applications');
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          const applications = appsData.applications || [];
          
          // Calculate stats from real data
          setStats({
            totalApplications: applications.length,
            interviews: applications.filter((app: Application) => app.status === 'Interviewing').length,
            offers: applications.filter((app: Application) => app.status === 'Offer').length,
            savedJobs: applications.filter((app: Application) => app.status === 'Saved').length,
          });

          // Get recent applications
          setRecentApplications(applications.slice(0, 4));

          // Get upcoming deadlines
          const withDeadlines = applications
            .filter((app: Application) => app.deadline)
            .sort((a: Application, b: Application) => 
              new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
            )
            .slice(0, 3);
          setUpcomingDeadlines(withDeadlines);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [session, status, router]);

  if (isLoading || status === 'loading') {
    return (
      <MainLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const userName = profile?.firstName || session?.user?.name || session?.user?.email?.split('@')[0] || 'there';
  const firstName = userName.split(' ')[0];
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

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
          <Button 
            variant="primary" 
            size="lg" 
            className="flex items-center gap-2 w-full md:w-auto"
            onClick={() => router.push('/tracker')}
          >
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
            value={stats.totalApplications}
            icon={FileText}
            trend={stats.totalApplications > 0 ? `${stats.totalApplications} tracked` : undefined}
          />
          <StatCard
            title="Interviews"
            value={stats.interviews}
            icon={Mic}
            trend={stats.interviews > 0 ? `${stats.interviews} scheduled` : undefined}
          />
          <StatCard
            title="Offers"
            value={stats.offers}
            icon={Briefcase}
          />
          <StatCard
            title="Saved Jobs"
            value={stats.savedJobs}
            icon={Bookmark}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-textPrimary">Upcoming Deadlines</h3>
              <button 
                onClick={() => router.push('/tracker')}
                className="text-sm text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="space-y-4">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((app) => (
                  <div 
                    key={app.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                    onClick={() => router.push('/tracker')}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-textPrimary mb-1">{app.jobTitle}</h4>
                      <p className="text-sm text-textSecondary">{app.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-textPrimary">{app.deadline}</p>
                      <span className="inline-block text-xs text-textSecondary mt-1">
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-textSecondary">No upcoming deadlines</p>
                  <button 
                    onClick={() => router.push('/tracker')}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Add your first application
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-textPrimary">Recent Activity</h3>
              <button 
                onClick={() => router.push('/tracker')}
                className="text-sm text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="space-y-4">
              {recentApplications.length > 0 ? (
                recentApplications.map((app) => (
                  <div 
                    key={app.id} 
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                    onClick={() => router.push('/tracker')}
                  >
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-textPrimary">
                        Applied to <span className="font-medium">{app.jobTitle}</span> at {app.company}
                      </p>
                      <p className="text-xs text-textSecondary">
                        {new Date(app.appliedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-textSecondary">No recent activity</p>
                  <button 
                    onClick={() => router.push('/tracker')}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Start tracking your applications
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Profile Completion Reminder */}
        {profile && !profile.experience?.length && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Complete your profile</h3>
                <p className="text-sm text-gray-600">
                  Add your work experience to enable autofill for job applications
                </p>
              </div>
              <Button 
                variant="primary" 
                size="md"
                onClick={() => router.push('/profile')}
              >
                Update Profile
              </Button>
            </div>
          </Card>
        )}
      </motion.div>
    </MainLayout>
  );
}
