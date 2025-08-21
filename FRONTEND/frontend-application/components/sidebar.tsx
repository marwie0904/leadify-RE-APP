"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/contexts/sidebar-context"
import {
  Home,
  Users2,
  MessagesSquare,
  Settings,
  HelpCircle,
  Menu,
  ChevronLeft,
  Bot,
  Building,
  LogOut,
  HandHeart,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/simple-auth-context"
import { NotificationCenter } from "@/components/notifications/notification-center"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const bottomNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user, signOut, canAccessHumanDashboard } = useAuth()

  // Dynamic navigation based on user permissions
  const getNavigation = () => {
    const baseNavigation = [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Leads", href: "/leads", icon: Users2 },
      { name: "AI Agents", href: "/agents", icon: Bot },
      { name: "Organization", href: "/organization", icon: Building },
      { name: "Conversations", href: "/conversations", icon: MessagesSquare },
    ]

    console.log("[Sidebar] Navigation Debug:", {
      userId: user?.id,
      userRole: user?.role,
      canAccessHumanDashboard,
      willShowHandoff: canAccessHumanDashboard,
      timestamp: new Date().toISOString()
    })

    // Add handoff dashboard for authorized users
    if (canAccessHumanDashboard) {
      console.log("[Sidebar] Adding Handoff to navigation")
      baseNavigation.splice(4, 0, { 
        name: "Handoff", 
        href: "/handoff", 
        icon: HandHeart 
      })
    } else {
      console.log("[Sidebar] NOT adding Handoff - access denied")
    }

    return baseNavigation
  }

  const navigation = getNavigation()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Failed to sign out:", error)
    }
  }

  const NavItem = ({ item, isBottom = false }: { 
    item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }; 
    isBottom?: boolean 
  }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={cn(
            "flex items-center rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200",
            pathname === item.href
              ? "bg-white/20 text-white shadow-sm"
              : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-sm",
            isCollapsed && "justify-center px-2",
          )}
        >
          <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>{item.name}</span>}
        </Link>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right" className="flex items-center gap-4">
          {item.name}
        </TooltipContent>
      )}
    </Tooltip>
  )

  return (
    <TooltipProvider delayDuration={0}>
      <>
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background rounded-md shadow-md"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-20 flex flex-col bg-blue-950 border-r border-border transition-all duration-300 ease-in-out h-screen overflow-hidden",
            isCollapsed ? "w-[72px]" : "w-64",
            isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* LEADIFY Branding at Top */}
          <div className="border-b border-white/10 shadow-sm">
            <div className="p-4">
              <div className="flex items-center justify-center">
                <h1 className={cn(
                  "font-bold text-white tracking-wider",
                  isCollapsed ? "text-xl" : "text-2xl"
                )}>
                  {isCollapsed ? "L" : "LEADIFY"}
                </h1>
              </div>
            </div>
          </div>

          {/* Collapse Button */}
          <div className="px-4 py-1 border-b border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "w-full h-7 hover:bg-white/10 transition-all duration-200 text-white",
                isCollapsed && "px-2"
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronLeft className="h-3 w-3 rotate-180" />
              ) : (
                <>
                  <ChevronLeft className="h-3 w-3 mr-2" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>

          {/* Navigation - directly after profile with no gap */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <nav className="space-y-1 px-4 pt-2 pb-4">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>

          {/* User Profile and Notification at Bottom */}
          {user && (
            <div className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="p-4">
                {isCollapsed ? (
                  <div className="flex flex-col items-center">
                    <NotificationCenter isCollapsed={true} />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="flex-1 justify-start h-auto p-0 hover:bg-white/10 text-white">
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-none truncate text-white">{user.name}</p>
                              <p className="text-xs leading-none text-white/70 truncate mt-1">{user.email ?? ''}</p>
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end" className="w-56">
                          <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                              <p className="text-sm font-medium leading-none">{user.name}</p>
                              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                            </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/settings">Settings</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <NotificationCenter isCollapsed={false} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="border-t border-white/10 px-4 py-2 flex-shrink-0">
            <nav className="space-y-1">
              {bottomNavigation.map((item) => (
                <NavItem key={item.name} item={item} isBottom />
              ))}
            </nav>
          </div>
        </div>
      </>
    </TooltipProvider>
  )
}
