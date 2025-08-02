export interface UserActivity {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  type: ActivityType;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  consent: ConsentStatus;
}

export enum ActivityType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  FORM_SUBMISSION = 'form_submission',
  API_CALL = 'api_call',
  ERROR = 'error',
  CUSTOM = 'custom'
}

export interface ConsentStatus {
  analytics: boolean;
  performance: boolean;
  functional: boolean;
  targeting: boolean;
}