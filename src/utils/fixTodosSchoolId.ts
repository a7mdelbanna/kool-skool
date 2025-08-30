import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  where, 
  query,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Utility function to fix existing TODOs that don't have school_id set
 * This is a one-time migration to fix TODOs created with the bug
 */
export async function fixTodosWithoutSchoolId(schoolId: string) {
  try {
    console.log('Starting TODO school_id migration...');
    
    // Get all TODOs
    const todosRef = collection(db, 'todos');
    const q = query(todosRef);
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      // Check if school_id is missing or empty
      if (!data.school_id || data.school_id === '') {
        console.log(`Updating TODO ${docSnapshot.id} with school_id: ${schoolId}`);
        const docRef = doc(db, 'todos', docSnapshot.id);
        batch.update(docRef, { school_id: schoolId });
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} TODOs with school_id`);
      return { success: true, count: updateCount };
    } else {
      console.log('No TODOs needed updating');
      return { success: true, count: 0 };
    }
  } catch (error) {
    console.error('Error fixing TODOs school_id:', error);
    return { success: false, error };
  }
}

/**
 * Get all TODOs without school_id for debugging
 */
export async function getTodosWithoutSchoolId() {
  try {
    const todosRef = collection(db, 'todos');
    const querySnapshot = await getDocs(todosRef);
    
    const todosWithoutSchoolId: any[] = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (!data.school_id || data.school_id === '') {
        todosWithoutSchoolId.push({
          id: docSnapshot.id,
          ...data
        });
      }
    });
    
    console.log(`Found ${todosWithoutSchoolId.length} TODOs without school_id`);
    return todosWithoutSchoolId;
  } catch (error) {
    console.error('Error getting TODOs without school_id:', error);
    return [];
  }
}