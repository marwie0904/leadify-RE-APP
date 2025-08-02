# Screen Reader Support Infrastructure Design

## Overview

This document outlines the comprehensive screen reader support infrastructure for the financial dashboard application, ensuring all content and interactions are fully accessible to screen reader users.

## Architecture Overview

```
screen-reader-support/
├── core/
│   ├── AnnouncementEngine.ts    # Central announcement system
│   ├── LiveRegionManager.ts     # Live region lifecycle
│   ├── AriaController.ts        # ARIA attribute management
│   └── ScreenReaderDetector.ts  # SR detection and optimization
├── patterns/
│   ├── PageTransitions.ts       # Page change announcements
│   ├── FormFeedback.ts          # Form interaction patterns
│   ├── DataUpdates.ts           # Live data announcements
│   └── NavigationContext.ts     # Navigation announcements
├── utilities/
│   ├── TextAlternatives.ts      # Alt text generation
│   ├── DescriptionBuilder.ts    # Complex UI descriptions
│   └── ReadingOrder.ts          # Content order management
└── optimizations/
    ├── VerbosityControl.ts       # Announcement verbosity
    ├── RateLimit.ts              # Announcement throttling
    └── Priority.ts               # Priority queue management
```

## Core Components

### 1. Announcement Engine

```typescript
interface AnnouncementEngine {
  // Queue management
  queue: PriorityQueue<Announcement>;
  activeAnnouncement: Announcement | null;
  
  // Configuration
  config: AnnouncementConfig;
  
  // Methods
  announce(message: string, options?: AnnouncementOptions): Promise<void>;
  clear(): void;
  pause(): void;
  resume(): void;
  
  // Events
  on(event: 'announced', callback: (announcement: Announcement) => void): void;
  on(event: 'cleared', callback: () => void): void;
}

interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
  category: AnnouncementCategory;
  metadata?: Record<string, any>;
}

type AnnouncementCategory = 
  | 'navigation'
  | 'form'
  | 'alert'
  | 'status'
  | 'dialog'
  | 'custom';
```

### 2. Live Region Architecture

```typescript
class LiveRegionManager {
  private regions: Map<string, LiveRegion> = new Map();
  private container: HTMLElement;
  
  createRegion(config: LiveRegionConfig): LiveRegion {
    const region = new LiveRegion(config);
    this.regions.set(region.id, region);
    
    // Append to DOM
    this.container.appendChild(region.element);
    
    return region;
  }
  
  getOrCreateRegion(id: string, config?: LiveRegionConfig): LiveRegion {
    if (this.regions.has(id)) {
      return this.regions.get(id)!;
    }
    
    return this.createRegion({ id, ...config });
  }
}

class LiveRegion {
  public readonly id: string;
  public readonly element: HTMLElement;
  private config: LiveRegionConfig;
  private updateQueue: string[] = [];
  
  constructor(config: LiveRegionConfig) {
    this.id = config.id || generateId();
    this.config = config;
    this.element = this.createElement();
  }
  
  private createElement(): HTMLElement {
    const element = document.createElement('div');
    
    // Core attributes
    element.setAttribute('role', this.config.role || 'status');
    element.setAttribute('aria-live', this.config.priority || 'polite');
    element.setAttribute('aria-atomic', String(this.config.atomic ?? true));
    
    // Additional attributes
    if (this.config.relevant) {
      element.setAttribute('aria-relevant', this.config.relevant.join(' '));
    }
    
    if (this.config.label) {
      element.setAttribute('aria-label', this.config.label);
    }
    
    // Styling for invisibility
    element.className = 'sr-only';
    element.setAttribute('aria-hidden', 'false');
    
    return element;
  }
  
  update(content: string): void {
    if (this.config.debounce) {
      this.queueUpdate(content);
    } else {
      this.immediateUpdate(content);
    }
  }
  
  private immediateUpdate(content: string): void {
    // Clear and update for proper announcement
    this.element.textContent = '';
    
    // Use RAF to ensure DOM update
    requestAnimationFrame(() => {
      this.element.textContent = content;
    });
  }
}
```

