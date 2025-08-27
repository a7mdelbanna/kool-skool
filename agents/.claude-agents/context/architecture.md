# TutorFlow Assistant - Architecture Guide

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
├─────────────────────────────────────────────────┤
│  Pages │ Components │ Hooks │ Services │ Utils  │
└─────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────┐
│              Service Layer (TypeScript)          │
├─────────────────────────────────────────────────┤
│  Auth Service │ Database Service │ API Services │
└─────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────┐
│                Firebase Platform                 │
├─────────────────────────────────────────────────┤
│  Auth │ Firestore │ Functions │ Storage │ Rules │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn)
│   ├── student-tabs/   # Student-specific tabs
│   └── calendar/       # Calendar components
├── pages/              # Route pages
├── services/           # Business logic & Firebase
│   ├── firebase/       # Firebase services
│   └── migration/      # Migration utilities
├── hooks/              # Custom React hooks
├── contexts/           # React Context providers
├── utils/              # Utility functions
├── config/             # Configuration files
└── lib/               # Third-party integrations
```

## Data Flow Architecture

### 1. Authentication Flow
```
User Login → Firebase Auth → Custom Claims → User Context → App Routes
```

### 2. Data Fetching Pattern
```
Component → TanStack Query → Service Layer → Firebase → Response
```

### 3. Real-time Updates
```
Firestore Listener → Service Layer → Query Invalidation → UI Update
```

## Firebase Collections Schema

### Users Collection
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  schoolId?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tempPassword?: string; // For students
  timezone?: string;
}
```

### Students Collection
```typescript
interface Student {
  id: string;
  userId: string;        // Reference to users
  schoolId: string;
  teacherId?: string;    // Reference to teacher user
  courseName: string;
  lessonType: 'individual' | 'group';
  ageGroup: 'adult' | 'kid';
  level: string;
  createdAt: Timestamp;
}
```

### Subscriptions Collection
```typescript
interface Subscription {
  id: string;
  studentId: string;
  schoolId: string;
  priceMode: 'fixed' | 'perSession';
  totalPrice?: number;
  pricePerSession?: number;
  sessionCount: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'active' | 'paused' | 'completed';
}
```

## Service Layer Architecture

### DatabaseService Pattern
```typescript
class DatabaseService {
  // Generic CRUD operations
  create<T>(collection: string, data: T): Promise<string>
  update<T>(collection: string, id: string, data: T): Promise<void>
  delete(collection: string, id: string): Promise<void>
  getById<T>(collection: string, id: string): Promise<T>
  query<T>(collection: string, options: QueryOptions): Promise<T[]>
  
  // Real-time listeners
  subscribe<T>(collection: string, callback: (data: T[]) => void): Unsubscribe
}
```

### AuthService Pattern
```typescript
class AuthService {
  // Authentication methods
  signIn(email: string, password: string): Promise<User>
  signOut(): Promise<void>
  createUser(userData: CreateUserData): Promise<string>
  updatePassword(userId: string, newPassword: string): Promise<void>
  
  // Role management
  getUserRole(userId: string): Promise<string>
  hasPermission(userId: string, permission: string): Promise<boolean>
}
```

## State Management Strategy

### Global State (React Context)
- User authentication state
- School configuration
- Theme preferences

### Server State (TanStack Query)
- All data fetched from Firebase
- Automatic caching and invalidation
- Optimistic updates

### Local State (useState/useReducer)
- Form inputs
- UI toggles
- Temporary data

## Security Architecture

### Frontend Security
- Role-based route protection
- Component-level permission checks
- Input validation
- XSS prevention

### Firebase Security Rules
```javascript
// Example rule structure
match /schools/{schoolId}/students/{studentId} {
  allow read: if isAuthenticated() && 
    (hasRole('admin') || hasRole('teacher')) && 
    userBelongsToSchool(schoolId);
  allow write: if isAuthenticated() && 
    hasRole('admin') && 
    userBelongsToSchool(schoolId);
}
```

## Performance Optimization

### Code Splitting
- Route-based splitting with React.lazy()
- Component lazy loading
- Dynamic imports for heavy libraries

### Caching Strategy
- TanStack Query caching
- Firebase offline persistence
- Browser localStorage for preferences

### Bundle Optimization
- Tree shaking
- Minification
- Compression
- Asset optimization

## Error Handling

### Error Boundaries
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

### Service Layer Error Handling
```typescript
try {
  const result = await databaseService.create('students', data);
  return { success: true, data: result };
} catch (error) {
  console.error('Error creating student:', error);
  toast.error('Failed to create student');
  return { success: false, error };
}
```

## Testing Architecture

### Unit Tests
- Service functions
- Utility functions
- Custom hooks

### Integration Tests
- API integrations
- Firebase operations
- Authentication flows

### Component Tests
- UI component rendering
- User interactions
- State changes

### E2E Tests
- Critical user journeys
- Payment flows
- Authentication flows