/**
 * Migration Validation Script
 * 
 * Validates that the API v1 migration system is working correctly.
 * Can be run independently to verify migration functionality.
 */

import {
  migrateEndpoint,
  shouldUseMigratedEndpoint,
  getMigrationConfig,
  getMigrationStats,
  validateAllMigrations,
  ENDPOINT_MIGRATIONS
} from './migration-helper'

interface ValidationResult {
  success: boolean
  message: string
  details?: any
}

/**
 * Validates endpoint migration mappings
 */
function validateEndpointMappings(): ValidationResult {
  console.log('\n🔍 Validating endpoint mappings...')
  
  const testCases = [
    { input: '/api/agents', expected: '/api/v1/agents' },
    { input: '/api/agents/123', expected: '/api/v1/agents/123' },
    { input: '/api/conversations', expected: '/api/v1/conversations' },
    { input: '/api/conversations/456/messages', expected: '/api/v1/conversations/456/messages' },
    { input: '/api/conversations/789/send-message', expected: '/api/v1/conversations/789/messages' },
    { input: '/api/leads', expected: '/api/v1/leads' },
    { input: '/api/leads/abc/assign-agent', expected: '/api/v1/leads/abc/assign-agent' },
    { input: '/api/dashboard/summary', expected: '/api/v1/dashboard/summary' },
    { input: '/api/settings/profile', expected: '/api/v1/settings/profile' },
    { input: '/api/organization/members', expected: '/api/v1/organization/members' }
  ]

  const results = testCases.map(({ input, expected }) => {
    const actual = migrateEndpoint(input)
    const success = actual === expected
    
    console.log(
      success ? '✅' : '❌',
      `${input} → ${actual}`,
      success ? '' : `(expected: ${expected})`
    )
    
    return { input, expected, actual, success }
  })

  const failures = results.filter(r => !r.success)
  
  if (failures.length === 0) {
    return {
      success: true,
      message: `All ${results.length} endpoint mappings are correct`,
      details: { total: results.length, passed: results.length, failed: 0 }
    }
  } else {
    return {
      success: false,
      message: `${failures.length} endpoint mappings failed`,
      details: { total: results.length, passed: results.length - failures.length, failed: failures.length, failures }
    }
  }
}

/**
 * Validates feature flag functionality
 */
function validateFeatureFlags(): ValidationResult {
  console.log('\n🚩 Validating feature flags...')
  
  // Test environment variable scenarios
  const originalEnv = process.env.NEXT_PUBLIC_USE_API_V1
  
  try {
    // Test enabled via environment
    process.env.NEXT_PUBLIC_USE_API_V1 = 'true'
    const enabledResult = shouldUseMigratedEndpoint()
    console.log('✅ Environment variable "true":', enabledResult === true ? 'PASS' : 'FAIL')
    
    // Test disabled via environment
    process.env.NEXT_PUBLIC_USE_API_V1 = 'false'
    const disabledResult = shouldUseMigratedEndpoint()
    console.log('✅ Environment variable "false":', disabledResult === false ? 'PASS' : 'FAIL')
    
    // Test default behavior
    delete process.env.NEXT_PUBLIC_USE_API_V1
    const defaultResult = shouldUseMigratedEndpoint()
    console.log('✅ Default behavior:', defaultResult === false ? 'PASS' : 'FAIL')
    
    const allPassed = enabledResult === true && disabledResult === false && defaultResult === false
    
    return {
      success: allPassed,
      message: allPassed ? 'All feature flag tests passed' : 'Some feature flag tests failed',
      details: { enabled: enabledResult, disabled: disabledResult, default: defaultResult }
    }
  } finally {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_USE_API_V1 = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_USE_API_V1
    }
  }
}

/**
 * Validates migration configuration
 */
function validateMigrationConfig(): ValidationResult {
  console.log('\n⚙️ Validating migration configuration...')
  
  try {
    const config = getMigrationConfig()
    const stats = getMigrationStats()
    
    console.log('✅ Configuration:', JSON.stringify(config, null, 2))
    console.log('✅ Statistics:', JSON.stringify(stats, null, 2))
    
    const hasRequiredProperties = (
      typeof config.enabled === 'boolean' &&
      typeof config.fallbackToLegacy === 'boolean' &&
      typeof config.logMigrations === 'boolean' &&
      typeof stats.totalMappings === 'number' &&
      typeof stats.dynamicPatterns === 'number' &&
      typeof stats.migrationEnabled === 'boolean'
    )
    
    return {
      success: hasRequiredProperties,
      message: hasRequiredProperties ? 'Migration configuration is valid' : 'Migration configuration is invalid',
      details: { config, stats }
    }
  } catch (error) {
    return {
      success: false,
      message: `Migration configuration validation failed: ${error}`,
      details: { error }
    }
  }
}

/**
 * Validates built-in validation functions
 */
