# TutorFlow Assistant - Code Patterns & Standards

## React Component Patterns

### Functional Component Structure
```typescript
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: (data: any) => void;
}

const ComponentName: React.FC<ComponentNameProps> = ({ 
  prop1, 
  prop2 = 0, 
  onAction 
}) => {
  // State declarations
  const [localState, setLocalState] = useState<string>('');
  
  // Context hooks
  const { user } = useContext(UserContext);
  
  // Query hooks
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-key', param],
    queryFn: () => serviceFunction(param),
    enabled: !!param
  });
  
  // Effects
  useEffect(() => {
    // Side effects
  }, [dependency]);
  
  // Event handlers
  const handleClick = () => {
    // Handle event
  };
  
  // Render
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="space-y-4">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### Custom Hook Pattern
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useCustomHook = (initialValue: string) => {
  const [state, setState] = useState(initialValue);
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['hook-data', initialValue],
    queryFn: () => fetchData(initialValue)
  });
  
  const mutation = useMutation({
    mutationFn: (newData: any) => updateData(newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hook-data'] });
      toast.success('Data updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update data');
    }
  });
  
  const updateState = useCallback((newValue: string) => {
    setState(newValue);
    mutation.mutate(newValue);
  }, [mutation]);
  
  return {
    state,
    updateState,
    isLoading,
    data
  };
};
```

## Service Layer Patterns

### Firebase Service Pattern
```typescript
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

class ServiceName {
  private collectionName = 'collectionName';
  
  async getById(id: string): Promise<DataType | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DataType;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ${this.collectionName}:`, error);
      throw error;
    }
  }
  
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
      console.error(`Error querying ${this.collectionName}:`, error);
      throw error;
    }
  }
}

export const serviceName = new ServiceName();
```

## Form Handling Pattern

### React Hook Form with Zod
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(1).max(120)
});

type FormData = z.infer<typeof formSchema>;

const FormComponent = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      age: 18
    }
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      await submitData(data);
      toast.success('Form submitted successfully');
      reset();
    } catch (error) {
      toast.error('Failed to submit form');
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        {...register('name')}
        error={errors.name?.message}
        placeholder="Enter name"
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
};
```

## Error Handling Patterns

### Try-Catch with Toast Notifications
```typescript
const handleAction = async () => {
  try {
    setLoading(true);
    const result = await performAction();
    toast.success('Action completed successfully');
    return result;
  } catch (error) {
    console.error('Action failed:', error);
    toast.error(error.message || 'An error occurred');
    throw error;
  } finally {
    setLoading(false);
  }
};
```

### Error Boundary Pattern
```typescript
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

## State Management Patterns

### Context Provider Pattern
```typescript
interface ContextState {
  data: DataType[];
  loading: boolean;
  error: Error | null;
}

interface ContextValue extends ContextState {
  updateData: (data: DataType[]) => void;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<ContextValue | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ContextState>({
    data: [],
    loading: false,
    error: null
  });
  
  const updateData = useCallback((data: DataType[]) => {
    setState(prev => ({ ...prev, data }));
  }, []);
  
  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await fetchData();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error }));
    }
  }, []);
  
  return (
    <DataContext.Provider value={{ ...state, updateData, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
```

## TypeScript Patterns

### Interface Definitions
```typescript
// Base interfaces
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended interfaces
interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Type unions
type UserRole = 'admin' | 'teacher' | 'student';

// Generic types
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Utility types
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

## CSS/Tailwind Patterns

### Component Styling
```typescript
// Using cn() for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  {
    "active": isActive,
    "disabled": isDisabled
  }
)} />

// Consistent spacing
<div className="space-y-4">
  <Card className="p-6">
    <CardHeader className="pb-4">
      <CardTitle>Title</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {/* Content */}
    </CardContent>
  </Card>
</div>
```

## Testing Patterns

### Component Test
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComponentName from './ComponentName';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName prop1="test" />, { wrapper });
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interaction', async () => {
    render(<ComponentName prop1="test" />, { wrapper });
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Updated Text')).toBeInTheDocument();
    });
  });
});
```

## File Naming Conventions

```
components/
  ComponentName.tsx           # PascalCase for components
  ComponentName.test.tsx      # Test files
  ComponentName.types.ts      # Type definitions

hooks/
  useCustomHook.ts           # camelCase with 'use' prefix

services/
  serviceName.service.ts     # camelCase with .service suffix

utils/
  utilityFunction.ts         # camelCase for utilities

pages/
  PageName.tsx               # PascalCase for pages
```

## Import Organization

```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party imports
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 3. UI component imports
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 4. Local component imports
import CustomComponent from '@/components/CustomComponent';

// 5. Service/utility imports
import { authService } from '@/services/auth.service';
import { formatCurrency } from '@/utils/format';

// 6. Type imports
import type { User, Student } from '@/types';

// 7. Style imports
import './styles.css';
```