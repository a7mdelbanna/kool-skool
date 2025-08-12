import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  addDoc,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  runTransaction,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db, getUserSchoolId } from '@/config/firebase';

export interface QueryOptions {
  where?: Array<{ field: string; operator: any; value: any }>;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  startAfter?: any;
}

export interface PaginationResult<T> {
  data: T[];
  lastDoc: any;
  hasMore: boolean;
}

class DatabaseService {
  // Generic CRUD operations

  // Create document with auto-generated ID
  async create<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  // Create document with specific ID
  async createWithId<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: T
  ): Promise<void> {
    try {
      await setDoc(doc(db, collectionName, documentId), {
        ...data,
        id: documentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  // Read single document
  async getById<T>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    try {
      const docSnap = await getDoc(doc(db, collectionName, documentId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error: any) {
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  // Update document
  async update<T extends Partial<DocumentData>>(
    collectionName: string,
    documentId: string,
    updates: T
  ): Promise<void> {
    try {
      await updateDoc(doc(db, collectionName, documentId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  // Delete document
  async delete(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    try {
      await deleteDoc(doc(db, collectionName, documentId));
    } catch (error: any) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  // Query documents
  async query<T>(
    collectionName: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Add where clauses
      if (options.where) {
        options.where.forEach(w => {
          constraints.push(where(w.field, w.operator, w.value));
        });
      }

      // Add orderBy clauses
      if (options.orderBy) {
        options.orderBy.forEach(o => {
          constraints.push(orderBy(o.field, o.direction));
        });
      }

      // Add limit
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      // Add pagination
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error: any) {
      throw new Error(`Failed to query documents: ${error.message}`);
    }
  }

  // Query with pagination
  async queryWithPagination<T>(
    collectionName: string,
    pageSize: number,
    options: QueryOptions = {}
  ): Promise<PaginationResult<T>> {
    try {
      const constraints: QueryConstraint[] = [];

      // Add where clauses
      if (options.where) {
        options.where.forEach(w => {
          constraints.push(where(w.field, w.operator, w.value));
        });
      }

      // Add orderBy clauses
      if (options.orderBy) {
        options.orderBy.forEach(o => {
          constraints.push(orderBy(o.field, o.direction));
        });
      }

      // Add limit (one extra to check if there are more)
      constraints.push(limit(pageSize + 1));

      // Add pagination
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      const hasMore = docs.length > pageSize;
      const data = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      const lastDoc = docs[Math.min(docs.length - 1, pageSize - 1)];

      return {
        data,
        lastDoc,
        hasMore
      };
    } catch (error: any) {
      throw new Error(`Failed to query documents: ${error.message}`);
    }
  }

  // Real-time listeners
  subscribe<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    options: QueryOptions = {}
  ): Unsubscribe {
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    if (options.where) {
      options.where.forEach(w => {
        constraints.push(where(w.field, w.operator, w.value));
      });
    }

    // Add orderBy clauses
    if (options.orderBy) {
      options.orderBy.forEach(o => {
        constraints.push(orderBy(o.field, o.direction));
      });
    }

    // Add limit
    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(collection(db, collectionName), ...constraints);

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      callback(data);
    });
  }

  // Subscribe to single document
  subscribeToDocument<T>(
    collectionName: string,
    documentId: string,
    callback: (data: T | null) => void
  ): Unsubscribe {
    return onSnapshot(doc(db, collectionName, documentId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as T);
      } else {
        callback(null);
      }
    });
  }

  // Batch operations
  async batchCreate<T extends DocumentData>(
    collectionName: string,
    documents: T[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      documents.forEach(docData => {
        const docRef = doc(collection(db, collectionName));
        batch.set(docRef, {
          ...docData,
          id: docRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error: any) {
      throw new Error(`Batch create failed: ${error.message}`);
    }
  }

  async batchUpdate<T extends Partial<DocumentData>>(
    collectionName: string,
    updates: Array<{ id: string; data: T }>
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      updates.forEach(({ id, data }) => {
        const docRef = doc(db, collectionName, id);
        batch.update(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error: any) {
      throw new Error(`Batch update failed: ${error.message}`);
    }
  }

  async batchDelete(
    collectionName: string,
    documentIds: string[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      documentIds.forEach(id => {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
      });

      await batch.commit();
    } catch (error: any) {
      throw new Error(`Batch delete failed: ${error.message}`);
    }
  }

  // Transaction operations
  async runTransaction<T>(
    operation: (transaction: any) => Promise<T>
  ): Promise<T> {
    try {
      return await runTransaction(db, operation);
    } catch (error: any) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  // Helper methods for common operations

  // Increment a numeric field
  async incrementField(
    collectionName: string,
    documentId: string,
    field: string,
    value: number = 1
  ): Promise<void> {
    try {
      await updateDoc(doc(db, collectionName, documentId), {
        [field]: increment(value),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to increment field: ${error.message}`);
    }
  }

  // Add to array field
  async addToArray(
    collectionName: string,
    documentId: string,
    field: string,
    ...values: any[]
  ): Promise<void> {
    try {
      await updateDoc(doc(db, collectionName, documentId), {
        [field]: arrayUnion(...values),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to add to array: ${error.message}`);
    }
  }

  // Remove from array field
  async removeFromArray(
    collectionName: string,
    documentId: string,
    field: string,
    ...values: any[]
  ): Promise<void> {
    try {
      await updateDoc(doc(db, collectionName, documentId), {
        [field]: arrayRemove(...values),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(`Failed to remove from array: ${error.message}`);
    }
  }

  // Get documents by school ID (common query)
  async getBySchoolId<T>(
    collectionName: string,
    schoolId?: string
  ): Promise<T[]> {
    const effectiveSchoolId = schoolId || await getUserSchoolId();
    if (!effectiveSchoolId) {
      throw new Error('School ID not found');
    }

    return this.query<T>(collectionName, {
      where: [{ field: 'schoolId', operator: '==', value: effectiveSchoolId }]
    });
  }

  // Check if document exists
  async exists(
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    try {
      const docSnap = await getDoc(doc(db, collectionName, documentId));
      return docSnap.exists();
    } catch (error: any) {
      throw new Error(`Failed to check document existence: ${error.message}`);
    }
  }

  // Convert Firestore timestamp to Date
  timestampToDate(timestamp: Timestamp): Date {
    return timestamp.toDate();
  }

  // Convert Date to Firestore timestamp
  dateToTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
  }

  // Get server timestamp
  getServerTimestamp() {
    return serverTimestamp();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;