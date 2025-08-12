import { useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/components/ui/use-toast';

// Generic hook for real-time data subscription
export function useFirestoreQuery<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribe: Unsubscribe;

    try {
      const q = query(collection(db, collectionName), ...constraints);
      
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          
          setData(results);
          setLoading(false);
        },
        (err) => {
          console.error(`Error fetching ${collectionName}:`, err);
          setError(err as Error);
          setLoading(false);
          toast({
            title: "Error",
            description: `Failed to load ${collectionName}`,
            variant: "destructive"
          });
        }
      );
    } catch (err) {
      console.error(`Error setting up query for ${collectionName}:`, err);
      setError(err as Error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, dependencies);

  return { data, loading, error, refetch: () => {} };
}

// Hook for single document subscription
export function useFirestoreDocument<T = DocumentData>(
  collectionName: string,
  documentId: string | null | undefined
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, collectionName, documentId),
      (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching document ${documentId}:`, err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, documentId]);

  return { data, loading, error };
}

// Hook for collection with automatic school filtering
export function useSchoolCollection<T = DocumentData>(
  collectionName: string,
  additionalConstraints: QueryConstraint[] = [],
  schoolId?: string
) {
  const userSchoolId = localStorage.getItem('schoolId') || schoolId;
  
  const constraints = userSchoolId 
    ? [where('schoolId', '==', userSchoolId), ...additionalConstraints]
    : additionalConstraints;

  return useFirestoreQuery<T>(collectionName, constraints, [userSchoolId, ...additionalConstraints]);
}

// Hook for paginated data
export function useFirestorePagination<T = DocumentData>(
  collectionName: string,
  pageSize: number = 20,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const loadMore = async () => {
    // Implementation for pagination
    // This would use startAfter(lastDoc) to get next page
  };

  return { data, loading, error, hasMore, loadMore };
}

// Specific hooks for each collection
export function useStudents(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('students', constraints);
}

export function useTeachers(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('users', [
    where('role', 'in', ['teacher', 'admin']),
    ...constraints
  ]);
}

export function useGroups(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('groups', constraints);
}

export function useCourses(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('courses', constraints);
}

export function useSubscriptions(studentId?: string) {
  const constraints = studentId 
    ? [where('studentId', '==', studentId)]
    : [];
  return useSchoolCollection('subscriptions', constraints);
}

export function useSessions(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('sessions', [
    orderBy('scheduledDate', 'desc'),
    ...constraints
  ]);
}

export function useTransactions(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('transactions', [
    orderBy('transactionDate', 'desc'),
    ...constraints
  ]);
}

export function useAccounts(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('accounts', constraints);
}

export function useContacts(constraints: QueryConstraint[] = []) {
  return useSchoolCollection('contacts', constraints);
}