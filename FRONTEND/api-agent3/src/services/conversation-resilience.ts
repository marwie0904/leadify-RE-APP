/**
 * Conversation Resilience Service
 * 
 * Implements error handling, retry logic, circuit breaker pattern,
 * and message delivery guarantees for the conversation system.
 */

import { migrateEndpoint, shouldUseMigratedEndpoint } from '@/lib/api/migration-helper'

// ===== TYPES =====

export interface RetryContext {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  operation: string
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface DeliveryGuarantee {
  messageId: string
  conversationId: string
  content: string
  timestamp: Date
  retryCount: number
  maxRetries: number
}

// ===== CIRCUIT BREAKER =====

export class ConversationAPICircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private successCount = 0
  
  constructor(private config: CircuitBreakerConfig) {}
  
  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
        console.log(`[CircuitBreaker] ${operationName}: Moving to HALF_OPEN state`)
      } else {
        throw new CircuitBreakerOpenError(`Circuit breaker is open for ${operationName}`)
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess(operationName)
      return result
    } catch (error) {
      this.onFailure(operationName, error as Error)
      throw error
    }
  }
  
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout
  }
  
  private onSuccess(operationName: string): void {
    this.failureCount = 0
    this.successCount++
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED
      console.log(`[CircuitBreaker] ${operationName}: Reset to CLOSED state`)
    }
  }
  
  private onFailure(operationName: string, error: Error): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    console.error(`[CircuitBreaker] ${operationName} failure ${this.failureCount}:`, error.message)
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
      console.warn(`[CircuitBreaker] ${operationName}: Circuit opened due to ${this.failureCount} failures`)
    }
  }
  
  getState(): { state: CircuitState; failureCount: number; successCount: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    }
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

// ===== RETRY STRATEGY =====

export class MessageDeliveryRetryStrategy {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: RetryContext
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= context.maxAttempts; attempt++) {
      try {
        console.log(`[Retry] ${context.operation}: Attempt ${attempt}/${context.maxAttempts}`)
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (!this.isRetryableError(error) || attempt === context.maxAttempts) {
          console.error(`[Retry] ${context.operation}: Not retryable or max attempts reached`)
          throw error
        }
        
        const delay = this.calculateDelay(attempt, context.baseDelay, context.maxDelay)
        console.log(`[Retry] ${context.operation}: Waiting ${delay}ms before retry ${attempt + 1}`)
        await this.sleep(delay)
      }
    }
    
    throw lastError!
  }
  
  private calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, maxDelay)
  }
  
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors, timeout errors, 5xx status codes
      const retryableNames = ['NetworkError', 'TimeoutError', 'AbortError']
      if (retryableNames.includes(error.name)) return true
      
      // Check HTTP status codes if available
      const httpError = error as any
      if (httpError.status && httpError.status >= 500) return true
      
      // Connection issues
      if (error.message.includes('fetch')) return true
      if (error.message.includes('network')) return true
    }
    
    return false
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ===== MESSAGE DELIVERY GUARANTEES =====

export class ReliableMessageDelivery {
  private pendingMessages = new Map<string, DeliveryGuarantee>()
  private deliveryTimeout = 30000 // 30s
  private maxRetries = 3
  
  constructor(
    private circuitBreaker: ConversationAPICircuitBreaker,
    private retryStrategy: MessageDeliveryRetryStrategy
  ) {
    // Start periodic cleanup of expired messages
    setInterval(() => this.cleanupExpiredMessages(), 60000) // Every minute
  }
  
  async sendMessageWithDeliveryGuarantee(
    conversationId: string,
    content: string,
    getAuthHeaders: () => Promise<Record<string, string>>
  ): Promise<any> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const deliveryGuarantee: DeliveryGuarantee = {
      messageId,
      conversationId,
      content,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.maxRetries
    }
    
    this.pendingMessages.set(messageId, deliveryGuarantee)
    