## Screen Reader Patterns

### 1. Page Navigation Announcements

```typescript
class PageNavigationAnnouncer {
  private announcer: AnnouncementEngine;
  private previousLocation: string = '';
  
  announcePageChange(location: PageLocation): void {
    const announcement = this.buildPageAnnouncement(location);
    
    this.announcer.announce(announcement, {
      priority: 'assertive',
      clearQueue: true,
    });
    
    // Update document title for screen readers
    document.title = `${location.title} - Financial Dashboard`;
    
    // Focus management
    this.manageFocusOnNavigation(location);
  }
  
  private buildPageAnnouncement(location: PageLocation): string {
    const parts: string[] = [];
    
    // Page title
    parts.push(`${location.title} page`);
    
    // Loading state
    if (location.isLoading) {
      parts.push('Loading');
    }
    
    // Breadcrumb
    if (location.breadcrumb) {
      parts.push(`in ${location.breadcrumb.join(', ')}`);
    }
    
    // Additional context
    if (location.itemCount !== undefined) {
      parts.push(`${location.itemCount} items`);
    }
    
    return parts.join(', ');
  }
  
  private manageFocusOnNavigation(location: PageLocation): void {
    // Set focus to main heading or content
    const mainHeading = document.querySelector('h1');
    const mainContent = document.querySelector('[role="main"]');
    
    const focusTarget = mainHeading || mainContent;
    
    if (focusTarget) {
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus();
    }
  }
}
```

### 2. Form Interaction Patterns

```typescript
class FormScreenReaderSupport {
  setupFormField(field: HTMLInputElement, config: FieldConfig): void {
    // Label association
    this.ensureLabel(field, config);
    
    // Description and error setup
    this.setupDescriptions(field, config);
    
    // Live validation announcements
    this.setupLiveValidation(field, config);
    
    // Required field indication
    if (config.required) {
      field.setAttribute('aria-required', 'true');
    }
    
    // Autocomplete
    if (config.autocomplete) {
      field.setAttribute('autocomplete', config.autocomplete);
    }
  }
  
  private setupDescriptions(field: HTMLInputElement, config: FieldConfig): void {
    const describedBy: string[] = [];
    
    // Helper text
    if (config.description) {
      const descId = `${field.id}-description`;
      const descElement = document.getElementById(descId);
      
      if (descElement) {
        describedBy.push(descId);
      }
    }
    
    // Error message
    const errorId = `${field.id}-error`;
    const errorElement = document.getElementById(errorId);
    
    if (errorElement) {
      describedBy.push(errorId);
      
      // Make error live
      errorElement.setAttribute('role', 'alert');
      errorElement.setAttribute('aria-live', 'polite');
    }
    
    // Set aria-describedby
    if (describedBy.length > 0) {
      field.setAttribute('aria-describedby', describedBy.join(' '));
    }
  }
  
  announceFormSubmission(result: FormSubmitResult): void {
    if (result.success) {
      announce('Form submitted successfully', {
        priority: 'polite',
        category: 'form',
      });
    } else {
      const errorCount = result.errors.length;
      const message = `Form submission failed. ${errorCount} ${
        errorCount === 1 ? 'error' : 'errors'
      } found. First error: ${result.errors[0].message}`;
      
      announce(message, {
        priority: 'assertive',
        category: 'form',
      });
      
      // Focus first error field
      this.focusFirstError(result.errors[0].fieldId);
    }
  }
}
```

### 3. Dynamic Content Updates

```typescript
class DynamicContentAnnouncer {
  private updateRegions: Map<string, LiveRegion> = new Map();
  private updateThrottler: Throttler;
  
  setupDynamicRegion(config: DynamicRegionConfig): void {
    const region = this.createUpdateRegion(config);
    
    // Monitor for changes
    if (config.selector) {
      this.observeChanges(config.selector, region);
    }
    
    this.updateRegions.set(config.id, region);
  }
  
  private observeChanges(selector: string, region: LiveRegion): void {
    const target = document.querySelector(selector);
    if (!target) return;
    
    const observer = new MutationObserver((mutations) => {
      const announcement = this.buildUpdateAnnouncement(mutations, target);
      
      if (announcement) {
        this.throttler.execute(() => {
          region.update(announcement);
        });
      }
    });
    
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-valuenow'],
    });
  }
  
  private buildUpdateAnnouncement(
    mutations: MutationRecord[],
    target: Element
  ): string | null {
    // Analyze mutations to build meaningful announcement
    // This is context-specific based on the UI component
    
    // Example: Data table update
    if (target.matches('[role="grid"]')) {
      return this.buildTableUpdateAnnouncement(mutations);
    }
    
    // Example: Chart update
    if (target.matches('.chart-container')) {
      return this.buildChartUpdateAnnouncement(mutations);
    }
    
    return null;
  }
}
```

### 4. Complex UI Component Descriptions

```typescript
class ComponentDescriptionBuilder {
  describeDataVisualization(chart: ChartComponent): string {
    const parts: string[] = [];
    
    // Chart type
    parts.push(`${chart.type} chart`);
    
    // Title
    if (chart.title) {
      parts.push(`showing ${chart.title}`);
    }
    
    // Data summary
    const summary = this.summarizeChartData(chart);
    parts.push(summary);
    
    // Key insights
    const insights = this.extractKeyInsights(chart);
    if (insights.length > 0) {
      parts.push(`Key points: ${insights.join(', ')}`);
    }
    
    return parts.join('. ');
  }
  
  private summarizeChartData(chart: ChartComponent): string {
    switch (chart.type) {
      case 'line':
        return this.summarizeLineChart(chart);
      case 'bar':
        return this.summarizeBarChart(chart);
      case 'pie':
        return this.summarizePieChart(chart);
      default:
        return 'Data visualization';
    }
  }
  
  private summarizeLineChart(chart: LineChart): string {
    const trend = this.calculateTrend(chart.data);
    const range = this.calculateRange(chart.data);
    
    return `${trend} trend from ${range.min} to ${range.max} over ${chart.data.length} data points`;
  }
  
  describeInteractiveTable(table: DataTable): void {
    const summary = document.createElement('div');
    summary.className = 'sr-only';
    summary.id = `${table.id}-summary`;
    
    summary.textContent = `
      Data table with ${table.rows} rows and ${table.columns} columns.
      Column headers: ${table.headers.join(', ')}.
      Table is ${table.sortable ? 'sortable' : 'not sortable'}.
      ${table.filterable ? 'Filters available.' : ''}
      Use arrow keys to navigate cells.
    `;
    
    table.element.setAttribute('aria-describedby', summary.id);
    table.element.parentNode?.insertBefore(summary, table.element);
  }
}
```

## ARIA Implementation Patterns

### 1. Semantic Structure

```typescript
class AriaStructureManager {
  setupPageStructure(): void {
    // Main landmarks
    this.setLandmarks();
    
    // Heading hierarchy
    this.validateHeadingStructure();
    
    // Region labeling
    this.labelRegions();
  }
  
  private setLandmarks(): void {
    // Banner
    const header = document.querySelector('header');
    if (header && !header.hasAttribute('role')) {
      header.setAttribute('role', 'banner');
    }
    
    // Navigation
    const nav = document.querySelector('nav');
    if (nav && !nav.hasAttribute('role')) {
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('aria-label', 'Main navigation');
    }
    
    // Main
    const main = document.querySelector('main');
    if (main && !main.hasAttribute('role')) {
      main.setAttribute('role', 'main');
    }
    
    // Complementary
    const aside = document.querySelector('aside');
    if (aside && !aside.hasAttribute('role')) {
      aside.setAttribute('role', 'complementary');
    }
    
    // Content info
    const footer = document.querySelector('footer');
    if (footer && !footer.hasAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
  }
  
  private validateHeadingStructure(): void {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      
      // Check for skipped levels
      if (level > lastLevel + 1) {
        console.warn(`Heading level skipped: h${lastLevel} to h${level}`);
      }
      
      lastLevel = level;
    });
  }
}
```

