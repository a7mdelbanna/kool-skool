import React, { useState, useContext } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  Users, 
  BookOpen, 
  Tag, 
  CreditCard,
  Calendar,
  FileText,
  Shield,
  Database,
  Loader2,
  UsersRound
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserContext } from '@/App';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  writeBatch 
} from 'firebase/firestore';

interface DeleteOperation {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedData: string[];
}

const DataManagement = () => {
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<DeleteOperation | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteOperations: DeleteOperation[] = [
    {
      type: 'students',
      title: 'Delete All Students',
      description: 'Remove all students from your school',
      icon: <Users className="h-5 w-5" />,
      warningLevel: 'critical',
      affectedData: [
        'Student profiles and accounts',
        'All subscriptions (Supabase + Firebase)',
        'Session history and attendance records',
        'All todos and homework assignments',
        'Session details with vocabulary and notes',
        'Payment records and transactions',
        'ALL GROUPS (since all students are deleted)',
        'Group memberships',
        'Student levels and progress',
        'All Firebase data (todos, session_details, groups, etc.)'
      ]
    },
    {
      type: 'courses',
      title: 'Delete All Courses',
      description: 'Remove all courses and programs',
      icon: <BookOpen className="h-5 w-5" />,
      warningLevel: 'high',
      affectedData: [
        'Course materials and content',
        'Course schedules',
        'All student subscriptions to courses',
        'All groups associated with courses',
        'Course assignments and grades'
      ]
    },
    {
      type: 'groups',
      title: 'Delete All Groups',
      description: 'Remove all student groups',
      icon: <UsersRound className="h-5 w-5" />,
      warningLevel: 'high',
      affectedData: [
        'All groups and classes',
        'Group memberships (group_students)',
        'Group sessions and schedules',
        'Group lesson_sessions',
        'Firebase group data',
        'Group-specific settings'
      ]
    },
    {
      type: 'sessions',
      title: 'Delete All Sessions',
      description: 'Clear all session and attendance data',
      icon: <Calendar className="h-5 w-5" />,
      warningLevel: 'high',
      affectedData: [
        'All scheduled sessions and lesson_sessions',
        'Attendance records',
        'All todos and homework for sessions',
        'Session details with vocabulary and notes',
        'Session notes and feedback',
        'All Firebase session data'
      ]
    },
    {
      type: 'transactions',
      title: 'Delete All Transactions',
      description: 'Remove all financial records',
      icon: <CreditCard className="h-5 w-5" />,
      warningLevel: 'critical',
      affectedData: [
        'All payment records',
        'Student payments',
        'Expected payments (via subscriptions)',
        'Expenses and transfers',
        'Transaction tags and categories',
        'Payment methods',
        'Invoices and receipts',
        'Financial reports',
        'Account balances',
        'Firebase payment and subscription data'
      ]
    },
    {
      type: 'tags',
      title: 'Delete All Tags',
      description: 'Remove all tags and categories',
      icon: <Tag className="h-5 w-5" />,
      warningLevel: 'low',
      affectedData: [
        'Student tags',
        'Transaction tags and categories',
        'Payment tags',
        'Contact tags',
        'Course categories',
        'Custom labels',
        'All tag relationships'
      ]
    },
    {
      type: 'accounts',
      title: 'Delete All Accounts',
      description: 'Remove all bookkeeping accounts',
      icon: <FileText className="h-5 w-5" />,
      warningLevel: 'high',
      affectedData: [
        'Chart of accounts',
        'Account balances',
        'Financial categories',
        'Linked payment methods'
      ]
    }
  ];

  const handleDeleteClick = (operation: DeleteOperation) => {
    setSelectedOperation(operation);
    setConfirmText('');
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedOperation || !user?.schoolId) return;
    
    setIsDeleting(true);
    
    try {
      switch (selectedOperation.type) {
        case 'students':
          await deleteAllStudents();
          break;
        case 'courses':
          await deleteAllCourses();
          break;
        case 'groups':
          await deleteAllGroups();
          break;
        case 'sessions':
          await deleteAllSessions();
          break;
        case 'transactions':
          await deleteAllTransactions();
          break;
        case 'tags':
          await deleteAllTags();
          break;
        case 'accounts':
          await deleteAllAccounts();
          break;
      }
      
      toast({
        title: "Success",
        description: `${selectedOperation.title} completed successfully.`,
      });
      
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Delete operation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete delete operation",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllStudents = async () => {
    if (!user?.schoolId) return;
    
    // Delete from Supabase
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('id, user_id')
      .eq('school_id', user.schoolId);
    
    if (fetchError) throw fetchError;
    
    if (students && students.length > 0) {
      // Delete related data first
      const studentIds = students.map(s => s.id);
      const userIds = students.map(s => s.user_id).filter(Boolean);
      
      // 1. Delete lesson_sessions (individual sessions)
      const { error: lessonError } = await supabase
        .from('lesson_sessions')
        .delete()
        .in('student_id', studentIds);
      
      if (lessonError) console.error('Error deleting lesson sessions:', lessonError);
      
      // 2. Delete subscriptions
      const { error: subError } = await supabase
        .from('subscriptions')
        .delete()
        .in('student_id', studentIds);
      
      if (subError) throw subError;
      
      // 3. Delete sessions
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .in('student_id', studentIds);
      
      if (sessionError) throw sessionError;
      
      // 4. Delete student payments
      const { error: paymentError } = await supabase
        .from('student_payments')
        .delete()
        .in('student_id', studentIds);
      
      if (paymentError) throw paymentError;
      
      // 5. Delete group memberships
      const { error: groupError } = await supabase
        .from('group_students')
        .delete()
        .in('student_id', studentIds);
      
      if (groupError) console.error('Error deleting group memberships:', groupError);
      
      // 6. Delete student levels
      const { error: levelError } = await supabase
        .from('student_levels')
        .delete()
        .in('student_id', studentIds);
      
      if (levelError) console.error('Error deleting student levels:', levelError);
      
      // 7. Delete ALL groups (since we're deleting all students, groups become empty)
      const { error: groupsDeleteError } = await supabase
        .from('groups')
        .delete()
        .eq('school_id', user.schoolId);
      
      if (groupsDeleteError) console.error('Error deleting groups:', groupsDeleteError);
      
      // 8. Delete students
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('school_id', user.schoolId);
      
      if (deleteError) throw deleteError;
      
      // 9. Delete user accounts if they exist
      if (userIds.length > 0) {
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .in('id', userIds);
        
        if (userError) console.error('Error deleting user accounts:', userError);
      }
    }
    
    // Delete from Firebase - All student-related collections
    try {
      // Delete todos - BOTH by school_id AND by student_id to ensure we catch all
      // First, delete todos by school_id
      const todosQuery1 = query(
        collection(db, 'todos'),
        where('school_id', '==', user.schoolId)
      );
      
      const todosSnapshot1 = await getDocs(todosQuery1);
      const batch1 = writeBatch(db);
      let count = 0;
      
      todosSnapshot1.docs.forEach((doc) => {
        batch1.delete(doc.ref);
        count++;
        // Firestore has a limit of 500 operations per batch
        if (count === 500) {
          batch1.commit();
          count = 0;
        }
      });
      
      if (count > 0) {
        await batch1.commit();
      }
      
      // Also delete todos by student_id for any orphaned todos
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        // Firebase has an 'in' query limit of 10 items, so we need to batch
        for (let i = 0; i < studentIds.length; i += 10) {
          const batchIds = studentIds.slice(i, i + 10);
          const todosQuery2 = query(
            collection(db, 'todos'),
            where('student_id', 'in', batchIds)
          );
          
          const todosSnapshot2 = await getDocs(todosQuery2);
          const batchTodos = writeBatch(db);
          
          todosSnapshot2.docs.forEach((doc) => {
            batchTodos.delete(doc.ref);
          });
          
          if (todosSnapshot2.docs.length > 0) {
            await batchTodos.commit();
          }
        }
      }
      
      // Final safety net: Get ALL todos and check if they belong to this school
      // This catches any todos with missing or incorrect field names
      console.log('Running final todos cleanup for school:', user.schoolId);
      const allTodosQuery = query(collection(db, 'todos'));
      const allTodosSnapshot = await getDocs(allTodosQuery);
      const finalBatch = writeBatch(db);
      let finalCount = 0;
      let deletedCount = 0;
      
      allTodosSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Check multiple field variations
        if (data.school_id === user.schoolId || 
            data.schoolId === user.schoolId ||
            (students && students.some(s => s.id === data.student_id))) {
          finalBatch.delete(doc.ref);
          finalCount++;
          deletedCount++;
          if (finalCount === 500) {
            finalBatch.commit();
            finalCount = 0;
          }
        }
      });
      
      if (finalCount > 0) {
        await finalBatch.commit();
      }
      
      console.log(`Deleted ${deletedCount} todos in total`)
      
      // Delete session_details comprehensively
      console.log('Deleting session_details for school:', user.schoolId);
      
      // First try with school_id field
      const sessionDetailsQuery = query(
        collection(db, 'session_details'),
        where('school_id', '==', user.schoolId)
      );
      
      const sessionDetailsSnapshot = await getDocs(sessionDetailsQuery);
      const batch2 = writeBatch(db);
      count = 0;
      
      sessionDetailsSnapshot.docs.forEach((doc) => {
        batch2.delete(doc.ref);
        count++;
        if (count === 500) {
          batch2.commit();
          count = 0;
        }
      });
      
      if (count > 0) {
        await batch2.commit();
      }
      
      // Also delete by student_id
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        for (let i = 0; i < studentIds.length; i += 10) {
          const batchIds = studentIds.slice(i, i + 10);
          const detailsQuery = query(
            collection(db, 'session_details'),
            where('student_id', 'in', batchIds)
          );
          
          const detailsSnapshot = await getDocs(detailsQuery);
          const batchDetails = writeBatch(db);
          
          detailsSnapshot.docs.forEach((doc) => {
            batchDetails.delete(doc.ref);
          });
          
          if (detailsSnapshot.docs.length > 0) {
            await batchDetails.commit();
          }
        }
      }
      
      console.log('Session details deletion complete')
      
      // Delete students collection
      const studentsQuery = query(
        collection(db, 'students'),
        where('schoolId', '==', user.schoolId)
      );
      
      const snapshot = await getDocs(studentsQuery);
      const batch3 = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch3.delete(doc.ref);
      });
      
      await batch3.commit();
      
      // Delete subscriptions collection (Firebase) - CRITICAL for expected payments
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('school_id', '==', user.schoolId)
      );
      
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const batchSubs = writeBatch(db);
      
      subscriptionsSnapshot.docs.forEach((doc) => {
        batchSubs.delete(doc.ref);
      });
      
      if (subscriptionsSnapshot.docs.length > 0) {
        await batchSubs.commit();
        console.log(`Deleted ${subscriptionsSnapshot.docs.length} subscriptions from Firebase`);
      }
      
      // Also try with student_id for any orphaned subscriptions
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        for (let i = 0; i < studentIds.length; i += 10) {
          const batchIds = studentIds.slice(i, i + 10);
          const subsQuery = query(
            collection(db, 'subscriptions'),
            where('student_id', 'in', batchIds)
          );
          
          const subsSnapshot = await getDocs(subsQuery);
          const batchStudentSubs = writeBatch(db);
          
          subsSnapshot.docs.forEach((doc) => {
            batchStudentSubs.delete(doc.ref);
          });
          
          if (subsSnapshot.docs.length > 0) {
            await batchStudentSubs.commit();
          }
        }
      }
      
      // Delete groups collection (Firebase)
      const groupsQuery = query(
        collection(db, 'groups'),
        where('schoolId', '==', user.schoolId)
      );
      
      const groupsSnapshot = await getDocs(groupsQuery);
      const batchGroups = writeBatch(db);
      
      groupsSnapshot.docs.forEach((doc) => {
        batchGroups.delete(doc.ref);
      });
      
      if (groupsSnapshot.docs.length > 0) {
        await batchGroups.commit();
        console.log(`Deleted ${groupsSnapshot.docs.length} groups from Firebase`);
      }
      
      // Delete sessions collection (Firebase)
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('schoolId', '==', user.schoolId)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const batch4 = writeBatch(db);
      
      sessionsSnapshot.docs.forEach((doc) => {
        batch4.delete(doc.ref);
      });
      
      await batch4.commit();
    } catch (error) {
      console.error('Error deleting Firebase data:', error);
    }
  };

  const deleteAllCourses = async () => {
    if (!user?.schoolId) return;
    
    // First delete all subscriptions to courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('school_id', user.schoolId);
    
    if (courses && courses.length > 0) {
      const courseIds = courses.map(c => c.id);
      
      // Delete subscriptions
      const { error: subError } = await supabase
        .from('subscriptions')
        .delete()
        .in('course_id', courseIds);
      
      if (subError) console.error('Error deleting course subscriptions:', subError);
      
      // Delete groups associated with courses
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .in('course_id', courseIds);
      
      if (groupError) console.error('Error deleting course groups:', groupError);
    }
    
    // Delete courses
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (error) throw error;
    
    // Delete from Firebase
    try {
      // Delete subscriptions from Firebase (important for expected payments)
      const subsQuery = query(
        collection(db, 'subscriptions'),
        where('school_id', '==', user.schoolId)
      );
      
      const subsSnapshot = await getDocs(subsQuery);
      const batchSubs = writeBatch(db);
      
      subsSnapshot.docs.forEach((doc) => {
        batchSubs.delete(doc.ref);
      });
      
      if (subsSnapshot.docs.length > 0) {
        await batchSubs.commit();
        console.log(`Deleted ${subsSnapshot.docs.length} subscriptions from Firebase`);
      }
      
      // Delete courses from Firebase
      const coursesQuery = query(
        collection(db, 'courses'),
        where('schoolId', '==', user.schoolId)
      );
      
      const snapshot = await getDocs(coursesQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting Firebase courses:', error);
    }
  };

  const deleteAllSessions = async () => {
    if (!user?.schoolId) return;
    
    // Get all students for this school first
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', user.schoolId);
    
    if (students && students.length > 0) {
      const studentIds = students.map(s => s.id);
      
      // Delete lesson_sessions
      const { error: lessonError } = await supabase
        .from('lesson_sessions')
        .delete()
        .in('student_id', studentIds);
      
      if (lessonError) console.error('Error deleting lesson sessions:', lessonError);
      
      // Delete sessions
      const { error } = await supabase
        .from('sessions')
        .delete()
        .in('student_id', studentIds);
      
      if (error) throw error;
    }
    
    // Delete from Firebase - sessions and all related data
    try {
      // Delete todos associated with sessions (using correct field name: school_id)
      const todosQuery = query(
        collection(db, 'todos'),
        where('school_id', '==', user.schoolId)
      );
      
      const todosSnapshot = await getDocs(todosQuery);
      const batch1 = writeBatch(db);
      let count = 0;
      
      todosSnapshot.docs.forEach((doc) => {
        batch1.delete(doc.ref);
        count++;
        if (count === 500) {
          batch1.commit();
          count = 0;
        }
      });
      
      if (count > 0) {
        await batch1.commit();
      }
      
      // Delete session_details (contains vocabulary and notes) - using correct field name
      const sessionDetailsQuery = query(
        collection(db, 'session_details'),
        where('school_id', '==', user.schoolId)
      );
      
      const sessionDetailsSnapshot = await getDocs(sessionDetailsQuery);
      const batch2 = writeBatch(db);
      count = 0;
      
      sessionDetailsSnapshot.docs.forEach((doc) => {
        batch2.delete(doc.ref);
        count++;
        if (count === 500) {
          batch2.commit();
          count = 0;
        }
      });
      
      if (count > 0) {
        await batch2.commit();
      }
      
      // Delete sessions collection
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('schoolId', '==', user.schoolId)
      );
      
      const snapshot = await getDocs(sessionsQuery);
      const batch3 = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch3.delete(doc.ref);
      });
      
      await batch3.commit();
    } catch (error) {
      console.error('Error deleting Firebase sessions data:', error);
    }
  };

  const deleteAllTransactions = async () => {
    if (!user?.schoolId) return;
    
    // Delete transaction tags junction records first
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('school_id', user.schoolId);
    
    if (transactions && transactions.length > 0) {
      const transactionIds = transactions.map(t => t.id);
      
      // Delete transaction-tag relationships
      const { error: junctionError } = await supabase
        .from('transaction_tags_junction')
        .delete()
        .in('transaction_id', transactionIds);
      
      if (junctionError) console.error('Error deleting transaction tags:', junctionError);
    }
    
    // Delete expenses
    const { error: expenseError } = await supabase
      .from('expenses')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (expenseError) console.error('Error deleting expenses:', expenseError);
    
    // Delete transfers
    const { error: transferError } = await supabase
      .from('transfers')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (transferError) console.error('Error deleting transfers:', transferError);
    
    // Delete transactions
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (error) throw error;
    
    // Also delete student payments
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', user.schoolId);
    
    if (students && students.length > 0) {
      const studentIds = students.map(s => s.id);
      
      const { error: paymentError } = await supabase
        .from('student_payments')
        .delete()
        .in('student_id', studentIds);
      
      if (paymentError) throw paymentError;
    }
    
    // Delete from Firebase
    try {
      // Delete subscriptions (these generate expected payments)
      const subsQuery = query(
        collection(db, 'subscriptions'),
        where('school_id', '==', user.schoolId)
      );
      
      const subsSnapshot = await getDocs(subsQuery);
      const batchSubs = writeBatch(db);
      
      subsSnapshot.docs.forEach((doc) => {
        batchSubs.delete(doc.ref);
      });
      
      if (subsSnapshot.docs.length > 0) {
        await batchSubs.commit();
        console.log(`Deleted ${subsSnapshot.docs.length} subscriptions from Firebase (clearing expected payments)`);
      }
      
      // Delete payments collection
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('schoolId', '==', user.schoolId)
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const batch = writeBatch(db);
      
      paymentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Delete paymentMethods collection
      const methodsQuery = query(
        collection(db, 'paymentMethods'),
        where('schoolId', '==', user.schoolId)
      );
      
      const methodsSnapshot = await getDocs(methodsQuery);
      const batch2 = writeBatch(db);
      
      methodsSnapshot.docs.forEach((doc) => {
        batch2.delete(doc.ref);
      });
      
      await batch2.commit();
    } catch (error) {
      console.error('Error deleting Firebase payment data:', error);
    }
  };

  const deleteAllTags = async () => {
    if (!user?.schoolId) return;
    
    // Delete all tag types from Supabase
    // Delete transaction tags
    const { error: transTagError } = await supabase
      .from('transaction_tags')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (transTagError) console.error('Error deleting transaction tags:', transTagError);
    
    // Delete payment tags
    const { error: payTagError } = await supabase
      .from('payment_tags')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (payTagError) console.error('Error deleting payment tags:', payTagError);
    
    // Delete contact tags
    const { error: contactTagError } = await supabase
      .from('contact_tags')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (contactTagError) console.error('Error deleting contact tags:', contactTagError);
    
    // Delete transaction categories
    const { error: catError } = await supabase
      .from('transaction_categories')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (catError) console.error('Error deleting transaction categories:', catError);
    
    // Delete general tags
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (error) throw error;
    
    // Delete from Firebase
    try {
      const tagsQuery = query(
        collection(db, 'tags'),
        where('schoolId', '==', user.schoolId)
      );
      
      const snapshot = await getDocs(tagsQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting Firebase tags:', error);
    }
  };

  const deleteAllAccounts = async () => {
    if (!user?.schoolId) return;
    
    // Delete from Supabase
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (error) throw error;
  };

  const deleteAllGroups = async () => {
    if (!user?.schoolId) return;
    
    // First get all groups
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('school_id', user.schoolId);
    
    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      
      // Delete group-student relationships
      const { error: memberError } = await supabase
        .from('group_students')
        .delete()
        .in('group_id', groupIds);
      
      if (memberError) console.error('Error deleting group memberships:', memberError);
      
      // Delete group sessions
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .in('group_id', groupIds);
      
      if (sessionError) console.error('Error deleting group sessions:', sessionError);
      
      // Delete lesson_sessions for groups
      const { error: lessonError } = await supabase
        .from('lesson_sessions')
        .delete()
        .in('group_id', groupIds);
      
      if (lessonError) console.error('Error deleting group lesson sessions:', lessonError);
    }
    
    // Delete groups from Supabase
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('school_id', user.schoolId);
    
    if (error) throw error;
    
    // Delete groups from Firebase
    try {
      const groupsQuery = query(
        collection(db, 'groups'),
        where('schoolId', '==', user.schoolId)
      );
      
      const snapshot = await getDocs(groupsQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      if (snapshot.docs.length > 0) {
        await batch.commit();
      }
      
      console.log(`Deleted ${snapshot.docs.length} groups from Firebase`);
    } catch (error) {
      console.error('Error deleting Firebase groups:', error);
    }
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Management</h1>
        <p className="text-muted-foreground mt-1">Manage and delete your school's data</p>
      </div>

      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Warning:</strong> These operations permanently delete data and cannot be undone. 
          Please ensure you have proper backups before proceeding.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Delete Operations</CardTitle>
          </div>
          <CardDescription>
            Select data categories to delete. All deletions are permanent and will cascade to related data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deleteOperations.map((operation) => (
            <div key={operation.type}>
              <div className={`border rounded-lg p-4 ${getWarningColor(operation.warningLevel)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {operation.icon}
                      <h3 className="font-semibold">{operation.title}</h3>
                      {operation.warningLevel === 'critical' && (
                        <span className="text-xs px-2 py-1 bg-red-600 text-white rounded">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-2">{operation.description}</p>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">This will delete:</p>
                      <ul className="list-disc list-inside ml-2">
                        {operation.affectedData.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(operation)}
                    className="ml-4"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
              {operation !== deleteOperations[deleteOperations.length - 1] && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-900">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            These actions are irreversible and will permanently delete all selected data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-300 bg-red-100">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Final Warning:</strong> Deleted data cannot be recovered. Make sure you have 
              downloaded any important information and have proper backups before proceeding with any deletion.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to perform: <strong>{selectedOperation?.title}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800 text-sm">
                This action will permanently delete:
                <ul className="list-disc list-inside mt-2">
                  {selectedOperation?.affectedData.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono"
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={executeDelete}
              disabled={confirmText !== 'DELETE' || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataManagement;