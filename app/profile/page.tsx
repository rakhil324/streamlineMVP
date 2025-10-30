'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, Mail, MapPin, Briefcase, Download } from 'lucide-react';

export default function ProfilePage() {
  return (
    <MainLayout title="Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-textPrimary mb-1">Hriday Sainathuni</h2>
              <p className="text-textSecondary mb-4">Senior Frontend Developer</p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-textSecondary">
                  <Mail className="w-4 h-4" />
                  <span>hriday@streamline.ai</span>
                </div>
                <div className="flex items-center gap-2 text-textSecondary">
                  <MapPin className="w-4 h-4" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2 text-textSecondary">
                  <Briefcase className="w-4 h-4" />
                  <span>Available for opportunities</span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Resume
            </Button>
          </div>
        </Card>

        {/* About Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">About</h3>
          <p className="text-textSecondary leading-relaxed">
            Experienced frontend developer with a passion for building intuitive and performant web applications. 
            Skilled in React, TypeScript, and modern web technologies. Always eager to learn and contribute to 
            innovative projects.
          </p>
        </Card>

        {/* Skills Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Node.js', 'Git', 'Figma'].map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>

        {/* Experience Section */}
        <Card>
          <h3 className="text-lg font-semibold text-textPrimary mb-4">Experience</h3>
          <div className="space-y-4">
            <div className="border-l-2 border-gray-200 pl-4">
              <h4 className="font-semibold text-textPrimary">Senior Frontend Developer</h4>
              <p className="text-sm text-textSecondary">Tech Company • 2021 - Present</p>
              <p className="text-sm text-textSecondary mt-2">
                Led frontend development for multiple products, improved performance by 40%, and mentored junior developers.
              </p>
            </div>
            <div className="border-l-2 border-gray-200 pl-4">
              <h4 className="font-semibold text-textPrimary">Frontend Developer</h4>
              <p className="text-sm text-textSecondary">Startup Inc. • 2019 - 2021</p>
              <p className="text-sm text-textSecondary mt-2">
                Built and maintained multiple web applications, collaborated with cross-functional teams.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

