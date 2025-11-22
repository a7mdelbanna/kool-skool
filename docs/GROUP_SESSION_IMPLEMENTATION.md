# Group Session Implementation Guide for React Native

## Overview
This document explains the complete implementation of teacher display, filtering, and group session handling in the attendance system. This guide is for implementing the same functionality in the React Native mobile app.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Data Flow](#data-flow)
3. [Database Schema](#database-schema)
4. [Implementation Steps](#implementation-steps)
5. [Critical Bug Fixes](#critical-bug-fixes)
6. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

### Core Concept
The system enriches sessions with teacher and group information by:
1. Fetching students, teachers, and groups in parallel
2. Building lookup maps for subscriptions → groups
3. Enriching sessions with teacher/group data from subscriptions
4. Grouping sessions intelligently based on `groupId` and `teacherId`

### Data Sources
- **Firebase Collections**:
  - `students` - Student records
  - `teachers` (users) - Teacher profiles
  - `groups` - Group definitions with subscription_ids arrays
  - `subscriptions` - Individual student subscriptions
  - `sessions` - Lesson sessions

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Parallel Data Fetching                              │
├─────────────────────────────────────────────────────────────┤
│  Students (school_id) ────┐                                 │
│  Teachers (school_id) ────┼──→ Promise.all()                │
│  Groups (schoolId) ───────┘                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Build Lookup Maps                                   │
├─────────────────────────────────────────────────────────────┤
│  studentMap:     studentId → StudentInfo                    │
│  teacherMap:     teacherId → TeacherInfo                    │
│  subscriptionToGroupMap: subscriptionId → {groupId, name}   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Fetch Sessions & Subscriptions (Parallel)           │
├─────────────────────────────────────────────────────────────┤
│  For each student:                                          │
│    - getStudentLessonSessions(studentId)                    │
│    - getStudentSubscriptions(studentId)                     │
│  Using Promise.allSettled() for parallel execution          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Enrich Sessions                                     │
├─────────────────────────────────────────────────────────────┤
│  Session + Subscription → Add:                              │
│    - teacherId, teacherName                                 │
│    - groupId, groupName (from group map or subscription)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Intelligent Grouping                                │
├─────────────────────────────────────────────────────────────┤
│  Sessions with groupId → Group Widget (even if 1 student)   │
│  Sessions with same teacher + time → Can group              │
│  Sessions with different teachers → Stay separate           │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Firebase Collections

#### `groups` Collection
```typescript
{
  id: string;
  name: string;                    // "new group", "Nails - a1"
  description: string;
  schoolId: string;                // IMPORTANT: camelCase!
  teacher_id: string;
  subscription_ids: string[];      // Array of subscription IDs
  session_count: number;
  schedule: object;
  status: 'active' | 'paused' | 'completed';
  created_at: timestamp;
}
```

#### `subscriptions` Collection
```typescript
{
  id: string;
  student_id: string;
  teacher_id?: string;             // May or may not exist
  group_id?: string;               // May or may not exist
  group_name?: string;             // May or may not exist
  session_count: number;
  start_date: string;
  total_price: number;
  currency: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}
```

#### `sessions` Collection
```typescript
{
  id: string;
  student_id: string;              // OR studentId (both exist!)
  subscription_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  scheduled_datetime?: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'canceled' | 'missed';
  notes: string;
  cost: number;
  payment_status: string;
  // NOTE: groupId/groupName NOT stored in sessions!
  // They're inherited from subscriptions via enrichment
}
```

---

## Implementation Steps

### Step 1: Update Type Definitions

#### Add Group Fields to Session Interface
```typescript
// src/contexts/PaymentContext.tsx or your types file
export interface Session {
  id: string;
  date: Date;
  time: string;
  duration: string;
  status: "scheduled" | "completed" | "canceled" | "missed";
  notes?: string;
  sessionNumber?: number;
  totalSessions?: number;
  studentId: string;
  studentName: string;
  cost: number;
  paymentStatus: string;

  // ADD THESE FIELDS:
  teacherId?: string;
  teacherName?: string;
  groupId?: string;        // ← From subscription or group mapping
  groupName?: string;      // ← From subscription or group mapping
}
```

#### Add Group Fields to LessonSession Interface
```typescript
// src/integrations/supabase/client.ts (or your RPC types)
export interface LessonSession {
  id: string;
  subscription_id: string;
  student_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  scheduled_datetime?: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  cost: number;
  notes?: string;
  created_at: string;
  index_in_sub?: number;

  // ADD THESE FIELDS:
  group_id?: string;
  groupId?: string;
  group_name?: string;
  groupName?: string;
}
```

---

### Step 2: Update RPC Function to Return Group Fields

**File**: `src/services/migration/supabaseToFirebase.ts` (or your API layer)

```typescript
async function handleGetLessonSessions(params: { p_student_id: string }) {
  try {
    // Fetch sessions from Firebase
    const sessions = await databaseService.query('sessions', {
      where: [{ field: 'student_id', operator: '==', value: params.p_student_id }]
    });

    // Map sessions to include ALL fields
    const mappedSessions = sessions.map((session: any) => ({
      id: session.id,
      subscription_id: session.subscriptionId || session.subscription_id,
      student_id: session.studentId || session.student_id,
      teacher_id: session.teacherId || session.teacher_id || null,
      scheduled_date: session.scheduledDateTime || session.scheduledDate || session.scheduled_date,
      scheduled_time: session.scheduledTime || session.scheduled_time,
      scheduled_datetime: session.scheduledDateTime || null,
      duration_minutes: session.durationMinutes || session.duration_minutes || 60,
      status: session.status || 'scheduled',
      notes: session.notes || '',
      index_in_sub: session.indexInSub || session.index_in_sub || null,
      cost: session.cost || null,
      payment_status: session.paymentStatus || session.payment_status || null,

      // ADD THESE LINES (even though sessions don't store them, support fallback):
      group_id: session.groupId || session.group_id || null,
      groupId: session.groupId || session.group_id || null,
      group_name: session.groupName || session.group_name || null,
      groupName: session.groupName || session.group_name || null
    }));

    return { data: mappedSessions, error: null };
  } catch (error) {
    console.error('Error getting lesson sessions:', error);
    return { data: null, error };
  }
}
```

---

### Step 3: Implement Data Fetching Hook

**File**: `src/hooks/useAttendanceData.ts` (or equivalent in React Native)

```typescript
import { databaseService } from '@/services/firebase/database.service';

export const useAttendanceData = (userTimezone?: string) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subscriptionInfoMap, setSubscriptionInfoMap] = useState<Map<string, SubscriptionInfo>>(new Map());
  const [studentInfoMap, setStudentInfoMap] = useState<Map<string, StudentInfo>>(new Map());
  const [teacherInfoMap, setTeacherInfoMap] = useState<Map<string, TeacherInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);

      const userData = localStorage.getItem('user'); // Or AsyncStorage in RN
      const user = userData ? JSON.parse(userData) : null;

      if (!user || !user.schoolId) return;

      // ===== STEP 1: PARALLEL DATA FETCHING =====
      const [students, teachers, groupsData] = await Promise.all([
        getStudentsWithDetails(user.schoolId),
        getSchoolTeachers(user.schoolId),
        // Fetch groups directly from Firebase
        (async () => {
          try {
            return await databaseService.query('groups', {
              where: [{ field: 'schoolId', operator: '==', value: user.schoolId }]
            });
          } catch (error) {
            console.error('Error fetching groups:', error);
            return [];
          }
        })()
      ]);

      console.log('👥 Found students:', students.length);
      console.log('👨‍🏫 Found teachers:', teachers.length);
      console.log('👥 Found groups:', groupsData.length);

      if (students.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // ===== STEP 2: BUILD LOOKUP MAPS =====

      // Student map
      const studentMap = new Map<string, StudentInfo>();
      students.forEach(student => {
        studentMap.set(student.id, {
          id: student.id,
          courseName: student.course_name,
          level: student.level,
          firstName: student.first_name,
          lastName: student.last_name
        });
      });
      setStudentInfoMap(studentMap);

      // Teacher map
      const teacherMap = new Map<string, TeacherInfo>();
      teachers.forEach(teacher => {
        teacherMap.set(teacher.id, {
          id: teacher.id,
          firstName: teacher.first_name || teacher.firstName,
          lastName: teacher.last_name || teacher.lastName,
          displayName: teacher.display_name || `${teacher.first_name || teacher.firstName} ${teacher.last_name || teacher.lastName}`
        });
      });
      setTeacherInfoMap(teacherMap);

      // ===== CRITICAL: BUILD SUBSCRIPTION → GROUP MAP =====
      // Groups contain subscription_ids arrays
      // We reverse-map: subscriptionId → { groupId, groupName }
      const subscriptionToGroupMap = new Map<string, { groupId: string; groupName: string }>();

      groupsData.forEach((group: any) => {
        const groupId = group.id;
        const groupName = group.name || group.group_name || 'Group Session';
        const subscriptionIds = group.subscription_ids || group.subscriptionIds || [];

        subscriptionIds.forEach((subId: string) => {
          subscriptionToGroupMap.set(subId, { groupId, groupName });
        });
      });

      console.log('🔗 Mapped', subscriptionToGroupMap.size, 'subscriptions to groups');

      // ===== STEP 3: FETCH SESSIONS & SUBSCRIPTIONS IN PARALLEL =====
      const studentIds = students.map(s => s.id);

      const [sessionsResults, subscriptionsResults] = await Promise.all([
        // Fetch all sessions in parallel
        Promise.allSettled(
          studentIds.map(async (studentId) => {
            const sessions = await getStudentLessonSessions(studentId);
            return { studentId, sessions };
          })
        ),
        // Fetch all subscriptions in parallel
        Promise.allSettled(
          studentIds.map(async (studentId) => {
            const subscriptions = await getStudentSubscriptions(studentId);
            return { studentId, subscriptions };
          })
        )
      ]);

      // ===== STEP 4: PROCESS SESSIONS =====
      const allSessions: Session[] = [];

      sessionsResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { studentId, sessions } = result.value;
          const student = studentMap.get(studentId);

          if (student) {
            const convertedSessions: Session[] = sessions.map((session: LessonSession) => {
              // ... date/time parsing logic ...

              return {
                id: session.id,
                studentId: studentId,
                studentName: `${student.firstName} ${student.lastName}`,
                date: localDate,
                time: formatTime(session),
                duration: `${session.duration_minutes || 60} min`,
                status: session.status as Session['status'],
                sessionNumber: session.index_in_sub || undefined,
                notes: session.notes || '',
                cost: session.cost,
                paymentStatus: session.payment_status as Session['paymentStatus'],

                // IMPORTANT: Include group info from session if available
                groupId: session.groupId || session.group_id || undefined,
                groupName: session.groupName || session.group_name || undefined
              };
            });

            allSessions.push(...convertedSessions);
          }
        }
      });

      // ===== STEP 5: PROCESS SUBSCRIPTIONS =====
      const subscriptionMap = new Map<string, SubscriptionInfo>();

      subscriptionsResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { studentId, subscriptions } = result.value;
          const activeSubscription = subscriptions.find(sub => sub.status === 'active');

          if (activeSubscription) {
            // CRITICAL: Check subscription → group map
            const groupInfo = subscriptionToGroupMap.get(activeSubscription.id);

            const subscriptionInfo: SubscriptionInfo = {
              id: activeSubscription.id,
              studentId: studentId,
              sessionCount: activeSubscription.session_count,
              totalPrice: activeSubscription.total_price,
              currency: activeSubscription.currency,
              startDate: activeSubscription.start_date,
              teacherId: activeSubscription.teacherId || activeSubscription.teacher_id,

              // CRITICAL: Use group info from map FIRST, fallback to subscription fields
              groupId: groupInfo?.groupId || activeSubscription.groupId || activeSubscription.group_id,
              groupName: groupInfo?.groupName || activeSubscription.groupName || activeSubscription.group_name
            };

            subscriptionMap.set(studentId, subscriptionInfo);
          }
        }
      });

      // ===== STEP 6: ENRICH SESSIONS WITH TEACHER & GROUP INFO =====
      const enrichedSessions = allSessions.map(session => {
        const subscriptionInfo = subscriptionMap.get(session.studentId);

        if (subscriptionInfo) {
          const teacher = subscriptionInfo.teacherId ? teacherMap.get(subscriptionInfo.teacherId) : undefined;

          return {
            ...session,
            teacherId: subscriptionInfo.teacherId,
            teacherName: teacher?.displayName || undefined,

            // CRITICAL: Preserve session's own group info if it exists,
            // otherwise use subscription's group info
            groupId: session.groupId || subscriptionInfo.groupId,
            groupName: session.groupName || subscriptionInfo.groupName
          };
        }

        return session;
      });

      console.log('✅ Loaded:', enrichedSessions.length, 'sessions');
      console.log('📊 Sessions with teachers:', enrichedSessions.filter(s => s.teacherId).length);
      console.log('📊 Sessions with groupId:', enrichedSessions.filter(s => s.groupId).length);

      setSessions(enrichedSessions);
      setSubscriptionInfoMap(subscriptionMap);

    } catch (error) {
      console.error('❌ Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sessions,
    subscriptionInfoMap,
    studentInfoMap,
    teacherInfoMap,
    loading,
    loadSessions
  };
};
```

---

### Step 4: Implement Intelligent Session Grouping

**File**: `src/components/calendar/UpcomingLessonsList.tsx` (or your session list component)

```typescript
const identifyGroupSessions = (sessions: Session[]) => {
  const groupMap = new Map<string, Session[]>();
  const individualSessions: Session[] = [];

  sessions.forEach(session => {
    const sessionDate = new Date(session.date);
    const dateKey = format(sessionDate, 'yyyy-MM-dd');
    const timeKey = session.time;

    // ===== CRITICAL: CREATE UNIQUE GROUP KEY =====
    // This prevents sessions with different teachers from being grouped
    const groupKey = session.groupId
      ? `group-${session.groupId}-${dateKey}-${timeKey}`      // Real group
      : session.teacherId
        ? `teacher-${session.teacherId}-${dateKey}-${timeKey}` // Same teacher
        : `individual-${session.id}-${dateKey}-${timeKey}`;    // Individual

    // ===== CRITICAL FIX: Sessions with groupId ALWAYS get grouped =====
    const isRealGroup = !!session.groupId;
    const hasGroupIndicator = session.notes?.toLowerCase().includes('group');

    // Add to group if:
    // 1. Has groupId (real group) OR
    // 2. Has "group" in notes OR
    // 3. Another session with same groupKey already exists
    if (isRealGroup || hasGroupIndicator || groupMap.has(groupKey)) {
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(session);
    } else {
      // Check if we should group with an existing individual session
      const existingSessionIndex = individualSessions.findIndex(s => {
        const existingDate = format(new Date(s.date), 'yyyy-MM-dd');
        const existingTimeKey = s.time;

        // Calculate groupKey for existing session
        const existingGroupKey = s.groupId
          ? `group-${s.groupId}-${existingDate}-${existingTimeKey}`
          : s.teacherId
            ? `teacher-${s.teacherId}-${existingDate}-${existingTimeKey}`
            : `individual-${s.id}-${existingDate}-${existingTimeKey}`;

        // CRITICAL: Only match if SAME groupKey (same teacher OR same group)
        return existingGroupKey === groupKey;
      });

      if (existingSessionIndex !== -1) {
        // Move existing session to group and add current session
        const existingSession = individualSessions.splice(existingSessionIndex, 1)[0];
        groupMap.set(groupKey, [existingSession, session]);
      } else {
        individualSessions.push(session);
      }
    }
  });

  // ===== CRITICAL: KEEP SINGLE-SESSION GROUPS IF THEY HAVE groupId =====
  const finalGroups = new Map<string, Session[]>();

  groupMap.forEach((sessions, key) => {
    if (sessions.length > 1) {
      // Multiple sessions → definitely a group
      finalGroups.set(key, sessions);
    } else if (sessions.length === 1 && sessions[0].groupId) {
      // Single session BUT has groupId → keep as group to show group name
      finalGroups.set(key, sessions);
    } else {
      // Single session without groupId → individual
      individualSessions.push(...sessions);
    }
  });

  return { groups: finalGroups, individual: individualSessions };
};
```

---

### Step 5: Update Group Widget to Display Group Name

**File**: `src/components/calendar/GroupSessionWidget.tsx`

```typescript
const GroupSessionWidget = ({ groupSessions, ...props }) => {
  if (!groupSessions || groupSessions.length === 0) {
    return null;
  }

  const firstSession = groupSessions[0];

  // ===== CRITICAL: Use groupName from session data =====
  // Real groups have groupName populated from enrichment
  // Fallback to 'Group Session' for time-coincidental sessions without groupName
  const groupName = firstSession.groupName || 'Group Session';

  // Display teacher name from first session
  const teacherName = firstSession.teacherName;

  return (
    <Card>
      <CardContent>
        {/* Group Icon & Info */}
        <h3>{groupName}</h3>
        {teacherName && <p>Teacher: {teacherName}</p>}
        <Badge>{groupSessions.length} students</Badge>

        {/* Expandable student list */}
        <Collapsible>
          <CollapsibleContent>
            {groupSessions.map((session) => (
              <div key={session.id}>
                {/* Render individual session card */}
                {renderSessionCard(session)}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
```

---

## Critical Bug Fixes

### Bug 1: Teacher Filter Not Working
**Problem**: Teacher filter dropdown showed no sessions even though sessions existed.

**Root Cause**: `handleGetStudentSubscriptions` RPC wasn't returning `teacherId` field.

**Fix**: Add `teacherId` and `teacher_id` to subscription response:
```typescript
return {
  ...subscription,
  teacherId: subscription.teacherId || subscription.teacher_id,
  teacher_id: subscription.teacherId || subscription.teacher_id,
};
```

---

### Bug 2: Different Teachers Being Grouped Together
**Problem**: Sessions at same time with DIFFERENT teachers were grouped as "Group Session".

**Root Cause**: Grouping logic only checked `date + time`, not `teacherId`.

**Fix**: Include `teacherId` in groupKey:
```typescript
const groupKey = session.groupId
  ? `group-${session.groupId}-${dateKey}-${timeKey}`
  : session.teacherId
    ? `teacher-${session.teacherId}-${dateKey}-${timeKey}`  // ← Added teacherId
    : `individual-${session.id}-${dateKey}-${timeKey}`;
```

---

### Bug 3: Group Sessions Not Showing Group Name
**Problem**: Real group sessions showed "Speakoshka - B2 Lesson" instead of "new group".

**Root Cause 1**: Sessions didn't store `groupId`/`groupName` in Firebase.
**Root Cause 2**: Subscription → Group mapping wasn't implemented.
**Root Cause 3**: Grouping logic didn't recognize sessions with `groupId`.

**Fix**:
1. Fetch groups from Firebase
2. Build `subscriptionToGroupMap` from group's `subscription_ids` arrays
3. Enrich subscriptions with group info from map
4. Check `isRealGroup = !!session.groupId` before grouping logic

---

### Bug 4: Single Group Sessions Showing as Individual
**Problem**: Group with only 1 student attending showed as individual session.

**Root Cause**: Logic removed groups with `length === 1` without checking `groupId`.

**Fix**: Keep single-session groups if they have `groupId`:
```typescript
if (sessions.length > 1) {
  finalGroups.set(key, sessions);
} else if (sessions.length === 1 && sessions[0].groupId) {
  // ← Added this condition
  finalGroups.set(key, sessions);
}
```

---

## Testing Checklist

### ✅ Teacher Display
- [ ] Teacher name appears on individual sessions
- [ ] Teacher name appears on group session widgets
- [ ] Sessions without teachers show correctly (no crash)
- [ ] Teacher search/filter includes teacher names

### ✅ Teacher Filter
- [ ] "All Teachers" shows all sessions
- [ ] "Unassigned" shows sessions without teachers
- [ ] Selecting specific teacher shows only their sessions
- [ ] Filter works with group sessions
- [ ] Filter persists across view mode changes (day/week/month)

### ✅ Group Sessions
- [ ] Real groups show with group name (e.g., "new group")
- [ ] Groups with multiple students display correctly
- [ ] Groups with single student still show as group widget
- [ ] Group widget shows teacher name
- [ ] Group widget shows student count
- [ ] Expandable student list works
- [ ] Individual session cards within groups are clickable

### ✅ Session Grouping Logic
- [ ] Sessions with same `groupId` are grouped together
- [ ] Sessions with DIFFERENT teachers at same time are NOT grouped
- [ ] Sessions with SAME teacher at same time CAN be grouped
- [ ] Individual sessions (no group, no shared teacher) remain separate
- [ ] Time-coincidental sessions without `groupId` show as "Group Session" fallback

### ✅ Edge Cases
- [ ] Students with no active subscription show sessions correctly
- [ ] Sessions with no teacher assignment display correctly
- [ ] Mixed camelCase/snake_case field names work (groupId/group_id)
- [ ] Empty notes don't break group detection
- [ ] Timezone handling works correctly for group sessions
- [ ] Status updates work for sessions within groups

---

## React Native Specific Considerations

### 1. AsyncStorage vs localStorage
```typescript
// Web
const userData = localStorage.getItem('user');

// React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
const userData = await AsyncStorage.getItem('user');
```

### 2. Date Formatting
Use `date-fns` consistently:
```typescript
import { format } from 'date-fns';
const dateKey = format(sessionDate, 'yyyy-MM-dd');
```

### 3. Firebase SDK
Ensure you're using `@react-native-firebase/firestore` for React Native, not the web SDK.

### 4. Performance Optimization
- Use `useMemo` for expensive calculations (map building)
- Use `useCallback` for event handlers
- Implement virtualized lists for large session counts (FlatList)
- Cache group data to reduce Firebase reads

### 5. Error Handling
Add proper error boundaries and user-friendly error messages for:
- Network failures
- Missing permissions
- Invalid data formats

---

## Common Pitfalls

### ❌ Don't Do This:
```typescript
// BAD: Only checking snake_case
const groupId = subscription.group_id;

// BAD: Only checking one field variant
.where('studentId', '==', studentId)

// BAD: Grouping without checking teacherId
const groupKey = `${dateKey}-${timeKey}`;
```

### ✅ Do This Instead:
```typescript
// GOOD: Check both naming conventions
const groupId = subscription.groupId || subscription.group_id;

// GOOD: Query both field variants
const q1 = query(collection(db, 'subscriptions'),
  where('student_id', '==', studentId));
const q2 = query(collection(db, 'subscriptions'),
  where('studentId', '==', studentId));

// GOOD: Include teacher/group in grouping key
const groupKey = session.groupId
  ? `group-${session.groupId}-${dateKey}-${timeKey}`
  : session.teacherId
    ? `teacher-${session.teacherId}-${dateKey}-${timeKey}`
    : `individual-${session.id}-${dateKey}-${timeKey}`;
```

---

## Performance Metrics

Expected performance for 100 students:
- Initial load: ~2-3 seconds
- Group mapping: ~100ms
- Session enrichment: ~200ms
- UI rendering: ~300ms

Optimize by:
1. Parallel fetching (Promise.all)
2. Early returns for empty data
3. Map-based lookups (O(1)) vs array searches (O(n))
4. Memoization of computed values

---

## Support & Questions

If you encounter issues:
1. Check browser console for debug logs
2. Verify Firebase field names (camelCase vs snake_case)
3. Ensure groups have `subscription_ids` arrays
4. Confirm subscriptions have `teacher_id` populated
5. Check that grouping logic includes `isRealGroup` check

For questions, refer to:
- Web implementation: `/src/hooks/useAttendanceData.ts`
- Grouping logic: `/src/components/calendar/UpcomingLessonsList.tsx`
- Group widget: `/src/components/calendar/GroupSessionWidget.tsx`

---

**Last Updated**: November 22, 2025
**Version**: 1.0
**Author**: Development Team
