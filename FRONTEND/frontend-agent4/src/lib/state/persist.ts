import { StateStorage } from 'zustand/middleware'

// Custom storage implementation with encryption support
export const createSecureStorage = (prefix = 'app'): StateStorage => {
  return {
    getItem: (name: string) => {
      const key = `${prefix}:${name}`
      try {
        const value = localStorage.getItem(key)
        if (!value) return null
        
        // Decrypt if needed (placeholder for actual encryption)
        return value
      } catch (error) {
        console.error(`Error reading from storage:`, error)
        return null
      }
    },
    
    setItem: (name: string, value: string) => {
      const key = `${prefix}:${name}`
      try {
        // Encrypt if needed (placeholder for actual encryption)
        localStorage.setItem(key, value)
      } catch (error) {
        console.error(`Error writing to storage:`, error)
      }
    },
    
    removeItem: (name: string) => {
      const key = `${prefix}:${name}`
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Error removing from storage:`, error)
      }
    },
  }
}

// Storage migration utilities
export const storageMigrations = {
  // Migrate from old storage format to new
  migrate: (oldKey: string, newKey: string, transform?: (data: any) => any) => {
    try {
      const oldData = localStorage.getItem(oldKey)
      if (oldData) {
        const parsed = JSON.parse(oldData)
        const transformed = transform ? transform(parsed) : parsed
        localStorage.setItem(newKey, JSON.stringify(transformed))
        localStorage.removeItem(oldKey)
        return true
      }
    } catch (error) {
      console.error('Migration failed:', error)
    }
    return false
  },
  
  // Clear all app storage
  clearAll: (prefix = 'app') => {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(`${prefix}:`))
    keys.forEach((key) => localStorage.removeItem(key))
  },
  
  // Export all storage data
  exportData: (prefix = 'app') => {
    const data: Record<string, any> = {}
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(`${prefix}:`))
    
    keys.forEach((key) => {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          data[key] = JSON.parse(value)
        }
      } catch {
        data[key] = localStorage.getItem(key)
      }
    })
    
    return data
  },
  
  // Import storage data
  importData: (data: Record<string, any>) => {
    Object.entries(data).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      } catch (error) {
        console.error(`Failed to import ${key}:`, error)
      }
    })
  },
}

// Session storage adapter
export const createSessionStorage = (prefix = 'app'): StateStorage => {
  return {
    getItem: (name: string) => {
      const key = `${prefix}:${name}`
      return sessionStorage.getItem(key)
    },
    
    setItem: (name: string, value: string) => {
      const key = `${prefix}:${name}`
      sessionStorage.setItem(key, value)
    },
    
    removeItem: (name: string) => {
      const key = `${prefix}:${name}`
      sessionStorage.removeItem(key)
    },
  }
}

// IndexedDB storage for large data
export const createIndexedDBStorage = (dbName = 'AppStorage', version = 1): StateStorage => {
  let db: IDBDatabase | null = null
  
  const initDB = async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }
      
      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result
        if (!database.objectStoreNames.contains('state')) {
          database.createObjectStore('state')
        }
      }
    })
  }
  
  return {
    getItem: async (name: string) => {
      if (!db) db = await initDB()
      
      return new Promise((resolve) => {
        const transaction = db.transaction(['state'], 'readonly')
        const store = transaction.objectStore('state')
        const request = store.get(name)
        
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => resolve(null)
      })
    },
    
    setItem: async (name: string, value: string) => {
      if (!db) db = await initDB()
      
      return new Promise<void>((resolve) => {
        const transaction = db.transaction(['state'], 'readwrite')
        const store = transaction.objectStore('state')
        store.put(value, name)
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      })
    },
    
    removeItem: async (name: string) => {
      if (!db) db = await initDB()
      
      return new Promise<void>((resolve) => {
        const transaction = db.transaction(['state'], 'readwrite')
        const store = transaction.objectStore('state')
        store.delete(name)
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      })
    },
  }
}