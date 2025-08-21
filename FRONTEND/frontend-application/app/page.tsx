"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [timeoutReached, setTimeoutReached] = useState(false)

  useEffect(() => {
    console.log("[Root Page] Effect triggered", { 
      authLoading, 
      hasUser: !!user, 
      supabaseAvailable: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      pathname: window.location.pathname
    })

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log("[Root Page] Auth loading timeout reached, redirecting to auth")
      setTimeoutReached(true)
      router.push("/auth")
    }, 3000) // 3 second timeout (reduced from 5)

    // If Supabase environment variables are missing, redirect immediately
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log("[Root Page] Supabase not configured, redirecting to auth")
      clearTimeout(timeout)
      router.push("/auth")
      return () => clearTimeout(timeout)
    }

    if (!authLoading) {
      clearTimeout(timeout)
      console.log("[Root Page] Auth loading complete", { user: !!user, hasOrganization: user?.hasOrganization })
      
      if (user) {
        // User is authenticated, check if they have an organization
        console.log("User has organization:", user.hasOrganization)
        if (!user.hasOrganization) {
          // User doesn't have an organization, redirect to organization setup
          console.log("Redirecting to organization setup")
          router.push("/organization-setup")
          
          // Fallback redirect
          setTimeout(() => {
            if (window.location.pathname === "/") {
              console.log("Router redirect failed, using window.location for organization setup")
              window.location.href = "/organization-setup"
            }
          }, 100)
        } else {
          // User has an organization, redirect to dashboard
          console.log("Redirecting to dashboard")
          router.push("/dashboard")
          
          // Fallback redirect
          setTimeout(() => {
            if (window.location.pathname === "/") {
              console.log("Router redirect failed, using window.location for dashboard")
              window.location.href = "/dashboard"
            }
          }, 100)
        }
      } else {
        // User is not authenticated, redirect to auth
        console.log("User not authenticated, redirecting to auth")
        router.push("/auth")
      }
    }

    return () => clearTimeout(timeout)
  }, [user, authLoading, router])

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>
          {timeoutReached 
            ? "Redirecting to login..." 
            : authLoading 
              ? "Checking authentication..." 
              : "Loading..."
          }
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-gray-500">
            <p>Auth Loading: {authLoading ? 'true' : 'false'}</p>
            <p>User: {user ? 'authenticated' : 'none'}</p>
            <p>Timeout: {timeoutReached ? 'reached' : 'waiting'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
