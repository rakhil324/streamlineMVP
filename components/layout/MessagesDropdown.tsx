'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, User } from 'lucide-react';

interface Message {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: boolean;
  avatar?: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    preview: 'Thanks for your application! We would like to schedule an interview...',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: '2',
    name: 'Mike Chen',
    preview: 'Great to meet you! Looking forward to discussing the role...',
    time: '5 hours ago',
    unread: true,
  },
  {
    id: '3',
    name: 'Emily Davis',
    preview: 'Your application has been moved to the next round.',
    time: '1 day ago',
    unread: false,
  },
];

export default function MessagesDropdown() {
  const router = useRouter();
  const unreadCount = mockMessages.filter(m => m.unread).length;

  const handleMessageClick = (messageId: string) => {
    router.push('/messages');
  };

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-textPrimary">Messages</h3>
        <span className="text-xs text-primary font-medium">{unreadCount} unread</span>
      </div>

      {/* Messages List */}
      <div className="max-h-96 overflow-y-auto">
        {mockMessages.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {mockMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => handleMessageClick(message.id)}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                  message.unread ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    {message.avatar ? (
                      <img src={message.avatar} alt={message.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium truncate ${message.unread ? 'text-textPrimary' : 'text-textSecondary'}`}>
                        {message.name}
                      </p>
                      {message.unread && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    <p className="text-sm text-textSecondary line-clamp-2">
                      {message.preview}
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                      {message.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-textSecondary text-sm">No messages</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button className="text-sm text-primary font-medium hover:underline w-full text-center flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          View all messages
        </button>
      </div>
    </div>
  );
}

