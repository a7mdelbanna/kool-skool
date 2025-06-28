
import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import StudentLogin from '@/pages/StudentLogin';
import SuperAdminLogin from '@/pages/SuperAdminLogin';
import MainLayout from '@/layout/MainLayout';
import SchoolSetup from '@/pages/SchoolSetup';
import { Toaster } from "@/components/ui/toaster"
import { PaymentProvider } from '@/contexts/PaymentContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  email?: string;
  role: string;
  schoolId: string;
  avatar?: string;
  timezone?: string;
}

interface UserContextProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const UserContext = createContext<UserContextProps>({
  user: null,
  setUser: () => {},
});

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user data exists in localStorage on app load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }

    // Listen for storage events (e.g., user logged out in another tab)
    const handleStorage = () => {
      const storedUser = localStorage.getItem('user');
      try {
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } catch (error) {
        console.error('Error parsing storage user data:', error);
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorage);

    // Clean up the event listener on unmount
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Router>
        <Toaster />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/superadmin-login" element={<SuperAdminLogin />} />
          <Route path="/school-setup" element={<SchoolSetup />} />
          <Route
            path="/*"
            element={
              user ? (
                <PaymentProvider>
                  <MainLayout />
                </PaymentProvider>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
    </UserContext.Provider>
  );
};

export default App;
