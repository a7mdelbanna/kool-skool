import React, { useState } from 'react';
import { PlusCircle, Search, Filter, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentCard, { Student } from '@/components/StudentCard';
import AddStudentDialog from '@/components/AddStudentDialog';

// Sample data for demonstration
const sampleStudents: Student[] = [
  {
    id: '1',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.j@example.com',
    courseName: 'English Conversation',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'beginner',
    lessonsCompleted: 12,
    nextLesson: 'Today, 4 PM',
    paymentStatus: 'paid'
  },
  {
    id: '2',
    firstName: 'Sophia',
    lastName: 'Chen',
    email: 'sophia.c@example.com',
    courseName: 'Business English',
    lessonType: 'group',
    ageGroup: 'adult',
    level: 'intermediate',
    lessonsCompleted: 8,
    nextLesson: 'Tomorrow, 3 PM',
    paymentStatus: 'pending'
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Davis',
    email: 'michael.d@example.com',
    courseName: 'IELTS Preparation',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'advanced',
    lessonsCompleted: 15,
    nextLesson: 'Friday, 5 PM',
    paymentStatus: 'overdue'
  },
  {
    id: '4',
    firstName: 'Emma',
    lastName: 'Wilson',
    email: 'emma.w@example.com',
    courseName: 'TOEFL Preparation',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'advanced',
    lessonsCompleted: 6,
    nextLesson: 'Today, 6 PM',
    paymentStatus: 'paid'
  },
  {
    id: '5',
    firstName: 'Noah',
    lastName: 'Martinez',
    email: 'noah.m@example.com',
    courseName: 'Grammar Fundamentals',
    lessonType: 'group',
    ageGroup: 'kid',
    level: 'beginner',
    lessonsCompleted: 10,
    nextLesson: 'Monday, 5 PM',
    paymentStatus: 'paid'
  },
  {
    id: '6',
    firstName: 'Olivia',
    lastName: 'Brown',
    email: 'olivia.b@example.com',
    courseName: 'Vocabulary Building',
    lessonType: 'group',
    ageGroup: 'kid',
    level: 'intermediate',
    lessonsCompleted: 9,
    nextLesson: 'Wednesday, 4 PM',
    paymentStatus: 'overdue'
  },
  {
    id: '7',
    firstName: 'William',
    lastName: 'Taylor',
    email: 'william.t@example.com',
    courseName: 'Academic Writing',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'advanced',
    lessonsCompleted: 14,
    nextLesson: 'Thursday, 6 PM',
    paymentStatus: 'pending'
  },
  {
    id: '8',
    firstName: 'Ava',
    lastName: 'Anderson',
    email: 'ava.a@example.com',
    courseName: 'Pronunciation Workshop',
    lessonType: 'individual',
    ageGroup: 'adult',
    level: 'intermediate',
    lessonsCompleted: 7,
    nextLesson: 'Tuesday, 3 PM',
    paymentStatus: 'paid'
  },
];

const Students = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  
  const courses = Array.from(new Set(sampleStudents.map(s => s.courseName)));
  
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
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.courseName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply course filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(student => 
        activeFilters.includes(student.courseName)
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
    <div className="space-y-6 pt-6 sm:pt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground mt-1">Manage your students and track their progress</p>
        </div>
        
        <Button 
          className="gap-2 shrink-0" 
          variant="default"
          onClick={() => setIsAddStudentOpen(true)}
        >
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
          
          {courses.map(course => (
            <Badge 
              key={course}
              className="cursor-pointer"
              variant={activeFilters.includes(course) ? "default" : "outline"} 
              onClick={() => handleFilterToggle(course)}
            >
              {course}
              {activeFilters.includes(course) && (
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  handleFilterToggle(course);
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
      
      <AddStudentDialog 
        open={isAddStudentOpen} 
        onOpenChange={setIsAddStudentOpen}
      />
    </div>
  );
};

export default Students;
