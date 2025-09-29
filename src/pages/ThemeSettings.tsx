import React, { useState, useEffect } from 'react';
import { Palette, Check, Moon, Sun, Laptop } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  colors: {
    primary: string;
    background: string;
    foreground: string;
    surface: string;
    accent?: string;
  };
  cssVars: Record<string, string>;
}

const themes: ThemeOption[] = [
  {
    id: 'dark-blue',
    name: 'Dark Blue',
    description: 'Current default theme with blue accents',
    icon: Moon,
    colors: {
      primary: '#3b82f6',
      background: '#0f172a',
      foreground: '#f8fafc',
      surface: '#1e293b',
    },
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
  {
    id: 'dark-purple',
    name: 'Dark Purple',
    description: 'Elegant purple theme with violet accents',
    icon: Moon,
    colors: {
      primary: '#8b5cf6',
      background: '#0f0f1e',
      foreground: '#f8fafc',
      surface: '#1a1a2e',
    },
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
  {
    id: 'dark-green',
    name: 'Dark Green',
    description: 'Nature-inspired theme with emerald tones',
    icon: Moon,
    colors: {
      primary: '#10b981',
      background: '#0a1f1a',
      foreground: '#f0fdf4',
      surface: '#134e3a',
    },
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
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Ultra dark theme with subtle cyan accents',
    icon: Moon,
    colors: {
      primary: '#06b6d4',
      background: '#020617',
      foreground: '#f1f5f9',
      surface: '#0f172a',
    },
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
  {
    id: 'light',
    name: 'Light Mode',
    description: 'Clean light theme for daytime use',
    icon: Sun,
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      foreground: '#0f172a',
      surface: '#f8fafc',
    },
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
    }
  },
];

const ThemeSettings = () => {
  const [selectedTheme, setSelectedTheme] = useState('dark-blue');
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  useEffect(() => {
    // Load saved theme on mount
    const savedTheme = localStorage.getItem('selectedTheme') || 'dark-blue';
    setSelectedTheme(savedTheme);
    applyTheme(themes.find(t => t.id === savedTheme) || themes[0]);
  }, []);

  const applyTheme = (theme: ThemeOption) => {
    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Update body class for light/dark mode
    if (theme.id === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
  };

  const handleThemeSelect = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setSelectedTheme(themeId);
      localStorage.setItem('selectedTheme', themeId);
      applyTheme(theme);
    }
  };

  const handlePreview = (themeId: string | null) => {
    if (themeId) {
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        applyTheme(theme);
        setPreviewTheme(themeId);
      }
    } else {
      // Restore selected theme
      const theme = themes.find(t => t.id === selectedTheme);
      if (theme) {
        applyTheme(theme);
        setPreviewTheme(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Theme Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize the appearance of your dashboard
        </p>
      </div>

      <div className="grid gap-6">
        {/* Theme Selection Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Choose Your Theme
            </CardTitle>
            <CardDescription>
              Select a theme that suits your preference. Changes are applied instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((theme) => {
                const Icon = theme.icon;
                const isSelected = selectedTheme === theme.id;
                const isPreviewing = previewTheme === theme.id;

                return (
                  <div
                    key={theme.id}
                    className={cn(
                      "relative rounded-lg border-2 transition-all cursor-pointer",
                      isSelected ? "border-primary shadow-lg" : "border-border hover:border-primary/50",
                      isPreviewing && !isSelected && "border-primary/70"
                    )}
                    onClick={() => handleThemeSelect(theme.id)}
                    onMouseEnter={() => handlePreview(theme.id)}
                    onMouseLeave={() => handlePreview(null)}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">{theme.name}</h3>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">
                        {theme.description}
                      </p>

                      {/* Color Preview */}
                      <div className="flex gap-2">
                        <div
                          className="w-8 h-8 rounded-md border"
                          style={{ backgroundColor: theme.colors.background }}
                          title="Background"
                        />
                        <div
                          className="w-8 h-8 rounded-md border"
                          style={{ backgroundColor: theme.colors.surface }}
                          title="Surface"
                        />
                        <div
                          className="w-8 h-8 rounded-md border"
                          style={{ backgroundColor: theme.colors.primary }}
                          title="Primary"
                        />
                        {theme.colors.accent && (
                          <div
                            className="w-8 h-8 rounded-md border"
                            style={{ backgroundColor: theme.colors.accent }}
                            title="Accent"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Live Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              See how different elements look with your selected theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Button>Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
              </div>

              <div className="space-y-3">
                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Sample Card</h4>
                  <p className="text-sm text-muted-foreground">
                    This is how cards look with the selected theme.
                  </p>
                </Card>

                <div className="flex gap-2">
                  <div className="bg-success/20 text-success px-3 py-1 rounded-md text-sm">
                    Success
                  </div>
                  <div className="bg-warning/20 text-warning px-3 py-1 rounded-md text-sm">
                    Warning
                  </div>
                  <div className="bg-destructive/20 text-destructive px-3 py-1 rounded-md text-sm">
                    Error
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Theme Option */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />
              Advanced Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Follow System Theme</p>
                <p className="text-sm text-muted-foreground">
                  Automatically switch between light and dark themes based on your system settings
                </p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThemeSettings;