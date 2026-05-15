import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { MobileBottomNav } from '../components/layout/MobileBottomNav.jsx';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#09090b] text-foreground relative overflow-hidden selection:bg-violet-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <Sidebar />
      <MobileBottomNav />

      <main className="relative z-10 min-h-screen pb-24 transition-all duration-300 md:pb-0 md:pl-72">
        <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 md:px-8 md:py-8 lg:px-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
