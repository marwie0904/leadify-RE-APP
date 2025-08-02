# Error Handling Components

This directory contains error handling components for the application.

## Components

### ErrorBoundary
The main error boundary component that catches JavaScript errors anywhere in the component tree.

### Feature-Specific Error Boundaries
- `FeatureErrorBoundary` - Generic feature error boundary with customizable fallback
- `ChatErrorBoundary` - For chat/conversation features
- `AgentErrorBoundary` - For agent-related features
- `AnalyticsErrorBoundary` - For analytics components
- `DashboardErrorBoundary` - For dashboard components

### Error Fallback Components
- `NetworkErrorFallback` - For network/connection errors
- `AuthErrorFallback` - For authentication errors
- `ServerErrorFallback` - For server/API errors
- `ComponentErrorFallback` - For component-level errors

## Usage Examples

### Basic Error Boundary
```tsx
import { ErrorBoundary } from '@/components/error-boundaries'

function MyComponent() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  )
}
```

### Feature-Specific Error Boundary
```tsx
import { ChatErrorBoundary } from '@/components/error-boundaries'

function ChatPage() {
  return (
    <ChatErrorBoundary>
      <ChatInterface />
    </ChatErrorBoundary>
  )
}
```

### Custom Error Handling
```tsx
import { FeatureErrorBoundary } from '@/components/error-boundaries'

function CustomFeature() {
  return (
    <FeatureErrorBoundary 
      feature="custom-feature" 
      fallbackType="network"
    >
      <YourFeatureComponent />
    </FeatureErrorBoundary>
  )
}
```

## Error Pages

The application includes three error pages:

1. **app/error.tsx** - Handles runtime errors in nested routes
2. **app/not-found.tsx** - Handles 404 errors
3. **app/global-error.tsx** - Handles errors in the root layout

## Error Logging

Errors are automatically logged using the error logger service. In production, these would be sent to an error monitoring service like Sentry.