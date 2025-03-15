
import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import MobileNavbar from '@/components/Navbar';
import { Sidebar } from './Sidebar';

const MainLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <MobileNavbar />
          <main className="flex-1 p-4 pt-20 pb-20 lg:pt-6 lg:pb-6 overflow-auto">
            <div className="max-w-7xl mx-auto transition-all duration-300 page-transition">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
