import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Filter,
  Search,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  User,
  BookOpen,
  Target,
  RefreshCcw
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { 
  todosService, 
  Todo, 
  TodoCategory, 
  TodoPriority, 
  TodoStatus,
  TodoFilter
} from '@/services/firebase/todos.service';
import { supabase } from '@/integrations/supabase/client';
import { fixTodosWithoutSchoolId } from '@/utils/fixTodosSchoolId';
import { studentsService, FirebaseStudent } from '@/services/firebase/students.service';
import TodoItem from '@/components/todos/TodoItem';

const TodosPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [students, setStudents] = useState<FirebaseStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TodoStatus[]>([]);
  const [filterPriority, setFilterPriority] = useState<TodoPriority[]>([]);
  const [filterCategory, setFilterCategory] = useState<TodoCategory[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Todo>>({
    title: '',
    description: '',
    category: 'homework',
    priority: 'medium',
    status: 'pending',
    due_date: new Date(),
    notes: '',
    student_id: ''
  });
  const [showMigrationButton, setShowMigrationButton] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [selectedStudent, filterStatus, filterPriority, filterCategory, activeTab]);

  const loadData = async () => {
    if (!user) {
      console.log('No user found, skipping data load');
      return;
    }

    console.log('Loading data for user:', {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId
    });

    try {
      setLoading(true);

      // Load TODOs first
      await loadTodos();

      // Then load students from Firebase (same as Students page)
      if (user.schoolId) {
        try {
          // Import databaseService if not already imported
          const { databaseService } = await import('@/services/firebase/database.service');

          // Fetch students from Firebase using the same method as Students page
          const studentsData = await databaseService.getBySchoolId('students', user.schoolId);
          console.log('Loaded students from Firebase:', studentsData.length);

          // Transform the data to match FirebaseStudent interface
          // The data from Firebase already has the correct structure
          const formattedStudents: FirebaseStudent[] = studentsData.map((student: any) => ({
            id: student.id || student.studentId,
            studentId: student.studentId || student.id,
            firstName: student.firstName || student.first_name || '',
            lastName: student.lastName || student.last_name || '',
            email: student.email || '',
            phone: student.phone || '',
            schoolId: student.schoolId || student.school_id || user.schoolId,
            status: student.status || 'active',
            courseName: student.courseName || student.course_name || '',
            level: student.level || '',
            teacherId: student.teacherId || student.teacher_id || '',
            groupId: student.groupId || student.group_id || '',
            whatsappPhone: student.whatsappPhone || student.whatsapp_phone || '',
            profilePictureUrl: student.profilePictureUrl || student.profile_picture_url || '',
            dateOfBirth: student.dateOfBirth || student.date_of_birth || '',
            gender: student.gender || '',
            address: student.address || '',
            city: student.city || '',
            country: student.country || '',
            parentName: student.parentName || student.parent_name || '',
            parentPhone: student.parentPhone || student.parent_phone || '',
            parentEmail: student.parentEmail || student.parent_email || '',
            medicalConditions: student.medicalConditions || student.medical_conditions || '',
            allergies: student.allergies || '',
            emergencyContact: student.emergencyContact || student.emergency_contact || '',
            emergencyPhone: student.emergencyPhone || student.emergency_phone || '',
            notes: student.notes || '',
            joinDate: student.joinDate || student.join_date || '',
            totalLessonsTaken: student.totalLessonsTaken || student.total_lessons_taken || 0,
            totalPayments: student.totalPayments || student.total_payments || 0
          }));

          setStudents(formattedStudents);
        } catch (error) {
          console.error('Error loading students from Firebase:', error);
          setStudents([]);
        }
      } else {
        console.warn('User has no schoolId, skipping student load');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTodos = async () => {
    if (!user) {
      console.log('No user found, skipping TODOs load');
      return;
    }
    
    console.log('Loading TODOs for user role:', user.role);
    
    try {
      let todosList: Todo[] = [];
      
      if (user.role === 'teacher' && user.id) {
        // Load TODOs for this teacher
        console.log('Loading teacher TODOs for:', user.id);
        todosList = await todosService.getByTeacherId(user.id);
      } else if ((user.role === 'admin' || user.role === 'superadmin') && user.schoolId) {
        // Load all TODOs for the school
        console.log('Loading school TODOs for school:', user.schoolId);
        todosList = await todosService.getBySchoolId(user.schoolId);
      } else {
        console.warn('Missing required user data:', {
          role: user.role,
          id: user.id,
          schoolId: user.schoolId
        });
        setTodos([]);
        calculateStats([]);
        return;
      }
      
      console.log('Loaded TODOs count:', todosList.length);
      
      // Show migration button if no TODOs found and user is admin
      if (todosList.length === 0 && (user.role === 'admin' || user.role === 'superadmin')) {
        setShowMigrationButton(true);
      } else {
        setShowMigrationButton(false);
      }
      
      setTodos(todosList);
      calculateStats(todosList);
    } catch (error) {
      console.error('Error loading TODOs:', error);
      toast.error('Failed to load TODOs');
      setTodos([]);
      calculateStats([]);
    }
  };

  const calculateStats = (todosList: Todo[]) => {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    
    const stats = {
      total: todosList.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
      dueSoon: 0
    };
    
    todosList.forEach(todo => {
      switch (todo.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_progress':
          stats.in_progress++;
          break;
        case 'completed':
          stats.completed++;
          break;
      }
      
      if (todo.status !== 'completed' && todo.status !== 'cancelled') {
        const dueDate = new Date(todo.due_date);
        if (isBefore(dueDate, now)) {
          stats.overdue++;
        } else if (isBefore(dueDate, weekFromNow)) {
          stats.dueSoon++;
        }
      }
    });
    
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...todos];
    
    // Filter by student
    if (selectedStudent !== 'all') {
      filtered = filtered.filter(todo => todo.student_id === selectedStudent);
    }
    
    // Filter by status
    if (filterStatus.length > 0) {
      filtered = filtered.filter(todo => filterStatus.includes(todo.status));
    }
    
    // Filter by priority
    if (filterPriority.length > 0) {
      filtered = filtered.filter(todo => filterPriority.includes(todo.priority));
    }
    
    // Filter by category
    if (filterCategory.length > 0) {
      filtered = filtered.filter(todo => filterCategory.includes(todo.category));
    }
    
    // Filter by tab
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = addDays(today, 1);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    switch (activeTab) {
      case 'today':
        filtered = filtered.filter(todo => {
          const dueDate = new Date(todo.due_date);
          return dueDate >= today && dueDate < tomorrow;
        });
        break;
      case 'week':
        filtered = filtered.filter(todo => {
          const dueDate = new Date(todo.due_date);
          return dueDate >= weekStart && dueDate <= weekEnd;
        });
        break;
      case 'overdue':
        filtered = filtered.filter(todo => {
          const dueDate = new Date(todo.due_date);
          return dueDate < today && todo.status !== 'completed' && todo.status !== 'cancelled';
        });
        break;
      case 'completed':
        filtered = filtered.filter(todo => todo.status === 'completed');
        break;
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(todo => 
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const handleAddTodo = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    
    if (!user.schoolId) {
      toast.error('Unable to create TODO: School information missing');
      return;
    }
    
    try {
      if (!formData.title || !formData.student_id) {
        toast.error('Please fill in required fields');
        return;
      }
      
      const newTodo: Todo = {
        ...formData as Todo,
        teacher_id: user.id || '',
        school_id: user.schoolId
      };
      
      const todoId = await todosService.create(newTodo);
      const createdTodo = { ...newTodo, id: todoId };
      
      setTodos([...todos, createdTodo]);
      calculateStats([...todos, createdTodo]);
      
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('TODO created successfully');
    } catch (error) {
      console.error('Error creating TODO:', error);
      toast.error('Failed to create TODO');
    }
  };

  const handleStatusChange = async (todo: Todo, newStatus: TodoStatus) => {
    try {
      const updates: Partial<Todo> = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date();
      }
      
      await todosService.update(todo.id!, updates);
      
      const updatedTodos = todos.map(t => 
        t.id === todo.id ? { ...t, ...updates } : t
      );
      setTodos(updatedTodos);
      calculateStats(updatedTodos);
      
      toast.success(`TODO marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating TODO status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleFixTodosSchoolId = async () => {
    if (!user || !user.schoolId) {
      toast.error('Unable to fix TODOs: School information missing');
      return;
    }
    
    try {
      const toastId = toast.loading('Fixing TODOs school_id...');
      const result = await fixTodosWithoutSchoolId(user.schoolId);
      
      toast.dismiss(toastId);
      if (result.success) {
        toast.success(`Fixed ${result.count} TODOs with school_id`);
        // Reload TODOs after fixing
        await loadTodos();
      } else {
        toast.error('Failed to fix TODOs');
      }
    } catch (error) {
      console.error('Error fixing TODOs:', error);
      toast.error('An error occurred while fixing TODOs');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'homework',
      priority: 'medium',
      status: 'pending',
      due_date: new Date(),
      notes: '',
      student_id: ''
    });
    setStudentSearchQuery(''); // Clear search query when form is reset
  };

  const getPriorityColor = (priority: TodoPriority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: TodoCategory) => {
    switch (category) {
      case 'homework': return '📚';
      case 'practice': return '✏️';
      case 'review': return '🔄';
      case 'project': return '🎯';
      case 'assessment': return '📝';
      default: return '📌';
    }
  };

  const getStatusIcon = (status: TodoStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const isOverdue = (todo: Todo) => {
    return todo.status !== 'completed' && 
           todo.status !== 'cancelled' && 
           new Date(todo.due_date) < new Date();
  };

  const filteredTodos = applyFilters();

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">TODOs Management</h1>
            <p className="text-muted-foreground">
              Manage tasks and assignments for your students
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add TODO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md glass-card border-border/50">
              <DialogHeader>
                <DialogTitle>Create New TODO</DialogTitle>
                <DialogDescription>
                  Add a new task for a student
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="student">Student *</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, student_id: value });
                      setStudentSearchQuery(''); // Clear search when student selected
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Search input inside the dropdown */}
                      <div className="px-2 pb-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search students..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="pl-8 h-9"
                            onClick={(e) => e.stopPropagation()} // Prevent closing dropdown
                          />
                        </div>
                      </div>

                      {/* Filtered student list */}
                      <div className="max-h-[200px] overflow-y-auto">
                        {students
                          .filter(student => {
                            const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                            return fullName.includes(studentSearchQuery.toLowerCase());
                          })
                          .map(student => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.firstName} {student.lastName}
                            </SelectItem>
                          ))}

                        {/* No results message */}
                        {students.filter(student => {
                          const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                          return fullName.includes(studentSearchQuery.toLowerCase());
                        }).length === 0 && (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No students found
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter TODO title..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add description..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: TodoCategory) => 
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homework">Homework</SelectItem>
                        <SelectItem value="practice">Practice</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: TodoPriority) => 
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={format(formData.due_date || new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      due_date: new Date(e.target.value) 
                    })}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddTodo}>
                    Create TODO
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="glass-card glass-card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="glass-card glass-card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
              <div className="p-2 bg-gray-500/10 rounded-lg">
                <Circle className="h-6 w-6 text-gray-500" />
              </div>
            </div>
          </Card>

          <Card className="glass-card glass-card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{stats.in_progress}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="glass-card glass-card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="glass-card glass-card-hover p-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-500">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </Card>

          <Card className="glass-card glass-card-hover p-4 border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-500">Due Soon</p>
                <p className="text-2xl font-bold text-orange-500">{stats.dueSoon}</p>
              </div>
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search TODOs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 backdrop-blur-sm border-border/50"
              />
            </div>
          </div>

          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-[200px] bg-background/50 backdrop-blur-sm border-border/50">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="hover:bg-primary/10 transition-colors">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-background/50 backdrop-blur-sm">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
          <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Today</TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">This Week</TabsTrigger>
          <TabsTrigger value="overdue" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overdue</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTodos.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No TODOs found</p>
              {showMigrationButton && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    If you have existing TODOs that aren't showing up, they may need to be migrated.
                  </p>
                  <Button
                    onClick={handleFixTodosSchoolId}
                    variant="outline"
                    className="gap-2 hover:bg-primary/10 transition-colors"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Fix Missing TODOs
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTodos.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  students={students}
                  onStatusChange={handleStatusChange}
                  isOverdue={isOverdue}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TodosPage;