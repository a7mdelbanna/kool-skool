import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  CheckCircle,
  Circle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  todosService, 
  Todo, 
  TodoCategory, 
  TodoPriority, 
  TodoStatus 
} from '@/services/firebase/todos.service';

interface SessionTodosProps {
  sessionId: string;
  studentId: string;
  teacherId: string;
  todos: Todo[];
  onTodoAdded: (todo: Todo) => void;
  onTodoUpdated: (todo: Todo) => void;
  onTodoDeleted: (todoId: string) => void;
}

const SessionTodos: React.FC<SessionTodosProps> = ({
  sessionId,
  studentId,
  teacherId,
  todos,
  onTodoAdded,
  onTodoUpdated,
  onTodoDeleted
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [deletingTodoTitle, setDeletingTodoTitle] = useState<string>('');
  const [formData, setFormData] = useState<Partial<Todo>>({
    title: '',
    description: '',
    category: 'homework',
    priority: 'medium',
    status: 'pending',
    due_date: new Date(),
    notes: ''
  });

  const handleAddTodo = async () => {
    try {
      if (!formData.title) {
        toast.error('Please enter a title for the TODO');
        return;
      }

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const newTodo: Todo = {
        ...formData as Todo,
        session_id: sessionId,
        student_id: studentId,
        teacher_id: teacherId,
        school_id: userData.school_id || ''
      };

      const todoId = await todosService.create(newTodo);
      onTodoAdded({ ...newTodo, id: todoId });
      
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('TODO added successfully');
    } catch (error) {
      console.error('Error adding TODO:', error);
      toast.error('Failed to add TODO');
    }
  };

  const handleUpdateTodo = async () => {
    if (!editingTodo?.id) return;

    try {
      await todosService.update(editingTodo.id, formData);
      onTodoUpdated({ ...editingTodo, ...formData });
      
      setEditingTodo(null);
      resetForm();
      toast.success('TODO updated successfully');
    } catch (error) {
      console.error('Error updating TODO:', error);
      toast.error('Failed to update TODO');
    }
  };

  const handleDeleteTodo = async () => {
    if (!deletingTodoId) return;

    try {
      await todosService.delete(deletingTodoId);
      onTodoDeleted(deletingTodoId);
      toast.success('TODO deleted successfully');
      setDeletingTodoId(null);
      setDeletingTodoTitle('');
    } catch (error) {
      console.error('Error deleting TODO:', error);
      toast.error('Failed to delete TODO');
    }
  };

  const openDeleteDialog = (todoId: string, todoTitle: string) => {
    setDeletingTodoId(todoId);
    setDeletingTodoTitle(todoTitle);
  };

  const handleStatusChange = async (todo: Todo, newStatus: TodoStatus) => {
    try {
      const updates: Partial<Todo> = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date();
      }
      
      await todosService.update(todo.id!, updates);
      onTodoUpdated({ ...todo, ...updates });
      toast.success(`TODO marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating TODO status:', error);
      toast.error('Failed to update status');
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
      notes: ''
    });
  };

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description,
      category: todo.category,
      priority: todo.priority,
      status: todo.status,
      due_date: todo.due_date,
      notes: todo.notes
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Session TODOs</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add TODO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New TODO</DialogTitle>
              <DialogDescription>
                Create a new TODO item for this session
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
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
                  Add TODO
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {todos.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No TODOs for this session yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {todos.map(todo => (
            <Card 
              key={todo.id} 
              className={`p-4 ${isOverdue(todo) ? 'border-red-200 bg-red-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => handleStatusChange(
                      todo, 
                      todo.status === 'completed' ? 'pending' : 'completed'
                    )}
                    className="mt-1"
                  >
                    {getStatusIcon(todo.status)}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getCategoryIcon(todo.category)}</span>
                      <h4 className={`font-medium ${
                        todo.status === 'completed' ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {todo.title}
                      </h4>
                      <Badge variant={getPriorityColor(todo.priority)}>
                        {todo.priority}
                      </Badge>
                      {isOverdue(todo) && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                    
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {todo.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {format(new Date(todo.due_date), 'MMM dd, yyyy')}
                      </span>
                      {todo.completed_at && (
                        <span className="text-green-600">
                          Completed: {format(new Date(todo.completed_at), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(todo)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(todo.id!, todo.title)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTodo} onOpenChange={(open) => !open && setEditingTodo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit TODO</DialogTitle>
            <DialogDescription>
              Update the TODO details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter TODO title..."
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add description..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Category</Label>
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
                <Label htmlFor="edit-priority">Priority</Label>
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
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: TodoStatus) => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-due_date">Due Date</Label>
              <Input
                id="edit-due_date"
                type="date"
                value={format(formData.due_date || new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  due_date: new Date(e.target.value) 
                })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTodo(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateTodo}>
                Update TODO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingTodoId} 
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTodoId(null);
            setDeletingTodoTitle('');
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete TODO
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to delete this TODO?</p>
                {deletingTodoTitle && (
                  <div className="p-3 bg-muted rounded-lg border">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      {deletingTodoTitle}
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. The TODO will be permanently removed from this session.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTodo}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete TODO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionTodos;