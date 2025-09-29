import { Layout, Layouts } from 'react-grid-layout';

export interface WidgetConfig {
  id: string;
  component: string;
  title: string;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isResizable?: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  layouts: Layouts;
  widgets: WidgetConfig[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class DashboardLayoutService {
  private readonly STORAGE_KEY = 'dashboard_layouts';
  private readonly ACTIVE_LAYOUT_KEY = 'active_dashboard_layout';
  private readonly DEFAULT_BREAKPOINTS = {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0
  };

  private readonly DEFAULT_COLS = {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2
  };

  /**
   * Get default widget configurations
   */
  getDefaultWidgets(): WidgetConfig[] {
    return [
      {
        id: 'quick-actions',
        component: 'QuickActionsBar',
        title: 'Quick Actions',
        minW: 4,
        minH: 1,
        isResizable: false
      },
      {
        id: 'business-health',
        component: 'BusinessHealthMonitor',
        title: 'Business Health',
        minW: 4,
        minH: 2,
        isResizable: true
      },
      {
        id: 'urgent-actions',
        component: 'UrgentActionsWidget',
        title: 'Urgent Actions',
        minW: 3,
        minH: 3,
        isResizable: true
      },
      {
        id: 'todays-focus',
        component: 'TodaysFocusWidget',
        title: "Today's Focus",
        minW: 3,
        minH: 3,
        isResizable: true
      },
      {
        id: 'insights',
        component: 'InsightsWidget',
        title: 'AI Insights',
        minW: 4,
        minH: 3,
        isResizable: true
      },
      {
        id: 'revenue-chart',
        component: 'RevenueExpensesChart',
        title: 'Revenue & Expenses',
        minW: 4,
        minH: 3,
        isResizable: true
      },
      {
        id: 'new-students',
        component: 'NewStudentsStats',
        title: 'New Students',
        minW: 3,
        minH: 2,
        isResizable: true
      },
      {
        id: 'live-updates',
        component: 'LiveUpdatesIndicator',
        title: 'Live Updates',
        minW: 12,
        minH: 1,
        maxH: 1,
        isResizable: false
      },
      {
        id: 'recent-students',
        component: 'RecentStudents',
        title: 'Recent Students',
        minW: 6,
        minH: 3,
        isResizable: true
      },
      {
        id: 'upcoming-lessons',
        component: 'UpcomingLessons',
        title: 'Upcoming Lessons',
        minW: 3,
        minH: 3,
        isResizable: true
      },
      {
        id: 'upcoming-payments',
        component: 'UpcomingPayments',
        title: 'Upcoming Payments',
        minW: 3,
        minH: 3,
        isResizable: true
      }
    ];
  }

  /**
   * Get default layout configuration
   */
  getDefaultLayout(): Layouts {
    return {
      lg: [
        { i: 'live-updates', x: 0, y: 0, w: 12, h: 1, static: true },
        { i: 'quick-actions', x: 0, y: 1, w: 12, h: 1, static: true },
        { i: 'business-health', x: 0, y: 2, w: 12, h: 2 },
        { i: 'urgent-actions', x: 0, y: 4, w: 4, h: 4 },
        { i: 'todays-focus', x: 4, y: 4, w: 4, h: 4 },
        { i: 'insights', x: 8, y: 4, w: 4, h: 4 },
        { i: 'revenue-chart', x: 0, y: 8, w: 8, h: 3 },
        { i: 'new-students', x: 8, y: 8, w: 4, h: 3 },
        { i: 'recent-students', x: 0, y: 11, w: 8, h: 3 },
        { i: 'upcoming-lessons', x: 8, y: 11, w: 4, h: 3 },
        { i: 'upcoming-payments', x: 8, y: 14, w: 4, h: 3 }
      ],
      md: [
        { i: 'live-updates', x: 0, y: 0, w: 10, h: 1, static: true },
        { i: 'quick-actions', x: 0, y: 1, w: 10, h: 1, static: true },
        { i: 'business-health', x: 0, y: 2, w: 10, h: 2 },
        { i: 'urgent-actions', x: 0, y: 4, w: 5, h: 4 },
        { i: 'todays-focus', x: 5, y: 4, w: 5, h: 4 },
        { i: 'insights', x: 0, y: 8, w: 10, h: 3 },
        { i: 'revenue-chart', x: 0, y: 11, w: 6, h: 3 },
        { i: 'new-students', x: 6, y: 11, w: 4, h: 3 },
        { i: 'recent-students', x: 0, y: 14, w: 6, h: 3 },
        { i: 'upcoming-lessons', x: 6, y: 14, w: 4, h: 3 },
        { i: 'upcoming-payments', x: 6, y: 17, w: 4, h: 3 }
      ],
      sm: [
        { i: 'live-updates', x: 0, y: 0, w: 6, h: 1, static: true },
        { i: 'quick-actions', x: 0, y: 1, w: 6, h: 2, static: true },
        { i: 'business-health', x: 0, y: 3, w: 6, h: 2 },
        { i: 'urgent-actions', x: 0, y: 5, w: 6, h: 4 },
        { i: 'todays-focus', x: 0, y: 9, w: 6, h: 4 },
        { i: 'insights', x: 0, y: 13, w: 6, h: 3 },
        { i: 'revenue-chart', x: 0, y: 16, w: 6, h: 3 },
        { i: 'new-students', x: 0, y: 19, w: 6, h: 3 },
        { i: 'recent-students', x: 0, y: 22, w: 6, h: 3 },
        { i: 'upcoming-lessons', x: 0, y: 25, w: 6, h: 3 },
        { i: 'upcoming-payments', x: 0, y: 28, w: 6, h: 3 }
      ],
      xs: [
        { i: 'live-updates', x: 0, y: 0, w: 4, h: 1, static: true },
        { i: 'quick-actions', x: 0, y: 1, w: 4, h: 2, static: true },
        { i: 'business-health', x: 0, y: 3, w: 4, h: 2 },
        { i: 'urgent-actions', x: 0, y: 5, w: 4, h: 4 },
        { i: 'todays-focus', x: 0, y: 9, w: 4, h: 4 },
        { i: 'insights', x: 0, y: 13, w: 4, h: 3 },
        { i: 'revenue-chart', x: 0, y: 16, w: 4, h: 3 },
        { i: 'new-students', x: 0, y: 19, w: 4, h: 3 },
        { i: 'recent-students', x: 0, y: 22, w: 4, h: 3 },
        { i: 'upcoming-lessons', x: 0, y: 25, w: 4, h: 3 },
        { i: 'upcoming-payments', x: 0, y: 28, w: 4, h: 3 }
      ],
      xxs: [
        { i: 'live-updates', x: 0, y: 0, w: 2, h: 1, static: true },
        { i: 'quick-actions', x: 0, y: 1, w: 2, h: 2, static: true },
        { i: 'business-health', x: 0, y: 3, w: 2, h: 2 },
        { i: 'urgent-actions', x: 0, y: 5, w: 2, h: 4 },
        { i: 'todays-focus', x: 0, y: 9, w: 2, h: 4 },
        { i: 'insights', x: 0, y: 13, w: 2, h: 3 },
        { i: 'revenue-chart', x: 0, y: 16, w: 2, h: 3 },
        { i: 'new-students', x: 0, y: 19, w: 2, h: 3 },
        { i: 'recent-students', x: 0, y: 22, w: 2, h: 3 },
        { i: 'upcoming-lessons', x: 0, y: 25, w: 2, h: 3 },
        { i: 'upcoming-payments', x: 0, y: 28, w: 2, h: 3 }
      ]
    };
  }

  /**
   * Save layout to localStorage
   */
  saveLayout(layout: DashboardLayout): void {
    const layouts = this.getAllLayouts();
    const existingIndex = layouts.findIndex(l => l.id === layout.id);

    if (existingIndex >= 0) {
      layouts[existingIndex] = {
        ...layout,
        updatedAt: new Date()
      };
    } else {
      layouts.push({
        ...layout,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layouts));
  }

  /**
   * Get all saved layouts
   */
  getAllLayouts(): DashboardLayout[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    try {
      const layouts = JSON.parse(stored);
      return layouts.map((layout: any) => ({
        ...layout,
        createdAt: new Date(layout.createdAt),
        updatedAt: new Date(layout.updatedAt)
      }));
    } catch (error) {
      console.error('Error parsing layouts:', error);
      return [];
    }
  }

  /**
   * Get layout by ID
   */
  getLayout(id: string): DashboardLayout | null {
    const layouts = this.getAllLayouts();
    return layouts.find(l => l.id === id) || null;
  }

  /**
   * Delete layout
   */
  deleteLayout(id: string): void {
    const layouts = this.getAllLayouts();
    const filtered = layouts.filter(l => l.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Get active layout ID
   */
  getActiveLayoutId(): string | null {
    return localStorage.getItem(this.ACTIVE_LAYOUT_KEY);
  }

  /**
   * Set active layout ID
   */
  setActiveLayout(id: string): void {
    localStorage.setItem(this.ACTIVE_LAYOUT_KEY, id);
  }

  /**
   * Get active layout or default
   */
  getActiveLayout(): DashboardLayout {
    const activeId = this.getActiveLayoutId();
    if (activeId) {
      const layout = this.getLayout(activeId);
      if (layout) return layout;
    }

    // Return default layout
    return {
      id: 'default',
      name: 'Default Layout',
      layouts: this.getDefaultLayout(),
      widgets: this.getDefaultWidgets(),
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Reset to default layout
   */
  resetToDefault(): void {
    localStorage.removeItem(this.ACTIVE_LAYOUT_KEY);
  }

  /**
   * Export layout as JSON
   */
  exportLayout(id: string): string | null {
    const layout = this.getLayout(id);
    if (!layout) return null;
    return JSON.stringify(layout, null, 2);
  }

  /**
   * Import layout from JSON
   */
  importLayout(jsonString: string, newId?: string): boolean {
    try {
      const layout = JSON.parse(jsonString);
      if (newId) layout.id = newId;
      this.saveLayout(layout);
      return true;
    } catch (error) {
      console.error('Error importing layout:', error);
      return false;
    }
  }

  /**
   * Get breakpoints configuration
   */
  getBreakpoints() {
    return this.DEFAULT_BREAKPOINTS;
  }

  /**
   * Get columns configuration
   */
  getCols() {
    return this.DEFAULT_COLS;
  }
}

export const dashboardLayoutService = new DashboardLayoutService();