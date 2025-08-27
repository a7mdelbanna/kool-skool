import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  DocumentData,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Define your data types
interface DataType {
  id?: string;
  schoolId: string;
  // Add your fields here
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

interface CreateDataInput {
  schoolId: string;
  // Add your input fields here
}

interface UpdateDataInput {
  // Add your update fields here
}

class ServiceNameService {
  private readonly collectionName = 'collectionName';
  
  /**
   * Get a single document by ID
   */
  async getById(id: string): Promise<DataType | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as DataType;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching ${this.collectionName} by id:`, error);
      throw error;
    }
  }
  
  /**
   * Get all documents for a school
   */
  async getBySchoolId(schoolId: string): Promise<DataType[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DataType[];
    } catch (error) {
      console.error(`Error fetching ${this.collectionName} for school:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new document
   */
  async create(data: CreateDataInput): Promise<string> {
    try {
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(
        collection(db, this.collectionName),
        docData
      );
      
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Update an existing document
   */
  async update(id: string, data: UpdateDataInput): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Batch create multiple documents
   */
  async batchCreate(items: CreateDataInput[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      items.forEach(item => {
        const docRef = doc(collection(db, this.collectionName));
        batch.set(docRef, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error(`Error batch creating ${this.collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Query with custom filters
   */
  async queryWithFilters(
    schoolId: string,
    filters: { field: string; operator: any; value: any }[]
  ): Promise<DataType[]> {
    try {
      const constraints = [
        where('schoolId', '==', schoolId),
        ...filters.map(f => where(f.field, f.operator, f.value))
      ];
      
      const q = query(
        collection(db, this.collectionName),
        ...constraints
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DataType[];
    } catch (error) {
      console.error(`Error querying ${this.collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time updates
   */
  subscribe(
    schoolId: string,
    callback: (data: DataType[]) => void
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DataType[];
      
      callback(data);
    }, (error) => {
      console.error(`Error in ${this.collectionName} subscription:`, error);
    });
    
    return unsubscribe;
  }
}

export const serviceNameService = new ServiceNameService();