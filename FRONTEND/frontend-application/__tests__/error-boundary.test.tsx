/**
 * Advanced Error Boundary Test Suite (TDD)
 * 
 * Tests written FIRST following TDD principles
 * Focus: Frontend UX, Accessibility, Performance, Recovery
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

// Components to be implemented
import { AdvancedErrorBoundary } from '@/components/error/AdvancedErrorBoundary'
import { NetworkErrorHandler } from '@/components/error/NetworkErrorHandler'
import { ErrorRecoveryManager } from '@/lib/error-recovery'
import { UserFeedbackCollector } from '@/components/error/UserFeedbackCollector'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock implementations
const mockErrorLogger = {
  logError: vi.fn(),
  clearStoredErrors: vi.fn()
}

// Mock removed - error-logger no longer exists
// vi.mock('@/lib/error-logger', () => ({
//   errorLogger: mockErrorLogger
// }))

// Test component that throws errors
const ThrowError = ({ shouldThrow = false, errorType = 'generic' }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Network request failed')
      case 'authentication':
        throw new Error('Authentication failed')
      case 'permission':
        throw new Error('Permission denied')
      case 'validation':
        throw new Error('Validation failed')
      default:
        throw new Error('Generic error')
    }
  }
  return <div>Working component</div>
}

describe('AdvancedErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Error Handling', () => {
    it('should catch and display errors with proper ARIA attributes', async () => {
      render(
        <AdvancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      // Should show error UI
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByLabelledBy(/error-title/)).toBeInTheDocument()
      
      // Should have proper ARIA live region for screen readers
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
    })

    it('should pass accessibility audit', async () => {
      const { container } = render(
        <AdvancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <AdvancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      // Tab through all interactive elements
      await user.tab()
      expect(screen.getByRole('button', { name: /try again/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /report issue/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('link', { name: /go home/i })).toHaveFocus()
    })
  })

  describe('Error Recovery Mechanisms', () => {
    it('should implement progressive retry with exponential backoff', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()
      
      render(
        <AdvancedErrorBoundary onRetry={onRetry} maxRetries={3}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: /try again/i })
      
      // First retry - immediate
      await user.click(retryButton)
      expect(onRetry).toHaveBeenCalledWith(1)
      
      // Second retry - should show delay indicator
      await user.click(screen.getByRole('button', { name: /try again/i }))
      expect(screen.getByText(/retrying in/i)).toBeInTheDocument()
      
      // Should disable button during retry delay
      expect(screen.getByRole('button', { name: /try again/i })).toBeDisabled()
    })

    it('should show different recovery options based on error type', () => {
      // Network error should show retry option
      const { rerender } = render(
        <AdvancedErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </AdvancedErrorBoundary>
      )
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByText(/network connection/i)).toBeInTheDocument()

      // Authentication error should show login option
      rerender(
        <AdvancedErrorBoundary>
          <ThrowError shouldThrow={true} errorType="authentication" />
        </AdvancedErrorBoundary>
      )
      
      expect(screen.getByRole('button', { name: /sign in again/i })).toBeInTheDocument()
    })

    it('should provide fallback content for graceful degradation', () => {
      const fallbackContent = <div>Fallback content</div>
      
      render(
        <AdvancedErrorBoundary fallback={fallbackContent}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      expect(screen.getByText('Fallback content')).toBeInTheDocument()
    })
  })

  describe('User Experience Enhancements', () => {
    it('should show contextual help based on user action', async () => {
      const user = userEvent.setup()
      
      render(
        <AdvancedErrorBoundary showContextualHelp={true}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      // Should show help expand button
      const helpButton = screen.getByRole('button', { name: /what can i do/i })
      await user.click(helpButton)
      
      // Should expand help content
      expect(screen.getByText(/here are some things you can try/i)).toBeInTheDocument()
      expect(screen.getByText(/refresh the page/i)).toBeInTheDocument()
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument()
    })

    it('should collect user feedback when error occurs', async () => {
      const user = userEvent.setup()
      const onFeedback = vi.fn()
      
      render(
        <AdvancedErrorBoundary onFeedbackSubmit={onFeedback}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      // Click report issue button
      const reportButton = screen.getByRole('button', { name: /report issue/i })
      await user.click(reportButton)
      
      // Should show feedback form
      expect(screen.getByRole('textbox', { name: /describe what happened/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send feedback/i })).toBeInTheDocument()
    })

    it('should persist error state across page refreshes', () => {
      const mockSessionStorage = {
        getItem: vi.fn(() => JSON.stringify({ 
          errorCount: 2,
          lastError: 'Network error',
          timestamp: Date.now() - 1000
        })),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
      
      Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage })
      
      render(
        <AdvancedErrorBoundary persistErrorState={true}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      // Should show error count indicator
      expect(screen.getByText(/this error has occurred 2 times/i)).toBeInTheDocument()
    })
  })

  describe('Mobile UX Optimizations', () => {
    it('should adapt layout for mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      render(
        <AdvancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      // Should stack buttons vertically on mobile
      const buttonContainer = screen.getByTestId('error-actions')
      expect(buttonContainer).toHaveClass('flex-col', 'gap-2')
    })

    it('should support touch gestures for retry', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()
      
      render(
        <AdvancedErrorBoundary onRetry={onRetry} supportTouchGestures={true}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      // Should show swipe hint on mobile
      expect(screen.getByText(/swipe up to retry/i)).toBeInTheDocument()
      
      // Simulate swipe up gesture
      const errorCard = screen.getByTestId('error-card')
      fireEvent.touchStart(errorCard, { touches: [{ clientY: 100 }] })
      fireEvent.touchEnd(errorCard, { changedTouches: [{ clientY: 50 }] })
      
      expect(onRetry).toHaveBeenCalled()
    })
  })

  describe('Performance Monitoring', () => {
    it('should track error boundary render performance', () => {
      const performanceObserver = vi.fn()
      vi.spyOn(window, 'performance').mockReturnValue({
        mark: performanceObserver,
        measure: performanceObserver,
        now: () => 100
      } as any)
      
      render(
        <AdvancedErrorBoundary trackPerformance={true}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      expect(performanceObserver).toHaveBeenCalledWith('error-boundary-render-start')
      expect(performanceObserver).toHaveBeenCalledWith('error-boundary-render-end')
    })

    it('should not impact main thread performance', async () => {
      const startTime = performance.now()
      
      render(
        <AdvancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Error boundary should render in under 16ms (60fps)
      expect(renderTime).toBeLessThan(16)
    })
  })

  describe('Integration with Error Recovery Manager', () => {
    it('should delegate complex recovery to ErrorRecoveryManager', async () => {
      const mockRecoveryManager = {
        attemptRecovery: vi.fn().mockResolvedValue({ success: true }),
        getRecoveryStrategies: vi.fn().mockReturnValue(['retry', 'fallback'])
      }
      
      render(
        <AdvancedErrorBoundary recoveryManager={mockRecoveryManager}>
          <ThrowError shouldThrow={true} />
        </AdvancedErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: /try again/i })
      await userEvent.click(retryButton)
      
      expect(mockRecoveryManager.attemptRecovery).toHaveBeenCalledWith({
        error: expect.any(Error),
        strategy: 'retry',
        context: expect.any(Object)
      })
    })
  })
})

describe('NetworkErrorHandler', () => {
  it('should detect network-specific errors', () => {
    render(
      <NetworkErrorHandler>
        <ThrowError shouldThrow={true} errorType="network" />
      </NetworkErrorHandler>
    )

    expect(screen.getByText(/connection problem/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check connection/i })).toBeInTheDocument()
  })

  it('should provide offline mode fallback', () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    render(
      <NetworkErrorHandler enableOfflineMode={true}>
        <ThrowError shouldThrow={true} errorType="network" />
      </NetworkErrorHandler>
    )

    expect(screen.getByText(/you're currently offline/i)).toBeInTheDocument()
    expect(screen.getByText(/cached content available/i)).toBeInTheDocument()
  })
})

describe('UserFeedbackCollector', () => {
  it('should validate feedback form inputs', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    
    render(<UserFeedbackCollector onSubmit={onSubmit} />)
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /send feedback/i })
    await user.click(submitButton)
    
    // Should show validation errors
    expect(screen.getByText(/please describe what happened/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should support multiple feedback types', async () => {
    const user = userEvent.setup()
    
    render(<UserFeedbackCollector />)
    
    // Should show feedback type options
    expect(screen.getByRole('radio', { name: /bug report/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /feature request/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /general feedback/i })).toBeInTheDocument()
  })
})

// Performance benchmark tests
describe('Error Boundary Performance', () => {
  it('should handle high-frequency errors without memory leaks', () => {
    const TestComponent = ({ errorCount }: { errorCount: number }) => {
      if (errorCount > 0) throw new Error(`Error ${errorCount}`)
      return <div>Success</div>
    }

    // Simulate multiple error scenarios
    for (let i = 1; i <= 100; i++) {
      const { unmount } = render(
        <AdvancedErrorBoundary>
          <TestComponent errorCount={i} />
        </AdvancedErrorBoundary>
      )
      unmount()
    }

    // Memory usage should remain stable
    if (performance.memory) {
      expect(performance.memory.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024) // 50MB limit
    }
  })
})