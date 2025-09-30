import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

export type TodoCategory = 'homework' | 'practice' | 'review' | 'project' | 'assessment' | 'other';
export type TodoPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TodoAttachment {
  name: string;
  url: string;
  type: string;
}

export interface Todo {
  id?: string;
  session_id?: string;
  session_detail_id?: string;
  teacher_id: string;
  student_id: string;
  school_id: string;
  
  // Core fields
  title: string;
  description?: string;
  category: TodoCategory;
  priority: TodoPriority;
  status: TodoStatus;
  
  // Dates
  due_date: Date;
  reminder_date?: Date;
  completed_at?: Date;
  
  // Additional fields
  tags?: string[];
  attachments?: TodoAttachment[];
  notes?: string;
  completion_notes?: string;
  
  // Metadata
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
  updated_by?: string;
}

export interface TodoFilter {
  school_id?: string;
  student_ids?: string[];
  teacher_id?: string;
  status?: TodoStatus[];
  priority?: TodoPriority[];
  category?: TodoCategory[];
  due_date_start?: Date;
  due_date_end?: Date;
  session_id?: string;
  tags?: string[];
}

class TodosService {
  private collectionName = 'todos';

  /**
   * Create a new TODO
   */
  async create(todo: Todo): Promise<string> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const docRef = doc(collection(db, this.collectionName));
      const data = {
        ...todo,
        due_date: Timestamp.fromDate(todo.due_date),
        reminder_date: todo.reminder_date ? Timestamp.fromDate(todo.reminder_date) : null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by: currentUser.uid,
        updated_by: currentUser.uid
      };
      
