import { LRUCache } from 'lru-cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // Start with 1 second

// Request queue to manage concurrent requests
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestCount = 0;
  private windowStart = Date.now();

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Check rate limit
      const now = Date.now();
      if (now - this.windowStart > RATE_LIMIT_WINDOW) {
        this.requestCount = 0;
        this.windowStart = now;
      }
      
      if (this.requestCount >= MAX_REQUESTS_PER_WINDOW) {
        // Wait until next window
        const waitTime = RATE_LIMIT_WINDOW - (now - this.windowStart);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      const request = this.queue.shift();
      if (request) {
        this.requestCount++;
        await request();
      }
    }
    
    this.processing = false;
  }
}

// Response cache
const responseCache = new LRUCache<string, any>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
});

// Request queue instance
const requestQueue = new RequestQueue();

// API Usage Monitoring & Alerting System
interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  circuitBreakerTrips: number;
  rateLimitHits: number;
  lastResetTime: number;
}

class ApiMonitor {
  private metrics: ApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    circuitBreakerTrips: 0,
    rateLimitHits: 0,
    lastResetTime: Date.now(),
  };

  private responseTimes: number[] = [];
  private cacheRequests = 0;
  private cacheHits = 0;

  recordRequest() {
    this.metrics.totalRequests++;
  }

  recordSuccess(responseTime: number) {
    this.metrics.successfulRequests++;
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for rolling average
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    
    this.updateAverageResponseTime();
  }

  recordFailure() {
    this.metrics.failedRequests++;
  }

  recordCacheHit() {
    this.cacheRequests++;
    this.cacheHits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.cacheRequests++;
    this.updateCacheHitRate();
  }

  recordCircuitBreakerTrip() {
    this.metrics.circuitBreakerTrips++;
    this.checkAlerts();
  }

  recordRateLimitHit() {
    this.metrics.rateLimitHits++;
    this.checkAlerts();
  }

  private updateAverageResponseTime() {
    if (this.responseTimes.length > 0) {
      const sum = this.responseTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageResponseTime = Math.round(sum / this.responseTimes.length);
    }
  }

  private updateCacheHitRate() {
    if (this.cacheRequests > 0) {
      this.metrics.cacheHitRate = Math.round((this.cacheHits / this.cacheRequests) * 100);
    }
  }

  private checkAlerts() {
    const now = Date.now();
    const timeSinceReset = now - this.metrics.lastResetTime;
    const oneHour = 60 * 60 * 1000;

    // Alert if circuit breaker trips more than 3 times in an hour
    if (this.metrics.circuitBreakerTrips > 3 && timeSinceReset < oneHour) {
      logger.error(`🚨 ALERT: High circuit breaker activity (${this.metrics.circuitBreakerTrips} trips)`);
    }

    // Alert if rate limit hits more than 10 times in an hour  
    if (this.metrics.rateLimitHits > 10 && timeSinceReset < oneHour) {
      logger.error(`🚨 ALERT: Excessive rate limiting (${this.metrics.rateLimitHits} hits)`);
    }

    // Alert if error rate > 10%
    if (this.metrics.totalRequests > 50) {
      const errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
      if (errorRate > 10) {
        logger.error(`🚨 ALERT: High error rate (${errorRate.toFixed(1)}%)`);
      }
    }

    // Alert if average response time > 5 seconds
    if (this.metrics.averageResponseTime > 5000) {
      logger.error(`🚨 ALERT: Slow API responses (${this.metrics.averageResponseTime}ms avg)`);
    }
  }

  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      circuitBreakerTrips: 0,
      rateLimitHits: 0,
      lastResetTime: Date.now(),
    };
    this.responseTimes = [];
    this.cacheRequests = 0;
    this.cacheHits = 0;
  }

  logSummary() {
    if (!IS_PRODUCTION) {
      console.log('📊 API Usage Summary:', this.getMetrics());
    }
  }
}

const apiMonitor = new ApiMonitor();

// Export monitoring functions
export const getApiMetrics = () => apiMonitor.getMetrics();
export const resetApiMetrics = () => apiMonitor.resetMetrics();

// Server Health Monitoring System
interface ServerHealthStatus {
  isHealthy: boolean;
  lastHealthCheck: number;
  consecutiveFailures: number;
  responseTime: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

class ServerHealthMonitor {
  private healthStatus: ServerHealthStatus = {
    isHealthy: true,
    lastHealthCheck: Date.now(),
    consecutiveFailures: 0,
    responseTime: 0,
    status: 'healthy'
  };

  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly FAILURE_THRESHOLD = 3;
  private readonly DEGRADED_THRESHOLD = 1000; // 1 second response time

  constructor() {
    // Start health monitoring
    this.startHealthChecking();
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        this.onHealthCheckSuccess(responseTime);
      } else {
        this.onHealthCheckFailure();
      }
    } catch (error) {
      this.onHealthCheckFailure();
    }
  }

  private onHealthCheckSuccess(responseTime: number): void {
    this.healthStatus.consecutiveFailures = 0;
    this.healthStatus.responseTime = responseTime;
    this.healthStatus.lastHealthCheck = Date.now();
    
    if (responseTime > this.DEGRADED_THRESHOLD) {
      this.healthStatus.status = 'degraded';
      this.healthStatus.isHealthy = true; // Still functional but slow
    } else {
      this.healthStatus.status = 'healthy';
      this.healthStatus.isHealthy = true;
    }
  }

  private onHealthCheckFailure(): void {
    this.healthStatus.consecutiveFailures++;
    this.healthStatus.lastHealthCheck = Date.now();
    
    if (this.healthStatus.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.healthStatus.status = 'unhealthy';
      this.healthStatus.isHealthy = false;
      logger.error('🚨 SERVER HEALTH CRITICAL: Server marked as unhealthy');
    }
  }

  private startHealthChecking(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
    
    // Initial health check
    this.performHealthCheck();
  }

  getHealthStatus(): ServerHealthStatus {
    return { ...this.healthStatus };
  }

  isServerHealthy(): boolean {
    return this.healthStatus.isHealthy;
  }
}

const serverHealth = new ServerHealthMonitor();

// Graceful Degradation Strategies
interface DegradationStrategy {
  enableCache: boolean;
  showOfflineNotice: boolean;
  fallbackToLocalData: boolean;
  reduceRequestTimeout: boolean;
}

function getDegradationStrategy(healthStatus: ServerHealthStatus): DegradationStrategy {
  switch (healthStatus.status) {
    case 'healthy':
      return {
        enableCache: true,
        showOfflineNotice: false,
        fallbackToLocalData: false,
        reduceRequestTimeout: false
      };
    
    case 'degraded':
      return {
        enableCache: true,
        showOfflineNotice: true,
        fallbackToLocalData: true,
        reduceRequestTimeout: true
      };
    
    case 'unhealthy':
      return {
        enableCache: true,
        showOfflineNotice: true,
        fallbackToLocalData: true,
        reduceRequestTimeout: true
      };
      
    default:
      return {
        enableCache: true,
        showOfflineNotice: false,
        fallbackToLocalData: false,
        reduceRequestTimeout: false
      };
  }
}

// Export health monitoring functions
export const getServerHealth = () => serverHealth.getHealthStatus();
export const isServerHealthy = () => serverHealth.isServerHealthy();

// Log summary every 5 minutes in development
if (!IS_PRODUCTION) {
  setInterval(() => {
    apiMonitor.logSummary();
    console.log('🏥 Server Health:', serverHealth.getHealthStatus());
  }, 5 * 60 * 1000);
}

// Logger that respects environment
const logger = {
  log: (...args: any[]) => !IS_PRODUCTION && console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => !IS_PRODUCTION && console.warn(...args),
};

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  cache?: boolean;
  retry?: boolean;
  critical?: boolean; // Mark request as critical - will be attempted even when server is unhealthy
  timeout?: number; // Custom timeout for the request
}

// Exponential backoff with jitter
function getRetryDelay(attempt: number): number {
  const delay = RETRY_DELAY * Math.pow(2, attempt);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
}

// Enhanced error categorization for 500-level responses
interface ServerError {
  status: number;
  code?: string;
  type: 'server_unavailable' | 'database_error' | 'service_error' | 'resource_exhaustion' | 'unknown';
  retryable: boolean;
  backoffMultiplier: number;
  maxRetries: number;
}

function categorizeServerError(error: any): ServerError {
  const status = error.status || 0;
  let type: ServerError['type'] = 'unknown';
  let retryable = false;
  let backoffMultiplier = 2;
  let maxRetries = 3;

  // Network/Connection errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    type = 'server_unavailable';
    retryable = true;
    backoffMultiplier = 3; // Longer backoff for connection issues
    maxRetries = 5;
  }
  // 500 Internal Server Error - Usually database or application logic errors
  else if (status === 500) {
    type = 'server_unavailable';
    retryable = true;
    backoffMultiplier = 2;
    maxRetries = 2; // Limited retries to avoid overwhelming failing server
  }
  // 502 Bad Gateway - Upstream server issues  
  else if (status === 502) {
    type = 'service_error';
    retryable = true;
    backoffMultiplier = 2;
    maxRetries = 4;
  }
  // 503 Service Unavailable - Temporary server overload
  else if (status === 503) {
    type = 'resource_exhaustion';
    retryable = true;
    backoffMultiplier = 4; // Longer backoff for overloaded servers
    maxRetries = 3;
  }
  // 504 Gateway Timeout - Upstream timeout
  else if (status === 504) {
    type = 'service_error';
    retryable = true;
    backoffMultiplier = 3;
    maxRetries = 2;
  }
  // Other 5xx errors
  else if (status >= 500 && status < 600) {
    type = 'server_unavailable';
    retryable = true;
    backoffMultiplier = 2;
    maxRetries = 2;
  }

  return { status, code: error.code, type, retryable, backoffMultiplier, maxRetries };
}

// Check if error is retryable (enhanced)
function isRetryableError(error: any): boolean {
  if (error.status === 429) return true; // Rate limited
  
  const serverError = categorizeServerError(error);
  return serverError.retryable;
}

// Parse rate limit headers
function parseRateLimitHeaders(headers: Headers) {
  return {
    limit: parseInt(headers.get('X-RateLimit-Limit') || '0'),
    remaining: parseInt(headers.get('X-RateLimit-Remaining') || '0'),
    reset: parseInt(headers.get('X-RateLimit-Reset') || '0'),
    retryAfter: parseInt(headers.get('Retry-After') || '0'),
  };
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const cacheKey = `${options.method || 'GET'}:${endpoint}`;
  const startTime = Date.now();
  
  // Record request start
  apiMonitor.recordRequest();
  
  // Check server health and apply degradation strategy
  const healthStatus = serverHealth.getHealthStatus();
  const degradationStrategy = getDegradationStrategy(healthStatus);
  
  // Enhanced cache strategy based on server health
  const shouldUseCache = options.cache !== false && 
    (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE');
  
  if (shouldUseCache) {
    const cached = responseCache.get(cacheKey);
    if (cached) {
      logger.log(`Cache hit for ${endpoint}`);
      apiMonitor.recordCacheHit();
      apiMonitor.recordSuccess(Date.now() - startTime);
      return cached;
    } else {
      apiMonitor.recordCacheMiss();
    }
  }
  
  // If server is unhealthy and we have fallback data, consider using it
  if (!healthStatus.isHealthy && degradationStrategy.fallbackToLocalData && shouldUseCache) {
    const staleCache = responseCache.get(cacheKey);
    if (staleCache) {
      logger.warn(`Using stale cache data due to server health issues: ${endpoint}`);
      return staleCache;
    }
  }
  
  // Skip non-critical requests if server is unhealthy
  if (!healthStatus.isHealthy && options.method === 'GET' && !options.critical) {
    throw new Error(`Skipping non-critical request due to server health: ${endpoint}`);
  }
  
  // Add request to queue
  return requestQueue.add(async () => {
    let lastError: any;
    let serverError: ServerError | null = null;
    const shouldRetry = options.retry !== false;
    let maxAttempts = shouldRetry ? RETRY_ATTEMPTS : 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          // Use dynamic retry delays based on error type
          const multiplier = serverError?.backoffMultiplier || 2;
          const delay = getRetryDelay(attempt) * multiplier;
          logger.warn(`Retrying ${serverError?.type || 'unknown'} error for ${endpoint} after ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const url = `${API_BASE_URL}${endpoint}`;
        logger.log(`API Call: ${endpoint}`);
        
        // Apply adaptive timeout based on server health
        const baseTimeout = options.timeout || 30000; // 30s default
        const adaptiveTimeout = degradationStrategy.reduceRequestTimeout 
          ? Math.min(baseTimeout * 0.5, 15000) // Reduced timeout for degraded servers
          : baseTimeout;
        
        // Create abort controller with timeout
        const controller = options.signal ? new AbortController() : new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, adaptiveTimeout);
        
        // If user provided signal, listen for it too
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            controller.abort();
          });
        }
        
        const config: RequestInit = {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          signal: controller.signal,
        };
        
        if (options.body && options.method !== "GET") {
          if (options.body instanceof FormData) {
            const headers = config.headers as Record<string, string>;
            delete headers["Content-Type"];
            config.headers = headers;
            config.body = options.body;
          } else {
            config.body = JSON.stringify(options.body);
          }
        }
        
        const response = await fetch(url, config);
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);
        
        // Parse rate limit headers
        const rateLimits = parseRateLimitHeaders(response.headers);
        if (rateLimits.remaining < 10) {
          logger.warn(`Low rate limit remaining: ${rateLimits.remaining}`);
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`API call failed: ${response.status} ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).response = errorText;
          (error as any).rateLimits = rateLimits;
          
          if (response.status === 429) {
            apiMonitor.recordRateLimitHit();
            if (rateLimits.retryAfter) {
              // Wait for rate limit reset
              logger.warn(`Rate limited. Waiting ${rateLimits.retryAfter}s before retry`);
              await new Promise(resolve => setTimeout(resolve, rateLimits.retryAfter * 1000));
            }
          }
          
          throw error;
        }
        
        const data = await response.json();
        
        // Cache successful GET responses
        if (options.cache !== false && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
          responseCache.set(cacheKey, data);
        }
        
        // Record successful request
        const responseTime = Date.now() - startTime;
        apiMonitor.recordSuccess(responseTime);
        
        return data;
      } catch (error) {
        // Clear timeout on error
        clearTimeout(timeoutId);
        lastError = error;
        
        // Categorize the error for intelligent retry handling
        if (error instanceof Error && (error as any).status >= 500) {
          serverError = categorizeServerError(error);
          
          // Update max attempts based on error type
          if (attempt === 0) {
            maxAttempts = Math.min(serverError.maxRetries, RETRY_ATTEMPTS);
          }
          
          // Log detailed error information
          logger.error(`Server error (${serverError.type}): ${error.message}`, {
            endpoint,
            status: serverError.status,
            code: serverError.code,
            attempt: attempt + 1,
            maxAttempts,
            retryable: serverError.retryable
          });
        }
        
        if (!shouldRetry || attempt === maxAttempts - 1 || !isRetryableError(error)) {
          // Record failed request with error categorization
          apiMonitor.recordFailure();
          
          // Add error type to the thrown error for better debugging
          if (serverError) {
            (error as any).serverErrorType = serverError.type;
            (error as any).retryAttempts = attempt + 1;
          }
          
          throw error;
        }
      }
    }
    
    // Record failed request if all retries exhausted
    apiMonitor.recordFailure();
    throw lastError;
  });
}

