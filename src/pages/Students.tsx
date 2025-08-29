import React, { useState, useRef, useEffect, useContext } from 'react';
import { PlusCircle, Search, Filter, CheckCircle, X, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentCard, { Student } from '@/components/StudentCard';
import AddStudentDialog from '@/components/AddStudentDialog';
import { toast } from 'sonner';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getStudentsWithDetails, 
  StudentRecord, 
  createCourse, 
  supabase
} from '@/integrations/supabase/client';
import { UserContext } from '@/App';
import { useNavigate } from 'react-router-dom';
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

const USE_MOCK_DATA = false;

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
  const [newCourseType, setNewCourseType] = useState<'individual' | 'group'>('individual');
  const [savingCourse, setSavingCourse] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user, setUser } = useContext(UserContext);
  
  const schoolId = user?.schoolId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { 
    data: studentsData, 
    isLoading: studentsLoading, 
    error: studentsError,
    refetch: refetchStudents,
    isRefetching: isRefetchingStudents
  } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => getStudentsWithDetails(schoolId),
    enabled: !!schoolId,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: false
  });
  
  useEffect(() => {
    if (schoolId) {
      refetchStudents();
    }
  }, [schoolId, refetchStudents]);
  
  // Update the mapping function to work with the actual data structure
  const mapStudentDataToStudent = (data: any): Student => {
    
    // Format next session date for display
    const formatNextSession = (dateStr: string | null): string => {
      if (!dateStr) return 'Not scheduled';
      
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    const mappedStudent = {
      id: data.id,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      email: data.email || '',
      courseName: data.course_name || '',
      lessonType: (data.lesson_type as 'individual' | 'group') || 'individual',
      ageGroup: (data.age_group?.toLowerCase() as 'adult' | 'kid') || 'adult',
      level: data.level || '',
      phone: data.phone,
      countryCode: data.countryCode || data.country_code || '',
      paymentStatus: (data.payment_status || 'not paid') as 'paid' | 'partial' | 'not paid' | 'overdue',
      teacherId: data.teacher_id,
      lessonsCompleted: data.lessons_count || 0,
      nextLesson: formatNextSession(data.next_session_date),
      nextPaymentDate: data.next_payment_date,
      nextPaymentAmount: data.next_payment_amount,
      subscriptionProgress: data.subscription_progress || '0/0',
      parentInfo: data.parent_info || data.parentInfo || null
    };
    
    return mappedStudent;
  };
  
  
  const students: Student[] = USE_MOCK_DATA 
    ? getMockStudents() 
    : (studentsData ? 
      studentsData.map(mapStudentDataToStudent) : 
      []);
  
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
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };
  
  const getActiveFilterCount = () => {
    return Object.values(activeFilters).reduce((count, filters) => count + filters.length, 0);
  };
  
  const filterStudents = () => {
    let filtered = [...students];
    
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
  
  const handleDeleteStudent = async (student: Student) => {
    try {
      toast.promise(
        async () => {
          const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', student.id);
          
          if (error) throw new Error(error.message);
          
          await refetchStudents();
          
          return { success: true };
        },
        {
          loading: 'Deleting student...',
          success: `${student.firstName} ${student.lastName} deleted successfully`,
          error: (err) => `Failed to delete student: ${err.message}`
        }
      );
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };
  
  const handleCloseDialog = () => {
    setIsAddStudentOpen(false);
    setSelectedStudent(null);
    setIsEditMode(false);
    
    setTimeout(() => {
      refetchStudents();
    }, 300);
  };
  
  const handleAddCourse = async () => {
    if (!newCourseName.trim()) {
      toast.error("Please enter a course name");
      return;
    }
    
    try {
      setSavingCourse(true);
      
      if (!user || !user.schoolId) {
        toast.error("User data is missing. Please log in again.");
        return;
      }
      
      toast.loading("Creating course...");
      
      const courseData = await createCourse(newCourseName.trim(), newCourseType);
      
      toast.dismiss();
      
      if (!courseData) {
        toast.error("Failed to create course");
        return;
      }
      
      toast.success(`Course "${newCourseName}" created successfully`);
      setNewCourseName("");
      setIsAddCourseOpen(false);
      
      refetchStudents();
      
    } catch (error) {
      toast.dismiss();
      console.error("Error adding course:", error);
      
      if (error instanceof Error) {
        if (error.message?.includes("Authentication required") || 
            error.message?.includes("expired") || 
            error.message?.includes("JWT")) {
          toast.error("Your session has expired. Please log in again.");
          
          localStorage.removeItem('user');
          setUser(null);
          navigate('/login');
          return;
        }
        
        toast.error(error.message || "Failed to create course");
      } else {
        toast.error("An error occurred while creating the course");
      }
    } finally {
      setSavingCourse(false);
    }
  };
  
  const handleStudentAdded = async (newStudent: Student) => {
    // Don't show duplicate toast for updates (already shown in useStudentForm)
    if (!isEditMode) {
      toast.success(`Student ${newStudent.firstName} ${newStudent.lastName} added successfully`);
    }
    
    // Invalidate all related queries immediately
    await queryClient.invalidateQueries({ queryKey: ['students'] });
    await queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
    
    // Refetch students data
    await refetchStudents();
    
    // Close the dialog
    handleCloseDialog();
  };
  
  const handleForceRefresh = () => {
    setIsLoading(true);
    toast.loading('Refreshing students list...');
    
    console.log('Current user context:', user);
    
    queryClient.invalidateQueries({ queryKey: ['students'] });
    
    console.log('Force refreshing students data...');
    refetchStudents().then((result) => {
      console.log('Refetch result:', result);
      toast.dismiss();
      toast.success('Student list refreshed');
      setIsLoading(false);
    }).catch(error => {
      console.error('Error during force refresh:', error);
      toast.dismiss();
      toast.error(`Error refreshing: ${error.message}`);
      setIsLoading(false);
    });
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
          
          <Button 
            variant="outline"
            size="sm"
            onClick={handleForceRefresh}
            className="gap-2"
            disabled={isRefetchingStudents || isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${(isRefetchingStudents || isLoading) ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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
              {courses.length > 0 ? (
                courses.map(course => (
                  <DropdownMenuCheckboxItem
                    key={`course-${course}`}
                    checked={activeFilters.courseName.includes(course)}
                    onCheckedChange={() => handleFilterToggle('courseName', course)}
                    className="capitalize"
                  >
                    {course}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1 text-xs text-muted-foreground">No courses available</div>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-xs">Lesson Type</DropdownMenuLabel>
              {lessonTypes.length > 0 ? (
                lessonTypes.map(type => (
                  <DropdownMenuCheckboxItem
                    key={`type-${type}`}
                    checked={activeFilters.lessonType.includes(type)}
                    onCheckedChange={() => handleFilterToggle('lessonType', type)}
                    className="capitalize"
                  >
                    {type}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1 text-xs text-muted-foreground">No lesson types available</div>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-xs">Age Group</DropdownMenuLabel>
              {ageGroups.length > 0 ? (
                ageGroups.map(age => (
                  <DropdownMenuCheckboxItem
                    key={`age-${age}`}
                    checked={activeFilters.ageGroup.includes(age)}
                    onCheckedChange={() => handleFilterToggle('ageGroup', age)}
                    className="capitalize"
                  >
                    {age}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1 text-xs text-muted-foreground">No age groups available</div>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-xs">Level</DropdownMenuLabel>
              {levels.length > 0 ? (
                levels.map(level => (
                  <DropdownMenuCheckboxItem
                    key={`level-${level}`}
                    checked={activeFilters.level.includes(level)}
                    onCheckedChange={() => handleFilterToggle('level', level)}
                    className="capitalize"
                  >
                    {level}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1 text-xs text-muted-foreground">No levels available</div>
              )}
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
          <TabsTrigger value="not paid" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-500" />
            Not Paid
            <Badge variant="secondary">{students.filter(s => s.paymentStatus === 'not paid').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Overdue
            <Badge variant="secondary">{students.filter(s => s.paymentStatus === 'overdue').length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTab} className="mt-0">
          {studentsLoading || isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium">Loading students...</h3>
            </div>
          ) : studentsError ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-red-500">Error loading students: {studentsError.message}</p>
              <pre className="text-xs text-left bg-gray-100 p-2 rounded max-h-32 overflow-auto">
                {JSON.stringify(studentsError, null, 2)}
              </pre>
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
          ) : students.length > 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No students match your filters</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
              {selectedTab === 'paid' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Paid Filter:</strong> Shows students whose total payments are greater than or equal to their active subscription costs.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Students appear here when they have fully paid for their current subscriptions.
                  </p>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="mt-4"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No students found</h3>
              <p className="text-muted-foreground mt-1">Add your first student to get started</p>
              <div className="mt-2 mb-4">
                <details className="text-sm text-left bg-gray-50 p-3 rounded border">
                  <summary className="cursor-pointer font-medium">Debug Info (click to expand)</summary>
                  <div className="pt-2">
                    <p>School ID: {schoolId || 'Not set'}</p>
                    <p>User role: {user?.role || 'Not set'}</p>
                    <p>Data fetch status: {studentsLoading ? 'Loading' : 'Complete'}</p>
                    <p>Students data array: {studentsData ? `${studentsData.length} records` : 'Undefined'}</p>
                  </div>
                </details>
              </div>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  setSelectedStudent(null);
                  setIsEditMode(false);
                  setIsAddStudentOpen(true);
                }}
                className="mt-4 gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Add Student
              </Button>
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
                    value="individual"
                    checked={newCourseType === 'individual'}
                    onChange={() => setNewCourseType('individual')}
                    className="form-radio h-4 w-4"
                  />
                  <label htmlFor="individual" className="text-sm">Individual</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="group" 
                    value="group"
                    checked={newCourseType === 'group'}
                    onChange={() => setNewCourseType('group')}
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

function getMockStudents(): Student[] {
  return [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      lessonType: 'individual',
      ageGroup: 'adult',
      courseName: 'IELTS Preparation',
      level: 'intermediate',
      phone: '+1234567890',
      paymentStatus: 'paid',
      lessonsCompleted: 12,
      nextLesson: '2025-04-01',
      nextPaymentDate: '2025-04-15',
      nextPaymentAmount: 100
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      lessonType: 'group',
      ageGroup: 'adult',
      courseName: 'Business English',
      level: 'advanced',
      phone: '+0987654321',
      paymentStatus: 'pending',
      lessonsCompleted: 8,
      nextLesson: '2025-03-28',
      nextPaymentDate: '2025-04-01',
      nextPaymentAmount: 50
    },
    {
      id: '3',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.j@example.com',
      lessonType: 'individual',
      ageGroup: 'kid',
      courseName: 'Basic English',
      level: 'beginner',
      phone: '+1122334455',
      paymentStatus: 'overdue',
      lessonsCompleted: 3,
      nextLesson: '2025-03-29',
      nextPaymentDate: '2025-03-15',
      nextPaymentAmount: 75
    }
  ];
}
