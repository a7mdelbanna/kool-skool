import React, { useContext, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '@/App';
import StudentSidebar from '@/components/student-portal/layout/StudentSidebar';
import { databaseService } from '@/services/firebase/database.service';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/providers/theme-provider';

const StudentPortal: React.FC = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [studentData, setStudentData] = useState<any>(null);
  const [stats, setStats] = useState({
    streak: 7,
    xp: 750,
    level: 5,
    nextLevelXp: 1000,
    completedLessons: 24,
    badges: 8
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check both user context and localStorage for authentication
      const storedUser = localStorage.getItem('user');
      
      if (!user && !storedUser) {
        navigate('/student-login');
        return;
      }

      try {
        // Use user from context or parse from localStorage
        const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);
        
        if (!currentUser || currentUser.role !== 'student') {
          navigate('/student-login');
          return;
        }

        // For students, the user ID is their student ID
        const studentId = currentUser.id;
        
        // Fetch student data
        const student = await databaseService.getById('students', studentId);
        
        if (!student) {
          // If student document doesn't exist, create basic student data from user
          setStudentData({
            id: currentUser.id,
            first_name: currentUser.firstName,
            last_name: currentUser.lastName,
            email: currentUser.email,
            school_id: currentUser.schoolId
          });
        } else {
          setStudentData(student);
        }
        
        // Here you would fetch real stats from Firebase
        // For now using mock data
        fetchStudentStats(studentId);
        
      } catch (error) {
        console.error('Error checking auth:', error);
        // Don't immediately redirect on error, user might still be valid
        if (!user && !storedUser) {
          navigate('/student-login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, user]);

  const fetchStudentStats = async (studentId: string) => {
    try {
      // Fetch real stats from Firebase
      // This would include:
      // - Learning streak from session attendance
      // - XP from completed activities
      // - Level calculation
      // - Badge count
      // For now using mock data set in state
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="tutorflow-theme">
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-background/95 dark:from-gray-950 dark:via-gray-900 dark:to-black">
        {/* Sidebar */}
        <StudentSidebar studentData={studentData} stats={stats} />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <motion.header 
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-8 lg:px-10 py-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome back, {studentData?.first_name || studentData?.firstName || 'Student'}! 👋
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
                  onClick={() => navigate('/student-dashboard/practice')}
                >
                  Start Practice
                </motion.button>
              </div>
            </div>
          </motion.header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-gray-900 dark:to-black">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full p-8 lg:p-10"
              >
                <div className="max-w-[1600px] mx-auto">
                  <Outlet context={{ studentData, stats }} />
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <Toaster />
      </div>
    </ThemeProvider>
  );
};

export default StudentPortal;