### 2. Interactive Widget Patterns

```typescript
class WidgetAriaPatterns {
  // Tab Panel Pattern
  setupTabPanel(tablist: HTMLElement, tabs: HTMLElement[], panels: HTMLElement[]): void {
    // Tablist
    tablist.setAttribute('role', 'tablist');
    
    tabs.forEach((tab, index) => {
      // Tab
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      tab.setAttribute('aria-controls', panels[index].id);
      tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      // Panel
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      panels[index].setAttribute('tabindex', '0');
      panels[index].hidden = index !== 0;
    });
  }
  
  // Combobox Pattern
  setupCombobox(input: HTMLInputElement, listbox: HTMLElement): void {
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', listbox.id);
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    
    listbox.setAttribute('role', 'listbox');
    
    // Options
    const options = listbox.querySelectorAll('[role="option"]');
    options.forEach((option, index) => {
      option.setAttribute('id', `option-${index}`);
      option.setAttribute('aria-selected', 'false');
    });
  }
  
  // Alert Dialog Pattern
  setupAlertDialog(dialog: HTMLElement, config: AlertDialogConfig): void {
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', config.titleId);
    
    if (config.descriptionId) {
      dialog.setAttribute('aria-describedby', config.descriptionId);
    }
    
    // Ensure proper focus management
    const focusableElements = getFocusableElements(dialog);
    
    if (focusableElements.length === 0) {
      // Add close button if no focusable elements
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.onclick = config.onClose;
      dialog.appendChild(closeButton);
    }
  }
}
```

## Screen Reader Optimization

### 1. Performance Optimization

```typescript
class ScreenReaderPerformance {
  private announcementCache: Map<string, string> = new Map();
  private throttlers: Map<string, Throttler> = new Map();
  
  optimizeAnnouncements(config: OptimizationConfig): void {
    // Debounce rapid updates
    if (config.debounce) {
      this.setupDebouncing(config.debounce);
    }
    
    // Cache repeated announcements
    if (config.cache) {
      this.setupCaching(config.cache);
    }
    
    // Batch related announcements
    if (config.batch) {
      this.setupBatching(config.batch);
    }
  }
  
  private setupDebouncing(debounceConfig: DebounceConfig): void {
    Object.entries(debounceConfig).forEach(([category, delay]) => {
      this.throttlers.set(
        category,
        new Throttler(delay, { leading: true, trailing: true })
      );
    });
  }
  
  private setupCaching(cacheConfig: CacheConfig): void {
    // Implement LRU cache for announcements
    const maxSize = cacheConfig.maxSize || 100;
    const ttl = cacheConfig.ttl || 5000;
    
    // Cache logic here...
  }
}
```

### 2. Verbosity Control

```typescript
enum VerbosityLevel {
  Minimal = 'minimal',
  Normal = 'normal',
  Verbose = 'verbose',
}

class VerbosityController {
  private level: VerbosityLevel = VerbosityLevel.Normal;
  
  setVerbosity(level: VerbosityLevel): void {
    this.level = level;
    this.updateAnnouncementTemplates();
  }
  
  formatAnnouncement(template: string, data: any): string {
    switch (this.level) {
      case VerbosityLevel.Minimal:
        return this.formatMinimal(template, data);
      case VerbosityLevel.Normal:
        return this.formatNormal(template, data);
      case VerbosityLevel.Verbose:
        return this.formatVerbose(template, data);
    }
  }
  
  private formatMinimal(template: string, data: any): string {
    // Just the essentials
    return data.action || template;
  }
  
  private formatNormal(template: string, data: any): string {
    // Standard announcement
    return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
  }
  
  private formatVerbose(template: string, data: any): string {
    // Detailed announcement with instructions
    const base = this.formatNormal(template, data);
    const instructions = this.getInstructions(data.context);
    
    return `${base}. ${instructions}`;
  }
}
```

