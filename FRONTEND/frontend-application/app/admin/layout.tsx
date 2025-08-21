"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Users2,
  Building,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Menu,
  X,
  Shield,
  ChevronRight,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminAuthProvider } from "@/contexts/admin-auth-context"

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: Home,
    color: "text-blue-600"
  },
  {
    title: "Leadify Team",
    href: "/admin/team",
    icon: Users,
    color: "text-green-600"
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users2,
    color: "text-purple-600"
  },
  {
    title: "Organizations",
    href: "/admin/organizations",
    icon: Building,
    color: "text-orange-600"
  },
  {
    title: "AI Analytics",
    href: "/admin/ai-analytics",
    icon: BarChart3,
    color: "text-indigo-600"
  },
  {
    title: "Issue Dashboard",
    href: "/admin/issues",
    icon: AlertTriangle,
    color: "text-red-600"
  },
  {
    title: "Feature Requests",
    href: "/admin/feature-requests",
    icon: Lightbulb,
    color: "text-blue-600"
  },
]

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Check for admin authentication
  useEffect(() => {
    // Skip authentication check for the login page
    if (pathname === '/admin/login') {
      return
    }

    // Check for test mode FIRST
    const isTestMode = localStorage.getItem('test_mode') === 'true'
    if (isTestMode) {
      console.log('[Admin Layout] Test mode enabled - skipping authentication')
      return
    }

    const adminToken = localStorage.getItem('admin_token')
    const adminUser = localStorage.getItem('admin_user')
    
    if (!adminToken || !adminUser) {
      console.log('[Admin Layout] No admin credentials, redirecting to admin login')
      router.push('/admin/login')
      return
    }

    // Verify the token is still valid (skip in test mode)
    if (!isTestMode) {
      // Verify token with error handling and retry logic
      const verifyToken = async (retryCount = 0) => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/verify`, {
            headers: {
              'Authorization': `Bearer ${adminToken}`
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(5000)
          })
          
          if (!response.ok) {
            // Only redirect if we get an explicit auth failure (401/403)
            if (response.status === 401 || response.status === 403) {
              console.log('[Admin Layout] Admin token invalid, redirecting to admin login')
              localStorage.removeItem('admin_token')
              localStorage.removeItem('admin_user')
              router.push('/admin/login')
            } else {
              // For other errors, log but don't redirect (server might be temporarily down)
              console.warn(`[Admin Layout] Verify endpoint returned ${response.status}, continuing with cached auth`)
            }
          }
        } catch (error) {
          console.error('[Admin Layout] Error verifying admin token:', error)
          
          // Retry with exponential backoff for network errors
          if (retryCount < 2) {
            const delay = Math.pow(2, retryCount) * 1000
            console.log(`[Admin Layout] Retrying verification in ${delay}ms...`)
            setTimeout(() => verifyToken(retryCount + 1), delay)
          } else {
            // After retries, continue with cached auth rather than blocking
            console.warn('[Admin Layout] Could not verify token after retries, continuing with cached authentication')
          }
        }
      }
      
      verifyToken()
    }
  }, [pathname, router])

  // Don't show layout for login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleSignOut = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin/login')
  }

  const adminUser = (() => {
    try {
      // Use mock user in test mode
      const isTestMode = localStorage.getItem('test_mode') === 'true'
      if (isTestMode) {
        return {
          id: 'admin-test-id',
          name: 'Test Admin',
          email: 'admin@test.com',
          role: 'Admin'
        }
      }
      const stored = localStorage.getItem('admin_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-30",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">Admin Panel</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-blue-600" : item.color)} />
                  <span>{item.title}</span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                {adminUser?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {adminUser?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {adminUser?.role || 'Developer'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between lg:justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Link href="/" className="flex items-center space-x-2">
                <span>View Main App</span>
              </Link>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  )
}