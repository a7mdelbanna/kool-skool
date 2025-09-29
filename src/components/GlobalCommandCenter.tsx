import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  User,
  Calendar,
  DollarSign,
  BookOpen,
  Users,
  Home,
  CheckSquare,
  ClipboardList,
  BarChart3,
  TrendingUp,
  UserPlus,
  CreditCard,
  Search,
  Clock,
  ArrowRight,
  Sparkles,
  Hash,
  AtSign,
  Slash
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { searchService, SearchResult } from '@/services/search.service';
import { UserContext } from '@/App';
import { useKeyboardShortcutListener, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import AddStudentDialog from '@/components/AddStudentDialog';
import PaymentDialog from '@/components/PaymentDialog';
import { cn } from '@/lib/utils';

const iconMap: { [key: string]: any } = {
  User,
  Users,
  Calendar,
  DollarSign,
  BookOpen,
  Home,
  CheckSquare,
  ClipboardList,
  BarChart3,
  TrendingUp,
  UserPlus,
  CreditCard
};

const GlobalCommandCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);

  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Listen for keyboard shortcut to open
  useKeyboardShortcutListener('openGlobalSearch', () => setOpen(true));
  useKeyboardShortcutListener('createNewStudent', () => setShowStudentDialog(true));
  useKeyboardShortcutListener('scheduleLesson', () => navigate('/calendar'));
  useKeyboardShortcutListener('recordPayment', () => setShowPaymentDialog(true));

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(searchService.getHistory());
  }, []);

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!user?.schoolId) return;

    setSearch(query);
    setLoading(true);

    try {
      if (query.length < 2) {
        setResults(searchService.getHistory());
      } else {
        // Check for natural language queries
        const isNaturalLanguage = query.split(' ').length > 2;
        const searchResults = isNaturalLanguage
          ? await searchService.naturalLanguageSearch(query, user.schoolId)
          : await searchService.search(query, { schoolId: user.schoolId });

        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        performSearch(search);
      } else {
        setResults(recentSearches);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, performSearch, recentSearches]);

  // Handle result selection
  const handleSelect = (result: SearchResult) => {
    // Add to history
    searchService.addToHistory(result);

    // Handle different result types
    switch (result.type) {
      case 'student':
        navigate(`/students/${result.id}`);
        break;
      case 'lesson':
        navigate('/calendar');
        break;
      case 'payment':
        navigate('/payments');
        break;
      case 'page':
        const pageId = result.id.replace('page-', '');
        navigate(`/${pageId === 'dashboard' ? '' : pageId}`);
        break;
      case 'action':
        handleAction(result.id);
        break;
      default:
        break;
    }

    setOpen(false);
    setSearch('');
  };

  // Handle quick actions
  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'action-add-student':
        setShowStudentDialog(true);
        break;
      case 'action-schedule-lesson':
        navigate('/calendar');
        break;
      case 'action-record-payment':
        setShowPaymentDialog(true);
        break;
      case 'action-mark-attendance':
        navigate('/attendance');
        break;
      default:
        break;
    }
  };

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Search;
    return iconMap[iconName] || Search;
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search students, lessons, payments, or type a command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              <AtSign className="h-3 w-3 mr-1" />
              Students
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Hash className="h-3 w-3 mr-1" />
              Lessons
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              Payments
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Slash className="h-3 w-3 mr-1" />
              Pages
            </Badge>
          </div>
        </div>

        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && search && (
            <CommandEmpty>
              No results found for "{search}"
              <div className="mt-2 text-xs text-muted-foreground">
                Try: "overdue payments", "today's lessons", or "new students"
              </div>
            </CommandEmpty>
          )}

          {!loading && !search && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.slice(0, 5).map((result) => {
                const Icon = getIcon(result.icon);
                return (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        result.type === 'student' ? "bg-blue-500/10 text-blue-500" :
                        result.type === 'lesson' ? "bg-green-500/10 text-green-500" :
                        result.type === 'payment' ? "bg-purple-500/10 text-purple-500" :
                        result.type === 'action' ? "bg-orange-500/10 text-orange-500" :
                        "bg-gray-500/10 text-gray-500"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.meta && (
                        <span className="text-xs text-muted-foreground">{result.meta}</span>
                      )}
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {!loading && results.length > 0 && search && (
            <>
              {/* Quick Actions */}
              {results.filter(r => r.type === 'action').length > 0 && (
                <CommandGroup heading="Quick Actions">
                  {results.filter(r => r.type === 'action').map((result) => {
                    const Icon = getIcon(result.icon);
                    return (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                            )}
                          </div>
                        </div>
                        {result.meta && <CommandShortcut>{result.meta}</CommandShortcut>}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* Navigation Pages */}
              {results.filter(r => r.type === 'page').length > 0 && (
                <>
                  {results.filter(r => r.type === 'action').length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Navigation">
                    {results.filter(r => r.type === 'page').map((result) => {
                      const Icon = getIcon(result.icon);
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-500/10 text-gray-500">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{result.title}</div>
                              {result.subtitle && (
                                <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {/* Students */}
              {results.filter(r => r.type === 'student').length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Students">
                    {results.filter(r => r.type === 'student').map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{result.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.subtitle} • {result.meta}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Lessons */}
              {results.filter(r => r.type === 'lesson').length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Lessons">
                    {results.filter(r => r.type === 'lesson').map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{result.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.subtitle} • {result.meta}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Payments */}
              {results.filter(r => r.type === 'payment').length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Payments">
                    {results.filter(r => r.type === 'payment').map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{result.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.subtitle} • {result.meta}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}

          {/* AI Suggestions */}
          {!search && (
            <>
              <CommandSeparator />
              <CommandGroup heading="AI Suggestions">
                <CommandItem
                  onSelect={() => setSearch("overdue payments")}
                  className="flex items-center gap-3"
                >
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Show overdue payments</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => setSearch("today's lessons")}
                  className="flex items-center gap-3"
                >
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">View today's lessons</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => setSearch("students without lessons this week")}
                  className="flex items-center gap-3"
                >
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Students without lessons this week</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>

        <div className="border-t px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↑↓</kbd>
              <span>Navigate</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted ml-2">↵</kbd>
              <span>Select</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted ml-2">Esc</kbd>
              <span>Close</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">{formatShortcut({ key: '/', shiftKey: true })}</kbd>
              <span>Help</span>
            </div>
          </div>
        </div>
      </CommandDialog>

      {/* Dialogs for actions */}
      <AddStudentDialog
        open={showStudentDialog}
        onOpenChange={setShowStudentDialog}
        onStudentAdded={(student) => {
          setShowStudentDialog(false);
          toast.success(`Student ${student.firstName} ${student.lastName} added successfully`);
        }}
      />

      {showPaymentDialog && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          onSuccess={() => {
            setShowPaymentDialog(false);
            toast.success('Payment recorded successfully');
          }}
        />
      )}
    </>
  );
};

export default GlobalCommandCenter;