## Testing Strategy

### 1. Automated Screen Reader Testing

```typescript
class ScreenReaderTestUtils {
  async testAnnouncement(
    action: () => void,
    expectedAnnouncement: string | RegExp
  ): Promise<void> {
    const spy = jest.spyOn(announcer, 'announce');
    
    action();
    
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(expectedAnnouncement),
        expect.any(Object)
      );
    });
  }
  
  async testLiveRegion(
    region: HTMLElement,
    action: () => void,
    expectedContent: string
  ): Promise<void> {
    action();
    
    await waitFor(() => {
      expect(region.textContent).toBe(expectedContent);
    });
  }
  
  testAriaStructure(container: HTMLElement): ValidationResult {
    const violations: string[] = [];
    
    // Check landmarks
    const main = container.querySelector('[role="main"], main');
    if (!main) {
      violations.push('Missing main landmark');
    }
    
    // Check heading hierarchy
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      
      if (level > lastLevel + 1) {
        violations.push(`Heading level skipped: h${lastLevel} to h${level}`);
      }
      
      lastLevel = level;
    });
    
    return { valid: violations.length === 0, violations };
  }
}
```

### 2. Manual Testing Protocol

```markdown
## Screen Reader Testing Checklist

### NVDA (Windows)
- [ ] Enable speech viewer for logging
- [ ] Test with Firefox and Chrome
- [ ] Verify all announcements
- [ ] Test form interactions
- [ ] Check table navigation
- [ ] Validate shortcuts work

### JAWS (Windows)
- [ ] Test with Chrome and Edge
- [ ] Verify virtual cursor navigation
- [ ] Check forms mode behavior
- [ ] Test quick navigation keys
- [ ] Validate custom regions

### VoiceOver (macOS)
- [ ] Test with Safari
- [ ] Use rotor for navigation
- [ ] Check gesture support
- [ ] Verify announcements
- [ ] Test with braille display

### Testing Scenarios
1. **Page Load**
   - Title announced
   - Main content focused
   - Page structure clear

2. **Navigation**
   - Menu items clear
   - Current page indicated
   - Transitions announced

3. **Forms**
   - Labels read correctly
   - Errors announced
   - Required fields indicated
   - Success confirmation

4. **Dynamic Updates**
   - Live regions work
   - Updates announced
   - Not too verbose

5. **Modals/Dialogs**
   - Opening announced
   - Focus trapped
   - Closing returns focus
```

## Implementation Examples

### Complete Page Example

```typescript
// pages/dashboard.tsx
export default function DashboardPage() {
  useEffect(() => {
    // Announce page load
    announcePageChange({
      title: 'Dashboard',
      breadcrumb: ['Home', 'Dashboard'],
      isLoading: false,
    });
  }, []);
  
  return (
    <div>
      {/* Skip Links */}
      <SkipLinks />
      
      {/* Main Content */}
      <main role="main" aria-labelledby="page-title">
        <h1 id="page-title">Dashboard</h1>
        
        {/* Live Region for Updates */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="dashboard-updates"
        />
        
        {/* Dashboard Content */}
        <DashboardContent />
      </main>
    </div>
  );
}
```

### Modal with Screen Reader Support

```typescript
export function AccessibleModal({ isOpen, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  
  useEffect(() => {
    if (isOpen) {
      announce(`${title} dialog opened. Press Escape to close.`, {
        priority: 'assertive',
      });
    }
  }, [isOpen, title]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
        </DialogHeader>
        
        <div id={descId}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

This comprehensive design ensures that all users, regardless of their screen reader or assistive technology, can effectively use and navigate the financial dashboard application.