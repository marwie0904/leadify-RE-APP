"use client"

import EnhancedAIAnalyticsPage from './page-enhanced'

export default function TestAIAnalyticsPage() {
  // Bypass authentication for testing
  console.log('[TEST] Rendering AI Analytics page without auth check')
  return <EnhancedAIAnalyticsPage />
}