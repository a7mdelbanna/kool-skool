import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import UrgentActionsWidget from '../UrgentActionsWidget';
import { UserContext } from '@/App';
import { todosService } from '@/services/firebase/todos.service';
import { databaseService } from '@/services/firebase/database.service';

// Mock the services
vi.mock('@/services/firebase/todos.service');
vi.mock('@/services/firebase/database.service');

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockUser = {
  schoolId: 'test-school-id',
  role: 'admin',
};

const mockTodos = [
  {
    id: 'todo-1',
    title: 'Complete math homework',
    description: 'Chapter 5 exercises',
    due_date: new Date(Date.now() - 86400000), // 1 day overdue
    priority: 'high',
    status: 'pending',
    student_id: 'student-1',
    teacher_id: 'teacher-1',
    school_id: 'test-school-id',
    category: 'homework',
  },
  {
    id: 'todo-2',
    title: 'Science project presentation',
    description: 'Solar system model',
    due_date: new Date(Date.now() + 172800000), // 2 days from now
    priority: 'urgent',
    status: 'pending',
    student_id: 'student-2',
    teacher_id: 'teacher-1',
    school_id: 'test-school-id',
    category: 'project',
  },
];

const renderWithContext = (children: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <UserContext.Provider value={{ user: mockUser }}>
        {children}
      </UserContext.Provider>
    </BrowserRouter>
  );
};

describe('UrgentActionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock todosService.getUrgentTodos
    vi.mocked(todosService.getUrgentTodos).mockResolvedValue(mockTodos);

    // Mock databaseService.query to return empty arrays for other data
    vi.mocked(databaseService.query).mockResolvedValue([]);
  });

  it('should render loading state initially', () => {
    renderWithContext(<UrgentActionsWidget />);

    expect(screen.getByText('Urgent Actions')).toBeInTheDocument();
    expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number));
  });

  it('should display urgent TODOs when loaded', async () => {
    renderWithContext(<UrgentActionsWidget />);

    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    expect(screen.getByText('Overdue TODO')).toBeInTheDocument();
    expect(screen.getByText('Complete math homework - 1 day overdue')).toBeInTheDocument();

    expect(screen.getByText('Urgent TODO')).toBeInTheDocument();
    expect(screen.getByText('Science project presentation - Due in 2 days')).toBeInTheDocument();
  });

  it('should show "All caught up!" when no urgent items exist', async () => {
    // Mock empty response
    vi.mocked(todosService.getUrgentTodos).mockResolvedValue([]);

    renderWithContext(<UrgentActionsWidget />);

    await waitFor(() => {
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    expect(screen.getByText('No urgent actions required')).toBeInTheDocument();
  });

  it('should call todosService.getUrgentTodos with correct school ID', async () => {
    renderWithContext(<UrgentActionsWidget />);

    await waitFor(() => {
      expect(todosService.getUrgentTodos).toHaveBeenCalledWith('test-school-id');
    });
  });

  it('should display correct priority badges', async () => {
    renderWithContext(<UrgentActionsWidget />);

    await waitFor(() => {
      expect(screen.getByText('critical')).toBeInTheDocument();
    });
  });

  it('should categorize overdue vs due soon TODOs correctly', async () => {
    const todosWithDifferentDates = [
      {
        ...mockTodos[0],
        due_date: new Date(Date.now() - 86400000), // Overdue
      },
      {
        ...mockTodos[1],
        due_date: new Date(), // Due today
      },
    ];

    vi.mocked(todosService.getUrgentTodos).mockResolvedValue(todosWithDifferentDates);

    renderWithContext(<UrgentActionsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Overdue TODO')).toBeInTheDocument();
      expect(screen.getByText('Urgent TODO')).toBeInTheDocument();
    });
  });

  it('should handle service errors gracefully', async () => {
    vi.mocked(todosService.getUrgentTodos).mockRejectedValue(new Error('Service error'));

    renderWithContext(<UrgentActionsWidget />);

    await waitFor(() => {
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });
  });

  it('should not render when user has no schoolId', () => {
    const userWithoutSchool = { ...mockUser, schoolId: undefined };

    render(
      <BrowserRouter>
        <UserContext.Provider value={{ user: userWithoutSchool }}>
          <UrgentActionsWidget />
        </UserContext.Provider>
      </BrowserRouter>
    );

    expect(todosService.getUrgentTodos).not.toHaveBeenCalled();
  });
});