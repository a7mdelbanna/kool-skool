import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Users,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { teachersService, Teacher } from '@/services/firebase/teachers.service';
import TeacherCard from '@/components/TeacherCard';
import AddTeacherDialog from '@/components/AddTeacherDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Teachers = () => {
  const navigate = useNavigate();

  // Get user data and check permissions
  const getUserData = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    return JSON.parse(userData);
  };

  const user = getUserData();
  const schoolId = user?.schoolId;

  // Redirect if not admin or superadmin
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      toast.error('You do not have permission to access this page');
      navigate('/');
    }
  }, [user, navigate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    const savedView = localStorage.getItem('teacherViewMode');
    return (savedView === 'list' || savedView === 'card') ? savedView : 'card';
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; teacherId: string | null }>({
    open: false,
    teacherId: null
  });
  const [filters, setFilters] = useState({
    subjects: [] as string[],
    languages: [] as string[],
    status: 'all' as 'all' | 'active' | 'inactive'
  });

  // Fetch teachers
  const {
    data: teachers = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const allTeachers = await teachersService.getBySchoolId(schoolId);

      // Fetch stats for each teacher
      const teachersWithStats = await Promise.all(
        allTeachers.map(async (teacher) => {
          try {
            const stats = await teachersService.getTeacherStats(teacher.id);
            return {
              ...teacher,
              ...stats
            };
          } catch (error) {
            console.error(`Error fetching stats for teacher ${teacher.id}:`, error);
            return teacher;
          }
        })
      );

      return teachersWithStats;
    },
    enabled: !!schoolId,
  });

  // Save view preference
  useEffect(() => {
    localStorage.setItem('teacherViewMode', viewMode);
  }, [viewMode]);

  // Extract unique subjects and languages for filters
  const allSubjects = [...new Set(teachers.flatMap(t => t.subjects || []))];
  const allLanguages = [...new Set(teachers.flatMap(t => t.languages || []))];

  // Filter teachers based on search and filters
  const filteredTeachers = teachers.filter(teacher => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      teacher.firstName.toLowerCase().includes(searchLower) ||
      teacher.lastName.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower) ||
      (teacher.subjects && teacher.subjects.some(s => s.toLowerCase().includes(searchLower)));

    // Status filter
    const matchesStatus = filters.status === 'all' ||
      (filters.status === 'active' && teacher.isActive) ||
      (filters.status === 'inactive' && !teacher.isActive);

    // Subject filter
    const matchesSubjects = filters.subjects.length === 0 ||
      (teacher.subjects && teacher.subjects.some(s => filters.subjects.includes(s)));

    // Language filter
    const matchesLanguages = filters.languages.length === 0 ||
      (teacher.languages && teacher.languages.some(l => filters.languages.includes(l)));

    return matchesSearch && matchesStatus && matchesSubjects && matchesLanguages;
  });

  // Separate active and inactive teachers
  const activeTeachers = filteredTeachers.filter(t => t.isActive);
  const inactiveTeachers = filteredTeachers.filter(t => !t.isActive);

  const handleEditTeacher = (teacher: Teacher) => {
    // TODO: Implement edit dialog
    toast.info('Edit functionality coming soon');
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await teachersService.delete(teacherId);
      toast.success('Teacher deactivated successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate teacher');
    } finally {
      setDeleteConfirm({ open: false, teacherId: null });
    }
  };

  const handleViewTeacher = (teacherId: string) => {
    navigate(`/teacher/${teacherId}`);
  };

  const TeacherList = ({ teacherList }: { teacherList: typeof teachers }) => {
    if (teacherList.length === 0) {
      return (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Teachers Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filters.subjects.length > 0 || filters.languages.length > 0
              ? "Try adjusting your filters"
              : "Add your first teacher to get started"}
          </p>
          {selectedTab === 'all' && !searchTerm && filters.subjects.length === 0 && filters.languages.length === 0 && (
            <Button onClick={() => setIsAddTeacherOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          )}
        </Card>
      );
    }

    if (viewMode === 'card') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teacherList.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onEdit={handleEditTeacher}
              onDelete={(id) => setDeleteConfirm({ open: true, teacherId: id })}
              onView={handleViewTeacher}
            />
          ))}
        </div>
      );
    }

    // List view (TODO: Implement list view component)
    return (
      <div className="space-y-2">
        {teacherList.map((teacher) => (
          <Card key={teacher.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {teacher.firstName} {teacher.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{teacher.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={teacher.isActive ? "success" : "secondary"}>
                  {teacher.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewTeacher(teacher.id)}
                >
                  View
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your teaching staff and their profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddTeacherOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {teachers.filter(t => t.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.reduce((sum, t) => sum + (t.studentCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.reduce((sum, t) => sum + (t.completedLessons || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(filters.subjects.length > 0 || filters.languages.length > 0) && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.subjects.length + filters.languages.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Status Filter */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Status
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setFilters({ ...filters, status: 'all' })}>
                All Teachers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters({ ...filters, status: 'active' })}>
                Active Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters({ ...filters, status: 'inactive' })}>
                Inactive Only
              </DropdownMenuItem>

              {allSubjects.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Subjects
                  </DropdownMenuLabel>
                  {allSubjects.map(subject => (
                    <DropdownMenuCheckboxItem
                      key={subject}
                      checked={filters.subjects.includes(subject)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFilters({ ...filters, subjects: [...filters.subjects, subject] });
                        } else {
                          setFilters({
                            ...filters,
                            subjects: filters.subjects.filter(s => s !== subject)
                          });
                        }
                      }}
                    >
                      {subject}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}

              {allLanguages.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Languages
                  </DropdownMenuLabel>
                  {allLanguages.map(language => (
                    <DropdownMenuCheckboxItem
                      key={language}
                      checked={filters.languages.includes(language)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFilters({ ...filters, languages: [...filters.languages, language] });
                        } else {
                          setFilters({
                            ...filters,
                            languages: filters.languages.filter(l => l !== language)
                          });
                        }
                      }}
                    >
                      {language}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}

              {(filters.subjects.length > 0 || filters.languages.length > 0 || filters.status !== 'all') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setFilters({
                      subjects: [],
                      languages: [],
                      status: 'all'
                    })}
                  >
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Teachers Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">
            All Teachers
            <Badge variant="secondary" className="ml-2">
              {filteredTeachers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-2">
              {activeTeachers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive
            <Badge variant="secondary" className="ml-2">
              {inactiveTeachers.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="p-12 text-center">
              <p className="text-red-500">Failed to load teachers. Please try again.</p>
            </Card>
          ) : (
            <TeacherList teacherList={filteredTeachers} />
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <TeacherList teacherList={activeTeachers} />
        </TabsContent>

        <TabsContent value="inactive" className="mt-6">
          <TeacherList teacherList={inactiveTeachers} />
        </TabsContent>
      </Tabs>

      {/* Add Teacher Dialog */}
      <AddTeacherDialog
        open={isAddTeacherOpen}
        onOpenChange={setIsAddTeacherOpen}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) =>
        setDeleteConfirm({ ...deleteConfirm, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deactivation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this teacher? They will no longer be able to access the system.
              You can reactivate them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm.teacherId && handleDeleteTeacher(deleteConfirm.teacherId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Teachers;