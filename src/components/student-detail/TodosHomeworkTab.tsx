import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  CheckSquare, 
  Clock, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Target,
  Trophy,
  Zap,
  Star
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

interface TodosHomeworkTabProps {
  todos: any[];
  sessions: any[];
  isLoading: boolean;
}

const TodosHomeworkTab: React.FC<TodosHomeworkTabProps> = ({
  todos,
  sessions,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'status'>('due_date');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['overdue', 'today', 'upcoming']));

  // Filter and sort todos
  const filteredTodos = useMemo(() => {
    let filtered = [...todos];
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(todo => 
        todo.title?.toLowerCase().includes(searchLower) ||
        todo.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(todo => todo.status === filterStatus);
    }
    
    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(todo => todo.priority === filterPriority);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
        case 'status':
          const statusOrder = { pending: 0, in_progress: 1, completed: 2 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 3) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 3);
        case 'due_date':
        default:
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
    });
    
    return filtered;
  }, [todos, searchTerm, filterStatus, filterPriority, sortBy]);

  // Categorize todos by due date
  const categorizedTodos = useMemo(() => {
    const overdue: any[] = [];
    const today: any[] = [];
    const tomorrow: any[] = [];
    const thisWeek: any[] = [];
    const upcoming: any[] = [];
    const noDueDate: any[] = [];
    const completed: any[] = [];
    
    filteredTodos.forEach(todo => {
      if (todo.status === 'completed') {
        completed.push(todo);
      } else if (!todo.due_date) {
        noDueDate.push(todo);
      } else {
        const dueDate = new Date(todo.due_date);
        if (isPast(dueDate) && !isToday(dueDate)) {
          overdue.push(todo);
        } else if (isToday(dueDate)) {
          today.push(todo);
        } else if (isTomorrow(dueDate)) {
          tomorrow.push(todo);
        } else if (differenceInDays(dueDate, new Date()) <= 7) {
          thisWeek.push(todo);
        } else {
          upcoming.push(todo);
        }
      }
    });
    
    return {
      overdue,
      today,
      tomorrow,
      thisWeek,
      upcoming,
      noDueDate,
      completed
    };
  }, [filteredTodos]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.status === 'completed').length;
    const pending = todos.filter(t => t.status === 'pending').length;
    const inProgress = todos.filter(t => t.status === 'in_progress').length;
    const overdue = categorizedTodos.overdue.length;
    const highPriority = todos.filter(t => t.priority === 'high' && t.status !== 'completed').length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeRate = completed > 0 
      ? Math.round((todos.filter(t => 
          t.status === 'completed' && 
          t.due_date && 
          new Date(t.completed_at || Date.now()) <= new Date(t.due_date)
        ).length / completed) * 100)
      : 0;
    
    return {
      total,
      completed,
      pending,
      inProgress,
      overdue,
      highPriority,
      completionRate,
      onTimeRate
    };
  }, [todos, categorizedTodos]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionInfo = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    return session ? `Session: ${session.topic || session.id.slice(-6)}` : null;
  };

  const renderTodoItem = (todo: any) => (
    <Card key={todo.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={todo.status === 'completed'}
            className="mt-1"
            disabled
          />
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className={`font-medium ${todo.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {todo.title}
                </h4>
                {todo.description && (
                  <p className="text-sm text-muted-foreground mt-1">{todo.description}</p>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                <Badge className={getPriorityColor(todo.priority)} variant="secondary">
                  {todo.priority}
                </Badge>
                <Badge className={getStatusColor(todo.status)} variant="secondary">
                  {todo.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {todo.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {format(new Date(todo.due_date), 'MMM dd, yyyy')}
                </span>
              )}
              {todo.session_id && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {getSessionInfo(todo.session_id)}
                </span>
              )}
              {todo.completed_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Completed: {format(new Date(todo.completed_at), 'MMM dd')}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTodoCategory = (
    title: string, 
    todos: any[], 
    icon: React.ReactNode,
    categoryKey: string,
    colorClass: string = ''
  ) => {
    if (todos.length === 0) return null;
    
    const isExpanded = expandedCategories.has(categoryKey);
    
    return (
      <div className="mb-6">
        <div 
          className={`flex items-center justify-between mb-3 cursor-pointer ${colorClass}`}
          onClick={() => toggleCategory(categoryKey)}
        >
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold">{title}</h3>
            <Badge variant="secondary">{todos.length}</Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        
        {isExpanded && (
          <div className="space-y-2">
            {todos.map(renderTodoItem)}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="h-32 animate-pulse bg-gray-100" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.completionRate}%</span>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </div>
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On-Time Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.onTimeRate}%</span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <Progress value={stats.onTimeRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-500' : ''}`}>
                {stats.overdue}
              </span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.highPriority}</span>
              <Zap className="h-4 w-4 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>TODOs & Homework</CardTitle>
          <CardDescription>
            {stats.pending} pending, {stats.inProgress} in progress, {stats.completed} completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search todos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="due_date">By Due Date</option>
              <option value="priority">By Priority</option>
              <option value="status">By Status</option>
            </select>
          </div>

          {/* Categorized TODOs */}
          <div>
            {renderTodoCategory(
              'Overdue',
              categorizedTodos.overdue,
              <AlertCircle className="h-4 w-4 text-red-500" />,
              'overdue',
              'text-red-600'
            )}
            
            {renderTodoCategory(
              'Due Today',
              categorizedTodos.today,
              <Clock className="h-4 w-4 text-orange-500" />,
              'today',
              'text-orange-600'
            )}
            
            {renderTodoCategory(
              'Due Tomorrow',
              categorizedTodos.tomorrow,
              <Calendar className="h-4 w-4 text-yellow-500" />,
              'tomorrow'
            )}
            
            {renderTodoCategory(
              'This Week',
              categorizedTodos.thisWeek,
              <Target className="h-4 w-4 text-blue-500" />,
              'thisWeek'
            )}
            
            {renderTodoCategory(
              'Upcoming',
              categorizedTodos.upcoming,
              <TrendingUp className="h-4 w-4 text-green-500" />,
              'upcoming'
            )}
            
            {renderTodoCategory(
              'No Due Date',
              categorizedTodos.noDueDate,
              <CheckSquare className="h-4 w-4 text-gray-500" />,
              'noDueDate'
            )}
            
            {renderTodoCategory(
              'Completed',
              categorizedTodos.completed,
              <Star className="h-4 w-4 text-green-500" />,
              'completed',
              'text-green-600'
            )}
          </div>

          {filteredTodos.length === 0 && (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'No todos found matching your filters'
                  : 'No todos assigned yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TodosHomeworkTab;