/**
 * Migration Helper Tests
 * 
 * Comprehensive test suite for API v1 migration functionality
 */

import {
  migrateEndpoint,
  shouldUseMigratedEndpoint,
  enableMigrationForTesting,
  disableMigrationForTesting,
  getMigrationConfig,
  getMigrationStats,
  validateMigration,
  validateAllMigrations,
  migrationRequestInterceptor,
  ENDPOINT_MIGRATIONS
} from './migration-helper'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  // Reset environment
  process.env = { ...originalEnv }
  
  // Clear localStorage if in browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('feature:api-v1')
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('migrateEndpoint', () => {
  test('should migrate direct mappings correctly', () => {
    expect(migrateEndpoint('/api/agents')).toBe('/api/v1/agents')
    expect(migrateEndpoint('/api/conversations')).toBe('/api/v1/conversations')
    expect(migrateEndpoint('/api/leads')).toBe('/api/v1/leads')
    expect(migrateEndpoint('/api/dashboard/summary')).toBe('/api/v1/dashboard/summary')
  })

  test('should handle dynamic ID segments', () => {
    expect(migrateEndpoint('/api/agents/123')).toBe('/api/v1/agents/123')
    expect(migrateEndpoint('/api/conversations/456/messages')).toBe('/api/v1/conversations/456/messages')
    expect(migrateEndpoint('/api/leads/789')).toBe('/api/v1/leads/789')
  })

  test('should handle complex dynamic paths', () => {
    expect(migrateEndpoint('/api/conversations/123/send-message'))
      .toBe('/api/v1/conversations/123/messages')
    expect(migrateEndpoint('/api/conversations/456/request-handoff'))
      .toBe('/api/v1/conversations/456/request-handoff')
    expect(migrateEndpoint('/api/leads/789/assign-agent'))
      .toBe('/api/v1/leads/789/assign-agent')
  })

  test('should handle already migrated endpoints', () => {
    expect(migrateEndpoint('/api/v1/agents')).toBe('/api/v1/agents')
    expect(migrateEndpoint('/api/v1/conversations/123')).toBe('/api/v1/conversations/123')
  })

  test('should use default prefix for unmapped endpoints', () => {
    expect(migrateEndpoint('/api/unknown')).toBe('/api/v1/unknown')
    expect(migrateEndpoint('/api/custom/endpoint')).toBe('/api/v1/custom/endpoint')
  })

  test('should not modify non-api endpoints', () => {
    expect(migrateEndpoint('/health')).toBe('/health')
    expect(migrateEndpoint('/status')).toBe('/status')
    expect(migrateEndpoint('/custom')).toBe('/custom')
  })

  test('should handle edge cases', () => {
    expect(migrateEndpoint('')).toBe('')
    expect(migrateEndpoint('/')).toBe('/')
    expect(migrateEndpoint('/api/')).toBe('/api/v1/')
  })

  test('should handle query parameters', () => {
    expect(migrateEndpoint('/api/leads?assignedAgentId=123'))
      .toBe('/api/v1/leads?assignedAgentId=123')
    expect(migrateEndpoint('/api/conversations/priority-queue?limit=10'))
      .toBe('/api/v1/conversations/priority-queue?limit=10')
  })
})

describe('shouldUseMigratedEndpoint', () => {
  test('should return true when NEXT_PUBLIC_USE_API_V1 is true', () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'true'
    expect(shouldUseMigratedEndpoint()).toBe(true)
  })

  test('should return false when NEXT_PUBLIC_USE_API_V1 is false', () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'false'
    expect(shouldUseMigratedEndpoint()).toBe(false)
  })

  test('should default to false when no environment variable set', () => {
    delete process.env.NEXT_PUBLIC_USE_API_V1
    expect(shouldUseMigratedEndpoint()).toBe(false)
  })

  // Note: localStorage tests would need to run in a browser environment
  // They are included for completeness but may need jsdom or similar to run
})

describe('feature flag management', () => {
  test('enableMigrationForTesting should work in browser environment', () => {
    // Mock localStorage
    const mockLocalStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn()
    }
    
    // @ts-ignore - mocking global
    global.window = { localStorage: mockLocalStorage }
    
    enableMigrationForTesting()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('feature:api-v1', 'true')
    
    // Cleanup
    delete (global as any).window
  })

  test('disableMigrationForTesting should work in browser environment', () => {
    // Mock localStorage
    const mockLocalStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn()
    }
    
    // @ts-ignore - mocking global
    global.window = { localStorage: mockLocalStorage }
    
    disableMigrationForTesting()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('feature:api-v1', 'false')
    
    // Cleanup
    delete (global as any).window
  })
})

describe('getMigrationConfig', () => {
  test('should return correct configuration', () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'true'
    process.env.NODE_ENV = 'development'
    
    const config = getMigrationConfig()
    
    expect(config.enabled).toBe(true)
    expect(config.fallbackToLegacy).toBe(true)
    expect(config.logMigrations).toBe(true)
  })

  test('should return correct configuration for production', () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'false'
    process.env.NODE_ENV = 'production'
    
    const config = getMigrationConfig()
    
    expect(config.enabled).toBe(false)
    expect(config.fallbackToLegacy).toBe(false)
    expect(config.logMigrations).toBe(false)
  })
})

