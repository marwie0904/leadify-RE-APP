import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import {
  AccessibilityContext as IAccessibilityContext,
  AccessibilityPreferences,
  AccessibilityFeature,
  AccessibilityConfig,
  ComplianceLevel,
  ComplianceReport,
  AccessibilityError,
  AccessibilityErrorCode,
  IPersistenceAdapter,
} from './types';

// Default preferences
const defaultPreferences: AccessibilityPreferences = {
  highContrast: false,
  fontSize: 'default',
  reducedMotion: false,
  colorBlindMode: undefined,
  keyboardNavEnabled: true,
  skipLinks: true,
  focusIndicatorStyle: 'default',
  screenReaderOptimized: false,
  verboseAnnouncements: false,
  announcementDelay: 100,
  autoErrorAnnouncement: true,
  formFieldDescriptions: true,
  requiredFieldIndication: 'asterisk',
};

// Default features
const defaultFeatures: AccessibilityFeature[] = [
  {
    id: 'keyboard-navigation',
    name: 'Keyboard Navigation',
    enabled: true,
    category: 'navigation',
    description: 'Enable keyboard navigation throughout the application',
  },
  {
    id: 'skip-links',
    name: 'Skip Links',
    enabled: true,
    category: 'navigation',
    description: 'Show skip navigation links',
  },
  {
    id: 'screen-reader-announcements',
    name: 'Screen Reader Announcements',
    enabled: true,
    category: 'screen-reader',
    description: 'Enable dynamic announcements for screen readers',
  },
  {
    id: 'form-validation-announcements',
    name: 'Form Validation Announcements',
    enabled: true,
    category: 'forms',
    description: 'Announce form validation errors to screen readers',
  },
];

// Context value interface
interface AccessibilityContextValue {
  context: IAccessibilityContext;
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => Promise<void>;
  enableFeature: (feature: AccessibilityFeature) => Promise<void>;
  disableFeature: (featureId: string) => Promise<void>;
  isFeatureEnabled: (featureId: string) => boolean;
  getComplianceLevel: () => ComplianceLevel;
  runComplianceCheck: (level?: ComplianceLevel) => Promise<ComplianceReport>;
  subscribe: (callback: (context: IAccessibilityContext) => void) => () => void;
}

// Action types
type AccessibilityAction =
  | { type: 'SET_PREFERENCES'; payload: Partial<AccessibilityPreferences> }
  | { type: 'SET_FEATURE'; payload: AccessibilityFeature }
  | { type: 'DISABLE_FEATURE'; payload: string }
  | { type: 'SET_COMPLIANCE_LEVEL'; payload: ComplianceLevel }
  | { type: 'SET_INITIALIZED'; payload: boolean };

// Reducer
function accessibilityReducer(
  state: IAccessibilityContext,
  action: AccessibilityAction
): IAccessibilityContext {
  switch (action.type) {
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
        lastModified: new Date(),
      };

    case 'SET_FEATURE': {
      const features = new Map(state.features);
      features.set(action.payload.id, action.payload);
      return { ...state, features, lastModified: new Date() };
    }

    case 'DISABLE_FEATURE': {
      const features = new Map(state.features);
      const feature = features.get(action.payload);
      if (feature) {
        features.set(action.payload, { ...feature, enabled: false });
      }
      return { ...state, features, lastModified: new Date() };
    }

    case 'SET_COMPLIANCE_LEVEL':
      return { ...state, complianceLevel: action.payload };

    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };

    default:
      return state;
  }
}

// Create context
const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

// Local storage persistence adapter
class LocalStoragePersistenceAdapter implements IPersistenceAdapter {
  async save(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    }
  }

  async load(key: string): Promise<any> {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load accessibility preferences:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete accessibility preferences:', error);
    }
  }
}

// Provider props
export interface AccessibilityProviderProps {
  children: React.ReactNode;
  config?: AccessibilityConfig;
  initialPreferences?: Partial<AccessibilityPreferences>;
}

// Provider component
export function AccessibilityProvider({
  children,
  config,
  initialPreferences,
}: AccessibilityProviderProps) {
  // Initialize state
  const initialState: IAccessibilityContext = {
    id: `a11y-${Date.now()}`,
    preferences: { ...defaultPreferences, ...initialPreferences },
    features: new Map(defaultFeatures.map(f => [f.id, f])),
    complianceLevel: config?.complianceLevel || 'WCAG_2_1_AA',
    initialized: false,
    lastModified: new Date(),
  };

  // Add custom features from config
  if (config?.features) {
    config.features.forEach(feature => {
      initialState.features.set(feature.id, feature);
    });
  }

  const [state, dispatch] = useReducer(accessibilityReducer, initialState);
  const persistenceAdapter = useRef(
    config?.persistenceAdapter || new LocalStoragePersistenceAdapter()
  );
  const subscribers = useRef(new Set<(context: IAccessibilityContext) => void>());
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const saved = await persistenceAdapter.current.load('a11y-preferences');
      if (saved) {
        dispatch({ type: 'SET_PREFERENCES', payload: saved });
      }
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    };

    loadPreferences();
  }, []);

  // Save preferences with debouncing
  useEffect(() => {
    if (!state.initialized) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(() => {
      persistenceAdapter.current.save('a11y-preferences', state.preferences);
    }, 500);

    // Notify subscribers
    subscribers.current.forEach(callback => callback(state));

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state]);

  // Update preferences
  const updatePreferences = useCallback(
    async (preferences: Partial<AccessibilityPreferences>): Promise<void> => {
      // Validate preferences
      if (preferences.fontSize && 
          !['default', 'large', 'extra-large'].includes(preferences.fontSize)) {
        throw new AccessibilityError(
          'Invalid font size preference',
          AccessibilityErrorCode.INVALID_PREFERENCE
        );
      }

      dispatch({ type: 'SET_PREFERENCES', payload: preferences });
    },
    []
  );

  // Enable feature
  const enableFeature = useCallback(
    async (feature: AccessibilityFeature): Promise<void> => {
      dispatch({ type: 'SET_FEATURE', payload: { ...feature, enabled: true } });
    },
    []
  );

  // Disable feature
  const disableFeature = useCallback(
    async (featureId: string): Promise<void> => {
      dispatch({ type: 'DISABLE_FEATURE', payload: featureId });
    },
    []
  );

  // Check if feature is enabled
  const isFeatureEnabled = useCallback(
    (featureId: string): boolean => {
      const feature = state.features.get(featureId);
      return feature?.enabled || false;
    },
    [state.features]
  );

  // Get compliance level
  const getComplianceLevel = useCallback(
    (): ComplianceLevel => state.complianceLevel,
    [state.complianceLevel]
  );

  // Run compliance check
  const runComplianceCheck = useCallback(
    async (level?: ComplianceLevel): Promise<ComplianceReport> => {
      const targetLevel = level || state.complianceLevel;
      
      // This is a placeholder implementation
      // In a real app, this would use axe-core or similar
      return {
        level: targetLevel,
        violations: [],
        passes: 0,
        timestamp: new Date(),
      };
    },
    [state.complianceLevel]
  );

  // Subscribe to changes
  const subscribe = useCallback(
    (callback: (context: IAccessibilityContext) => void): (() => void) => {
      subscribers.current.add(callback);
      return () => {
        subscribers.current.delete(callback);
      };
    },
    []
  );

  // Context value
  const value: AccessibilityContextValue = {
    context: state,
    updatePreferences,
    enableFeature,
    disableFeature,
    isFeatureEnabled,
    getComplianceLevel,
    runComplianceCheck,
    subscribe,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// Hook to use accessibility context
export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}