/**
 * API V1 Migration Helper
 * 
 * Core migration infrastructure for transitioning from /api/ to /api/v1/ endpoints.
 * Designed with DDD principles for separation of concerns and backward compatibility.
 * 
 * @module MigrationHelper
 */

// ===== DOMAIN MODELS =====

/**
 * Endpoint migration mapping interface
 */
interface EndpointMigration {
  pattern: string
  replacement: string
  method?: string
  description?: string
}

/**
 * Migration configuration interface
 */
interface MigrationConfig {
  enabled: boolean
  fallbackToLegacy: boolean
  logMigrations: boolean
}

// ===== ENDPOINT MAPPINGS =====

/**
 * Complete endpoint mapping from legacy /api/ to /api/v1/
 * Organized by domain for maintainability
 */
export const ENDPOINT_MIGRATIONS: Record<string, string> = {
  // Agent endpoints
  '/api/agents': '/api/v1/agents',
  '/api/agents/create': '/api/v1/agents', // POST method uses same endpoint
  '/api/agents/${id}': '/api/v1/agents/${id}',
  '/api/agents/${id}/documents': '/api/v1/agents/${id}/documents',

  // Conversation endpoints
  '/api/conversations': '/api/v1/conversations',
  '/api/conversations/${id}/send-message': '/api/v1/conversations/${id}/messages',
  '/api/conversations/${id}/messages': '/api/v1/conversations/${id}/messages',
  '/api/conversations/${id}/request-handoff': '/api/v1/conversations/${id}/request-handoff',
  '/api/conversations/${id}/accept-handoff': '/api/v1/conversations/${id}/accept-handoff',
  '/api/conversations/priority-queue': '/api/v1/conversations/priority-queue',

  // Lead endpoints
  '/api/leads': '/api/v1/leads',
  '/api/leads/${id}': '/api/v1/leads/${id}',
  '/api/leads/${id}/assign-agent': '/api/v1/leads/${id}/assign-agent',

  // Health endpoints
  '/api/health': '/api/v1/health',

  // Dashboard endpoints
  '/api/dashboard/summary': '/api/v1/dashboard/summary',
  '/api/analytics/revenue': '/api/v1/analytics/revenue',

  // Settings & Profile endpoints
  '/api/settings/profile': '/api/v1/settings/profile',

  // Organization endpoints
  '/api/organization/members': '/api/v1/organization/members',

  // Human-in-Loop endpoints
  '/api/human-agents/dashboard': '/api/v1/human-agents/dashboard',

  // Chat endpoints
  '/api/chat': '/api/v1/chat',

  // Generic catch-all patterns for common REST patterns
  '/api/users': '/api/v1/users',
  '/api/users/${id}': '/api/v1/users/${id}',
}

// ===== DYNAMIC ENDPOINT PATTERNS =====

/**
 * Patterns for dynamic endpoint matching with placeholders
 */
const DYNAMIC_PATTERNS: EndpointMigration[] = [
  {
    pattern: '^/api/agents/([^/]+)$',
    replacement: '/api/v1/agents/$1',
    description: 'Agent by ID'
  },
  {
    pattern: '^/api/agents/([^/]+)/documents$',
    replacement: '/api/v1/agents/$1/documents',
    description: 'Agent documents'
  },
  {
    pattern: '^/api/conversations/([^/]+)$',
    replacement: '/api/v1/conversations/$1',
    description: 'Conversation by ID'
  },
  {
    pattern: '^/api/conversations/([^/]+)/messages$',
    replacement: '/api/v1/conversations/$1/messages',
    description: 'Conversation messages'
  },
  {
    pattern: '^/api/conversations/([^/]+)/send-message$',
    replacement: '/api/v1/conversations/$1/messages',
    description: 'Send message (maps to messages endpoint)'
  },
  {
    pattern: '^/api/conversations/([^/]+)/request-handoff$',
    replacement: '/api/v1/conversations/$1/request-handoff',
    description: 'Request handoff'
  },
  {
    pattern: '^/api/conversations/([^/]+)/accept-handoff$',
    replacement: '/api/v1/conversations/$1/accept-handoff',
    description: 'Accept handoff'
  },
  {
    pattern: '^/api/leads/([^/]+)$',
    replacement: '/api/v1/leads/$1',
    description: 'Lead by ID'
  },
  {
    pattern: '^/api/leads/([^/]+)/assign-agent$',
    replacement: '/api/v1/leads/$1/assign-agent',
    description: 'Assign agent to lead'
  },
  {
    pattern: '^/api/users/([^/]+)$',
    replacement: '/api/v1/users/$1',
    description: 'User by ID'
  }
]

// ===== CORE MIGRATION FUNCTIONS =====

/**
 * Migrates a legacy endpoint to the new v1 format
 * 
 * @param endpoint - The original endpoint to migrate
 * @returns The migrated endpoint with /api/v1/ prefix
 * 
 * @example
 * ```typescript
 * migrateEndpoint('/api/agents/123') // '/api/v1/agents/123'
 * migrateEndpoint('/api/conversations/456/messages') // '/api/v1/conversations/456/messages'
 * ```
 */
