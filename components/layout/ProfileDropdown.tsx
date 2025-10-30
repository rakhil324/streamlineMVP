'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick?: () => void;
}

export default function ProfileDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';
  const userEmail = session?.user?.email || 'user@example.com';
  const userName = session?.user?.name || 'User';
  
  const menuItems: MenuItem[] = [
    {
      icon: <User className="w-5 h-5" />,
      label: 'View Profile',
      href: '/profile',
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: 'Settings',
      href: '/settings',
    },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="py-2 min-w-56">
      {/* User Info */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
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
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="flex items-center gap-3 px-4 py-2 text-sm text-textSecondary hover:bg-gray-50 transition-colors group"
          >
            <span className="text-textSecondary group-hover:text-primary">
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <div className="border-t border-gray-200 pt-1">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

