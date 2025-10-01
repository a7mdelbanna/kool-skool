import { collection, query, where, getDocs, orderBy, limit, DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format } from 'date-fns';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';

export interface SearchResult {
  id: string;
  type: 'student' | 'lesson' | 'payment' | 'course' | 'group' | 'action' | 'page';
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: string;
  action?: () => void;
  data?: any;
  score?: number;
}

export interface SearchFilters {
  type?: SearchResult['type'];
  dateRange?: { start: Date; end: Date };
  status?: string;
  schoolId?: string;
}

class SearchService {
  private searchHistory: SearchResult[] = [];
  private readonly MAX_HISTORY = 10;
  private readonly SEARCH_DELAY = 300; // Debounce delay in ms

  constructor() {
    this.loadSearchHistory();
  }

  private loadSearchHistory() {
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      try {
        this.searchHistory = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse search history', e);
        this.searchHistory = [];
      }
    }
  }

  private saveSearchHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  addToHistory(result: SearchResult) {
    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => item.id !== result.id);

    // Add to beginning
    this.searchHistory.unshift(result);

    // Keep only last MAX_HISTORY items
    this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);

    this.saveSearchHistory();
  }

  getHistory(): SearchResult[] {
    return this.searchHistory;
  }

  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('searchHistory');
  }

  // Search students
  async searchStudents(searchTerm: string, schoolId: string): Promise<SearchResult[]> {
    const studentsRef = collection(db, 'students');
    const searchLower = searchTerm.toLowerCase();

    try {
      const q = query(
        studentsRef,
        where('schoolId', '==', schoolId),
        orderBy('firstName'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const results: SearchResult[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
        const email = data.email?.toLowerCase() || '';

        if (fullName.includes(searchLower) || email.includes(searchLower)) {
          results.push({
            id: doc.id,
            type: 'student',
            title: `${data.firstName} ${data.lastName}`,
            subtitle: data.email,
            meta: data.courseName || 'No course assigned',
            icon: 'User',
            data: { ...data, id: doc.id },
            score: fullName.startsWith(searchLower) ? 100 : 50
          });
        }
      });

      return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (error) {
      console.error('Error searching students:', error);
      return [];
    }
  }

  // Search lessons
  async searchLessons(searchTerm: string, schoolId: string): Promise<SearchResult[]> {
    const lessonsRef = collection(db, 'lessons');
    const searchLower = searchTerm.toLowerCase();

    try {
      const q = query(
        lessonsRef,
        where('schoolId', '==', schoolId),
        orderBy('date', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const results: SearchResult[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const studentName = data.studentName?.toLowerCase() || '';
        const subject = data.subject?.toLowerCase() || '';

        if (studentName.includes(searchLower) || subject.includes(searchLower)) {
          results.push({
            id: doc.id,
            type: 'lesson',
            title: data.subject || 'Lesson',
            subtitle: data.studentName,
            meta: data.date ? format(data.date.toDate(), 'MMM d, yyyy') : '',
            icon: 'Calendar',
            data: { ...data, id: doc.id },
            score: subject.startsWith(searchLower) ? 100 : 50
          });
        }
      });

      return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (error) {
      console.error('Error searching lessons:', error);
      return [];
    }
  }

  // Search payments
  async searchPayments(searchTerm: string, schoolId: string): Promise<SearchResult[]> {
    const paymentsRef = collection(db, 'payments');
    const searchLower = searchTerm.toLowerCase();

    try {
      const q = query(
        paymentsRef,
        where('schoolId', '==', schoolId),
        orderBy('dueDate', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const results: SearchResult[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const studentName = data.studentName?.toLowerCase() || '';
        const status = data.status?.toLowerCase() || '';

        if (studentName.includes(searchLower) || status.includes(searchLower)) {
          results.push({
            id: doc.id,
            type: 'payment',
            title: `$${data.amount} - ${data.studentName}`,
            subtitle: data.status,
            meta: data.dueDate ? format(data.dueDate.toDate(), 'MMM d, yyyy') : '',
            icon: 'DollarSign',
            data: { ...data, id: doc.id },
            score: studentName.startsWith(searchLower) ? 100 : 50
          });
        }
      });

      return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (error) {
      console.error('Error searching payments:', error);
      return [];
    }
  }

  // Get quick actions
  getQuickActions(searchTerm: string): SearchResult[] {
    const actions: SearchResult[] = [
      {
        id: 'action-add-student',
        type: 'action',
        title: 'Add New Student',
        subtitle: 'Create a new student profile',
        icon: 'UserPlus',
        meta: formatShortcut({ key: 'n', ctrlKey: true })
      },
      {
        id: 'action-schedule-lesson',
        type: 'action',
        title: 'Schedule Lesson',
        subtitle: 'Book a new session',
        icon: 'Calendar',
        meta: formatShortcut({ key: 'l', ctrlKey: true })
      },
      {
        id: 'action-record-payment',
        type: 'action',
        title: 'Record Payment',
        subtitle: 'Add a new transaction',
        icon: 'CreditCard',
        meta: formatShortcut({ key: 'p', ctrlKey: true })
      },
      {
        id: 'action-mark-attendance',
        type: 'action',
        title: 'Mark Attendance',
        subtitle: "Today's sessions",
        icon: 'CheckSquare',
        meta: formatShortcut({ key: 'a', ctrlKey: true })
      }
    ];

    const searchLower = searchTerm.toLowerCase();
    return actions.filter(action =>
      action.title.toLowerCase().includes(searchLower) ||
      action.subtitle?.toLowerCase().includes(searchLower)
    );
  }

  // Get navigation pages
  getNavigationPages(searchTerm: string): SearchResult[] {
    const pages: SearchResult[] = [
      { id: 'page-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Home page', icon: 'Home' },
      { id: 'page-students', type: 'page', title: 'Students', subtitle: 'Manage students', icon: 'Users' },
      { id: 'page-groups', type: 'page', title: 'Groups', subtitle: 'Class groups', icon: 'Users' },
      { id: 'page-courses', type: 'page', title: 'Courses', subtitle: 'Course management', icon: 'BookOpen' },
      { id: 'page-calendar', type: 'page', title: 'Calendar', subtitle: 'Schedule & events', icon: 'Calendar' },
      { id: 'page-attendance', type: 'page', title: 'Attendance', subtitle: 'Track attendance', icon: 'CheckSquare' },
      { id: 'page-payments', type: 'page', title: 'Payments', subtitle: 'Financial records', icon: 'DollarSign' },
      { id: 'page-finances', type: 'page', title: 'Finances', subtitle: 'Financial overview', icon: 'TrendingUp' },
      { id: 'page-todos', type: 'page', title: 'TODOs', subtitle: 'Task management', icon: 'ClipboardList' },
      { id: 'page-reports', type: 'page', title: 'Reports', subtitle: 'Analytics & reports', icon: 'BarChart3' }
    ];

    const searchLower = searchTerm.toLowerCase();
    return pages.filter(page =>
      page.title.toLowerCase().includes(searchLower) ||
      page.subtitle?.toLowerCase().includes(searchLower)
    );
  }

  // Main search function
  async search(searchTerm: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return this.getHistory();
    }

    const schoolId = filters.schoolId;
    if (!schoolId) {
      console.error('School ID is required for search');
      return [];
    }

    const results: SearchResult[] = [];

    // Search based on prefix modifiers
    if (searchTerm.startsWith('@')) {
      // Search students only
      const term = searchTerm.substring(1).trim();
      const students = await this.searchStudents(term, schoolId);
      results.push(...students);
    } else if (searchTerm.startsWith('#')) {
      // Search lessons only
      const term = searchTerm.substring(1).trim();
      const lessons = await this.searchLessons(term, schoolId);
      results.push(...lessons);
    } else if (searchTerm.startsWith('$')) {
      // Search payments only
      const term = searchTerm.substring(1).trim();
      const payments = await this.searchPayments(term, schoolId);
      results.push(...payments);
    } else if (searchTerm.startsWith('/')) {
      // Search pages only
      const term = searchTerm.substring(1).trim();
      const pages = this.getNavigationPages(term);
      results.push(...pages);
    } else {
      // Search everything
      const [students, lessons, payments] = await Promise.all([
        this.searchStudents(searchTerm, schoolId),
        this.searchLessons(searchTerm, schoolId),
        this.searchPayments(searchTerm, schoolId)
      ]);

      const actions = this.getQuickActions(searchTerm);
      const pages = this.getNavigationPages(searchTerm);

      results.push(...actions, ...pages, ...students, ...lessons, ...payments);
    }

    // Apply filters
    let filteredResults = results;
    if (filters.type) {
      filteredResults = filteredResults.filter(r => r.type === filters.type);
    }

    // Sort by score and limit results
    return filteredResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20);
  }

  // Natural language search processing
  async naturalLanguageSearch(query: string, schoolId: string): Promise<SearchResult[]> {
    const queryLower = query.toLowerCase();

    // Define patterns for natural language queries
    const patterns = [
      { regex: /overdue\s+payments?/i, type: 'payment', status: 'overdue' },
      { regex: /today'?s?\s+lessons?/i, type: 'lesson', today: true },
      { regex: /new\s+students?/i, type: 'student', recent: true },
      { regex: /unpaid\s+/i, type: 'payment', status: 'pending' },
      { regex: /this\s+week/i, thisWeek: true },
      { regex: /last\s+month/i, lastMonth: true }
    ];

    // Check for pattern matches
    for (const pattern of patterns) {
      if (pattern.regex.test(queryLower)) {
        // Implement specific searches based on patterns
        if (pattern.type === 'payment' && pattern.status) {
          return await this.searchPaymentsByStatus(pattern.status, schoolId);
        }
        if (pattern.type === 'lesson' && pattern.today) {
          return await this.searchTodaysLessons(schoolId);
        }
        // Add more pattern handlers as needed
      }
    }

    // Fallback to regular search
    return this.search(query, { schoolId });
  }

  private async searchPaymentsByStatus(status: string, schoolId: string): Promise<SearchResult[]> {
    const paymentsRef = collection(db, 'payments');

    try {
      const q = query(
        paymentsRef,
        where('schoolId', '==', schoolId),
        where('status', '==', status),
        orderBy('dueDate', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const results: SearchResult[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'payment',
          title: `$${data.amount} - ${data.studentName}`,
          subtitle: `Status: ${data.status}`,
          meta: data.dueDate ? format(data.dueDate.toDate(), 'MMM d, yyyy') : '',
          icon: 'DollarSign',
          data: { ...data, id: doc.id }
        });
      });

      return results;
    } catch (error) {
      console.error('Error searching payments by status:', error);
      return [];
    }
  }

  private async searchTodaysLessons(schoolId: string): Promise<SearchResult[]> {
    const lessonsRef = collection(db, 'lessons');
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    try {
      const q = query(
        lessonsRef,
        where('schoolId', '==', schoolId),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        orderBy('date'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const results: SearchResult[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'lesson',
          title: data.subject || 'Lesson',
          subtitle: data.studentName,
          meta: data.time || '',
          icon: 'Calendar',
          data: { ...data, id: doc.id }
        });
      });

      return results;
    } catch (error) {
      console.error('Error searching today\'s lessons:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();