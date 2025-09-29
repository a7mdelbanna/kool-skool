// Theme configuration and management service

export interface ThemeConfig {
  id: string;
  cssVars: Record<string, string>;
}

// Define all theme configurations
export const themes: Record<string, ThemeConfig> = {
  'dark-blue': {
    id: 'dark-blue',
    cssVars: {
      '--primary': '217 91% 60%',
      '--primary-hover': '217 91% 65%',
      '--primary-foreground': '210 40% 98%',
      '--background': '222 47% 11%',
      '--foreground': '210 40% 98%',
      '--surface': '217 33% 14%',
      '--surface-hover': '217 33% 18%',
      '--muted': '217 32% 17%',
      '--muted-foreground': '215 20% 65%',
      '--card': '217 33% 14%',
      '--card-foreground': '210 40% 98%',
      '--dialog': '217 33% 15%',
      '--border': '217 33% 20%',
      '--input': '217 33% 17%',
      '--input-hover': '217 33% 20%',
      '--input-focus': '217 33% 18%',
      '--ring': '217 91% 60%',
      '--sidebar-background': '222 47% 11%',
      '--sidebar-border': '217 33% 20%',
      '--popover': '217 33% 14%',
      '--popover-foreground': '210 40% 98%',
      '--accent': '217 33% 17%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '210 40% 98%',
      '--success': '142 76% 36%',
      '--warning': '38 92% 50%',
    }
  },
  'dark-purple': {
    id: 'dark-purple',
    cssVars: {
      '--primary': '263 70% 65%',
      '--primary-hover': '263 70% 70%',
      '--primary-foreground': '210 40% 98%',
      '--background': '240 33% 9%',
      '--foreground': '210 40% 98%',
      '--surface': '240 33% 14%',
      '--surface-hover': '240 33% 18%',
      '--muted': '240 32% 17%',
      '--muted-foreground': '240 20% 65%',
      '--card': '240 33% 14%',
      '--card-foreground': '210 40% 98%',
      '--dialog': '240 33% 15%',
      '--border': '240 33% 20%',
      '--input': '240 33% 17%',
      '--input-hover': '240 33% 20%',
      '--input-focus': '240 33% 18%',
      '--ring': '263 70% 65%',
      '--sidebar-background': '240 33% 9%',
      '--sidebar-border': '240 33% 20%',
      '--popover': '240 33% 14%',
      '--popover-foreground': '210 40% 98%',
      '--accent': '240 33% 17%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '210 40% 98%',
      '--success': '142 76% 36%',
      '--warning': '38 92% 50%',
    }
  },
  'dark-green': {
    id: 'dark-green',
    cssVars: {
      '--primary': '160 84% 39%',
      '--primary-hover': '160 84% 44%',
      '--primary-foreground': '210 40% 98%',
      '--background': '165 48% 8%',
      '--foreground': '138 76% 97%',
      '--surface': '162 47% 19%',
      '--surface-hover': '162 47% 23%',
      '--muted': '162 47% 17%',
      '--muted-foreground': '162 20% 65%',
      '--card': '162 47% 19%',
      '--card-foreground': '138 76% 97%',
      '--dialog': '162 47% 20%',
      '--border': '162 47% 25%',
      '--input': '162 47% 17%',
      '--input-hover': '162 47% 20%',
      '--input-focus': '162 47% 18%',
      '--ring': '160 84% 39%',
      '--sidebar-background': '165 48% 8%',
      '--sidebar-border': '162 47% 25%',
      '--popover': '162 47% 19%',
      '--popover-foreground': '138 76% 97%',
      '--accent': '162 47% 17%',
      '--accent-foreground': '138 76% 97%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '138 76% 97%',
      '--success': '142 76% 36%',
      '--warning': '38 92% 50%',
    }
  },
  'midnight': {
    id: 'midnight',
    cssVars: {
      '--primary': '188 91% 43%',
      '--primary-hover': '188 91% 48%',
      '--primary-foreground': '210 40% 98%',
      '--background': '222 84% 5%',
      '--foreground': '210 40% 96%',
      '--surface': '222 47% 11%',
      '--surface-hover': '222 47% 15%',
      '--muted': '222 47% 17%',
      '--muted-foreground': '215 20% 65%',
      '--card': '222 47% 11%',
      '--card-foreground': '210 40% 96%',
      '--dialog': '222 47% 12%',
      '--border': '222 47% 20%',
      '--input': '222 47% 14%',
      '--input-hover': '222 47% 17%',
      '--input-focus': '222 47% 15%',
      '--ring': '188 91% 43%',
      '--sidebar-background': '222 84% 5%',
      '--sidebar-border': '222 47% 20%',
      '--popover': '222 47% 11%',
      '--popover-foreground': '210 40% 96%',
      '--accent': '222 47% 14%',
      '--accent-foreground': '210 40% 96%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '210 40% 96%',
      '--success': '142 76% 36%',
      '--warning': '38 92% 50%',
    }
  },
  'light': {
    id: 'light',
    cssVars: {
      '--primary': '217 91% 60%',
      '--primary-hover': '217 91% 55%',
      '--primary-foreground': '0 0% 100%',
      '--background': '0 0% 100%',
      '--foreground': '222 84% 5%',
      '--surface': '210 40% 98%',
      '--surface-hover': '210 40% 96%',
      '--muted': '210 40% 96%',
      '--muted-foreground': '215 16% 47%',
      '--card': '0 0% 100%',
      '--card-foreground': '222 84% 5%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222 84% 5%',
      '--dialog': '0 0% 100%',
      '--border': '214 32% 91%',
      '--input': '214 32% 91%',
      '--input-hover': '214 32% 89%',
      '--input-focus': '0 0% 100%',
      '--ring': '217 91% 60%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '142 76% 36%',
      '--warning': '38 92% 50%',
      '--sidebar-background': '0 0% 100%',
      '--sidebar-border': '214 32% 91%',
      '--accent': '210 40% 96%',
      '--accent-foreground': '222 84% 5%',
    }
  }
};

class ThemeService {
  private static instance: ThemeService;
  private currentTheme: string = 'dark-blue';

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Initialize theme on app startup
   */
  public initializeTheme(): void {
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('selectedTheme') || 'dark-blue';
    console.log('Initializing theme:', savedTheme);

    // Apply the theme
    this.applyTheme(savedTheme);
  }

  /**
   * Apply a theme by ID
   */
  public applyTheme(themeId: string): void {
    const theme = themes[themeId];

    if (!theme) {
      console.warn(`Theme "${themeId}" not found, falling back to dark-blue`);
      this.applyTheme('dark-blue');
      return;
    }

    // Apply CSS variables
    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Update body class for light/dark mode
    if (themeId === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }

    // Save to localStorage
    localStorage.setItem('selectedTheme', themeId);
    this.currentTheme = themeId;

    console.log('Theme applied:', themeId);
  }

  /**
   * Get current theme ID
   */
  public getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * Get all available themes
   */
  public getAvailableThemes(): string[] {
    return Object.keys(themes);
  }
}

// Export singleton instance
export const themeService = ThemeService.getInstance();