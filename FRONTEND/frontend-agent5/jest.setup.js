require('@testing-library/jest-dom');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.CSRF_SECRET = 'test-csrf-secret';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: class MockNextResponse {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.statusText = options.statusText || 'OK';
      this.headers = new Map(Object.entries(options.headers || {}));
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
    
    static json(data, options) {
      return new MockNextResponse(JSON.stringify(data), options);
    }
    
    static next(options) {
      return new MockNextResponse('', { status: 200, ...options });
    }
    
    static redirect(url, options) {
      return new MockNextResponse('', {
        status: options?.status || 302,
        headers: { Location: url, ...options?.headers }
      });
    }
  },
}));

// Mock crypto for Node.js environment
const crypto = require('crypto');

// Ensure crypto.webcrypto is available for tests
if (!global.crypto) {
  global.crypto = crypto.webcrypto;
}

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock Request if not available
if (!global.Request) {
  global.Request = class MockRequest {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map(Object.entries(options.headers || {}));
      this.body = options.body;
    }
  };
}

// Mock Response if not available  
if (!global.Response) {
  global.Response = class MockResponse {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.headers = new Map(Object.entries(options.headers || {}));
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}

// Mock window.performance for tests
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
  };
}

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Only show errors that aren't test-related warnings
  if (
    typeof args[0] === 'string' &&
    !args[0].includes('Warning: ReactDOM.render is deprecated') &&
    !args[0].includes('Warning: componentWillReceiveProps') &&
    !args[0].includes('act(') &&
    !args[0].includes('Not implemented: navigation')
  ) {
    originalError(...args);
  }
};

console.warn = (...args) => {
  // Only show warnings that aren't test-related
  if (
    typeof args[0] === 'string' &&
    !args[0].includes('Warning: ReactDOM.render is deprecated') &&
    !args[0].includes('Not implemented: navigation')
  ) {
    originalWarn(...args);
  }
};

// Global test utilities
global.testUtils = {
  // Helper to create mock NextRequest
  createMockRequest: (url, options = {}) => {
    const request = new Request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
    });
    
    return {
      ...request,
      nextUrl: new URL(url),
      ip: options.ip || '127.0.0.1',
      cookies: {
        get: jest.fn((name) => ({ value: options.cookies?.[name] })),
        set: jest.fn(),
      },
    };
  },
  
  // Helper to wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to suppress console output during tests
  suppressConsole: () => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  },
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});