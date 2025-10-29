'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Sparkles, FileText, MessageSquare, Zap } from 'lucide-react';

export default function AIToolsPage() {
  const tools = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Resume Builder',
      description: 'AI-powered resume builder with industry-specific templates',
      comingSoon: true,
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'Cover Letter Writer',
      description: 'Generate personalized cover letters in seconds',
      comingSoon: true,
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Interview Prep',
      description: 'Practice with AI interview questions and get feedback',
      comingSoon: true,
    },
  ];

  return (
    <MainLayout title="AI Tools">
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-textPrimary mb-2">
            AI-Powered Tools
          </h2>
          <p className="text-textSecondary">
            Supercharge your job search with our intelligent AI tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center text-primary mb-4">
                {tool.icon}
              </div>
              <h3 className="text-lg font-semibold text-textPrimary mb-2">
                {tool.title}
              </h3>
              <p className="text-sm text-textSecondary mb-4">
                {tool.description}
              </p>
              {tool.comingSoon && (
                <Button variant="outline" disabled className="w-full">
                  Coming Soon
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

