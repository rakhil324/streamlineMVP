'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, Bell, MessageSquare, User, ChevronDown } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import NotificationsDropdown from './NotificationsDropdown';
import MessagesDropdown from './MessagesDropdown';
import ProfileDropdown from './ProfileDropdown';
import SearchResults from '@/components/ui/SearchResults';

interface HeaderBarProps {
  title: string;
}

export default function HeaderBar({ title }: HeaderBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';

  const handleSearch = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowResults(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults]);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-60 h-16 bg-white border-b border-gray-100 shadow-sm z-30">
      <div className="flex items-center justify-between h-full px-4 md:px-6 lg:px-8">
        {/* Left: Title */}
        <h1 className="text-lg md:text-xl font-semibold text-textPrimary">{title}</h1>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4 lg:mx-8">
          <div className="relative w-full" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondary" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(e.target.value.length > 0);
              }}
              onFocus={() => {
                if (searchQuery.length > 0) {
                  setShowResults(true);
                }
              }}
              onKeyDown={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white transition-all"
            />
            {showResults && searchQuery && (
              <SearchResults 
                query={searchQuery} 
                onSelect={() => setShowResults(false)}
              />
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Notifications */}
          <Dropdown
            trigger={
              <div className="relative p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded-lg transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </div>
            }
            align="right"
          >
            <NotificationsDropdown />
          </Dropdown>
          
          {/* Messages */}
          <Dropdown
            trigger={
              <div className="relative p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded-lg transition-all">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
            }
            align="right"
          >
            <MessagesDropdown />
          </Dropdown>

          {/* Profile */}
          <Dropdown
            trigger={
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-all">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt={session.user.name || ''} className="w-full h-full rounded-full" />
                  ) : (
                    userInitial
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-textSecondary hidden md:block" />
              </div>
            }
            align="right"
            width="normal"
          >
            <ProfileDropdown />
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

