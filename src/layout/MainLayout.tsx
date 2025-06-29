
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import MobileNavbar from '@/components/Navbar';
import Sidebar from './Sidebar';

// Import all the pages
import Index from '@/pages/Index';
import Students from '@/pages/Students';
import Groups from '@/pages/Groups';
import Courses from '@/pages/Courses';
import Calendar from '@/pages/Calendar';
import Attendance from '@/pages/Attendance';
import Payments from '@/pages/Payments';
import Finances from '@/pages/Finances';
import Contacts from '@/pages/Contacts';
import StatesReports from '@/pages/StatesReports';
import Settings from '@/pages/Settings';
import TeamAccess from '@/pages/TeamAccess';
import StudentAccess from '@/pages/StudentAccess';
import LicenseManagement from '@/pages/LicenseManagement';

const MainLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNavbar />
          <main className="flex-1 overflow-auto bg-white ml-0">
            <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 transition-all duration-300 page-transition">
              <div className="w-full">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/finances" element={<Finances />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/states-reports" element={<StatesReports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/team-access" element={<TeamAccess />} />
                  <Route path="/student-access" element={<StudentAccess />} />
                  <Route path="/license-management" element={<LicenseManagement />} />
                </Routes>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
