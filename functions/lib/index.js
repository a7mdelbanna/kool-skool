"use strict";
const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================
// Create user with custom claims
exports.createUserWithClaims = functions.https.onCall(async (data, context) => {
    // Verify caller is admin or superadmin
    if (!context.auth || !['admin', 'superadmin'].includes(context.auth.token.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Only administrators can create users');
    }
    const { email, password, firstName, lastName, role, schoolId, phoneNumber, timezone } = data;
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role || !schoolId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    // Validate role
    const validRoles = ['admin', 'teacher', 'student'];
    if (!validRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role specified');
    }
    // Verify caller's school matches (unless superadmin)
    if (context.auth.token.role !== 'superadmin' && context.auth.token.schoolId !== schoolId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only create users for your own school');
    }
    try {
        // Create auth user
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
            phoneNumber: phoneNumber || undefined
        });
        // Set custom claims
        await auth.setCustomUserClaims(userRecord.uid, {
            role,
            schoolId
        });
        // Create user document in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            firstName,
            lastName,
            role,
            schoolId,
            phoneNumber: phoneNumber || null,
            timezone: timezone || 'UTC',
            isActive: true,
            metadata: {
                lastLogin: null,
                loginCount: 0
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { uid: userRecord.uid, success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error.message || 'Failed to create user');
    }
});
// Set user custom claims (SuperAdmin only)
exports.setUserClaims = functions.https.onCall(async (data, context) => {
    // Check if request is made by a superadmin
    if (!context.auth || context.auth.token.role !== 'superadmin') {
        throw new functions.https.HttpsError('permission-denied', 'Only superadmins can set user claims');
    }
    const { userId, role, schoolId } = data;
    // Validate inputs
    if (!userId || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'userId and role are required');
    }
    // Validate role
    const validRoles = ['superadmin', 'admin', 'teacher', 'student'];
    if (!validRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role specified');
    }
    // Set custom claims
    const claims = { role };
    if (schoolId) {
        claims.schoolId = schoolId;
    }
    try {
        await auth.setCustomUserClaims(userId, claims);
        // Also update the user document
        await db.collection('users').doc(userId).update({
            role,
            schoolId: schoolId || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Error setting custom claims', error);
    }
});
// Deactivate user
exports.deactivateUser = functions.https.onCall(async (data, context) => {
    // Verify caller is admin
    if (!context.auth || !['admin', 'superadmin'].includes(context.auth.token.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Only administrators can deactivate users');
    }
    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }
    try {
        // Disable user in Auth
        await auth.updateUser(uid, { disabled: true });
        // Update Firestore
        await db.collection('users').doc(uid).update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error.message || 'Failed to deactivate user');
    }
});
// Reactivate user
exports.reactivateUser = functions.https.onCall(async (data, context) => {
    // Verify caller is admin
    if (!context.auth || !['admin', 'superadmin'].includes(context.auth.token.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Only administrators can reactivate users');
    }
    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }
    try {
        // Enable user in Auth
        await auth.updateUser(uid, { disabled: false });
        // Update Firestore
        await db.collection('users').doc(uid).update({
            isActive: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error.message || 'Failed to reactivate user');
    }
});
// ============================================
// FIRESTORE TRIGGERS
// ============================================
// Trigger to set claims when user document is created
exports.onUserCreate = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap) => {
    const userData = snap.data();
    const userId = snap.id;
    if (!userData)
        return;
    const claims = {
        role: userData.role || 'student',
        schoolId: userData.schoolId || null
    };
    try {
        await auth.setCustomUserClaims(userId, claims);
        console.log(`Custom claims set for user ${userId}`);
    }
    catch (error) {
        console.error(`Error setting claims for user ${userId}:`, error);
    }
});
// Trigger to update claims when user document is updated
exports.onUserUpdate = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = change.after.id;
    if (!newData || !oldData)
        return;
    // Check if role or schoolId changed
    if (newData.role !== oldData.role || newData.schoolId !== oldData.schoolId) {
        const claims = {
            role: newData.role,
            schoolId: newData.schoolId || null
        };
        try {
            await auth.setCustomUserClaims(userId, claims);
            console.log(`Custom claims updated for user ${userId}`);
        }
        catch (error) {
            console.error(`Error updating claims for user ${userId}:`, error);
        }
    }
});
// ============================================
// GROUP MANAGEMENT TRIGGERS
// ============================================
// Update group student count when student is added/removed
exports.onGroupStudentWrite = functions.firestore
    .document('groups/{groupId}/students/{enrollmentId}')
    .onWrite(async (change) => {
    var _a;
    const groupId = (_a = change.after.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
    if (!groupId)
        return;
    // Get all active students in the group
    const studentsSnapshot = await db
        .collection('groups')
        .doc(groupId)
        .collection('students')
        .where('status', '==', 'active')
        .get();
    const currentStudents = studentsSnapshot.size;
    // Update the group document
    await db.collection('groups').doc(groupId).update({
        currentStudents,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
});
// ============================================
// SESSION MANAGEMENT TRIGGERS
// ============================================
// Update subscription session counts when session is completed
exports.onSessionUpdate = functions.firestore
    .document('sessions/{sessionId}')
    .onUpdate(async (change) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    if (!newData || !oldData)
        return;
    // Check if session was just completed
    if (oldData.status !== 'completed' && newData.status === 'completed') {
        const subscriptionId = newData.subscriptionId;
        if (subscriptionId) {
            // Increment sessions completed
            await db.collection('subscriptions').doc(subscriptionId).update({
                sessionsCompleted: admin.firestore.FieldValue.increment(1),
                sessionsRemaining: admin.firestore.FieldValue.increment(-1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Update student's total lessons taken
            if (newData.studentId) {
                await db.collection('students').doc(newData.studentId).update({
                    totalLessonsTaken: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    }
});
// ============================================
// TRANSACTION MANAGEMENT TRIGGERS
// ============================================
// Update account balances when transaction is created
exports.onTransactionCreate = functions.firestore
    .document('transactions/{transactionId}')
    .onCreate(async (snap) => {
    const transaction = snap.data();
    if (!transaction || transaction.status !== 'completed')
        return;
    const batch = db.batch();
    // Update account balances based on transaction type
    if (transaction.type === 'income' && transaction.toAccountId) {
        const accountRef = db.collection('accounts').doc(transaction.toAccountId);
        batch.update(accountRef, {
            currentBalance: admin.firestore.FieldValue.increment(transaction.amount),
            totalIncome: admin.firestore.FieldValue.increment(transaction.amount),
            transactionCount: admin.firestore.FieldValue.increment(1),
            lastTransactionDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    else if (transaction.type === 'expense' && transaction.fromAccountId) {
        const accountRef = db.collection('accounts').doc(transaction.fromAccountId);
        batch.update(accountRef, {
            currentBalance: admin.firestore.FieldValue.increment(-transaction.amount),
            totalExpenses: admin.firestore.FieldValue.increment(transaction.amount),
            transactionCount: admin.firestore.FieldValue.increment(1),
            lastTransactionDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    else if (transaction.type === 'transfer') {
        if (transaction.fromAccountId) {
            const fromAccountRef = db.collection('accounts').doc(transaction.fromAccountId);
            batch.update(fromAccountRef, {
                currentBalance: admin.firestore.FieldValue.increment(-transaction.amount),
                transactionCount: admin.firestore.FieldValue.increment(1),
                lastTransactionDate: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        if (transaction.toAccountId) {
            const toAccountRef = db.collection('accounts').doc(transaction.toAccountId);
            batch.update(toAccountRef, {
                currentBalance: admin.firestore.FieldValue.increment(transaction.amount),
                transactionCount: admin.firestore.FieldValue.increment(1),
                lastTransactionDate: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    await batch.commit();
});
// ============================================
// SUBSCRIPTION MANAGEMENT FUNCTIONS
// ============================================
// Generate lesson sessions for a subscription
exports.generateLessonSessions = functions.https.onCall(async (data, context) => {
    // Verify caller is staff
    if (!context.auth || !['admin', 'teacher'].includes(context.auth.token.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Only staff can generate sessions');
    }
    const { subscriptionId } = data;
    if (!subscriptionId) {
        throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
    }
    try {
        // Get subscription details
        const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
        if (!subscriptionDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Subscription not found');
        }
        const subscription = subscriptionDoc.data();
        const { studentId, schoolId, sessionCount, schedule, startDate, priceMode, pricePerSession, totalPrice } = subscription;
        // Calculate cost per session
        const costPerSession = priceMode === 'perSession'
            ? pricePerSession
            : totalPrice / sessionCount;
        // Generate sessions based on schedule
        const sessions = [];
        let currentDate = startDate.toDate();
        for (let i = 0; i < sessionCount; i++) {
            // Find next scheduled day
            const scheduleItem = schedule[i % schedule.length];
            const dayOfWeek = getDayOfWeek(scheduleItem.day);
            // Advance to next occurrence of this day
            while (currentDate.getDay() !== dayOfWeek) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // Create session
            const sessionData = {
                subscriptionId,
                studentId,
                teacherId: subscription.teacherId,
                schoolId,
                scheduledDate: admin.firestore.Timestamp.fromDate(currentDate),
                scheduledTime: scheduleItem.time,
                duration: 60, // Default 60 minutes
                timezone: scheduleItem.timezone || 'UTC',
                sessionNumber: i + 1,
                status: 'scheduled',
                attendanceStatus: null,
                cost: costPerSession,
                currency: subscription.currency,
                paymentStatus: 'pending',
                isRescheduled: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            sessions.push(sessionData);
            // Move to next week for next session
            currentDate.setDate(currentDate.getDate() + 7);
        }
        // Batch create sessions
        const batch = db.batch();
        sessions.forEach(session => {
            const sessionRef = db.collection('sessions').doc();
            batch.set(sessionRef, session);
        });
        await batch.commit();
        // Update subscription with total scheduled sessions
        await db.collection('subscriptions').doc(subscriptionId).update({
            totalScheduledSessions: sessionCount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, sessionsCreated: sessions.length };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error.message || 'Failed to generate sessions');
    }
});
// Helper function to get day of week number
function getDayOfWeek(day) {
    const days = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
    };
    return days[day.toLowerCase()] || 0;
}
// ============================================
// DATA MIGRATION FUNCTIONS
// ============================================
// Migrate data from Supabase (to be called once during migration)
exports.migrateFromSupabase = functions.https.onCall(async (data, context) => {
    // Only superadmin can trigger migration
    if (!context.auth || context.auth.token.role !== 'superadmin') {
        throw new functions.https.HttpsError('permission-denied', 'Only superadmins can trigger migration');
    }
    // This is a placeholder for the actual migration logic
    // You would implement the actual data transformation here
    return {
        success: true,
        message: 'Migration function ready. Implement actual migration logic here.'
    };
});
// ============================================
// SCHEDULED FUNCTIONS
// ============================================
// Daily cleanup of old temporary files
exports.dailyCleanup = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
    // Clean up temporary files older than 24 hours
    const storage = admin.storage();
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'temp/' });
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    for (const file of files) {
        const [metadata] = await file.getMetadata();
        const created = new Date(metadata.timeCreated || '');
        if (created < oneDayAgo) {
            await file.delete();
            console.log(`Deleted old temp file: ${file.name}`);
        }
    }
    return null;
});
// Update payment statuses daily
exports.updatePaymentStatuses = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    // Find all sessions with pending payment that are past due
    const overdueSessionsSnapshot = await db
        .collection('sessions')
        .where('paymentStatus', '==', 'pending')
        .where('scheduledDate', '<', now)
        .get();
    const batch = db.batch();
    overdueSessionsSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
            paymentStatus: 'overdue',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();
    console.log(`Updated ${overdueSessionsSnapshot.size} overdue payment statuses`);
    return null;
});
//# sourceMappingURL=index.js.map