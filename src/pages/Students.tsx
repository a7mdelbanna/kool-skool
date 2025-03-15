
import React, { useState } from 'react';
import { PlusCircle, Search, Filter, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentCard, { Student } from '@/components/StudentCard';

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
  {
    id: '5',
    name: 'Noah Martinez',
    email: 'noah.m@example.com',
    subject: 'Chemistry',
    lessonsCompleted: 10,
    nextLesson: 'Monday, 5 PM',
    paymentStatus: 'paid'
  },
  {
    id: '6',
    name: 'Olivia Brown',
    email: 'olivia.b@example.com',
    subject: 'Biology',
    lessonsCompleted: 9,
    nextLesson: 'Wednesday, 4 PM',
    paymentStatus: 'overdue'
  },
  {
    id: '7',
    name: 'William Taylor',
    email: 'william.t@example.com',
    subject: 'Computer Science',
    lessonsCompleted: 14,
    nextLesson: 'Thursday, 6 PM',
    paymentStatus: 'pending'
  },
  {
    id: '8',
    name: 'Ava Anderson',
    email: 'ava.a@example.com',
    subject: 'History',
    lessonsCompleted: 7,
    nextLesson: 'Tuesday, 3 PM',
    paymentStatus: 'paid'
  },
];

const Students = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  
  const subjects = Array.from(new Set(sampleStudents.map(s => s.subject)));
  
  const handleFilterToggle = (filter: string) => {
    if (activeFilters.includes(filter)) {
      setActiveFilters(activeFilters.filter(f => f !== filter));
    } else {
      setActiveFilters([...activeFilters, filter]);
    }
  };
  
  const filterStudents = () => {
    let filtered = [...sampleStudents];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        student => 
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply subject filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(student => 
        activeFilters.includes(student.subject)
      );
    }
    
    // Apply tab filters
    if (selectedTab !== 'all') {
      filtered = filtered.filter(student => 
        student.paymentStatus === selectedTab
      );
    }
    
    return filtered;
  };
  
  const filteredStudents = filterStudents();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground mt-1">Manage your students and track their progress</p>
        </div>
        
        <Button className="gap-2" variant="default">
          <PlusCircle className="h-4 w-4" />
          <span>Add New Student</span>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search students..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          
          {subjects.map(subject => (
            <Badge 
              key={subject}
              className="cursor-pointer"
              variant={activeFilters.includes(subject) ? "default" : "outline"} 
              onClick={() => handleFilterToggle(subject)}
            >
              {subject}
              {activeFilters.includes(subject) && (
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  handleFilterToggle(subject);
                }} />
              )}
            </Badge>
          ))}
        </div>
      </div>
      
      <Tabs 
        defaultValue="all" 
        className="w-full"
        onValueChange={value => setSelectedTab(value)}
      >
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary">{sampleStudents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Paid
            <Badge variant="secondary">{sampleStudents.filter(s => s.paymentStatus === 'paid').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Pending
            <Badge variant="secondary">{sampleStudents.filter(s => s.paymentStatus === 'pending').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Overdue
            <Badge variant="secondary">{sampleStudents.filter(s => s.paymentStatus === 'overdue').length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTab} className="mt-0">
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 element-transition">
              {filteredStudents.map(student => (
                <StudentCard key={student.id} student={student} className="glass glass-hover" />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No students found</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Students;
