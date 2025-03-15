
import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardStats from '@/components/DashboardStats';
import StudentCard, { Student } from '@/components/StudentCard';
import UpcomingLessons, { Lesson } from '@/components/UpcomingLessons';

// Sample data for demonstration
const sampleStudents: Student[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    subject: 'Mathematics',
    lessonsCompleted: 12,
    nextLesson: 'Today, 4 PM',
    paymentStatus: 'paid'
  },
  {
    id: '2',
    name: 'Sophia Chen',
    email: 'sophia.c@example.com',
    subject: 'Science',
    lessonsCompleted: 8,
    nextLesson: 'Tomorrow, 3 PM',
    paymentStatus: 'pending'
  },
  {
    id: '3',
    name: 'Michael Davis',
    email: 'michael.d@example.com',
    subject: 'English',
    lessonsCompleted: 15,
    nextLesson: 'Friday, 5 PM',
    paymentStatus: 'overdue'
  },
  {
    id: '4',
    name: 'Emma Wilson',
    email: 'emma.w@example.com',
    subject: 'Physics',
    lessonsCompleted: 6,
    nextLesson: 'Today, 6 PM',
    paymentStatus: 'paid'
  },
];

const sampleLessons: Lesson[] = [
  {
    id: '1',
    studentName: 'Alex Johnson',
    subject: 'Mathematics - Calculus',
    date: 'Today',
    time: '4:00 PM',
    duration: '1 hour',
    status: 'upcoming'
  },
  {
    id: '2',
    studentName: 'Emma Wilson',
    subject: 'Physics - Mechanics',
    date: 'Today',
    time: '6:00 PM',
    duration: '1 hour',
    status: 'upcoming'
  },
  {
    id: '3',
    studentName: 'Sophia Chen',
    subject: 'Science - Chemistry',
    date: 'Tomorrow',
    time: '3:00 PM',
    duration: '1 hour',
    status: 'upcoming'
  },
  {
    id: '4',
    studentName: 'Ryan Murphy',
    subject: 'Computer Science',
    date: 'Today',
    time: '2:00 PM',
    duration: '1 hour',
    status: 'completed'
  },
];

const Index = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, let's manage your tutoring business!</p>
        </div>
        
        <div className="flex gap-2">
          <Button className="gap-2" variant="default">
            <PlusCircle className="h-4 w-4" />
            <span>New Student</span>
          </Button>
        </div>
      </div>
      
      <DashboardStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Students</h2>
            <Button variant="link" className="text-primary">View All</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 element-transition">
            {sampleStudents.map(student => (
              <StudentCard key={student.id} student={student} className="glass glass-hover" />
            ))}
          </div>
        </div>
        
        <div>
          <UpcomingLessons lessons={sampleLessons} className="glass glass-hover" />
        </div>
      </div>
    </div>
  );
};

export default Index;
