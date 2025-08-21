"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import { useRouter } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { Loader2 } from "lucide-react"

export default function OrganizationSetupPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to auth
        console.log("No user found, redirecting to auth")
        router.replace("/auth")
      } else {
        // User is authenticated, show onboarding
        // Note: We don't check hasOrganization here to allow the full onboarding flow
        setIsReady(true)
      }
    }
  }, [user, loading, router])

  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Show the onboarding flow starting from organization since they don't have one yet
  // Skip the welcome screen for users being redirected here
  return <OnboardingFlow initialStep="organization" />
}