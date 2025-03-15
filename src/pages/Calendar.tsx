
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  BookOpen,
  Plus,
  Search,
  CreditCard,
  DollarSign,
  Calendar as CalendarLucide,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock4,
  Info
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePayments, Session } from '@/contexts/PaymentContext';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

// Constants
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Color mapping for subjects
const subjectColorMap: Record<string, { bg: string, border: string, text: string }> = {
  'Mathematics': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  'Science': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  'English': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  'Physics': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  'Chemistry': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  'Biology': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700' },
  'History': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  'Geography': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  'Literature': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
  'Art': { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700' },
  'Music': { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700' },
  'Computer Science': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' }
};

// Define the extended Session type with subject
interface SessionWithSubject extends Session {
  subject: string;
}

const Calendar = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(today, { weekStartsOn: 0 }));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionWithSubject | null>(null);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const { sessions } = usePayments();
  
  // Convert session dates from string to Date objects
  const formattedSessions = sessions.map(session => ({
    ...session,
    subject: getRandomSubject() // This is just for demonstration, replace with actual subject data
  }));

  // Function to generate a random subject for demo purposes
  function getRandomSubject() {
    const subjects = Object.keys(subjectColorMap).filter(s => s !== 'default');
    return subjects[Math.floor(Math.random() * subjects.length)];
  }

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentDate(today);
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  // Generate array of days for the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Get lessons for a specific day and hour
  const getLessonsForTimeSlot = (day: Date, hour: number) => {
    const filtered = formattedSessions.filter(session => {
      const sessionDate = new Date(session.date);
      const timeMatch = sessionDate.getHours() === hour;
      const dateMatch = 
        sessionDate.getDate() === day.getDate() &&
        sessionDate.getMonth() === day.getMonth() &&
        sessionDate.getFullYear() === day.getFullYear();
      
      // Apply search filter if there's a query
      const searchMatch = !searchQuery || 
        session.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return dateMatch && timeMatch && searchMatch;
    });
    
    return filtered;
  };

  // Get color for a subject
  const getSubjectColors = (subject: string) => {
    return subjectColorMap[subject] || subjectColorMap.default;
  };

  // Handle session click to show details
  const handleSessionClick = (session: SessionWithSubject) => {
    setSelectedSession(session);
    setOpen(true);
  };

  // Get status badge details
  const getStatusBadge = (status: Session['status']) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', variant: 'default' as const, icon: <CheckCircle className="w-4 h-4 mr-1" /> };
      case 'canceled':
        return { label: 'Canceled', variant: 'destructive' as const, icon: <XCircle className="w-4 h-4 mr-1" /> };
      case 'missed':
        return { label: 'Missed', variant: 'destructive' as const, icon: <XCircle className="w-4 h-4 mr-1" /> };
      default:
        return { label: 'Scheduled', variant: 'outline' as const, icon: <CalendarLucide className="w-4 h-4 mr-1" /> };
    }
  };

  // Get payment status badge details
  const getPaymentBadge = (status: Session['paymentStatus']) => {
    if (status === 'paid') {
      return { label: 'Paid', variant: 'default' as const, icon: <DollarSign className="w-4 h-4 mr-1" /> };
    }
    return { label: 'Unpaid', variant: 'destructive' as const, icon: <CreditCard className="w-4 h-4 mr-1" /> };
  };

  // Session details component based on device
  const SessionDetails = () => {
    if (!selectedSession) return null;
    
    const statusBadge = getStatusBadge(selectedSession.status);
    const paymentBadge = getPaymentBadge(selectedSession.paymentStatus);
    const colors = getSubjectColors(selectedSession.subject);
    
    const content = (
      <>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className={cn("text-sm", colors.text)}>
                  {selectedSession.id.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{selectedSession.notes?.split(' ')[0] || 'Lesson'}</h3>
                <Badge className={cn("mt-1", colors.bg, colors.border, colors.text, "border")}>
                  {selectedSession.subject}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Badge variant={statusBadge.variant} className="flex items-center">
                {statusBadge.icon} {statusBadge.label}
              </Badge>
              <Badge variant={paymentBadge.variant} className="flex items-center">
                {paymentBadge.icon} {paymentBadge.label}
              </Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <CalendarLucide className="w-5 h-5 text-muted-foreground" />
              <span>{format(new Date(selectedSession.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span>{selectedSession.time} ({selectedSession.duration})</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <span>{`Student ${parseInt(selectedSession.id.split('-')[1]) % 5 + 1}`}</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span>${selectedSession.cost}</span>
            </div>
          </div>
          
          {selectedSession.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <h4 className="font-medium">Notes</h4>
                </div>
                <p className="text-muted-foreground text-sm pl-7">{selectedSession.notes}</p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          {isMobile ? (
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          ) : (
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          )}
          <Button>
            Edit Session
          </Button>
        </div>
      </>
    );
    
    if (isMobile) {
      return (
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader>
            <DrawerTitle>Session Details</DrawerTitle>
            <DrawerDescription>View or edit this session</DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      );
    }
    
    return (
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Session Details</SheetTitle>
          <SheetDescription>View or edit this session</SheetDescription>
        </SheetHeader>
        <div className="py-6">
          {content}
        </div>
      </SheetContent>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">Manage your lessons and schedule</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              className="pl-9 w-full md:w-[200px] rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={goToToday} variant="outline" className="gap-2 rounded-lg">
            <CalendarIcon className="h-4 w-4" />
            <span>Today</span>
          </Button>
          <div className="flex rounded-lg shadow-sm">
            <Button onClick={goToPreviousWeek} variant="outline" size="icon" className="rounded-l-lg rounded-r-none">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={goToNextWeek} variant="outline" size="icon" className="rounded-r-lg rounded-l-none">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button className="gap-2 rounded-lg shadow-md bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            <span>New Lesson</span>
          </Button>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-medium">
          {format(weekDays[0], 'MMMM yyyy')}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Week day headers */}
          <div className="grid grid-cols-8 gap-2">
            <div className="p-2 text-center border-b"></div>
            {weekDays.map((day, index) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              return (
                <div 
                  key={index} 
                  className={cn(
                    "p-2 text-center font-medium",
                    isToday ? "bg-primary text-primary-foreground rounded-t-lg" : 
                      isWeekend ? "bg-muted/40" : "border-b"
                  )}
                >
                  <div className="text-sm">{DAYS[day.getDay()].substring(0, 3)}</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    isToday ? "" : isWeekend ? "text-muted-foreground" : ""
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-8 gap-2">
            {HOURS.map((hour) => (
              <React.Fragment key={hour}>
                {/* Time column */}
                <div className="py-2 px-3 text-right text-muted-foreground text-sm border-r sticky left-0 bg-white z-10">
                  <span className="font-medium">{hour % 12 === 0 ? 12 : hour % 12}</span>
                  <span className="text-xs ml-1">{hour < 12 ? 'AM' : 'PM'}</span>
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const lessonsInTimeSlot = getLessonsForTimeSlot(day, hour);
                  const isCurrentHour = 
                    format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') && 
                    hour === today.getHours();
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className={cn(
                        "p-2 border-b border-r min-h-[90px] relative transition-colors",
                        isCurrentHour ? "bg-blue-50/50" : isWeekend ? "bg-muted/20" : "hover:bg-gray-50"
                      )}
                    >
                      {lessonsInTimeSlot.map((session) => {
                        const colors = getSubjectColors(session.subject);
                        
                        return (
                          <Card 
                            key={session.id} 
                            className={cn(
                              "mb-2 cursor-pointer hover:shadow-md transition-shadow",
                              colors.bg, colors.border, "border"
                            )}
                            onClick={() => handleSessionClick(session)}
                          >
                            <CardContent className="p-2.5">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border">
                                  <AvatarFallback className={cn("text-xs", colors.text)}>
                                    {session.id.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <h5 className="text-sm font-medium truncate">
                                      {session.notes?.split(' ')[0] || 'Lesson'}
                                    </h5>
                                    <Badge 
                                      variant="outline" 
                                      className={cn("text-[10px] font-normal py-0 h-4", colors.text, colors.border)}
                                    >
                                      {session.subject}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{session.duration}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Session Details UI */}
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <SessionDetails />
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SessionDetails />
        </Sheet>
      )}
    </div>
  );
};

export default Calendar;
