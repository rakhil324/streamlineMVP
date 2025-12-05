'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Sparkles, Settings, User, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
  { name: 'Tracker', icon: <CheckSquare className="w-5 h-5" />, path: '/tracker' },
  { name: 'AI Tools', icon: <Sparkles className="w-5 h-5" />, path: '/ai-tools' },
  { name: 'Profile', icon: <User className="w-5 h-5" />, path: '/profile' },
  { name: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/settings' },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';
  const userEmail = session?.user?.email || 'user@example.com';
  const userName = session?.user?.name || 'User';

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white shadow-card border-r border-gray-100 transition-all duration-300 z-40 hidden md:block ${
      isCollapsed ? 'w-20' : 'w-60'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          {!isCollapsed ? (
            <h1 className="text-2xl font-bold text-primary">Streamline.ai</h1>
          ) : (
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={true}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-100 ${
                  isActive
                    ? 'bg-primary bg-opacity-10 text-primary font-medium border-l-4 border-primary'
                    : 'text-textSecondary hover:bg-gray-50 hover:text-textPrimary'
                }`}
              >
                {item.icon}
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
              {session?.user?.image ? (
                <img src={session.user.image} alt={userName} className="w-full h-full rounded-full" />
              ) : (
                userInitial
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-textPrimary">{userName}</p>
                <p className="text-xs text-textSecondary">{userEmail}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-textSecondary hover:bg-gray-50 hover:text-red-600 transition-all mt-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

