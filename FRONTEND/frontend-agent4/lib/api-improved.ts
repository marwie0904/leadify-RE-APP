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
}

// Exponential backoff with jitter
function getRetryDelay(attempt: number): number {
  const delay = RETRY_DELAY * Math.pow(2, attempt);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
}

// Check if error is retryable
function isRetryableError(error: any): boolean {
  if (error.status === 429) return true; // Rate limited
  if (error.status >= 500) return true; // Server errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
  return false;
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
  
  // Check cache for GET requests
  if (options.cache !== false && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
    const cached = responseCache.get(cacheKey);
    if (cached) {
      logger.log(`Cache hit for ${endpoint}`);
      return cached;
    }
  }
  
  // Add request to queue
  return requestQueue.add(async () => {
    let lastError: any;
    const shouldRetry = options.retry !== false;
    const maxAttempts = shouldRetry ? RETRY_ATTEMPTS : 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = getRetryDelay(attempt);
          logger.warn(`Retrying request ${endpoint} after ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const url = `${API_BASE_URL}${endpoint}`;
        logger.log(`API Call: ${endpoint}`);
        
        const config: RequestInit = {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          signal: options.signal,
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
          
          if (response.status === 429 && rateLimits.retryAfter) {
            // Wait for rate limit reset
            logger.warn(`Rate limited. Waiting ${rateLimits.retryAfter}s before retry`);
            await new Promise(resolve => setTimeout(resolve, rateLimits.retryAfter * 1000));
          }
          
          throw error;
        }
        
        const data = await response.json();
        
        // Cache successful GET responses
        if (options.cache !== false && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
          responseCache.set(cacheKey, data);
        }
        
        return data;
      } catch (error) {
        lastError = error;
        
        if (!shouldRetry || attempt === maxAttempts - 1 || !isRetryableError(error)) {
          throw error;
        }
      }
    }
    
    throw lastError;
  });
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
    }
  }
}

const circuitBreaker = new CircuitBreaker();

// Enhanced API call with circuit breaker
export async function apiCallWithCircuitBreaker(endpoint: string, options: ApiOptions = {}) {
  return circuitBreaker.call(endpoint, () => apiCall(endpoint, options));
}

// Export refactored human-in-loop functions
export { uploadFile } from './api';

// Optimized human-in-loop functions with proper error handling
import type {
  HandoffRequestPayload,
  HandoffRequestResponse,
  HandoffAcceptPayload,
  HandoffAcceptResponse,
  HumanAgentDashboard,
  PriorityQueueResponse,
  SendMessagePayload,
  SendMessageResponse,
} from "@/types/human-in-loop";

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

export async function getHumanAgentDashboard(
  headers: Record<string, string>
): Promise<HumanAgentDashboard> {
  return apiCallWithCircuitBreaker('/api/human-agents/dashboard', {
    method: "GET",
    headers,
    cache: true, // Cache dashboard data
  });
}

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