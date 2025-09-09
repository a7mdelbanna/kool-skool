import React, { useState, useContext, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Settings, Users, Shield } from 'lucide-react';
import { UserContext } from '@/App';
import { toast } from 'sonner';
import TeacherAvailabilitySettings from '@/components/booking/TeacherAvailabilitySettings';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import BlockTimeDialog from '@/components/booking/BlockTimeDialog';
import { teacherAvailabilityService } from '@/services/firebase/teacherAvailability.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const OnlineBooking = () => {
  const { user } = useContext(UserContext);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (isAdmin) {
      loadTeachers();
    } else if (isTeacher && user?.id) {
      setSelectedTeacher(user.id);
    }
  }, [user]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      // Get all users from the same school (teachers and admins can both have availability)
      const usersQuery = query(
        collection(db, 'users'),
        where('schoolId', '==', user?.schoolId)
      );
      
      const snapshot = await getDocs(usersQuery);
      // Filter to include both teachers and admins
      const teachersList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Teacher))
        .filter(u => u.role === 'teacher' || u.role === 'admin');
      
      setTeachers(teachersList);
      if (teachersList.length > 0 && !selectedTeacher) {
        setSelectedTeacher(teachersList[0].id);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const currentTeacherId = isTeacher ? user?.id : selectedTeacher;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Online Booking</h1>
          <p className="text-muted-foreground mt-2">
            Manage teacher availability and booking settings
          </p>
        </div>
        <Button 
          onClick={() => setBlockDialogOpen(true)}
          disabled={!currentTeacherId}
        >
          <Shield className="h-4 w-4 mr-2" />
          Block Time
        </Button>
      </div>

      {/* Teacher Selection (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Teacher
            </CardTitle>
            <CardDescription>
              Choose a teacher to manage their availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {teachers.map((teacher) => (
                <Button
                  key={teacher.id}
                  variant={selectedTeacher === teacher.id ? "default" : "outline"}
                  onClick={() => setSelectedTeacher(teacher.id)}
                  className="justify-start flex-col items-start h-auto py-2"
                >
                  <span className="font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {teacher.role}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {currentTeacherId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Availability Calendar
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Working Hours
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <AvailabilityCalendar 
              teacherId={currentTeacherId}
              onBlockTime={() => setBlockDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <TeacherAvailabilitySettings 
              teacherId={currentTeacherId}
              isReadOnly={isTeacher && user?.id !== currentTeacherId}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Block Time Dialog */}
      {currentTeacherId && (
        <BlockTimeDialog
          open={blockDialogOpen}
          onOpenChange={setBlockDialogOpen}
          teacherId={currentTeacherId}
          onSuccess={() => {
            setBlockDialogOpen(false);
            // Trigger calendar refresh
            setActiveTab('calendar');
          }}
        />
      )}
    </div>
  );
};

export default OnlineBooking;