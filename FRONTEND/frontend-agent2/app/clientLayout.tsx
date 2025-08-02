"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  const isAuthPage = pathname?.startsWith("/auth")
  const isOrganizationSetupPage = pathname === "/organization-setup"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Render pages without the main layout
  if (isAuthPage || isOrganizationSetupPage) {
    return <main className="min-h-screen">{children}</main>
  }

  // If user is not authenticated and not on an auth page, redirect them
  if (!user) {
    // This can be a redirect or just show nothing while auth context redirects
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Render the main application layout
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
