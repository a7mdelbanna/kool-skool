
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Index from "./pages/Index";
import Students from "./pages/Students";
import Calendar from "./pages/Calendar";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import SchoolSetup from "./pages/SchoolSetup";
import StatesReports from "./pages/StatesReports";
import TeamAccess from "./pages/TeamAccess";
import NotFound from "./pages/NotFound";
import { PaymentProvider } from "./contexts/PaymentContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PaymentProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/students" element={<Students />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/school-setup" element={<SchoolSetup />} />
              <Route path="/reports" element={<StatesReports />} />
              <Route path="/team-access" element={<TeamAccess />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PaymentProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