export async function uploadFile(endpoint: string, formData: FormData, headers: Record<string, string> = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`
    logger.log(`Uploading file to: ${url}`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    logger.error(`File upload failed for ${endpoint}:`, error)
    throw error
  }
}

// Batch multiple API calls
export async function batchApiCalls<T>(
  calls: Array<{ endpoint: string; options?: ApiOptions }>
): Promise<T[]> {
  const promises = calls.map(({ endpoint, options }) => 
    apiCall(endpoint, options).catch(error => ({ error, endpoint }))
  );
  
  const results = await Promise.all(promises);
  
  // Check for errors
  const errors = results.filter((r: any) => r.error);
  if (errors.length > 0) {
    logger.error('Batch API calls had errors:', errors);
  }
  
  return results;
}

// Circuit breaker for failing endpoints
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private circuitOpen = new Map<string, boolean>();
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  
  async call<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.isOpen(key)) {
      throw new Error(`Circuit breaker is open for ${key}`);
    }
    
    try {
      const result = await fn();
      this.onSuccess(key);
      return result;
    } catch (error) {
      this.onFailure(key);
      throw error;
    }
  }
  
  private isOpen(key: string): boolean {
    const isOpen = this.circuitOpen.get(key) || false;
    if (isOpen) {
      const lastFailure = this.lastFailureTime.get(key) || 0;
      if (Date.now() - lastFailure > this.timeout) {
        // Try to close circuit
        this.circuitOpen.set(key, false);
        this.failures.set(key, 0);
        return false;
      }
    }
    return isOpen;
  }
  
  private onSuccess(key: string) {
    this.failures.delete(key);
    this.circuitOpen.set(key, false);
  }
  
  private onFailure(key: string) {
    const failures = (this.failures.get(key) || 0) + 1;
    this.failures.set(key, failures);
    this.lastFailureTime.set(key, Date.now());
    
    if (failures >= this.threshold) {
      this.circuitOpen.set(key, true);
      logger.error(`Circuit breaker opened for ${key}`);
      apiMonitor.recordCircuitBreakerTrip();
    }
  }
}

const circuitBreaker = new CircuitBreaker();

// Enhanced API call with circuit breaker
export async function apiCallWithCircuitBreaker(endpoint: string, options: ApiOptions = {}) {
  return circuitBreaker.call(endpoint, () => apiCall(endpoint, options));
}

// System Test & Validation Functions
export async function validateApiSystemHealth(): Promise<{
  overall: 'healthy' | 'degraded' | 'critical';
  components: Record<string, boolean>;
  metrics: ApiMetrics;
  serverHealth: ServerHealthStatus;
  recommendations: string[];
}> {
  const metrics = getApiMetrics();
  const health = getServerHealth();
  const components: Record<string, boolean> = {};
  const recommendations: string[] = [];
  
  // Test critical endpoints
  const criticalEndpoints = ['/health', '/api/dashboard/summary', '/api/leads'];
  
  for (const endpoint of criticalEndpoints) {
    try {
      await apiCall(endpoint, { 
        method: 'GET', 
        timeout: 5000, 
        critical: true, 
        cache: false 
      });
      components[endpoint] = true;
    } catch (error) {
      components[endpoint] = false;
      recommendations.push(`Fix ${endpoint} endpoint - currently failing`);
    }
  }
  
  // Analyze metrics for issues
  if (metrics.averageResponseTime > 3000) {
    recommendations.push('High response times detected - consider server optimization');
  }
  
  if (metrics.failedRequests / metrics.totalRequests > 0.1) {
    recommendations.push('High error rate detected - investigate server issues');
  }
  
  if (metrics.circuitBreakerTrips > 0) {
    recommendations.push('Circuit breaker trips detected - check endpoint reliability');
  }
  
  // Determine overall status
  const failedComponents = Object.values(components).filter(c => !c).length;
  let overall: 'healthy' | 'degraded' | 'critical';
  
  if (failedComponents === 0 && health.status === 'healthy') {
    overall = 'healthy';
  } else if (failedComponents <= 1 || health.status === 'degraded') {
    overall = 'degraded';
  } else {
    overall = 'critical';
  }
  
  return {
    overall,
    components,
    metrics,
    serverHealth: health,
    recommendations
  };
}

// User Notification System for Server Issues
interface UserNotification {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  actions?: Array<{ label: string; action: () => void }>;
}

class NotificationManager {
  private notifications: UserNotification[] = [];
  private listeners: Array<(notifications: UserNotification[]) => void> = [];
  
  addNotification(notification: UserNotification) {
    this.notifications.push(notification);
    this.notifyListeners();
  }
  
  removeNotification(index: number) {
    this.notifications.splice(index, 1);
    this.notifyListeners();
  }
  
  subscribe(listener: (notifications: UserNotification[]) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
  
  checkAndNotifyHealthIssues() {
    const health = getServerHealth();
    const metrics = getApiMetrics();
    
    // Clear existing health notifications
    this.notifications = this.notifications.filter(n => 
      !n.title.includes('Server') && !n.title.includes('API')
    );
    
    if (health.status === 'unhealthy') {
      this.addNotification({
        type: 'error',
        title: 'Server Connection Issues',
        message: 'We\'re experiencing server connectivity problems. Some features may be unavailable.',
        actions: [
          { 
            label: 'Retry Connection', 
            action: () => serverHealth.performHealthCheck() 
          }
        ]
      });
    } else if (health.status === 'degraded') {
      this.addNotification({
        type: 'warning',
        title: 'Slow Server Response',
        message: 'Server response times are slower than usual. Please be patient.',
      });
    }
    
    if (metrics.circuitBreakerTrips > 2) {
      this.addNotification({
        type: 'warning',
        title: 'API Reliability Issues',
        message: 'Some API endpoints are experiencing issues. We\'re working to resolve this.',
      });
    }
  }
}

const notificationManager = new NotificationManager();

// Auto-check for health issues every minute
setInterval(() => {
  notificationManager.checkAndNotifyHealthIssues();
}, 60000);

// Export notification system
export const subscribeToNotifications = (listener: (notifications: UserNotification[]) => void) => 
  notificationManager.subscribe(listener);

// Human in the Loop API Functions
import type {
  HandoffRequestPayload,
  HandoffRequestResponse,
  HandoffAcceptPayload,
  HandoffAcceptResponse,
  HumanAgentDashboard,
  PriorityQueueResponse,
  SendMessagePayload,
  SendMessageResponse,
} from "@/types/human-in-loop"

/**
 * Request handoff to human agent
 */
export async function requestHandoff(
  conversationId: string,
  payload: HandoffRequestPayload,
  headers: Record<string, string>
): Promise<HandoffRequestResponse> {
  logger.log(`Requesting handoff for conversation: ${conversationId}`);
  return apiCallWithCircuitBreaker(`/api/conversations/${conversationId}/request-handoff`, {
    method: "POST",
    headers,
    body: payload,
  });
}

/**
 * Accept handoff as human agent
 */
export async function acceptHandoff(
  conversationId: string,
  payload: HandoffAcceptPayload,
  headers: Record<string, string>
): Promise<HandoffAcceptResponse> {
  logger.log(`Accepting handoff for conversation: ${conversationId}`);
  return apiCallWithCircuitBreaker(`/api/conversations/${conversationId}/accept-handoff`, {
    method: "POST",
    headers,
    body: payload,
  });
}

/**
 * Get human agent dashboard data
 */
export async function getHumanAgentDashboard(
  headers: Record<string, string>
): Promise<HumanAgentDashboard> {
  return apiCallWithCircuitBreaker('/api/human-agents/dashboard', {
    method: "GET",
    headers,
    cache: true, // Cache dashboard data
  });
}

/**
 * Get priority queue of conversations
 */
export async function getPriorityQueue(
  headers: Record<string, string>,
  params: {
    limit?: number;
    offset?: number;
    mode?: string;
  } = {}
): Promise<PriorityQueueResponse> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.mode) queryParams.append('mode', params.mode);
  
  const endpoint = `/api/conversations/priority-queue${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  return apiCallWithCircuitBreaker(endpoint, {
    method: "GET",
    headers,
    cache: true,
  });
}

/**
 * Send message as human agent
 */
export async function sendHumanAgentMessage(
  conversationId: string,
  payload: SendMessagePayload,
  headers: Record<string, string>
): Promise<SendMessageResponse> {
  return apiCallWithCircuitBreaker(`/api/conversations/${conversationId}/send-message`, {
    method: "POST",
    headers,
    body: payload,
    retry: true, // Ensure message delivery
  });
}

/**
 * Get conversation messages (enhanced for human agents)
 */
export async function getConversationMessages(
  conversationId: string,
  headers: Record<string, string>
): Promise<any> {
  return apiCallWithCircuitBreaker(`/api/conversations/${conversationId}/messages`, {
    method: "GET",
    headers,
    cache: true,
  });
}
