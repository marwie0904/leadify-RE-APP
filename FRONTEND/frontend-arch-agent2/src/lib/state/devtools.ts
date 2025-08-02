import { StoreApi } from 'zustand'
import { useEffect } from 'react'

// DevTools connection for debugging Zustand stores
export function createDevTools<T>(name: string) {
  if (typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
    return (store: StoreApi<T>) => store
  }
  
  const devtools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
    name,
    trace: true,
    traceLimit: 25,
  })
  
  return (store: StoreApi<T>) => {
    devtools.init(store.getState())
    
    store.subscribe((state, prevState) => {
      devtools.send('STATE_UPDATE', state)
    })
    
    return store
  }
}

// Debug logger for state changes
export function createStateLogger<T>(storeName: string) {
  return (store: StoreApi<T>) => {
    if (process.env.NODE_ENV === 'production') return store
    
    const unsubscribe = store.subscribe((state, prevState) => {
      console.group(`[${storeName}] State Update`)
      console.log('Previous State:', prevState)
      console.log('Current State:', state)
      console.log('Diff:', getDiff(prevState, state))
      console.groupEnd()
    })
    
    // Clean up on unmount
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', unsubscribe)
    }
    
    return store
  }
}

// Get difference between two states
function getDiff(prev: any, current: any): Record<string, any> {
  const diff: Record<string, any> = {}
  
  // Check for added or modified keys
  for (const key in current) {
    if (prev[key] !== current[key]) {
      diff[key] = {
        prev: prev[key],
        current: current[key],
      }
    }
  }
  
  // Check for removed keys
  for (const key in prev) {
    if (!(key in current)) {
      diff[key] = {
        prev: prev[key],
        current: undefined,
      }
    }
  }
  
  return diff
}

// Performance monitor for state updates
export function createPerformanceMonitor<T>(storeName: string, threshold = 16) {
  return (store: StoreApi<T>) => {
    if (process.env.NODE_ENV === 'production') return store
    
    let updateCount = 0
    let lastResetTime = Date.now()
    
    store.subscribe(() => {
      updateCount++
      const now = Date.now()
      const timeDiff = now - lastResetTime
      
      // Check if updates are happening too frequently
      if (timeDiff < 1000 && updateCount > 60) {
        console.warn(
          `[${storeName}] High frequency updates detected: ${updateCount} updates in ${timeDiff}ms`
        )
      }
      
      // Reset counter every second
      if (timeDiff >= 1000) {
        updateCount = 0
        lastResetTime = now
      }
    })
    
    return store
  }
}

// Hook to debug renders caused by state changes
export function useWhyDidYouRender(componentName: string, props: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') return
  
  const previousProps = useRef<Record<string, any>>()
  
  useEffect(() => {
    if (previousProps.current) {
      const changedProps = Object.entries(props).filter(
        ([key, value]) => previousProps.current![key] !== value
      )
      
      if (changedProps.length > 0) {
        console.group(`[${componentName}] Re-rendered due to prop changes:`)
        changedProps.forEach(([key, value]) => {
          console.log(
            `  ${key}:`,
            previousProps.current![key],
            '→',
            value
          )
        })
        console.groupEnd()
      }
    }
    
    previousProps.current = props
  })
}

// State snapshot utility
export function createStateSnapshot<T>(store: StoreApi<T>) {
  const snapshots: Array<{ timestamp: Date; state: T }> = []
  
  return {
    takeSnapshot: () => {
      const state = store.getState()
      snapshots.push({
        timestamp: new Date(),
        state: JSON.parse(JSON.stringify(state)), // Deep clone
      })
      
      // Keep only last 10 snapshots
      if (snapshots.length > 10) {
        snapshots.shift()
      }
    },
    
    getSnapshots: () => snapshots,
    
    restoreSnapshot: (index: number) => {
      const snapshot = snapshots[index]
      if (snapshot) {
        store.setState(snapshot.state)
      }
    },
    
    clearSnapshots: () => {
      snapshots.length = 0
    },
  }
}

// Export store state for debugging
export function exportStoreState(stores: Record<string, StoreApi<any>>) {
  const state: Record<string, any> = {}
  
  Object.entries(stores).forEach(([name, store]) => {
    state[name] = store.getState()
  })
  
  return {
    timestamp: new Date().toISOString(),
    state,
    export: () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `store-state-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
  }
}