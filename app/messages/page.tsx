'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, Send, Paperclip } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const router = useRouter();

  return (
    <MainLayout title="Messages">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-textPrimary">Sarah Johnson</h2>
                <p className="text-sm text-textSecondary">Recruiter at Google</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-start">
              <div className="max-w-[70%] bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-textPrimary">
                  Hi! Thanks for your application to Google. We're impressed with your background and would like to schedule an interview for the Senior Frontend Developer position.
                </p>
                <p className="text-xs text-textSecondary mt-2">2 hours ago</p>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[70%] bg-primary text-white rounded-lg p-4">
                <p className="text-sm">
                  Thank you so much! I'm very interested and excited about this opportunity. When would be a good time to schedule the interview?
                </p>
                <p className="text-xs opacity-75 mt-2">1 hour ago</p>
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[70%] bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-textPrimary">
                  How about next Wednesday at 2 PM Pacific Time? We'll send you a calendar invite with the Zoom link.
                </p>
                <p className="text-xs text-textSecondary mt-2">30 minutes ago</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-textSecondary">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button variant="primary" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

