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
      
      // Then load students (we'll fetch them individually if batch fetch fails)
      if (user.schoolId) {
        try {
          const studentsData = await studentsService.getBySchoolId(user.schoolId);
          console.log('Loaded students from Firebase:', studentsData.length);
          setStudents(studentsData);
        } catch (error) {
          console.error('Error loading students from Firebase:', error);
          // We'll fetch students individually as needed
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
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">TODOs Management</h1>
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
            <DialogContent className="max-w-md">
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
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
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
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Circle className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          
          <Card className="p-4 border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Due Soon</p>
                <p className="text-2xl font-bold text-orange-600">{stats.dueSoon}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
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
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-[200px]">
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
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTodos.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No TODOs found</p>
              {showMigrationButton && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    If you have existing TODOs that aren't showing up, they may need to be migrated.
                  </p>
                  <Button 
                    onClick={handleFixTodosSchoolId}
                    variant="outline"
                    className="gap-2"
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