    try {
      const result = await this.circuitBreaker.execute(
        () => this.retryStrategy.executeWithRetry(
          () => this.sendMessageToAPI(conversationId, content, messageId, getAuthHeaders),
          {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            operation: `sendMessage-${messageId}`
          }
        ),
        'sendMessage'
      )
      
      this.pendingMessages.delete(messageId)
      console.log(`[MessageDelivery] Message ${messageId} delivered successfully`)
      return result
      
    } catch (error) {
      console.error(`[MessageDelivery] Failed to deliver message ${messageId}:`, error)
      await this.handleDeliveryFailure(messageId, error as Error)
      throw error
    }
  }
  
  private async sendMessageToAPI(
    conversationId: string,
    content: string,
    messageId: string,
    getAuthHeaders: () => Promise<Record<string, string>>
  ): Promise<any> {
    const endpoint = shouldUseMigratedEndpoint()
      ? `/api/v1/conversations/${conversationId}/messages`
      : `/api/conversations/${conversationId}/messages`
    
    const headers = await getAuthHeaders()
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        metadata: {
          messageId,
          timestamp: new Date().toISOString(),
          deliveryGuarantee: true
        }
      }),
    })
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
      ;(error as any).status = response.status
      throw error
    }
    
    return response.json()
  }
  
  private async handleDeliveryFailure(messageId: string, error: Error): Promise<void> {
    const deliveryGuarantee = this.pendingMessages.get(messageId)
    if (!deliveryGuarantee) return
    
    deliveryGuarantee.retryCount++
    
    if (deliveryGuarantee.retryCount < deliveryGuarantee.maxRetries) {
      console.log(`[MessageDelivery] Scheduling retry ${deliveryGuarantee.retryCount} for message ${messageId}`)
      // Schedule retry with exponential backoff
      const delay = 1000 * Math.pow(2, deliveryGuarantee.retryCount - 1)
      setTimeout(() => this.retryMessage(messageId), delay)
    } else {
      console.error(`[MessageDelivery] Message ${messageId} failed after ${deliveryGuarantee.maxRetries} retries`)
      await this.moveToDeadLetterQueue(deliveryGuarantee)
      this.pendingMessages.delete(messageId)
    }
  }
  
  private async retryMessage(messageId: string): Promise<void> {
    const deliveryGuarantee = this.pendingMessages.get(messageId)
    if (!deliveryGuarantee) return
    
    console.log(`[MessageDelivery] Retrying message ${messageId}`)
    // In a real implementation, you would retry the message delivery here
    // For now, we'll just log it
  }
  
  private async moveToDeadLetterQueue(deliveryGuarantee: DeliveryGuarantee): Promise<void> {
    // In a real implementation, you would store failed messages for manual review
    console.error('[MessageDelivery] Moving to dead letter queue:', {
      messageId: deliveryGuarantee.messageId,
      conversationId: deliveryGuarantee.conversationId,
      content: deliveryGuarantee.content.substring(0, 50),
      retryCount: deliveryGuarantee.retryCount
    })
    
    // Store in localStorage for debugging purposes
    const deadLetterKey = `deadletter-${deliveryGuarantee.messageId}`
    localStorage.setItem(deadLetterKey, JSON.stringify(deliveryGuarantee))
  }
  
  private cleanupExpiredMessages(): void {
    const now = Date.now()
    const expiredMessages: string[] = []
    
    for (const [messageId, deliveryGuarantee] of this.pendingMessages) {
      if (now - deliveryGuarantee.timestamp.getTime() > this.deliveryTimeout) {
        expiredMessages.push(messageId)
      }
    }
    
    expiredMessages.forEach(messageId => {
      console.warn(`[MessageDelivery] Cleaning up expired message ${messageId}`)
      this.pendingMessages.delete(messageId)
    })
  }
  
  getPendingMessageCount(): number {
    return this.pendingMessages.size
  }
  
  getPendingMessages(): DeliveryGuarantee[] {
    return Array.from(this.pendingMessages.values())
  }
}

// ===== RESILIENCE SERVICE =====

export class ConversationResilienceService {
  private circuitBreaker: ConversationAPICircuitBreaker
  private retryStrategy: MessageDeliveryRetryStrategy
  private messageDelivery: ReliableMessageDelivery
  
  constructor(config?: Partial<CircuitBreakerConfig>) {
    const circuitConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      ...config
    }
    
    this.circuitBreaker = new ConversationAPICircuitBreaker(circuitConfig)
    this.retryStrategy = new MessageDeliveryRetryStrategy()
    this.messageDelivery = new ReliableMessageDelivery(this.circuitBreaker, this.retryStrategy)
  }
  
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryContext?: Partial<RetryContext>
  ): Promise<T> {
    const context: RetryContext = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      operation: operationName,
      ...retryContext
    }
    
    return this.circuitBreaker.execute(
      () => this.retryStrategy.executeWithRetry(operation, context),
      operationName
    )
  }
  
  async sendReliableMessage(
    conversationId: string,
    content: string,
    getAuthHeaders: () => Promise<Record<string, string>>
  ): Promise<any> {
    return this.messageDelivery.sendMessageWithDeliveryGuarantee(
      conversationId,
      content,
      getAuthHeaders
    )
  }
  
  getHealthStatus() {
    return {
      circuitBreaker: this.circuitBreaker.getState(),
      pendingMessages: this.messageDelivery.getPendingMessageCount(),
      timestamp: new Date().toISOString()
    }
  }
}

// ===== SINGLETON INSTANCE =====

export const conversationResilienceService = new ConversationResilienceService()