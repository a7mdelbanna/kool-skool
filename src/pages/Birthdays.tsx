import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Gift, Cake, PartyPopper, Mail, MessageSquare, Users, User } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, differenceInDays, differenceInYears, startOfToday, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface StudentBirthday {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthday: string;
  age?: number;
  daysUntil: number;
  image?: string;
  lessonType?: string;
  level?: string;
  courseName?: string;
}

const Birthdays = () => {
  const [students, setStudents] = useState<StudentBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchStudentBirthdays();
  }, []);

  const fetchStudentBirthdays = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user?.schoolId) {
        toast({
          title: "Error",
          description: "School information not found",
          variant: "destructive"
        });
        return;
      }

      // Fetch all students with birthdays from Firebase
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('schoolId', '==', user.schoolId));
      const querySnapshot = await getDocs(q);
      
      const allStudents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const today = startOfToday();
      const studentsWithBirthdays = allStudents
        .filter((student: any) => student.birthday)
        .map((student: any) => {
          const birthday = new Date(student.birthday);
          const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
          const nextYearBirthday = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
          
          // Calculate days until next birthday
          let daysUntil = differenceInDays(thisYearBirthday, today);
          if (daysUntil < 0) {
            daysUntil = differenceInDays(nextYearBirthday, today);
          }
          
          // Calculate age
          const age = differenceInYears(today, birthday);
          
          return {
            id: student.id,
            firstName: student.firstName || student.first_name || '',
            lastName: student.lastName || student.last_name || '',
            email: student.email || '',
            phone: student.phone || '',
            birthday: student.birthday,
            age,
            daysUntil,
            image: student.image || '',
            lessonType: student.lessonType || student.lesson_type || 'individual',
            level: student.level || '',
            courseName: student.courseName || student.course_name || ''
          };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setStudents(studentsWithBirthdays);
    } catch (error) {
      console.error('Error fetching birthdays:', error);
      toast({
        title: "Error",
        description: "Failed to load birthdays",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBirthdayStatus = (daysUntil: number): { label: string; color: string; icon: any } => {
    if (daysUntil === 0) return { label: 'Today!', color: 'bg-red-500', icon: Cake };
    if (daysUntil === 1) return { label: 'Tomorrow', color: 'bg-orange-500', icon: Gift };
    if (daysUntil <= 7) return { label: `In ${daysUntil} days`, color: 'bg-yellow-500', icon: PartyPopper };
    if (daysUntil <= 30) return { label: `In ${daysUntil} days`, color: 'bg-blue-500', icon: Calendar };
    return { label: `In ${daysUntil} days`, color: 'bg-gray-500', icon: Calendar };
  };

  const filterStudents = (students: StudentBirthday[], filter: string): StudentBirthday[] => {
    switch (filter) {
      case 'today':
        return students.filter(s => s.daysUntil === 0);
      case 'thisWeek':
        return students.filter(s => s.daysUntil <= 7);
      case 'thisMonth':
        return students.filter(s => s.daysUntil <= 30);
      case 'upcoming':
        return students.filter(s => s.daysUntil > 0 && s.daysUntil <= 90);
      default:
        return students;
    }
  };

  const sendBirthdayWish = (student: StudentBirthday, method: 'email' | 'sms') => {
    toast({
      title: "Birthday Wish",
      description: `Birthday wish would be sent via ${method} to ${student.firstName} ${student.lastName}`,
    });
  };

  const BirthdayCard = ({ student }: { student: StudentBirthday }) => {
    const status = getBirthdayStatus(student.daysUntil);
    const StatusIcon = status.icon;
    
    return (
      <Card className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-lg",
        student.daysUntil === 0 && "ring-2 ring-red-500 animate-pulse"
      )}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-white shadow-md">
              <AvatarImage src={student.image} alt={`${student.firstName} ${student.lastName}`} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-lg font-bold">
                {`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{`${student.firstName} ${student.lastName}`}</h3>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
                <Badge className={cn("text-white", status.color)}>
                  <StatusIcon className="h-4 w-4 mr-1" />
                  {status.label}
                </Badge>
              </div>
              
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Cake className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(student.birthday), 'MMMM d')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Turning {student.age + 1}</span>
                </div>
                {student.level && (
                  <Badge variant="outline">{student.level}</Badge>
                )}
              </div>
              
              {student.daysUntil <= 7 && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendBirthdayWish(student, 'email')}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Send Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendBirthdayWish(student, 'sms')}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Send SMS
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const HighlightWidget = ({ title, icon: Icon, students, color }: {
    title: string;
    icon: any;
    students: StudentBirthday[];
    color: string;
  }) => {
    return (
      <Card className={cn("border-2", color)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" />
            {title}
            <Badge className="ml-auto">{students.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No birthdays</p>
          ) : (
            <div className="space-y-2">
              {students.slice(0, 3).map(student => (
                <div key={student.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.image} />
                    <AvatarFallback className="text-xs">
                      {`${student.firstName?.[0]}${student.lastName?.[0]}`}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {`${student.firstName} ${student.lastName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(student.birthday), 'MMM d')} • Age {student.age + 1}
                    </p>
                  </div>
                </div>
              ))}
              {students.length > 3 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{students.length - 3} more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const todayBirthdays = filterStudents(students, 'today');
  const weekBirthdays = filterStudents(students, 'thisWeek');
  const monthBirthdays = filterStudents(students, 'thisMonth');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Birthday Management
        </h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Users className="h-5 w-5 mr-2" />
          {students.length} Students with Birthdays
        </Badge>
      </div>

      {/* Highlight Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HighlightWidget
          title="Today's Birthdays"
          icon={Cake}
          students={todayBirthdays}
          color="border-red-200"
        />
        <HighlightWidget
          title="This Week"
          icon={Gift}
          students={weekBirthdays}
          color="border-orange-200"
        />
        <HighlightWidget
          title="This Month"
          icon={PartyPopper}
          students={monthBirthdays}
          color="border-yellow-200"
        />
      </div>

      {/* Birthday List Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-[500px]">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="thisWeek">Week</TabsTrigger>
          <TabsTrigger value="thisMonth">Month</TabsTrigger>
          <TabsTrigger value="upcoming">Next 90 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filterStudents(students, selectedTab).map(student => (
              <BirthdayCard key={student.id} student={student} />
            ))}
          </div>
          {filterStudents(students, selectedTab).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No birthdays in this period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Birthdays;