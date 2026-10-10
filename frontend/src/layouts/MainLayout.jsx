import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { MobileBottomNav } from '../components/layout/MobileBottomNav.jsx';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#09090b] text-foreground relative overflow-hidden selection:bg-zinc-800 selection:text-white">
      {/* Subtle precision background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <Sidebar />
      <MobileBottomNav />

      <main className="relative z-10 min-h-screen pb-24 transition-all duration-300 md:pb-0 md:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-12 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
