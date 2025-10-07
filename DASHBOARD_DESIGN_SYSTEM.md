# Kool-Skool Dashboard Design System Documentation

## Overview
This document captures the visual design language and styling approach of the Kool-Skool V2 Dashboard to ensure consistency across all platforms, including the mobile app.

---

## Color Palette

### Background & Base Colors
- **Primary Background**: Dark navy blue (`#0a0e27` / `hsl(228, 60%, 6%)`)
- **Secondary Background**: Slightly lighter dark blue for cards
- **Gradient Overlays**: `from-primary/5 via-transparent to-purple-500/5`

### Accent Colors
- **Primary Brand**: Blue (`text-primary`, `bg-primary`)
- **Success/Revenue**: Green (`text-green-500`)
- **Active/Students**: Blue (`text-blue-500`)
- **Sessions/Calendar**: Purple (`text-purple-500`)
- **Growth/Trending**: Orange (`text-orange-500`)
- **Warning**: Yellow/Amber (`text-yellow-500`, `text-amber-500`)
- **Error/Urgent**: Red (`text-red-500`)

### Glass Morphism Effect
```css
.glass-card {
  background: rgba(255, 255, 255, 0.02) to rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-card-hover:hover {
  background: rgba(255, 255, 255, 0.05) to rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transform: scale(1.02);
}
```

---

## Typography

### Font Family
- **Primary**: System font stack (San Francisco on iOS/macOS, Roboto on Android, Segoe UI on Windows)
- **Monospace**: For shortcuts and code

### Heading Styles
```css
/* Main Heading */
h1 {
  font-size: 2.5rem - 3rem (40px - 48px);
  font-weight: 700 (bold);
  background: linear-gradient(to right, primary, purple-500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Section Headings */
h2 {
  font-size: 1.25rem - 1.5rem (20px - 24px);
  font-weight: 600 (semibold);
  color: foreground;
}

/* Card Titles */
h3 {
  font-size: 0.875rem - 1rem (14px - 16px);
  font-weight: 600 (semibold);
  color: foreground;
}
```

### Text Styles
- **Body Text**: `text-sm` or `text-base` (14px - 16px)
- **Muted Text**: `text-muted-foreground` (reduced opacity)
- **Small Text**: `text-xs` (12px)
- **Tiny Text**: `text-[10px]` (10px)

---

## Spacing & Layout

### Grid System
- **Desktop**: `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`
- **Tablet**: `md:grid-cols-2`
- **Mobile**: `grid-cols-1` or `grid-cols-2` for compact items
- **Gap**: `gap-4` (1rem / 16px) or `gap-6` (1.5rem / 24px)

### Padding
- **Cards**: `p-4` (1rem / 16px) to `p-6` (1.5rem / 24px)
- **Sections**: `py-6` or `py-8` (1.5rem - 2rem)
- **Page Container**: `px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16`

### Border Radius
- **Small Elements**: `rounded-lg` (0.5rem / 8px)
- **Cards**: `rounded-xl` (0.75rem / 12px)
- **Large Cards**: `rounded-2xl` (1rem / 16px)
- **Buttons**: `rounded-lg` to `rounded-full`

---

## Components

### 1. Stats Cards
```
Structure:
- Icon in colored background (p-2, rounded-lg, bg-{color}-500/10)
- Large number (text-2xl, font-bold)
- Label (text-xs, text-muted-foreground)
- Optional trend indicator (+2%, +15%)

Colors by Type:
- Revenue: Green (bg-green-500/10, text-green-500)
- Students: Blue (bg-blue-500/10, text-blue-500)
- Sessions: Purple (bg-purple-500/10, text-purple-500)
- Growth: Orange (bg-orange-500/10, text-orange-500)
```

### 2. Search Bar
```
Features:
- Large, prominent with glow effect on hover
- Glass morphism background (bg-background/60, backdrop-blur-xl)
- Gradient border on hover (from-primary/20 to-purple-500/20)
- Icon on left (Search)
- Keyboard shortcut badge on right (⌘K or Ctrl+K)
- Scale animation on hover (scale-[1.02])
- Rounded-2xl corners
```

