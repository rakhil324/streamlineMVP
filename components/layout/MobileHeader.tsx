'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/' },
  { name: 'Job Search', path: '/search' },
  { name: 'Tracker', path: '/tracker' },
  { name: 'Saved Jobs', path: '/saved' },
  { name: 'AI Tools', path: '/ai-tools' },
  { name: 'Settings', path: '/settings' },
];

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 shadow-sm z-30 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-primary">Simplify</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-textSecondary hover:text-textPrimary"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 mt-16">
          <nav className="flex flex-col">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-6 py-4 border-b border-gray-100 ${
                    isActive
                      ? 'bg-primary bg-opacity-10 text-primary font-medium border-l-4 border-primary'
                      : 'text-textSecondary hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-textPrimary">Hriday Sainathuni</p>
                <p className="text-xs text-textSecondary">hriday@simplify.com</p>
              </div>
            </div>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-textSecondary hover:bg-gray-50">
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

