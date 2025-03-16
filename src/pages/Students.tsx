
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, Search, Filter, CheckCircle, X, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentCard, { Student } from '@/components/StudentCard';
import AddStudentDialog from '@/components/AddStudentDialog';
import { toast } from 'sonner';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { useQuery } from '@tanstack/react-query';
import { getStudentsWithDetails, StudentRecord, createCourse } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Students = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    courseName: string[];
    lessonType: string[];
    ageGroup: string[];
    level: string[];
  }>({
    courseName: [],
    lessonType: [],
    ageGroup: [],
    level: []
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseType, setNewCourseType] = useState<'Individual' | 'Group'>('Individual');
  const [savingCourse, setSavingCourse] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Get user data from localStorage
  const getUserData = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  };

  const userData = getUserData();
  const schoolId = userData?.school_id;
  
  // Fetch students from Supabase
  const { 
    data: studentsData, 
    isLoading: studentsLoading, 
    error: studentsError,
    refetch: refetchStudents
  } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => getStudentsWithDetails(schoolId),
    enabled: !!schoolId,
  });
  
  // Convert Supabase students to the format expected by our components
  const mapStudentRecordToStudent = (record: StudentRecord): Student => {
    return {
      id: record.id,
      firstName: record.first_name || '',
      lastName: record.last_name || '',
      email: record.email || '',
      courseName: record.course_name || '',
      lessonType: record.lessonType || 'individual',
      ageGroup: record.age_group?.toLowerCase() as 'adult' | 'kid',
      level: record.level?.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
      phone: record.phone,
      paymentStatus: 'pending', // This would come from subscriptions/payments
      teacherId: record.teacher_id,
    };
  };
  
  const students: Student[] = studentsData?.data ? 
    studentsData.data.map(mapStudentRecordToStudent) : 
    [];
  
  // Extract unique values for filters
  const courses = Array.from(new Set(students.map(s => s.courseName)));
  const lessonTypes = Array.from(new Set(students.map(s => s.lessonType)));
  const ageGroups = Array.from(new Set(students.map(s => s.ageGroup)));
  const levels = Array.from(new Set(students.map(s => s.level)));
  
  const handleFilterToggle = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const currentFilters = [...prev[filterType]];
      
      if (currentFilters.includes(value)) {
        return {
          ...prev,
          [filterType]: currentFilters.filter(f => f !== value)
        };
      } else {
        return {
          ...prev,
          [filterType]: [...currentFilters, value]
        };
      }
    });
  };
  
  const clearFilters = () => {
    setActiveFilters({
      courseName: [],
      lessonType: [],
      ageGroup: [],
      level: []
    });
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is already reactive, but we can add focus behavior
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };
  
  const getActiveFilterCount = () => {
    return Object.values(activeFilters).reduce((count, filters) => count + filters.length, 0);
  };
  
  const filterStudents = () => {
    let filtered = [...students];
    
    // Search functionality
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        student => 
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(term) ||
          student.email.toLowerCase().includes(term) ||
          student.courseName.toLowerCase().includes(term) ||
          (student.phone && student.phone.toLowerCase().includes(term))
      );
    }
    
    // Apply multiple filter types
    if (activeFilters.courseName.length > 0) {
      filtered = filtered.filter(student => 
        activeFilters.courseName.includes(student.courseName)
      );
    }
    
    if (activeFilters.lessonType.length > 0) {
      filtered = filtered.filter(student => 
        activeFilters.lessonType.includes(student.lessonType)
      );
    }
    
    if (activeFilters.ageGroup.length > 0) {
      filtered = filtered.filter(student => 
        activeFilters.ageGroup.includes(student.ageGroup)
      );
    }
    
    if (activeFilters.level.length > 0) {
      filtered = filtered.filter(student => 
        activeFilters.level.includes(student.level)
      );
    }
    
    // Payment status filtering from tabs
    if (selectedTab !== 'all') {
      filtered = filtered.filter(student => 
        student.paymentStatus === selectedTab
      );
    }
    
    return filtered;
  };
  
  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsEditMode(true);
    setIsAddStudentOpen(true);
  };
  
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsEditMode(true);
    setIsAddStudentOpen(true);
  };
  
  const handleDeleteStudent = (student: Student) => {
    // In a real app, we would call a Supabase function to delete the student
    toast.success(`${student.firstName} ${student.lastName} deleted successfully`);
    refetchStudents();
  };
  
  const handleCloseDialog = () => {
    setIsAddStudentOpen(false);
    setSelectedStudent(null);
    setIsEditMode(false);
  };
  
  const handleAddCourse = async () => {
    if (!newCourseName.trim()) {
      toast.error("Please enter a course name");
      return;
    }
    
    try {
      setSavingCourse(true);
      
      const { data, error } = await createCourse(
        schoolId,
        newCourseName.trim(),
        newCourseType
      );
      
      if (error) {
        console.error("Error creating course:", error);
        toast.error(error.message || "Failed to create course");
        return;
      }
      
      toast.success(`Course "${newCourseName}" created successfully`);
      setNewCourseName("");
      setIsAddCourseOpen(false);
      
    } catch (error) {
      console.error("Error adding course:", error);
      toast.error("An error occurred while creating the course");
    } finally {
      setSavingCourse(false);
    }
  };
  
  const handleStudentAdded = () => {
    refetchStudents();
  };
  
  const filteredStudents = filterStudents();
  
  return (
    <div className="space-y-6 pt-6 sm:pt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground mt-1">Manage your students and track their progress</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsAddCourseOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Course</span>
          </Button>
          
          <Button 
            className="gap-2 shrink-0" 
            variant="default"
            onClick={() => {
              setSelectedStudent(null);
              setIsEditMode(false);
              setIsAddStudentOpen(true);
            }}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add New Student</span>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, course or phone..." 
            className="pl-10 pr-14"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={searchInputRef}
          />
          {searchTerm && (
            <Button 
              type="button"
              variant="ghost" 
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2" 
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 rounded-full">
                  {getActiveFilterCount()}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="max-h-[50vh] overflow-auto p-1">
              <DropdownMenuLabel className="font-semibold text-xs">Course</DropdownMenuLabel>
              {courses.map(course => (
                <DropdownMenuCheckboxItem
                  key={`course-${course}`}
                  checked={activeFilters.courseName.includes(course)}
                  onCheckedChange={() => handleFilterToggle('courseName', course)}
                  className="capitalize"
                >
                  {course}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-xs">Lesson Type</DropdownMenuLabel>
              {lessonTypes.map(type => (
                <DropdownMenuCheckboxItem
                  key={`type-${type}`}
                  checked={activeFilters.lessonType.includes(type)}
                  onCheckedChange={() => handleFilterToggle('lessonType', type)}
                  className="capitalize"
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-xs">Age Group</DropdownMenuLabel>
              {ageGroups.map(age => (
                <DropdownMenuCheckboxItem
                  key={`age-${age}`}
                  checked={activeFilters.ageGroup.includes(age)}
                  onCheckedChange={() => handleFilterToggle('ageGroup', age)}
                  className="capitalize"
                >
                  {age}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-xs">Level</DropdownMenuLabel>
              {levels.map(level => (
                <DropdownMenuCheckboxItem
                  key={`level-${level}`}
                  checked={activeFilters.level.includes(level)}
                  onCheckedChange={() => handleFilterToggle('level', level)}
                  className="capitalize"
                >
                  {level}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
            
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={clearFilters}
                disabled={getActiveFilterCount() === 0}
              >
                Clear Filters
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Show active filters as badges, but only when filters are active */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(activeFilters).map(([filterType, values]) => 
            values.map(value => (
              <Badge 
                key={`${filterType}-${value}`}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                <span className="text-xs capitalize">{value}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterToggle(filterType as keyof typeof activeFilters, value)}
                />
              </Badge>
            ))
          )}
          {getActiveFilterCount() > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
      
      <Tabs 
        defaultValue="all" 
        className="w-full"
        onValueChange={value => setSelectedTab(value)}
      >
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary">{students.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Paid
            <Badge variant="secondary">{students.filter(s => s.paymentStatus === 'paid').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Pending
            <Badge variant="secondary">{students.filter(s => s.paymentStatus === 'pending').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Overdue
            <Badge variant="secondary">{students.filter(s => s.paymentStatus === 'overdue').length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTab} className="mt-0">
          {studentsLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium">Loading students...</h3>
            </div>
          ) : studentsError ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-red-500">Error loading students</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchStudents()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 element-transition">
              {filteredStudents.map(student => (
                <StudentCard 
                  key={student.id} 
                  student={student} 
                  className="glass glass-hover" 
                  onEdit={handleEditStudent}
                  onDelete={handleDeleteStudent}
                />
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
      
      <PaymentProvider>
        <AddStudentDialog 
          open={isAddStudentOpen} 
          onOpenChange={handleCloseDialog}
          student={selectedStudent}
          isEditMode={isEditMode}
          onStudentAdded={handleStudentAdded}
        />
      </PaymentProvider>
      
      {/* Add Course Dialog */}
      <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
            <DialogDescription>
              Create a new course for your students.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="courseName" className="text-sm font-medium">
                Course Name
              </label>
              <Input
                id="courseName"
                placeholder="e.g., IELTS Preparation"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="courseType" className="text-sm font-medium">
                Lesson Type
              </label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="individual" 
                    value="Individual"
                    checked={newCourseType === 'Individual'}
                    onChange={() => setNewCourseType('Individual')}
                    className="form-radio h-4 w-4"
                  />
                  <label htmlFor="individual" className="text-sm">Individual</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="group" 
                    value="Group"
                    checked={newCourseType === 'Group'}
                    onChange={() => setNewCourseType('Group')}
                    className="form-radio h-4 w-4"
                  />
                  <label htmlFor="group" className="text-sm">Group</label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddCourseOpen(false)}
              disabled={savingCourse}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddCourse}
              disabled={savingCourse}
            >
              {savingCourse ? 'Creating...' : 'Create Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
