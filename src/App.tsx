
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { StudentsPage } from '@/components/students/StudentsPage';
import { GroupsPage } from '@/components/groups/GroupsPage';
import { CalendarPage } from '@/components/calendar/CalendarPage';
import { CoursesPage } from '@/components/courses/CoursesPage';
import { TransactionsPage } from '@/components/transactions/TransactionsPage';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { GoalsPage } from '@/components/goals/GoalsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { StudentLogin } from '@/components/auth/StudentLogin';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { SuperAdminLogin } from '@/components/auth/SuperAdminLogin';
import { SuperAdminDashboard } from '@/components/superAdmin/SuperAdminDashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/student-login" element={<StudentLogin />} />
              <Route path="/admin-login" element={<SuperAdminLogin />} />
              
              {/* Student routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Super admin routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* School management routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
