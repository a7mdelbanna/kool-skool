import { collection, getDocs, updateDoc, doc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Migration script to clean up teacher assignments
 * Moves teacher assignments from students to subscriptions
 * Ensures teachers are only assigned at the subscription level
 */
export async function cleanupTeacherAssignments() {
  console.log('🔄 Starting teacher assignment cleanup...');

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    // Step 1: Get all students with teacher assignments
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);

    console.log(`Found ${studentsSnapshot.size} students to check`);

    // Process in batches to avoid overwhelming the database
    const batch = writeBatch(db);
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;

      // Check if student has teacherId field
      if (studentData.teacherId || studentData.teacher_id) {
        const teacherId = studentData.teacherId || studentData.teacher_id;
        console.log(`Found teacher ${teacherId} assigned to student ${studentId}`);

        try {
          // Find all subscriptions for this student
          const subscriptionsRef = collection(db, 'subscriptions');
          const q = query(subscriptionsRef, where('studentId', '==', studentId));
          const subscriptionsSnapshot = await getDocs(q);

          // Update subscriptions that don't have a teacher assigned
          subscriptionsSnapshot.forEach((subscriptionDoc) => {
            const subscription = subscriptionDoc.data();
            if (!subscription.teacherId) {
              const subRef = doc(db, 'subscriptions', subscriptionDoc.id);
              batch.update(subRef, { teacherId: teacherId });
              console.log(`  ✓ Updated subscription ${subscriptionDoc.id} with teacher ${teacherId}`);
            }
          })

          // Remove teacherId from student document
          const studentRef = doc(db, 'students', studentId);
          const updateData: any = {
            teacherId: null,
            teacher_id: null
          };

          // Also remove the fields completely
          batch.update(studentRef, updateData);
          console.log(`  ✓ Removed teacher assignment from student ${studentId}`);

          batchCount++;
          successCount++;

          // Commit batch if it reaches max size
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            console.log(`Committed batch of ${batchCount} updates`);
            batchCount = 0;
          }
        } catch (error: any) {
          console.error(`  ✗ Error processing student ${studentId}:`, error.message);
          errors.push(`Student ${studentId}: ${error.message}`);
          errorCount++;
        }
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates`);
    }

    // Step 2: Verify admin users are not assigned as teachers to students
    console.log('\n🔍 Checking for admin-student relationships...');

    const usersRef = collection(db, 'users');
    const adminsSnapshot = await getDocs(usersRef);

    const admins = adminsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.role === 'admin' || data.role === 'superadmin';
    });

    console.log(`Found ${admins.length} admin users to verify`);

    // Check if any admins are incorrectly linked as teachers
    for (const adminDoc of admins) {
      const adminId = adminDoc.id;
      const adminData = adminDoc.data();

      // Check subscriptions for this admin as teacher
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(subscriptionsRef, where('teacherId', '==', adminId));
      const subscriptionsWithAdminSnapshot = await getDocs(q);

      if (subscriptionsWithAdminSnapshot.size > 0) {
        console.log(`⚠️  Found ${subscriptionsWithAdminSnapshot.size} subscriptions with admin ${adminData.email} as teacher`);
        console.log('   These may need manual review to assign proper teachers');
        errors.push(`Admin ${adminData.email} is assigned as teacher to ${subscriptionsWithAdminSnapshot.size} subscriptions`);
      }
    }

    // Step 3: Summary
    console.log('\n✅ Migration completed!');
    console.log(`  - Successfully processed: ${successCount} students`);
    console.log(`  - Errors encountered: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors and warnings:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    return {
      success: true,
      processed: successCount,
      errors: errorCount,
      errorDetails: errors
    };
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      processed: successCount,
      errors: errorCount + 1,
      errorDetails: [...errors, error.message]
    };
  }
}

/**
 * Dry run to check what would be migrated without making changes
 */
export async function checkTeacherAssignments() {
  console.log('🔍 Checking teacher assignments (dry run)...');

  let studentsWithTeachers = 0;
  let subscriptionsNeedingTeacher = 0;
  let adminsAsTeachers = 0;

  try {
    // Check students
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      if (studentData.teacherId || studentData.teacher_id) {
        studentsWithTeachers++;

        // Check this student's subscriptions
        const subscriptionsRef = collection(db, 'subscriptions');
        const q = query(subscriptionsRef, where('studentId', '==', studentDoc.id));
        const subscriptionsSnapshot = await getDocs(q);

        let subsWithoutTeacher = 0;
        subscriptionsSnapshot.forEach((subDoc) => {
          const sub = subDoc.data();
          if (!sub.teacherId) {
            subsWithoutTeacher++;
          }
        });
        subscriptionsNeedingTeacher += subsWithoutTeacher;
      }
    }

    // Check for admins as teachers
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.role === 'admin' || userData.role === 'superadmin') {
        const subscriptionsRef = collection(db, 'subscriptions');
        const q = query(subscriptionsRef, where('teacherId', '==', userDoc.id));
        const subscriptionsSnapshot = await getDocs(q);

        if (subscriptionsSnapshot.size > 0) {
          adminsAsTeachers++;
          console.log(`  Admin ${userData.email} has ${subscriptionsSnapshot.size} subscriptions as teacher`);
        }
      }
    }

    console.log('\n📊 Dry run results:');
    console.log(`  - Students with teacher assignments: ${studentsWithTeachers}`);
    console.log(`  - Subscriptions that would receive teacher: ${subscriptionsNeedingTeacher}`);
    console.log(`  - Admins incorrectly assigned as teachers: ${adminsAsTeachers}`);

    return {
      studentsWithTeachers,
      subscriptionsNeedingTeacher,
      adminsAsTeachers
    };
  } catch (error: any) {
    console.error('❌ Check failed:', error);
    throw error;
  }
}