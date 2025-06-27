
import React from 'react';
import MobileNavbar from '@/components/Navbar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  console.log('MainLayout rendering with children:', children);
  
  return (
    <div className="min-h-screen flex w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <MobileNavbar />
        <main className="flex-1 p-4 pt-24 pb-20 lg:pt-24 lg:pb-6 overflow-auto">
          <div className="max-w-7xl mx-auto transition-all duration-300 page-transition">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