      await setDoc(docRef, data);
      return docRef.id;
    } catch (error) {
      console.error('Error creating TODO:', error);
      throw error;
    }
  }

  /**
   * Get TODO by ID
   */
  async getById(id: string): Promise<Todo | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      return this.formatTodo(docSnap.id, data);
    } catch (error) {
      console.error('Error getting TODO:', error);
      throw error;
    }
  }

  /**
   * Update TODO
   */
  async update(id: string, updates: Partial<Todo>): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const docRef = doc(db, this.collectionName, id);
      
      const updateData: any = {
        ...updates,
        updated_at: serverTimestamp(),
        updated_by: currentUser.uid
      };
      
      // Convert dates to Timestamps
      if (updates.due_date) {
        updateData.due_date = Timestamp.fromDate(updates.due_date);
      }
      if (updates.reminder_date) {
        updateData.reminder_date = Timestamp.fromDate(updates.reminder_date);
      }
      if (updates.completed_at) {
        updateData.completed_at = Timestamp.fromDate(updates.completed_at);
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating TODO:', error);
      throw error;
    }
  }

  /**
   * Delete TODO
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting TODO:', error);
      throw error;
    }
  }

  /**
   * Mark TODO as complete
   */
  async markComplete(id: string, completionNotes?: string): Promise<void> {
    try {
      await this.update(id, {
        status: 'completed',
        completed_at: new Date(),
        completion_notes: completionNotes
      });
    } catch (error) {
      console.error('Error marking TODO complete:', error);
      throw error;
    }
  }

  /**
   * Get TODOs with filters
   */
  async getWithFilters(filter: TodoFilter): Promise<Todo[]> {
    try {
      const constraints: QueryConstraint[] = [];
      
      // Add filters
      if (filter.school_id) {
        constraints.push(where('school_id', '==', filter.school_id));
      }
      if (filter.student_ids && filter.student_ids.length > 0) {
        constraints.push(where('student_id', 'in', filter.student_ids));
      }
      if (filter.teacher_id) {
        constraints.push(where('teacher_id', '==', filter.teacher_id));
      }
      if (filter.session_id) {
        constraints.push(where('session_id', '==', filter.session_id));
      }
      if (filter.status && filter.status.length > 0) {
        constraints.push(where('status', 'in', filter.status));
      }
      if (filter.priority && filter.priority.length > 0) {
        constraints.push(where('priority', 'in', filter.priority));
      }
      if (filter.category && filter.category.length > 0) {
        constraints.push(where('category', 'in', filter.category));
      }
      
      // Date range filters
      if (filter.due_date_start) {
        constraints.push(where('due_date', '>=', Timestamp.fromDate(filter.due_date_start)));
      }
      if (filter.due_date_end) {
        constraints.push(where('due_date', '<=', Timestamp.fromDate(filter.due_date_end)));
      }
      
      // Sort by due date
      constraints.push(orderBy('due_date', 'asc'));
      
      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatTodo(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting filtered TODOs:', error);
      throw error;
    }
  }

  /**
   * Get TODOs by session
   */
  async getBySessionId(sessionId: string): Promise<Todo[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('session_id', '==', sessionId),
        orderBy('priority', 'desc'),
        orderBy('due_date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatTodo(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting TODOs by session:', error);
      throw error;
    }
  }

  /**
   * Get TODOs by student
   */
  async getByStudentId(studentId: string, onlyPending = false): Promise<Todo[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('student_id', '==', studentId)
      ];
      
      if (onlyPending) {
        constraints.push(where('status', 'in', ['pending', 'in_progress']));
      }
      
      constraints.push(orderBy('due_date', 'asc'));
      
      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatTodo(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting TODOs by student:', error);
      throw error;
    }
  }

  /**
   * Get TODOs by school ID
   */
  async getBySchoolId(schoolId: string): Promise<Todo[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('school_id', '==', schoolId),
        orderBy('due_date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatTodo(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting TODOs by school:', error);
      return [];
    }
  }

  /**
   * Get TODOs by teacher
   */
  async getByTeacherId(teacherId: string): Promise<Todo[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('teacher_id', '==', teacherId),
        orderBy('due_date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatTodo(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting TODOs by teacher:', error);
      throw error;
    }
  }

  /**
   * Get overdue TODOs
   */
  async getOverdueTodos(schoolId: string): Promise<Todo[]> {
    try {
      const now = new Date();
      const q = query(
        collection(db, this.collectionName),
        where('school_id', '==', schoolId),
        where('status', 'in', ['pending', 'in_progress']),
        where('due_date', '<', Timestamp.fromDate(now)),
        orderBy('due_date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatTodo(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting overdue TODOs:', error);
      throw error;
    }
  }

  /**
   * Get upcoming TODOs (next 7 days)
   */
  async getUpcomingTodos(schoolId: string): Promise<Todo[]> {
    try {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const q = query(
        collection(db, this.collectionName),
        where('school_id', '==', schoolId),
        where('status', 'in', ['pending', 'in_progress']),
        where('due_date', '>=', Timestamp.fromDate(now)),
        where('due_date', '<=', Timestamp.fromDate(nextWeek)),
        orderBy('due_date', 'asc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc =>
        this.formatTodo(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting upcoming TODOs:', error);
      throw error;
    }
  }

  /**
   * Get urgent TODOs (overdue + due within 7 days with high/urgent priority)
   */
  async getUrgentTodos(schoolId: string): Promise<Todo[]> {
    try {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Get overdue TODOs first
      const overdueQuery = query(
        collection(db, this.collectionName),
        where('school_id', '==', schoolId),
        where('status', 'in', ['pending', 'in_progress']),
        where('due_date', '<', Timestamp.fromDate(now)),
        orderBy('due_date', 'asc')
      );

      // Get high priority upcoming TODOs
      const upcomingHighPriorityQuery = query(
        collection(db, this.collectionName),
        where('school_id', '==', schoolId),
        where('status', 'in', ['pending', 'in_progress']),
        where('priority', 'in', ['high', 'urgent']),
        where('due_date', '>=', Timestamp.fromDate(now)),
        where('due_date', '<=', Timestamp.fromDate(nextWeek)),
        orderBy('due_date', 'asc')
      );

      const [overdueSnapshot, upcomingSnapshot] = await Promise.all([
        getDocs(overdueQuery),
        getDocs(upcomingHighPriorityQuery)
      ]);

      const overdueTodos = overdueSnapshot.docs.map(doc =>
        this.formatTodo(doc.id, doc.data())
      );

      const upcomingTodos = upcomingSnapshot.docs.map(doc =>
        this.formatTodo(doc.id, doc.data())
      );

      // Combine and sort by priority and due date
      const allUrgentTodos = [...overdueTodos, ...upcomingTodos];

      return allUrgentTodos.sort((a, b) => {
        // Overdue items first
        const aOverdue = a.due_date < now;
        const bOverdue = b.due_date < now;

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // Then by priority
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Finally by due date
        return a.due_date.getTime() - b.due_date.getTime();
      });
    } catch (error) {
      console.error('Error getting urgent TODOs:', error);
      return [];
    }
  }

  /**
   * Bulk update TODOs status
   */
  async bulkUpdateStatus(ids: string[], status: TodoStatus): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const updatePromises = ids.map(id => {
        const docRef = doc(db, this.collectionName, id);
        const updateData: any = {
          status,
          updated_at: serverTimestamp(),
          updated_by: currentUser.uid
        };
        
        if (status === 'completed') {
          updateData.completed_at = serverTimestamp();
        }
        
        return updateDoc(docRef, updateData);
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error bulk updating TODOs:', error);
      throw error;
    }
  }

  /**
   * Format TODO data from Firestore
   */
  private formatTodo(id: string, data: any): Todo {
    return {
      id,
      ...data,
      due_date: data.due_date?.toDate(),
      reminder_date: data.reminder_date?.toDate(),
      completed_at: data.completed_at?.toDate(),
      created_at: data.created_at?.toDate(),
      updated_at: data.updated_at?.toDate()
    };
  }

  /**
   * Get TODO statistics for a school
   */
  async getStatistics(schoolId: string): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  }> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('school_id', '==', schoolId)
      );
      const querySnapshot = await getDocs(q);
      
      const now = new Date();
      let total = 0, pending = 0, in_progress = 0, completed = 0, overdue = 0;
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        total++;
        
        switch (data.status) {
          case 'pending':
            pending++;
            if (data.due_date?.toDate() < now) overdue++;
            break;
          case 'in_progress':
            in_progress++;
            if (data.due_date?.toDate() < now) overdue++;
            break;
          case 'completed':
            completed++;
            break;
        }
      });
      
      return { total, pending, in_progress, completed, overdue };
    } catch (error) {
      console.error('Error getting TODO statistics:', error);
      throw error;
    }
  }
}

export const todosService = new TodosService();