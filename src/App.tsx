
import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import Login from '@/pages/Login';
import StudentLogin from '@/pages/StudentLogin';
import SuperAdminLogin from '@/pages/SuperAdminLogin';
import MainLayout from '@/layout/MainLayout';
import SchoolSetup from '@/pages/SchoolSetup';
import StudentDashboard from '@/pages/StudentDashboard';
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
  loading: boolean;
}

export const UserContext = createContext<UserContextProps>({
  user: null,
  setUser: () => {},
  loading: true,
});

// Create a query client
const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const appUser: User = {
              id: firebaseUser.uid,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: firebaseUser.email || '',
              role: userData.role || 'student',
              schoolId: userData.schoolId || '',
              avatar: userData.avatar,
              timezone: userData.timezone
            };
            setUser(appUser);
            // Also store in localStorage for persistence
            localStorage.setItem('user', JSON.stringify(appUser));
          } else {
            console.warn('User document not found in Firestore');
            setUser(null);
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        // No user is signed in
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    // Clean up the listener on unmount
    return () => unsubscribe();
  }, []);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UserContext.Provider value={{ user, setUser, loading }}>
        <Router>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/student-login" element={<StudentLogin />} />
            <Route path="/superadmin-login" element={<SuperAdminLogin />} />
            <Route path="/school-setup" element={<SchoolSetup />} />
            <Route 
              path="/student-dashboard" 
              element={
                user && user.role === 'student' ? (
                  <StudentDashboard />
                ) : (
                  <Navigate to="/student-login" replace />
                )
              } 
            />
            <Route
              path="/*"
              element={
                user && (user.role === 'admin' || user.role === 'teacher' || user.role === 'superadmin') ? (
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
    </QueryClientProvider>
  );
};

export default App;
