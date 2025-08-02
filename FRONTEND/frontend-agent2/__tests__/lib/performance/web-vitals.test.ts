/**
 * @jest-environment jsdom
 */

import { WebVitalsReporter } from '../../../lib/performance/web-vitals';

// Mock web-vitals
jest.mock('web-vitals', () => ({
  getCLS: jest.fn(),
  getFCP: jest.fn(),
  getFID: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn(),
  getINP: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
});

describe('WebVitalsReporter', () => {
  let mockOnReport: jest.Mock;
  let reporter: WebVitalsReporter;

  beforeEach(() => {
    mockOnReport = jest.fn();
    reporter = new WebVitalsReporter('/test-endpoint', mockOnReport);
    
    // Clear all mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({ ok: true });
    
    // Clear storage
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('Metric Rating', () => {
    it('should rate LCP correctly', () => {
      const reporter = new WebVitalsReporter();
      
      // Access private method through type assertion
      const getRating = (reporter as any).getRating.bind(reporter);
      
      expect(getRating('LCP', 2000)).toBe('good');
      expect(getRating('LCP', 3000)).toBe('needs-improvement');
      expect(getRating('LCP', 5000)).toBe('poor');
    });

    it('should rate FCP correctly', () => {
      const reporter = new WebVitalsReporter();
      const getRating = (reporter as any).getRating.bind(reporter);
      
      expect(getRating('FCP', 1500)).toBe('good');
      expect(getRating('FCP', 2500)).toBe('needs-improvement');
      expect(getRating('FCP', 4000)).toBe('poor');
    });

    it('should rate CLS correctly', () => {
      const reporter = new WebVitalsReporter();
      const getRating = (reporter as any).getRating.bind(reporter);
      
      expect(getRating('CLS', 0.05)).toBe('good');
      expect(getRating('CLS', 0.15)).toBe('needs-improvement');
      expect(getRating('CLS', 0.3)).toBe('poor');
    });

    it('should default to good for unknown metrics', () => {
      const reporter = new WebVitalsReporter();
      const getRating = (reporter as any).getRating.bind(reporter);
      
      expect(getRating('UNKNOWN', 1000)).toBe('good');
    });
  });

  describe('Session Management', () => {
    it('should generate and store session ID', () => {
      const reporter = new WebVitalsReporter();
      const getSessionId = (reporter as any).getSessionId.bind(reporter);
      
      const sessionId = getSessionId();
      expect(sessionId).toBe('test-uuid-123');
      expect(sessionStorage.getItem('performance-session-id')).toBe('test-uuid-123');
    });

    it('should reuse existing session ID', () => {
      sessionStorage.setItem('performance-session-id', 'existing-id');
      
      const reporter = new WebVitalsReporter();
      const getSessionId = (reporter as any).getSessionId.bind(reporter);
      
      expect(getSessionId()).toBe('existing-id');
    });
  });

  describe('Device Information', () => {
    it('should get connection type', () => {
      const reporter = new WebVitalsReporter();
      const getConnectionType = (reporter as any).getConnectionType.bind(reporter);
      
      // Mock connection API
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g' },
        configurable: true
      });
      
      expect(getConnectionType()).toBe('4g');
    });

    it('should handle missing connection API', () => {
      const reporter = new WebVitalsReporter();
      const getConnectionType = (reporter as any).getConnectionType.bind(reporter);
      
      expect(getConnectionType()).toBe('unknown');
    });

    it('should get device memory', () => {
      const reporter = new WebVitalsReporter();
      const getDeviceMemory = (reporter as any).getDeviceMemory.bind(reporter);
      
      // Mock device memory API
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 8,
        configurable: true
      });
      
      expect(getDeviceMemory()).toBe(8);
    });
  });

  describe('Metric Handling', () => {
    it('should handle metric and call onReport', () => {
      const mockMetric = {
        name: 'LCP',
        value: 2000,
        id: 'test-id',
        delta: 100,
        navigationType: 'navigate'
      };

      const handleMetric = (reporter as any).handleMetric.bind(reporter);
      handleMetric(mockMetric);

      expect(mockOnReport).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'LCP',
          value: 2000,
          rating: 'good',
          id: 'test-id',
          delta: 100,
          navigationType: 'navigate'
        })
      );
    });

    it('should store metrics in internal map', () => {
      const mockMetric = {
        name: 'FCP',
        value: 1500,
        id: 'test-id',
        delta: 50,
        navigationType: 'navigate'
      };

      const handleMetric = (reporter as any).handleMetric.bind(reporter);
      handleMetric(mockMetric);

      const metrics = reporter.getMetrics();
      expect(metrics.FCP).toBe(1500);
      expect(reporter.getMetric('FCP')).toBe(1500);
    });
  });

  describe('Metric Reporting', () => {
    it('should send metrics to API endpoint', async () => {
      const mockMetric = {
        name: 'LCP',
        value: 2000,
        rating: 'good' as const,
        timestamp: new Date(),
        id: 'test-id',
        delta: 100,
        navigationType: 'navigate'
      };

      const reportMetric = (reporter as any).reportMetric.bind(reporter);
      await reportMetric(mockMetric);

      expect(fetch).toHaveBeenCalledWith('/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"name":"LCP"')
      });
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const mockMetric = {
        name: 'LCP',
        value: 2000,
        rating: 'good' as const,
        timestamp: new Date(),
        id: 'test-id',
        delta: 100,
        navigationType: 'navigate'
      };

      const reportMetric = (reporter as any).reportMetric.bind(reporter);
      
      // Should not throw
      await expect(reportMetric(mockMetric)).resolves.toBeUndefined();
    });
  });
});