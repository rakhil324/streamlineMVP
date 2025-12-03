'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, LayoutDashboard, Search, CheckSquare, Bookmark, Sparkles, Settings, Puzzle } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Job Search', path: '/search', icon: Search },
  { name: 'Tracker', path: '/tracker', icon: CheckSquare },
  { name: 'Saved Jobs', path: '/saved', icon: Bookmark },
  { name: 'AI Tools', path: '/ai-tools', icon: Sparkles },
  { name: 'Extension', path: '/extension', icon: Puzzle },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    setIsOpen(false);
  };

  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';
  const userEmail = session?.user?.email || 'user@example.com';
  const userName = session?.user?.name || 'User';

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 shadow-sm z-30 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-primary">Streamline.ai</h1>
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
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-6 py-4 border-b border-gray-100 flex items-center gap-3 ${
                    isActive
                      ? 'bg-primary bg-opacity-10 text-primary font-medium border-l-4 border-primary'
                      : 'text-textSecondary hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                {session?.user?.image ? (
                  <img src={session.user.image} alt={userName} className="w-full h-full rounded-full" />
                ) : (
                  userInitial
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-textPrimary">{userName}</p>
                <p className="text-xs text-textSecondary">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-textSecondary hover:bg-gray-50 hover:text-red-600 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

