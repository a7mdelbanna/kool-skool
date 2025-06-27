
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, createContext } from 'react';
import MainLayout from "./layout/MainLayout";
import Index from "./pages/Index";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import Contacts from "./pages/Contacts";
import Calendar from "./pages/Calendar";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import SchoolSetup from "./pages/SchoolSetup";
import StatesReports from "./pages/StatesReports";
import TeamAccess from "./pages/TeamAccess";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import LicenseManagement from "./pages/LicenseManagement";
import { PaymentProvider } from "./contexts/PaymentContext";

// Create a context for the user
export const UserContext = createContext<{
  user: any;
  isAuthenticated: boolean;
  setUser: (user: any) => void;
}>({
  user: null,
  isAuthenticated: false,
  setUser: () => {},
});

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log("Auth check:", !!parsedUser, parsedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    
    checkAuth();
    
    // Listen for storage events to handle authentication across tabs
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserContext.Provider value={{ user, isAuthenticated, setUser }}>
          <PaymentProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Authentication routes */}
                <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
                {/* School setup is only accessible if user is NOT authenticated */}
                <Route path="/school-setup" element={isAuthenticated ? <Navigate to="/license" replace /> : <SchoolSetup />} />
                
                {/* Protected routes */}
                <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/reports" element={<StatesReports />} />
                  <Route path="/team-access" element={<TeamAccess />} />
                  <Route path="/license" element={<LicenseManagement />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PaymentProvider>
        </UserContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
