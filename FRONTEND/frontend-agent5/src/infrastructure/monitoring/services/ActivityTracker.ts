import { UserActivity, ActivityType, ConsentStatus } from '@/domain/monitoring/entities/UserActivity';

export interface IActivityTransport {
  send(activities: UserActivity[]): Promise<void>;
}

export class ActivityTracker {
  private consent: ConsentStatus = {
    analytics: false,
    performance: false,
    functional: true,
    targeting: false
  };

  private buffer: UserActivity[] = [];
  private transport?: IActivityTransport;
  private flushInterval: number = 10000; // 10 seconds
  private flushTimer?: NodeJS.Timeout;
  private sessionId: string;

  constructor(transport?: IActivityTransport) {
    this.transport = transport;
    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
    this.startAutoFlush();
  }

  setConsent(consent: Partial<ConsentStatus>): void {
    this.consent = { ...this.consent, ...consent };
  }

  track(activity: Omit<UserActivity, 'id' | 'timestamp' | 'consent' | 'sessionId'>): void {
    if (!this.isConsentGiven(activity.type)) {
      return;
    }

    const fullActivity: UserActivity = {
      ...activity,
      id: this.generateId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      consent: { ...this.consent }
    };

    this.buffer.push(fullActivity);

    // Flush immediately for critical events
    if (this.isCriticalEvent(activity.type)) {
      this.flush();
    }
  }

  trackPageView(path: string, referrer?: string, metadata?: Record<string, any>): void {
    this.track({
      type: ActivityType.PAGE_VIEW,
      category: 'navigation',
      action: 'page_view',
      label: path,
      metadata: {
        path,
        referrer,
        ...metadata
      }
    });
  }

  trackClick(element: string, location?: string, metadata?: Record<string, any>): void {
    this.track({
      type: ActivityType.CLICK,
      category: 'interaction',
      action: 'click',
      label: element,
      metadata: {
        element,
        location,
        ...metadata
      }
    });
  }

  trackFormSubmission(formName: string, fields?: string[], metadata?: Record<string, any>): void {
    this.track({
      type: ActivityType.FORM_SUBMISSION,
      category: 'interaction',
      action: 'form_submit',
      label: formName,
      metadata: {
        form_name: formName,
        field_count: fields?.length,
        fields: fields?.join(','),
        ...metadata
      }
    });
  }

  trackApiCall(endpoint: string, method: string, statusCode: number, duration: number): void {
    this.track({
      type: ActivityType.API_CALL,
      category: 'api',
      action: 'api_call',
      label: `${method} ${endpoint}`,
      value: duration,
      metadata: {
        endpoint,
        method,
        status_code: statusCode,
        duration
      }
    });
  }

  trackError(error: string, component?: string, metadata?: Record<string, any>): void {
    this.track({
      type: ActivityType.ERROR,
      category: 'error',
      action: 'error_occurred',
      label: error,
      metadata: {
        error_message: error,
        component,
        ...metadata
      }
    });
  }

  trackCustomEvent(category: string, action: string, label?: string, value?: number, metadata?: Record<string, any>): void {
    this.track({
      type: ActivityType.CUSTOM,
      category,
      action,
      label,
      value,
      metadata
    });
  }

  async flush(): Promise<void> {
    if (!this.transport || this.buffer.length === 0) {
      return;
    }

    const activities = [...this.buffer];
    this.buffer = [];

    try {
      await this.transport.send(activities);
    } catch (error) {
      console.error('Failed to send activity data:', error);
      // Re-add activities on failure (keep only recent ones)
      const maxRetryBuffer = 100;
      if (this.buffer.length + activities.length <= maxRetryBuffer) {
        this.buffer.push(...activities);
      } else {
        // Keep only the most recent activities
        const availableSpace = maxRetryBuffer - this.buffer.length;
        if (availableSpace > 0) {
          this.buffer.push(...activities.slice(-availableSpace));
        }
      }
    }
  }

  private isConsentGiven(type: ActivityType): boolean {
    switch (type) {
      case ActivityType.PAGE_VIEW:
      case ActivityType.CLICK:
      case ActivityType.CUSTOM:
        return this.consent.analytics;
      case ActivityType.API_CALL:
        return this.consent.performance;
      case ActivityType.ERROR:
        return this.consent.functional;
      case ActivityType.FORM_SUBMISSION:
        return this.consent.analytics && this.consent.functional;
      default:
        return this.consent.analytics;
    }
  }

  private isCriticalEvent(type: ActivityType): boolean {
    return type === ActivityType.ERROR;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackCustomEvent('page', 'visibility_hidden');
        this.flush(); // Flush before page becomes hidden
      } else {
        this.trackCustomEvent('page', 'visibility_visible');
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackCustomEvent('page', 'unload');
      this.flush();
    });

    // Track clicks (with consent check)
    document.addEventListener('click', (event) => {
      if (!this.consent.analytics) return;

      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const elementInfo = this.getElementInfo(target);

      this.trackClick(elementInfo, window.location.pathname);
    }, { passive: true });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      if (!this.consent.analytics) return;

      const form = event.target as HTMLFormElement;
      const formName = form.name || form.id || 'unnamed_form';
      const fields = Array.from(form.elements)
        .filter(el => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
        .map(el => el.name || el.id)
        .filter(Boolean);

      this.trackFormSubmission(formName, fields);
    }, { passive: true });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      if (!this.consent.analytics) return;

      const scrollDepth = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollDepth > maxScrollDepth && scrollDepth % 25 === 0) {
        maxScrollDepth = scrollDepth;
        this.trackCustomEvent('page', 'scroll_depth', `${scrollDepth}%`, scrollDepth);
      }
    }, { passive: true });

    // Track time on page
    let pageStartTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - pageStartTime;
      this.trackCustomEvent('page', 'time_on_page', undefined, timeOnPage, {
        duration_seconds: Math.round(timeOnPage / 1000)
      });
    });
  }

  private getElementInfo(element: HTMLElement): string {
    // Try to get a meaningful identifier for the element
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    if (element.textContent && element.textContent.trim().length < 50) {
      return element.textContent.trim();
    }
    return element.tagName.toLowerCase();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    // Try to get existing session ID from sessionStorage
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem('activity_session_id');
      if (existing) return existing;

      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('activity_session_id', newSessionId);
      return newSessionId;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAutoFlush(): void {
    if (this.transport) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.flush(); // Final flush
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getBufferSize(): number {
    return this.buffer.length;
  }
}