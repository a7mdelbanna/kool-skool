
# Known Issues and Quirks

This document lists known bugs, issues, and quirks in the School Management System that developers and AI assistants should be aware of when working on the codebase.

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [UI/UX Issues](#uiux-issues)
3. [Database and Backend Issues](#database-and-backend-issues)
4. [Authentication and Security Issues](#authentication-and-security-issues)
5. [Performance Issues](#performance-issues)
6. [Edge Cases and Quirks](#edge-cases-and-quirks)
7. [Development Environment Issues](#development-environment-issues)
8. [Third-Party Integration Issues](#third-party-integration-issues)

---

## Critical Issues

### 1. Session Generation Duplicates
**Status:** Partially Fixed
**Impact:** High
**Description:** The session generation algorithm can still create duplicate sessions under certain edge cases, particularly when:
- Modifying subscription schedules multiple times rapidly
- Handling daylight saving time transitions
- Processing concurrent subscription updates

**Workaround:** 
- Always check for existing sessions before generating new ones
- Use the `generate_lesson_sessions_v2` function which has better duplicate prevention
- Monitor session counts after subscription updates

**Files Affected:**
- Multiple migration files (20250626030000 through 20250626045000)
- RPC functions for session generation

### 2. Teacher Schedule Overlap Detection
**Status:** Known Issue
**Impact:** Medium
**Description:** The teacher schedule validation doesn't account for:
- Buffer time between sessions
- Travel time between different locations
- Teacher preparation time requirements

**Workaround:**
- Manually verify teacher availability when scheduling
- Consider implementing configurable buffer times
- Check `validateTeacherScheduleOverlap` function for current limitations

**Files Affected:**
- `src/utils/teacherScheduleValidation.ts`

---

## UI/UX Issues

### 3. Dropdown Transparency
**Status:** Known Issue
**Impact:** Low
**Description:** Dropdown menus throughout the application often appear transparent or have insufficient z-index, making them difficult to use.

**Workaround:**
- Always add `bg-white` or `bg-background` classes to dropdown content
- Use high z-index values (`z-50` or higher)
- Ensure dropdown containers have proper background colors

**Files Affected:**
- Various components using shadcn/ui dropdown components

### 4. Mobile Responsiveness
**Status:** Ongoing
**Impact:** Medium
**Description:** Several components are not fully optimized for mobile devices:
- Calendar view becomes unusable on small screens
- Form dialogs may overflow on mobile
- Table components don't scroll properly on mobile

**Files Affected:**
- `src/components/calendar/CalendarView.tsx`
- Various dialog components
- Table components throughout the application

### 5. Glass Effect Performance
**Status:** Known Issue
**Impact:** Low
**Description:** The glass morphism effects (`glass` and `glass-hover` classes) can cause performance issues on older devices or browsers.

**Workaround:**
- Consider disabling glass effects on mobile devices
- Use `will-change: transform` CSS property sparingly

---

## Database and Backend Issues

### 6. Row Level Security Policies
**Status:** Ongoing
**Impact:** High
**Description:** Some RLS policies are overly restrictive or missing:
- Students can't access their own lesson sessions in some cases
- Teachers may not see all relevant student data
- Admin permissions are inconsistent across tables

**Files Affected:**
- Multiple SQL migration files
- Various table RLS policies

### 7. Currency Handling
**Status:** Known Issue
**Impact:** Medium
**Description:** Multi-currency support has several limitations:
- Exchange rates are not automatically updated
- Currency conversion in reports may be inaccurate
- Mixed currency transactions can cause calculation errors

**Workaround:**
- Manually update exchange rates regularly
- Validate currency consistency in financial operations
- Use base currency for all calculations when possible

### 8. Subscription Renewal Logic
**Status:** Recently Fixed, Monitor
**Impact:** Medium
**Description:** Subscription renewal had validation issues that were recently addressed, but should be monitored:
- Session regeneration during renewals
- Payment calculation accuracy
- Date range validation

**Files Affected:**
- Multiple migration files (20250628 series)
- Subscription renewal RPC functions

---

## Authentication and Security Issues

### 9. Password Storage
**Status:** Critical Security Issue
**Impact:** Critical
**Description:** User passwords are stored in plain text in the `users.password_plain` column, which is a major security vulnerability.

**Recommendation:**
- Remove or encrypt the `password_plain` column immediately
- Implement proper password hashing using bcrypt or similar
- Audit all authentication-related code

**Files Affected:**
- `docs/sql/users.sql`
- Authentication edge functions

### 10. JWT Token Validation
**Status:** Known Issue
**Impact:** Medium
**Description:** Some API endpoints don't properly validate JWT tokens or user permissions.

**Files Affected:**
- Various edge functions
- RPC function implementations

---

## Performance Issues

### 11. Large Dataset Queries
**Status:** Known Issue
**Impact:** Medium
**Description:** Several queries don't implement proper pagination or optimization:
- Student lists with many records
- Transaction history queries
- Session data retrieval

**Workaround:**
- Implement pagination on large datasets
- Add database indexes where needed
- Use query optimization techniques

### 12. Real-time Updates
**Status:** Not Implemented
**Impact:** Low
**Description:** The application doesn't use real-time subscriptions, so users must refresh to see updates from other users.

**Recommendation:**
- Implement Supabase real-time subscriptions for critical data
- Add automatic refresh mechanisms
- Consider using React Query's background refetching

---

## Edge Cases and Quirks

### 13. Timezone Handling
**Status:** Inconsistent
**Impact:** Medium
**Description:** Timezone handling is inconsistent across the application:
- Session times may display incorrectly for users in different timezones
- Date calculations don't always account for daylight saving time
- Mixed timezone data in database

**Files Affected:**
- `src/utils/timezone.ts`
- `src/utils/sessionTimezone.ts`
- Calendar and scheduling components

### 14. Sample Data in Dashboard
**Status:** Intentional but Confusing
**Impact:** Low
**Description:** The dashboard uses hardcoded sample data instead of real database queries, which can confuse developers.

**Files Affected:**
- `src/pages/Index.tsx` (Dashboard)
- Various dashboard components

### 15. Group Price Mode Validation
**Status:** Recently Fixed
**Impact:** Low
**Description:** Group price mode constraints were recently updated but may still have edge cases with validation.

**Files Affected:**
- Group-related migration files
- Group creation and editing components

---

## Development Environment Issues

### 16. Console Errors in Development
**Status:** Known Issue
**Impact:** Low
**Description:** Several console warnings and errors appear in development mode:
- React key warnings in list components
- Deprecated API usage warnings
- Type checking warnings

### 17. Hot Reload Issues
**Status:** Intermittent
**Impact:** Low
**Description:** Vite hot reload occasionally fails to update components properly, requiring full page refresh.

**Workaround:** 
- Restart dev server if changes aren't reflected
- Use browser hard refresh (Ctrl+F5)

---

## Third-Party Integration Issues

### 18. Supabase Edge Function Limitations
**Status:** Known Limitation
**Impact:** Medium
**Description:** Some edge functions have size and execution time limitations that may affect complex operations.

**Files Affected:**
- All edge functions in `supabase/functions/`

### 19. Date Picker Localization
**Status:** Not Implemented
**Impact:** Low
**Description:** Date pickers don't support multiple languages or regional date formats.

---

## Testing and Quality Assurance

### 20. Missing Test Coverage
**Status:** Critical Gap
**Impact:** High
**Description:** The application has no automated tests, making it difficult to catch regressions.

**Recommendation:**
- Implement unit tests for core business logic
- Add integration tests for critical user flows
- Set up end-to-end testing for key scenarios

### 21. Error Handling Inconsistency
**Status:** Known Issue
**Impact:** Medium
**Description:** Error handling is inconsistent across the application:
- Some errors are not properly caught or displayed to users
- Error messages are not user-friendly
- Some operations fail silently

---

## Migration and Deployment Issues

### 22. Database Migration Dependencies
**Status:** Known Issue
**Impact:** Medium
**Description:** Some database migrations have dependencies that aren't clearly documented, making it difficult to run them in isolation.

### 23. Environment Variable Management
**Status:** Known Issue
**Impact:** Low
**Description:** Environment variables are not well documented, and some may be missing in different deployment environments.

---

## Recommendations for Developers

### When Working on This Codebase:

1. **Always test subscription-related changes thoroughly** - The session generation logic is complex and prone to edge cases
2. **Verify RLS policies** when adding new database operations
3. **Check mobile responsiveness** for any UI changes
4. **Use proper error handling** and user-friendly error messages
5. **Test with multiple users and timezones** when working on scheduling features
6. **Monitor database query performance** with large datasets
7. **Validate currency handling** in financial operations
8. **Check for security vulnerabilities** especially around authentication
9. **Document any new known issues** you discover
10. **Consider the impact on existing data** when making schema changes

### For AI Assistants:

- **Always check for existing session generation** before creating new sessions
- **Be extra careful with subscription modifications** as they can create data inconsistencies
- **Validate user permissions** before suggesting database operations
- **Consider timezone implications** when working with dates and times
- **Test dropdown components** for proper styling and z-index
- **Be aware of the sample data** in dashboard components
- **Check for RLS policy conflicts** when users report data visibility issues
- **Consider performance implications** of any database queries you suggest

---

## Priority Fixes Needed

### High Priority:
1. Fix password storage security issue
2. Implement proper test coverage
3. Resolve RLS policy inconsistencies
4. Address session generation edge cases

### Medium Priority:
1. Improve mobile responsiveness
2. Implement proper error handling
3. Add timezone consistency
4. Optimize database queries

### Low Priority:
1. Fix dropdown transparency issues
2. Replace sample data with real queries
3. Improve development environment stability
4. Add localization support

---

*Last Updated: January 1, 2025*
*This document should be updated whenever new issues are discovered or existing issues are resolved.*
