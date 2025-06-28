import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import StudentLogin from '@/pages/StudentLogin';
import SuperAdminLogin from '@/pages/SuperAdminLogin';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import SchoolSetup from '@/pages/SchoolSetup';
import Students from '@/pages/Students';
import Courses from '@/pages/Courses';
import Payments from '@/pages/Payments';
import PaymentsOptimized from '@/pages/PaymentsOptimized';
import Finances from '@/pages/Finances';
import Calendar from '@/pages/Calendar';
import Attendance from '@/pages/Attendance';
import Settings from '@/pages/Settings';
import TeamAccess from '@/pages/TeamAccess';
import StudentAccess from '@/pages/StudentAccess';
import StudentDashboard from '@/pages/StudentDashboard';
import Contacts from '@/pages/Contacts';
import LicenseManagement from '@/pages/LicenseManagement';
import StatesReports from '@/pages/StatesReports';
import NotFound from '@/pages/NotFound';
import './App.css';

export const UserContext = createContext<{ user: any, setUser: any }>({ user: null, setUser: null });

const queryClient = new QueryClient();

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  schoolId: string | null;
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserContext.Provider value={{ user, setUser }}>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/student-login" element={<StudentLogin />} />
            <Route path="/superadmin-login" element={<SuperAdminLogin />} />
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/school-setup" element={<SchoolSetup />} />
            <Route path="/students" element={<Students />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments-optimized" element={<PaymentsOptimized />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/team-access" element={<TeamAccess />} />
            <Route path="/student-access" element={<StudentAccess />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/license-management" element={<LicenseManagement />} />
            <Route path="/states-reports" element={<StatesReports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </Router>
      </UserContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
