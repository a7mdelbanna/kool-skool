
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Index from "./pages/Index";
import Students from "./pages/Students";
import Calendar from "./pages/Calendar";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import SchoolSetup from "./pages/SchoolSetup";
import StatesReports from "./pages/StatesReports";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import OnboardingFlow from "./components/auth/signup/OnboardingFlow";
import { PaymentProvider } from "./contexts/PaymentContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PersonalProfile from "./pages/PersonalProfile";
import Access from "./pages/Access";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <PaymentProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              {/* Redirect users from any direct account creation attempts to the auth page */}
              <Route path="/auth/create-account" element={<Navigate to="/auth" replace />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingFlow /></ProtectedRoute>} />
              <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/" element={<Index />} />
                <Route path="/students" element={<Students />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/school-setup" element={<SchoolSetup />} />
                <Route path="/reports" element={<StatesReports />} />
                <Route path="/profile" element={<PersonalProfile />} />
                <Route path="/access" element={<Access />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PaymentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
