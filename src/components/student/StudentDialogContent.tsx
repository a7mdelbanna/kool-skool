
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ProfileTab from "../student-tabs/ProfileTab";
import SubscriptionsTab from "../student-tabs/SubscriptionsTab";
import PaymentsTab from "../student-tabs/PaymentsTab";
import SessionsTab from "../student-tabs/SessionsTab";
import { Student } from "../StudentCard";
import { User, CreditCard, Calendar, BookOpen } from "lucide-react";
import { useStudentForm } from "@/hooks/useStudentForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentDialogContentProps {
  student?: Student | null;
  isEditMode?: boolean;
  onStudentAdded?: (student: Student) => void;
  onClose: () => void;
  open: boolean;
}

const StudentDialogContent: React.FC<StudentDialogContentProps> = ({
  student,
  isEditMode = false,
  onStudentAdded,
  onClose,
  open
}) => {
  const [activeTab, setActiveTab] = useState("profile");
  const queryClient = useQueryClient();
  
  const {
    studentData,
    updateStudentData,
    saving,
    password,
    setPassword,
    createPassword,
    setCreatePassword,
    handleSave,
    coursesData,
    teachersData,
    isLoading
  } = useStudentForm(student, isEditMode, open, onStudentAdded, onClose);

  // Debug student data
  useEffect(() => {
    console.log('🔍 STUDENT DEBUG INFO:');
    console.log('Student prop:', student);
    console.log('Student ID:', student?.id);
    console.log('Dialog open:', open);
    console.log('Active tab:', activeTab);
    console.log('Query should be enabled:', !!student?.id && open);
  }, [student, open, activeTab]);

  // Enhanced subscription fetching with comprehensive logging
  const { data: subscriptions = [], isLoading: subscriptionsLoading, error: subscriptionsError, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['student-subscriptions-with-payments', student?.id],
    queryFn: async () => {
      console.log('🚀 SUBSCRIPTION QUERY EXECUTION START');
      console.log('Student ID for query:', student?.id);
      console.log('Query enabled conditions:', {
        hasStudentId: !!student?.id,
        dialogOpen: open,
        shouldExecute: !!student?.id && open
      });
      
      if (!student?.id) {
        console.log('❌ No student ID - returning empty array');
        return [];
      }
      
      try {
        console.log('🔄 Fetching subscriptions from database...');
        
        // Step 1: Get basic subscriptions first
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });
        
        console.log('📊 Raw subscriptions query result:', {
          data: subscriptionsData,
          error: subscriptionsError,
          dataLength: subscriptionsData?.length || 0
        });
        
        if (subscriptionsError) {
          console.error('❌ Subscription fetch error:', subscriptionsError);
          throw subscriptionsError;
        }

        if (!subscriptionsData || subscriptionsData.length === 0) {
          console.log('✅ No subscriptions found for student');
          return [];
        }

        console.log('💰 Calculating payments for each subscription...');
        
        // Step 2: For each subscription, calculate the total paid from transactions
        const subscriptionsWithPayments = await Promise.all(
          subscriptionsData.map(async (subscription, index) => {
            console.log(`💳 Processing subscription ${index + 1}/${subscriptionsData.length}:`, subscription.id);
            
            try {
              // Get all income transactions linked to this subscription
              const { data: payments, error: paymentsError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('subscription_id', subscription.id)
                .eq('type', 'income')
                .eq('status', 'completed');

              console.log(`💸 Payments query for subscription ${subscription.id}:`, {
                payments,
                error: paymentsError,
                paymentsCount: payments?.length || 0
              });

              if (paymentsError) {
                console.error('❌ Error fetching payments for subscription:', subscription.id, paymentsError);
                return {
                  ...subscription,
                  total_paid: 0
                };
              }

              const totalPaid = (payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
              console.log(`✅ Total paid for subscription ${subscription.id}:`, totalPaid);

              return {
                ...subscription,
                total_paid: totalPaid
              };
            } catch (error) {
              console.error('❌ Error calculating payments for subscription:', subscription.id, error);
              return {
                ...subscription,
                total_paid: 0
              };
            }
          })
        );
        
        console.log('🎉 FINAL SUBSCRIPTIONS WITH PAYMENTS:', subscriptionsWithPayments);
        return subscriptionsWithPayments;
      } catch (error) {
        console.error('❌ CRITICAL ERROR in subscription fetch:', error);
        // Return empty array instead of throwing to prevent UI break
        return [];
      }
    },
    enabled: !!student?.id && open,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });

  // Log subscription query state changes
  useEffect(() => {
    console.log('📊 SUBSCRIPTION QUERY STATE UPDATE:');
    console.log('Subscriptions data:', subscriptions);
    console.log('Subscriptions count:', subscriptions?.length || 0);
    console.log('Is loading:', subscriptionsLoading);
    console.log('Has error:', !!subscriptionsError);
    console.log('Error details:', subscriptionsError);
  }, [subscriptions, subscriptionsLoading, subscriptionsError]);

  // Error handling for subscriptions
  useEffect(() => {
    if (subscriptionsError) {
      console.error("❌ SUBSCRIPTION ERROR:", subscriptionsError);
      toast.error("Failed to load subscription history. Please refresh the page and try again.");
    }
  }, [subscriptionsError]);

  // Detailed course data debugging with clear section markers
  useEffect(() => {
    console.log('===== COURSES DATA DEBUG (StudentDialogContent) =====');
    
    // Step 1: Check if coursesData object exists
    console.log('1. coursesData object:', coursesData);
    
    // Step 2: Check if data property exists and has items
    if (coursesData?.data) {
      console.log('2. Courses data array length:', coursesData.data.length);
      
      // Step 3: Log each course with detailed information if we have courses
      if (coursesData.data.length > 0) {
        console.log('3. First 3 courses detail:');
        coursesData.data.slice(0, 3).forEach((course, index) => {
          console.log(`  Course ${index + 1}:`, {
            id: course.id,
            name: course.name,
            lesson_type: course.lesson_type,
            school_id: course.school_id
          });
        });
      } else {
        console.log('3. No courses in the array despite data property existing');
      }
    } else {
      console.log('2. No courses data available - data property missing or null');
    }
    
    console.log('===== END COURSES DEBUG =====');
    
    // Only show error toast if we're certain courses should exist
    if (open && (!coursesData?.data || coursesData.data.length === 0)) {
      console.log('No courses found, adding a small delay and checking localStorage');
      
      // Check user data directly
      try {
        const userData = localStorage.getItem('user');
        console.log('User data from localStorage for debugging courses issue:', userData);
        
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          console.log('School ID from userData:', parsedUserData.schoolId);
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
      
      // If still no courses after a moment, show an error
      const timer = setTimeout(() => {
        if (!coursesData?.data || coursesData.data.length === 0) {
          toast.error("No courses available. Please add courses first.");
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [open, coursesData]);
  
  // Teacher data debugging
  useEffect(() => {
    console.log('===== TEACHERS DATA DEBUG (StudentDialogContent) =====');
    
    if (teachersData?.data) {
      console.log('Teachers data array length:', teachersData.data.length);
      
      if (teachersData.data.length > 0) {
        console.log('First 3 teachers detail:');
        teachersData.data.slice(0, 3).forEach((teacher, index) => {
          console.log(`  Teacher ${index + 1}:`, {
            id: teacher.id,
            displayName: teacher.display_name,
            firstName: teacher.first_name,
            lastName: teacher.last_name
          });
        });
      }
    } else {
      console.log('No teachers data available');
    }
    
    console.log('===== END TEACHERS DEBUG =====');
  }, [teachersData]);

  // Handle subscription refresh
  const handleSubscriptionRefresh = () => {
    console.log('🔄 Manual subscription refresh triggered for student:', student?.id);
    if (student?.id) {
      queryClient.invalidateQueries({ queryKey: ['student-subscriptions-with-payments', student.id] });
      // Also try to refetch directly
      refetchSubscriptions();
    }
  };

  // Handle tab changes with detailed logging
  const handleTabChange = (value: string) => {
    console.log('🔄 Tab changed to:', value);
    setActiveTab(value);
    
    // If switching to subscriptions tab, ensure we have the latest data
    if (value === 'subscriptions' && student?.id) {
      console.log('🔄 Switching to subscriptions tab - ensuring fresh data');
      setTimeout(() => {
        refetchSubscriptions();
      }, 100);
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Sessions</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileTab 
            studentData={studentData} 
            setStudentData={updateStudentData} 
            isViewMode={false}
            password={password}
            setPassword={setPassword}
            createPassword={createPassword}
            setCreatePassword={setCreatePassword}
            isNewStudent={!isEditMode}
            courses={coursesData?.data || []}
            teachers={teachersData?.data || []}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="subscriptions">
          <SubscriptionsTab 
            subscriptions={subscriptions}
            onRefresh={handleSubscriptionRefresh}
            studentId={student?.id || ''}
            isLoading={subscriptionsLoading}
          />
        </TabsContent>
        
        <TabsContent value="payments">
          <PaymentsTab studentData={studentData} setStudentData={updateStudentData} isViewMode={false} />
        </TabsContent>
        
        <TabsContent value="sessions">
          <SessionsTab studentData={studentData} setStudentData={updateStudentData} isViewMode={false} />
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-6 space-x-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEditMode ? 'Update Student' : 'Save Student'}
        </Button>
      </div>
    </>
  );
};

export default StudentDialogContent;
