"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/contexts/simple-auth-context"
import { useSidebar } from "@/contexts/sidebar-context"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PostHogAuthWrapper } from "@/components/posthog-auth-wrapper"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const { isCollapsed } = useSidebar()

  const isAuthPage = pathname?.startsWith("/auth")
  const isOrganizationSetupPage = pathname === "/organization-setup"
  const isAdminPage = pathname?.startsWith("/admin")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Render pages without the main layout (auth, org setup, and admin pages)
  if (isAuthPage || isOrganizationSetupPage || isAdminPage) {
    return (
      <PostHogAuthWrapper>
        <main className="min-h-screen">{children}</main>
      </PostHogAuthWrapper>
    )
  }

  // If user is not authenticated and not on an auth page, redirect to auth
  if (!user) {
    console.log("[ClientLayout] No user found, redirecting to auth")
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
    return null
  }

  // Render the main application layout
  return (
    <PostHogAuthWrapper>
      <div className="h-screen flex overflow-hidden">
        <Sidebar />
        {/* Main content area with left margin to account for fixed sidebar */}
        <div 
          className={cn(
            "flex-1 h-screen transition-all duration-300 ease-in-out overflow-y-auto bg-gray-50",
            isCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
          )}
        >
          <main className="p-6 bg-gray-50">{children}</main>
        </div>
      </div>
    </PostHogAuthWrapper>
  )
}