function validateValidationFunctions(): ValidationResult {
  console.log('\n🔬 Validating built-in validation functions...')
  
  try {
    const results = validateAllMigrations()
    
    console.log(`✅ Built-in validation results:`)
    console.log(`   - Total tests: ${results.results.length}`)
    console.log(`   - Passed: ${results.passed}`)
    console.log(`   - Failed: ${results.failed}`)
    
    results.results.forEach(result => {
      console.log(
        result.valid ? '✅' : '❌',
        `${result.endpoint} → ${result.migrated}`
      )
    })
    
    return {
      success: results.failed === 0,
      message: results.failed === 0 ? 'All built-in validations passed' : `${results.failed} built-in validations failed`,
      details: results
    }
  } catch (error) {
    return {
      success: false,
      message: `Built-in validation functions failed: ${error}`,
      details: { error }
    }
  }
}

/**
 * Validates endpoint mappings completeness
 */
function validateMappingCompleteness(): ValidationResult {
  console.log('\n📋 Validating mapping completeness...')
  
  const requiredEndpoints = [
    '/api/agents',
    '/api/agents/create',
    '/api/conversations',
    '/api/conversations/priority-queue',
    '/api/leads',
    '/api/dashboard/summary',
    '/api/settings/profile',
    '/api/organization/members',
    '/api/human-agents/dashboard',
    '/api/chat',
    '/api/health'
  ]
  
  const missing = requiredEndpoints.filter(endpoint => !ENDPOINT_MIGRATIONS[endpoint])
  const present = requiredEndpoints.filter(endpoint => ENDPOINT_MIGRATIONS[endpoint])
  
  console.log(`✅ Present mappings (${present.length}):`)
  present.forEach(endpoint => {
    console.log(`   ${endpoint} → ${ENDPOINT_MIGRATIONS[endpoint]}`)
  })
  
  if (missing.length > 0) {
    console.log(`❌ Missing mappings (${missing.length}):`)
    missing.forEach(endpoint => {
      console.log(`   ${endpoint}`)
    })
  }
  
  return {
    success: missing.length === 0,
    message: missing.length === 0 
      ? `All ${requiredEndpoints.length} required endpoints have mappings`
      : `${missing.length} required endpoints are missing mappings`,
    details: { present, missing, total: requiredEndpoints.length }
  }
}

/**
 * Validates edge cases
 */
function validateEdgeCases(): ValidationResult {
  console.log('\n🎯 Validating edge cases...')
  
  const edgeCases = [
    { input: '', expected: '' },
    { input: '/', expected: '/' },
    { input: '/api/', expected: '/api/v1/' },
    { input: '/api/v1/already-migrated', expected: '/api/v1/already-migrated' },
    { input: '/not-api/endpoint', expected: '/not-api/endpoint' },
    { input: '/api/unknown', expected: '/api/v1/unknown' },
    { input: '/api/agents/123/456/deep', expected: '/api/v1/agents/123/456/deep' }
  ]
  
  const results = edgeCases.map(({ input, expected }) => {
    try {
      const actual = migrateEndpoint(input)
      const success = actual === expected
      
      console.log(
        success ? '✅' : '❌',
        `"${input}" → "${actual}"`,
        success ? '' : `(expected: "${expected}")`
      )
      
      return { input, expected, actual, success }
    } catch (error) {
      console.log('❌', `"${input}" → ERROR: ${error}`)
      return { input, expected, actual: null, success: false, error }
    }
  })
  
  const failures = results.filter(r => !r.success)
  
  return {
    success: failures.length === 0,
    message: failures.length === 0 
      ? `All ${results.length} edge cases handled correctly`
      : `${failures.length} edge cases failed`,
    details: { total: results.length, passed: results.length - failures.length, failed: failures.length, failures }
  }
}

/**
 * Main validation function
 */
export function runMigrationValidation(): { success: boolean; results: ValidationResult[] } {
  console.log('🚀 Starting API v1 Migration Validation\n')
  console.log('=' + '='.repeat(50))
  
  const validations = [
    validateEndpointMappings,
    validateFeatureFlags,
    validateMigrationConfig,
    validateValidationFunctions,
    validateMappingCompleteness,
    validateEdgeCases
  ]
  
  const results = validations.map(validation => {
    try {
      return validation()
    } catch (error) {
      return {
        success: false,
        message: `Validation failed with error: ${error}`,
        details: { error }
      }
    }
  })
  
  const totalTests = results.length
  const passedTests = results.filter(r => r.success).length
  const failedTests = totalTests - passedTests
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 VALIDATION SUMMARY')
  console.log('=', '='.repeat(48))
  console.log(`Total validations: ${totalTests}`)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 All validations passed! Migration system is ready to use.')
  } else {
    console.log('\n⚠️  Some validations failed. Please review the results above.')
  }
  
  return {
    success: failedTests === 0,
    results
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  runMigrationValidation()
}