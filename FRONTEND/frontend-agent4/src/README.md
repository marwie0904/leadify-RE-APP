# State Management Architecture

This project implements a modern state management solution using:
- **React Query (TanStack Query)** for server state
- **Zustand** for client state
- **WebSocket** for real-time updates

## Architecture Overview

### 1. Server State (React Query)

Located in `src/hooks/queries/` and `src/hooks/mutations/`

#### Query Hooks
- `useUser()` - Fetch current user profile
- `useConversations()` - Fetch conversations with filters
- `useLeads()` - Fetch leads with filters
- `useAnalytics()` - Fetch analytics data
- `useAgents()` - Fetch AI agents

#### Mutation Hooks
- `useUpdateProfile()` - Update user profile with optimistic updates
- `useSendMessage()` - Send messages with optimistic updates
- `useCreateLead()` - Create leads with optimistic updates
- `useUpdateAgent()` - Update AI agent configuration

### 2. Client State (Zustand)

Located in `src/stores/`

#### UI Store (`ui-store.ts`)
- Sidebar state (open/collapsed)
- Modal management
- Theme preferences
- Global loading states

#### User Preferences Store (`user-preferences-store.ts`)
- Display preferences (date/time format, currency)
- Dashboard layout preferences
- Notification settings
- Feature flags

#### Notification Store (`notification-store.ts`)
- Toast/alert management
- Success/error/warning/info notifications
- Auto-dismiss functionality

### 3. Real-time Updates (WebSocket)

Located in `src/lib/websocket/`

- Automatic reconnection with exponential backoff
- Message subscription system
- Integration with React Query for cache updates

## Usage Examples

### Basic Query Usage
```typescript
import { useUser } from '@/src/hooks/queries/use-user'

function Profile() {
  const { data: user, isLoading, error } = useUser()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{user.name}</div>
}
```

### Mutation with Optimistic Updates
```typescript
import { useUpdateProfile } from '@/src/hooks/mutations/use-update-profile'

function ProfileForm() {
  const updateProfile = useUpdateProfile()
  
  const handleSubmit = async (data) => {
    try {
      await updateProfile.mutateAsync(data)
      // Success handled by mutation
    } catch (error) {
      // Error handled by mutation
    }
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

### Using Zustand Stores
```typescript
import { useUIStore } from '@/src/stores/ui-store'
import { uiSelectors } from '@/src/lib/state/selectors'

function Sidebar() {
  // Using selector
  const isOpen = useUIStore(uiSelectors.isSidebarOpen)
  
  // Using actions
  const { toggleSidebar } = useUIStore()
  
  return (
    <div className={isOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </div>
  )
}
```

### Infinite Scroll
```typescript
import { useConversationMessages } from '@/src/hooks/queries/use-conversations'

function Messages({ conversationId }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(conversationId)
  
  const messages = data?.pages.flatMap(page => page.data) ?? []
  
  return (
    <div>
      {messages.map(msg => <Message key={msg.id} {...msg} />)}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

## Key Features

### 1. Optimistic Updates
All mutations implement optimistic updates for instant UI feedback:
- Immediate UI update on action
- Automatic rollback on error
- Cache synchronization on success

### 2. Type Safety
Full TypeScript support with:
- Typed API responses
- Typed store states
- Typed mutations

### 3. Performance Optimizations
- Query deduplication
- Intelligent caching (stale-while-revalidate)
- Selective re-renders with Zustand selectors
- Prefetching for route transitions

### 4. Developer Experience
- React Query DevTools integration
- Zustand DevTools support
- Comprehensive error handling
- Loading states management

## Best Practices

1. **Use Query Keys Consistently**
   ```typescript
   import { queryKeys } from '@/src/lib/react-query/utils'
   
   // Good
   queryKey: queryKeys.userProfile()
   
   // Bad
   queryKey: ['user', 'profile']
   ```

2. **Leverage Optimistic Updates**
   ```typescript
   onMutate: async (newData) => {
     // Cancel queries
     // Snapshot previous data
     // Update cache optimistically
     return { previousData }
   }
   ```

3. **Use Selectors for Performance**
   ```typescript
   // Good - only re-renders when specific value changes
   const theme = useUIStore(state => state.theme)
   
   // Bad - re-renders on any store change
   const { theme } = useUIStore()
   ```

4. **Handle Loading and Error States**
   ```typescript
   if (isLoading) return <Skeleton />
   if (error) return <ErrorBoundary error={error} />
   ```

## Folder Structure

```
src/
├── lib/
│   ├── react-query/
│   │   ├── client.ts       # QueryClient configuration
│   │   ├── providers.tsx   # React Query Provider
│   │   ├── types.ts        # TypeScript types
│   │   ├── utils.ts        # Query utilities
│   │   └── prefetch.ts     # Prefetching utilities
│   ├── websocket/
│   │   └── client.ts       # WebSocket manager
│   └── state/
│       ├── persist.ts      # Persistence utilities
│       ├── devtools.ts     # DevTools integration
│       └── selectors.ts    # Reusable selectors
├── stores/
│   ├── ui-store.ts         # UI state
│   ├── user-preferences-store.ts  # User preferences
│   └── notification-store.ts      # Notifications
├── hooks/
│   ├── queries/            # React Query hooks
│   └── mutations/          # Mutation hooks
└── examples/
    └── state-management-example.tsx  # Usage examples
```

## Testing

The state management system is designed to be easily testable:

1. **Mock API calls** in React Query
2. **Test Zustand stores** in isolation
3. **Mock WebSocket** connections
4. **Use React Testing Library** for integration tests

## Migration Guide

If migrating from Context API or Redux:

1. Move API calls to React Query hooks
2. Move client state to Zustand stores
3. Replace Redux selectors with Zustand selectors
4. Update components to use new hooks

## Performance Monitoring

Monitor performance with:
- React Query DevTools for query performance
- Zustand DevTools for state updates
- Browser DevTools for render performance
- Custom performance monitoring utilities