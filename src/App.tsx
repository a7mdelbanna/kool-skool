import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PaymentProvider } from '@/contexts/PaymentContext';
import MainLayout from '@/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import CalendarPage from '@/pages/CalendarPage';
import Courses from '@/pages/Courses';
import Payments from '@/pages/Payments';
import TeamAccess from '@/pages/TeamAccess';
import LicenseManagement from '@/pages/LicenseManagement';
import Settings from '@/pages/Settings';
import StatesReports from '@/pages/StatesReports';

const queryClient = new QueryClient();

const Contacts = lazy(() => import('@/pages/Contacts'));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaymentProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/students" element={<MainLayout><Students /></MainLayout>} />
              <Route path="/calendar" element={<MainLayout><CalendarPage /></MainLayout>} />
              <Route path="/courses" element={<MainLayout><Courses /></MainLayout>} />
              <Route path="/payments" element={<MainLayout><Payments /></MainLayout>} />
              <Route path="/contacts" element={<MainLayout><Suspense fallback={<div>Loading...</div>}><Contacts /></Suspense></MainLayout>} />
              <Route path="/team-access" element={<MainLayout><TeamAccess /></MainLayout>} />
              <Route path="/states-reports" element={<MainLayout><StatesReports /></MainLayout>} />
              <Route path="/license-management" element={<MainLayout><LicenseManagement /></MainLayout>} />
              <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PaymentProvider>
    </QueryClientProvider>
  );
}

export default App;
