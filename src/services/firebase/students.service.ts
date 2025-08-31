import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface FirebaseStudent {
  id?: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsappPhone?: string;
  courseName?: string;
  level?: string;
  teacherId?: string;
  groupId?: string;
  status: 'active' | 'inactive' | 'graduated' | 'dropped';
  schoolId: string;
  profilePictureUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  country?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  medicalConditions?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  joinDate?: string;
  totalLessonsTaken?: number;
  totalPayments?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class StudentsService {
  private collectionName = 'students';

  /**
   * Format Firestore document to Student object
   */
  private formatStudent(id: string, data: DocumentData): FirebaseStudent {
    return {
      id,
      studentId: data.studentId || id,
      firstName: data.firstName || data.first_name || '',
      lastName: data.lastName || data.last_name || '',
      email: data.email || '',
      phone: data.phone || '',
      whatsappPhone: data.whatsappPhone || data.whatsapp_phone || '',
      courseName: data.courseName || data.course_name || '',
      level: data.level || '',
      teacherId: data.teacherId || data.teacher_id || '',
      groupId: data.groupId || data.group_id || '',
      status: data.status || 'active',
      schoolId: data.schoolId || data.school_id || '',
      profilePictureUrl: data.profilePictureUrl || data.profile_picture_url || '',
      dateOfBirth: data.dateOfBirth || data.date_of_birth || '',
      gender: data.gender || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || '',
      parentName: data.parentName || data.parent_name || '',
      parentPhone: data.parentPhone || data.parent_phone || '',
      parentEmail: data.parentEmail || data.parent_email || '',
      medicalConditions: data.medicalConditions || data.medical_conditions || '',
      allergies: data.allergies || '',
      emergencyContact: data.emergencyContact || data.emergency_contact || '',
      emergencyPhone: data.emergencyPhone || data.emergency_phone || '',
      notes: data.notes || '',
      joinDate: data.joinDate || data.join_date || '',
      totalLessonsTaken: data.totalLessonsTaken || data.total_lessons_taken || 0,
      totalPayments: data.totalPayments || data.total_payments || 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    };
  }

  /**
   * Get a student by ID
   */
  async getById(studentId: string): Promise<FirebaseStudent | null> {
    try {
      const docRef = doc(db, this.collectionName, studentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.formatStudent(docSnap.id, docSnap.data());
      }
      
      // Try to find by studentId field if direct ID lookup fails
      const q = query(
        collection(db, this.collectionName),
        where('studentId', '==', studentId),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return this.formatStudent(doc.id, doc.data());
      }
      
      return null;
    } catch (error) {
      console.error('Error getting student by ID:', error);
      return null;
    }
  }

  /**
   * Get students by school ID
   */
  async getBySchoolId(schoolId: string): Promise<FirebaseStudent[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('school_id', '==', schoolId),
        orderBy('first_name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatStudent(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting students by school:', error);
      return [];
    }
  }

  /**
   * Get students by teacher ID
   */
  async getByTeacherId(teacherId: string): Promise<FirebaseStudent[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('teacher_id', '==', teacherId),
        orderBy('first_name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatStudent(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting students by teacher:', error);
      return [];
    }
  }

  /**
   * Get students by group ID
   */
  async getByGroupId(groupId: string): Promise<FirebaseStudent[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('group_id', '==', groupId),
        where('status', '==', 'active'),
        orderBy('first_name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.formatStudent(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting students by group:', error);
      return [];
    }
  }

  /**
   * Search students by name
   */
  async searchByName(searchTerm: string, schoolId?: string): Promise<FirebaseStudent[]> {
    try {
      const constraints: QueryConstraint[] = [];
      
      if (schoolId) {
        constraints.push(where('school_id', '==', schoolId));
      }
      
      // Note: Firestore doesn't support full-text search natively
      // This is a simple implementation that requires exact matching
      // For better search, consider using a search service like Algolia
      constraints.push(orderBy('first_name', 'asc'));
      
      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const students = querySnapshot.docs.map(doc => 
        this.formatStudent(doc.id, doc.data())
      );
      
      // Filter in memory for partial matches
      const lowerSearchTerm = searchTerm.toLowerCase();
      return students.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        return fullName.includes(lowerSearchTerm);
      });
    } catch (error) {
      console.error('Error searching students:', error);
      return [];
    }
  }
}

export const studentsService = new StudentsService();