export function migrateEndpoint(endpoint: string): string {
  // Early return if already v1
  if (endpoint.startsWith('/api/v1/')) {
    return endpoint
  }

  // Check direct mapping first for performance
  if (ENDPOINT_MIGRATIONS[endpoint]) {
    logMigration(endpoint, ENDPOINT_MIGRATIONS[endpoint], 'direct-mapping')
    return ENDPOINT_MIGRATIONS[endpoint]
  }

  // Handle dynamic segments using template literals (${id} format)
  for (const [oldPath, newPath] of Object.entries(ENDPOINT_MIGRATIONS)) {
    if (oldPath.includes('${')) {
      const regex = new RegExp(oldPath.replace(/\$\{[^}]+\}/g, '([^/]+)'))
      const match = endpoint.match(regex)
      if (match) {
        // Replace ${id} placeholders with actual values
        let migratedPath = newPath
        for (let i = 1; i < match.length; i++) {
          migratedPath = migratedPath.replace(/\$\{[^}]+\}/, match[i])
        }
        logMigration(endpoint, migratedPath, 'template-matching')
        return migratedPath
      }
    }
  }

  // Handle regex patterns for complex dynamic endpoints
  for (const pattern of DYNAMIC_PATTERNS) {
    const regex = new RegExp(pattern.pattern)
    const match = endpoint.match(regex)
    if (match) {
      const migratedPath = endpoint.replace(regex, pattern.replacement)
      logMigration(endpoint, migratedPath, 'regex-pattern')
      return migratedPath
    }
  }

  // Default fallback: just add v1 prefix
  if (endpoint.startsWith('/api/') && !endpoint.startsWith('/api/v1/')) {
    const defaultMigrated = endpoint.replace('/api/', '/api/v1/')
    logMigration(endpoint, defaultMigrated, 'default-prefix')
    return defaultMigrated
  }

  // Return original if no migration needed
  return endpoint
}

// ===== FEATURE FLAG SYSTEM =====

/**
 * Determines if API v1 migration should be used
 * Checks both environment variables and localStorage for flexibility
 * 
 * @returns True if migration should be enabled
 */
export function shouldUseMigratedEndpoint(): boolean {
  // Environment variable takes precedence (for production deployments)
  if (process.env.NEXT_PUBLIC_USE_API_V1 === 'true') {
    return true
  }

  // Explicit disable via environment
  if (process.env.NEXT_PUBLIC_USE_API_V1 === 'false') {
    return false
  }

  // Check localStorage for development/testing (only in browser)
  if (typeof window !== 'undefined') {
    const localStorageFlag = localStorage.getItem('feature:api-v1')
    if (localStorageFlag === 'true') {
      return true
    }
    if (localStorageFlag === 'false') {
      return false
    }
  }

  // Default to false for safety (opt-in migration)
  return false
}

/**
 * Enables API v1 migration via localStorage (for development/testing)
 */
export function enableMigrationForTesting(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('feature:api-v1', 'true')
    console.log('[Migration] API v1 migration enabled via localStorage')
  }
}

/**
 * Disables API v1 migration via localStorage
 */
export function disableMigrationForTesting(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('feature:api-v1', 'false')
    console.log('[Migration] API v1 migration disabled via localStorage')
  }
}

/**
 * Gets current migration configuration
 */
export function getMigrationConfig(): MigrationConfig {
  return {
    enabled: shouldUseMigratedEndpoint(),
    fallbackToLegacy: process.env.NODE_ENV !== 'production',
    logMigrations: process.env.NODE_ENV === 'development'
  }
}

// ===== LOGGING & DEBUGGING =====

/**
 * Logs endpoint migrations for debugging and monitoring
 */
function logMigration(originalEndpoint: string, migratedEndpoint: string, strategy: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Migration] ${originalEndpoint} → ${migratedEndpoint} (${strategy})`)
  }
}

/**
 * Gets migration statistics for monitoring
 */
export function getMigrationStats(): {
  totalMappings: number
  dynamicPatterns: number
  migrationEnabled: boolean
} {
  return {
    totalMappings: Object.keys(ENDPOINT_MIGRATIONS).length,
    dynamicPatterns: DYNAMIC_PATTERNS.length,
    migrationEnabled: shouldUseMigratedEndpoint()
  }
}

// ===== VALIDATION HELPERS =====

/**
 * Validates that an endpoint has been properly migrated
 */
export function validateMigration(originalEndpoint: string, expectedEndpoint?: string): boolean {
  const migrated = migrateEndpoint(originalEndpoint)
  
  if (expectedEndpoint) {
    return migrated === expectedEndpoint
  }
  
  // Basic validation: should have v1 prefix if migration is needed
  if (originalEndpoint.startsWith('/api/') && !originalEndpoint.startsWith('/api/v1/')) {
    return migrated.startsWith('/api/v1/')
  }
  
  return true
}

/**
 * Tests multiple endpoints for migration correctness
 */
export function validateAllMigrations(): { passed: number; failed: number; results: Array<{endpoint: string, migrated: string, valid: boolean}> } {
  const testEndpoints = [
    '/api/agents',
    '/api/agents/123',
    '/api/conversations/456/messages',
    '/api/leads/789',
    '/api/dashboard/summary'
  ]
  
  const results = testEndpoints.map(endpoint => ({
    endpoint,
    migrated: migrateEndpoint(endpoint),
    valid: validateMigration(endpoint)
  }))
  
  const passed = results.filter(r => r.valid).length
  const failed = results.length - passed
  
  return { passed, failed, results }
}

// ===== REQUEST INTERCEPTOR INTEGRATION =====

/**
 * Request interceptor function for integration with API client
 * This is the main integration point with the existing API client
 * 
 * @param endpoint - Original endpoint
 * @param options - Request options
 * @returns Tuple of [migratedEndpoint, options]
 */
export async function migrationRequestInterceptor(
  endpoint: string, 
  options: any
): Promise<[string, any]> {
  if (!shouldUseMigratedEndpoint()) {
    return [endpoint, options]
  }

  const migratedEndpoint = migrateEndpoint(endpoint)
  
  // Add migration metadata to options for debugging
  const enhancedOptions = {
    ...options,
    _migration: {
      original: endpoint,
      migrated: migratedEndpoint,
      timestamp: new Date().toISOString()
    }
  }

  return [migratedEndpoint, enhancedOptions]
}

// ===== EXPORTS =====

export default {
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
}