describe('getMigrationStats', () => {
  test('should return accurate statistics', () => {
    const stats = getMigrationStats()
    
    expect(stats.totalMappings).toBeGreaterThan(0)
    expect(stats.dynamicPatterns).toBeGreaterThan(0)
    expect(typeof stats.migrationEnabled).toBe('boolean')
  })

  test('should reflect current migration state', () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'true'
    const enabledStats = getMigrationStats()
    expect(enabledStats.migrationEnabled).toBe(true)

    process.env.NEXT_PUBLIC_USE_API_V1 = 'false'
    const disabledStats = getMigrationStats()
    expect(disabledStats.migrationEnabled).toBe(false)
  })
})

describe('validateMigration', () => {
  test('should validate correct migrations', () => {
    expect(validateMigration('/api/agents', '/api/v1/agents')).toBe(true)
    expect(validateMigration('/api/conversations/123', '/api/v1/conversations/123')).toBe(true)
  })

  test('should detect incorrect migrations', () => {
    expect(validateMigration('/api/agents', '/api/wrong')).toBe(false)
    expect(validateMigration('/api/agents', '/api/agents')).toBe(false)
  })

  test('should validate without expected endpoint', () => {
    expect(validateMigration('/api/agents')).toBe(true)
    expect(validateMigration('/api/v1/agents')).toBe(true)
  })
})

describe('validateAllMigrations', () => {
  test('should validate all test endpoints successfully', () => {
    const results = validateAllMigrations()
    
    expect(results.passed).toBeGreaterThan(0)
    expect(results.failed).toBe(0)
    expect(results.results).toHaveLength(5) // Test endpoints count
    
    results.results.forEach(result => {
      expect(result.valid).toBe(true)
      expect(result.migrated).toMatch(/^\/api\/v1\//)
    })
  })
})

describe('migrationRequestInterceptor', () => {
  test('should not modify endpoint when migration disabled', async () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'false'
    
    const [endpoint, options] = await migrationRequestInterceptor('/api/agents', {})
    
    expect(endpoint).toBe('/api/agents')
    expect(options).toEqual({})
  })

  test('should migrate endpoint when migration enabled', async () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'true'
    
    const [endpoint, options] = await migrationRequestInterceptor('/api/agents', { method: 'GET' })
    
    expect(endpoint).toBe('/api/v1/agents')
    expect(options._migration).toBeDefined()
    expect(options._migration.original).toBe('/api/agents')
    expect(options._migration.migrated).toBe('/api/v1/agents')
    expect(options.method).toBe('GET')
  })

  test('should add migration metadata', async () => {
    process.env.NEXT_PUBLIC_USE_API_V1 = 'true'
    
    const [endpoint, options] = await migrationRequestInterceptor('/api/conversations/123', {})
    
    expect(options._migration).toEqual({
      original: '/api/conversations/123',
      migrated: '/api/v1/conversations/123',
      timestamp: expect.any(String)
    })
  })
})

describe('ENDPOINT_MIGRATIONS constant', () => {
  test('should contain all required endpoint mappings', () => {
    const requiredEndpoints = [
      '/api/agents',
      '/api/conversations',
      '/api/leads',
      '/api/dashboard/summary',
      '/api/settings/profile',
      '/api/organization/members'
    ]

    requiredEndpoints.forEach(endpoint => {
      expect(ENDPOINT_MIGRATIONS[endpoint]).toBeDefined()
      expect(ENDPOINT_MIGRATIONS[endpoint]).toMatch(/^\/api\/v1\//)
    })
  })

  test('should have consistent v1 prefix for all mappings', () => {
    Object.values(ENDPOINT_MIGRATIONS).forEach(migratedEndpoint => {
      expect(migratedEndpoint).toMatch(/^\/api\/v1\//)
    })
  })
})

describe('integration scenarios', () => {
  test('should handle realistic API call scenarios', () => {
    const scenarios = [
      { input: '/api/agents', expected: '/api/v1/agents' },
      { input: '/api/agents/create', expected: '/api/v1/agents' },
      { input: '/api/conversations/abc123/messages', expected: '/api/v1/conversations/abc123/messages' },
      { input: '/api/leads/def456/assign-agent', expected: '/api/v1/leads/def456/assign-agent' },
      { input: '/api/conversations/ghi789/send-message', expected: '/api/v1/conversations/ghi789/messages' }
    ]

    scenarios.forEach(({ input, expected }) => {
      expect(migrateEndpoint(input)).toBe(expected)
    })
  })

  test('should handle edge cases gracefully', () => {
    const edgeCases = [
      '',
      '/',
      '/api',
      '/api/',
      '/notapi/test',
      '/api/v1/already-migrated',
      '/api/agents/123/456/deep/path'
    ]

    edgeCases.forEach(endpoint => {
      // Should not throw errors
      expect(() => migrateEndpoint(endpoint)).not.toThrow()
      
      // Result should be a string
      expect(typeof migrateEndpoint(endpoint)).toBe('string')
    })
  })
})

describe('backward compatibility', () => {
  test('should maintain existing API functionality', () => {
    // Ensure that the migration system doesn't break existing patterns
    expect(migrateEndpoint('/api/agents')).not.toBe('/api/agents')
    expect(migrateEndpoint('/api/v1/agents')).toBe('/api/v1/agents')
  })

  test('should preserve query parameters and fragments', () => {
    expect(migrateEndpoint('/api/agents?limit=10&offset=20'))
      .toBe('/api/v1/agents?limit=10&offset=20')
    expect(migrateEndpoint('/api/conversations#section'))
      .toBe('/api/v1/conversations#section')
  })
})

// Mock console methods to avoid test output noise
beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
})