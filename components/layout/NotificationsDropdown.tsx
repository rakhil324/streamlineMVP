'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle, Clock, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'success' | 'info' | 'warning';
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Job Match',
    message: 'Found 5 new jobs matching your skills',
    time: '5 minutes ago',
    read: false,
    type: 'info',
  },
  {
    id: '2',
    title: 'Application Update',
    message: 'Your application to Google has been reviewed',
    time: '1 hour ago',
    read: false,
    type: 'success',
  },
  {
    id: '3',
    title: 'Interview Reminder',
    message: 'Interview with Meta scheduled for tomorrow at 2 PM',
    time: '2 hours ago',
    read: true,
    type: 'warning',
  },
];

export default function NotificationsDropdown() {
  const router = useRouter();
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notificationId: string) => {
    // Navigate to relevant page based on notification type
    router.push('/tracker');
  };

  const handleMarkAllRead = () => {
    // Handle mark all as read
    alert('All notifications marked as read!');
  };

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-textPrimary">Notifications</h3>
        <span className="text-xs text-primary font-medium">{unreadCount} new</span>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {mockNotifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {mockNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id)}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${
                    notification.type === 'success' ? 'text-green-600' :
                    notification.type === 'warning' ? 'text-yellow-600' :
                    'text-primary'
                  }`}>
                    {notification.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : notification.type === 'warning' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!notification.read ? 'text-textPrimary' : 'text-textSecondary'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-textSecondary mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                      {notification.time}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-textSecondary text-sm">No notifications</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button 
          onClick={handleMarkAllRead}
          className="text-sm text-primary font-medium hover:underline w-full text-center"
        >
          Mark all as read
        </button>
      </div>
    </div>
  );
}

