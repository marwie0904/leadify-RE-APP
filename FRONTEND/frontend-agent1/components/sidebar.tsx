"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  UserCheck,
  HandHeart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
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
  const [isCollapsed, setIsCollapsed] = useState(false)
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

  const NavItem = ({ item, isBottom = false }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
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
    <TooltipProvider>
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
            "fixed inset-y-0 z-20 flex flex-col bg-background border-r border-border transition-all duration-300 ease-in-out lg:static",
            isCollapsed ? "w-[72px]" : "w-72",
            isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* Header */}
          <div className="border-b border-border">
            <div className={cn("flex h-16 items-center gap-2 px-4", isCollapsed && "justify-center px-2")}>
              {!isCollapsed && (
                <Link href="/dashboard" className="flex items-center font-semibold">
                  <span className="text-lg">Leadify</span>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn("ml-auto h-8 w-8", isCollapsed && "ml-0")}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
                <span className="sr-only">{isCollapsed ? "Expand" : "Collapse"} Sidebar</span>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1">
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>

          {/* Bottom Navigation */}
          <div className="border-t border-border p-2">
            <nav className="space-y-1">
              {bottomNavigation.map((item) => (
                <NavItem key={item.name} item={item} isBottom />
              ))}
            </nav>
          </div>

          {/* Profile Section */}
          {user && (
            <div className="border-t border-border p-2">
              {isCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full h-12 p-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                            <AvatarFallback>
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
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
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{user.name}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start h-12 px-3">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
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
              )}
            </div>
          )}
        </div>
      </>
    </TooltipProvider>
  )
}
