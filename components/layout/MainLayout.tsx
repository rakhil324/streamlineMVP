'use client';

import React from 'react';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import MobileHeader from './MobileHeader';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function MainLayout({ children, title = 'Dashboard' }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <MobileHeader />
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-60">
        <HeaderBar title={title} />
        <main className="mt-16 md:mt-16 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