### 3. Quick Actions
```
Layout:
- Grid of action cards (4 columns on desktop, 2 on mobile)
- Each card has:
  - Colored icon background (p-3, rounded-lg)
  - Action label (text-xs, font-medium)
  - Sublabel (text-[10px], text-muted-foreground)
  - Hover shortcut badge (top-right, appears on hover)

Interaction:
- Hover: scale-[1.02], enhanced shadow
- Active: scale-[0.98]
- Border glow on hover
```

### 4. Live Updates Bar
```
Style:
- Horizontal scroll of metrics
- Green dot indicator (animate-pulse)
- Inline stats with icons
- Badge for urgent items (bg-red-500, text-white)
```

### 5. Business Health Monitor
```
Layout:
- Horizontal row of metric cards
- Each shows:
  - Icon (colored)
  - Metric name
  - Value/status
  - Trend arrow (up/down)

Colors:
- Revenue: Green
- Expenses: Red
- Students: Blue/Purple
- Sessions: Purple
- Health Score: Green/Yellow/Red based on status
```

### 6. Widget Cards
```
Common Structure:
- Glass card background
- Header with icon + title
- Optional badge (item count)
- Scrollable content area (ScrollArea with max-height)
- Action buttons with icons

Examples:
- Urgent Actions (Amber icon, priority badges)
- Today's Focus (Calendar icon, time slots)
- Cash Flow (Dollar icon, transaction list)
- Past Sessions (Session list with quick actions)
```

---

## Interactions & Animations

### Hover Effects
```css
/* Cards */
.hover-card {
  transition: all 0.2s ease-in-out;
}
.hover-card:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Buttons */
.hover-button {
  transition: all 0.2s ease-in-out;
}
.hover-button:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

### Loading States
- Skeleton: `animate-pulse`, `bg-white/5`
- Spinner: `animate-spin`

### Transitions
- **Default**: `transition-all duration-200` or `duration-300`
- **Smooth entrance**: `animate-fade-in`

---

## Icons

### Style
- **Size**: `h-4 w-4` (16px) for most UI, `h-5 w-5` (20px) for emphasis
- **Stroke Width**: Default (lucide-react icons)
- **Colors**: Match parent context or use accent colors

### Common Icons
- **Revenue**: DollarSign
- **Students**: Users, UserPlus
- **Sessions**: Calendar
- **Growth**: TrendingUp, BarChart3
- **Actions**: CheckSquare, ClipboardList, Send
- **Navigation**: ChevronRight, ArrowRight
- **Status**: Check, X, AlertCircle, AlertTriangle

---

## Badges & Pills

### Status Badges
```
- Priority: bg-red-500/10, text-red-500, border-red-500/20
- High: bg-orange-500/10, text-orange-500, border-orange-500/20
- Medium: bg-yellow-500/10, text-yellow-500, border-yellow-500/20
- Success: bg-green-500/10, text-green-500, border-green-500/20
```

### Count Badges
```
- Small circular (h-5, px-2, rounded-full)
- Background: bg-white/10
- Text: text-xs, text-foreground
```

---

## Responsive Breakpoints

```
sm: 640px   (tablets portrait)
md: 768px   (tablets landscape)
lg: 1024px  (laptops)
xl: 1280px  (desktops)
2xl: 1536px (large desktops)
```

### Mobile-First Approach
- Start with mobile layout (`grid-cols-1`)
- Add responsive classes (`md:grid-cols-2`, `lg:grid-cols-3`)
- Hide/show elements conditionally (`hidden md:block`)

---

## Mobile App Adaptations

### Key Principles for Native Mobile App

1. **Touch-First Interactions**
   - Minimum tap target: 44x44pt (iOS) / 48x48dp (Android)
   - Increase padding for touch comfort
   - Add haptic feedback on interactions

2. **Navigation**
   - Bottom tab bar for main navigation (not sidebar)
   - Swipe gestures for common actions
   - Pull-to-refresh for data updates
   - Modal sheets for secondary actions

3. **Layout Adjustments**
   - Full-width cards (reduce horizontal margins)
   - Vertical stack for most content
   - Collapsible sections for dense information
   - Floating action button (FAB) for primary action

4. **Performance**
   - Lazy load images and heavy components
   - Use native list components (FlatList, RecyclerView)
   - Optimize animations (use native drivers)
   - Cache frequently accessed data

5. **Platform-Specific Features**
   - iOS: Large navigation titles, SF Symbols, swipe back
   - Android: Material Design 3, FAB, bottom sheets
   - Both: System-level dark mode support, biometric auth

6. **Simplified Quick Actions**
   - Bottom sheet with grid of actions (similar to current)
   - Large touch targets with icons
   - Quick action FAB menu (speed dial)

7. **Stats Display**
   - Horizontal scrollable carousel for top metrics
   - Card-based layout for detailed stats
   - Pull-to-refresh for live updates
   - Inline charts (simplified from desktop)

8. **Typography Scaling**
   - Support Dynamic Type (iOS) / Font Scaling (Android)
   - Larger minimum font sizes (16px base)
   - Better contrast ratios for outdoor readability

---

## Color Values Reference

### Exact Colors from Dashboard

```javascript
// Background
--background: hsl(228, 60%, 6%);           // #0a0e27
--card-bg: rgba(255, 255, 255, 0.02);

// Borders
--border: rgba(255, 255, 255, 0.1);
--border-hover: rgba(255, 255, 255, 0.2);

// Text
--foreground: hsl(0, 0%, 98%);             // Near white
--muted-foreground: hsl(0, 0%, 60%);       // Grayed out

// Accent Colors (use CSS variables or Tailwind classes)
--blue-500: #3b82f6;
--green-500: #10b981;
--purple-500: #8b5cf6;
--orange-500: #f97316;
--red-500: #ef4444;
--yellow-500: #eab308;
--amber-500: #f59e0b;
```

---

## Design Files & Assets

### Recommended Tools
- **Figma**: For mobile UI mockups (based on this design system)
- **React Native**: For cross-platform mobile app (iOS + Android)
- **Expo**: For rapid development and deployment
- **NativeWind**: Tailwind CSS for React Native (maintains consistency)

### Asset Export Guidelines
- Icons: SVG or use react-native-vector-icons
- Images: @1x, @2x, @3x for iOS; mdpi, hdpi, xhdpi, xxhdpi for Android
- Colors: Use design tokens (shared with web)

---

## Implementation Notes

### Current Tech Stack (Web)
- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **UI Library**: Radix UI primitives
- **Icons**: Lucide React
- **Animations**: Tailwind transitions + CSS animations

### Recommended Mobile Tech Stack
- **Framework**: React Native + TypeScript
- **Styling**: NativeWind (Tailwind for React Native)
- **UI Library**: React Native Paper or custom components
- **Navigation**: React Navigation
- **Icons**: react-native-vector-icons or Expo Icons
- **Animations**: Reanimated 2
- **State Management**: Same as web (React Context + hooks)

### Shared Code Potential
- Business logic (services, API calls)
- Type definitions (TypeScript interfaces)
- Utilities (date formatting, calculations)
- Design tokens (colors, spacing, typography)

---

## Next Steps for Mobile App

1. **Design Phase**
   - Create Figma mockups adapting this design system
   - Define mobile-specific navigation flow
   - Design bottom tab bar and floating actions
   - Create mobile components library

2. **Development Setup**
   - Initialize React Native / Expo project
   - Set up NativeWind for styling consistency
   - Create shared design token system
   - Implement authentication flow

3. **Core Features (MVP)**
   - Dashboard overview (stats + quick actions)
   - Student list and details
   - Calendar/Schedule view
   - Attendance marking
   - Payment recording
   - Push notifications for urgent actions

4. **Polish & Launch**
   - Implement haptic feedback
   - Add animations and transitions
   - Optimize performance
   - Test on physical devices
   - Submit to App Store + Play Store

---

## References

- Dashboard Live URL: TBD
- Web App Repo: [Current Repository]
- Mobile App Repo: TBD
- Design System Figma: TBD

---

**Document Version**: 1.0
**Last Updated**: October 1, 2025
**Maintained By**: Ahmed + Claude Code Team
