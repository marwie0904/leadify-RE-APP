"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { fetchUserWithOrganization } from "@/lib/api/consolidated-auth"
import { buildApiUrl, apiConfig } from "@/lib/utils/api-config"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create Supabase client if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

interface User {
  id: string
  email: string
  name: string
  role: "admin" | "moderator" | "agent" | "human_agent"
  organizationId: string
  hasOrganization: boolean
  isHumanAgent?: boolean
  humanAgentId?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  getAuthHeaders: () => Promise<{ Authorization: string } | {}>
  getTokens: () => Promise<{ accessToken: string; refreshToken: string } | null>
  refreshUserOrganization: () => Promise<void>
  updateUserName: (name: string) => void
  isHumanAgent: boolean
  canAccessHumanDashboard: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables");
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleUserSession(session)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserSession(session)
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleUserSession = async (session: any) => {
    setLoading(true)
    try {
      console.log("[Auth Context] Starting user session handling for:", session.user.id)
      
      // Fetch consolidated user data using the new helper
      const { profile, organizationMember, hasOrganization } = await fetchUserWithOrganization(
        session.user.id,
        session.access_token
      )

      // Debug log the raw data
      console.log("[Auth Context] Raw API data:", {
        profile,
        organizationMember,
        hasOrganization
      })

      // Extract user data with fallbacks
      const userDataFromApi = profile
      const organizationRole = organizationMember?.role || profile?.role || "agent"
      
      // Get organization ID from multiple sources
      // 1. From the matched organization member
      // 2. From the profile (which comes from the backend's req.user.organization_id)
      // 3. From alternative field names
      const organizationId = organizationMember?.organization_id || 
                            profile?.organization_id || 
                            profile?.organizationId || 
                            ""
      
      // If we have an organization_id from profile but no organizationMember,
      // it means the members endpoint didn't return this user or there was an issue
      // We should still consider the user as having an organization
      const effectiveHasOrganization = hasOrganization || !!organizationId
      
      // Check if user is a human agent (role can be "agent" or "human_agent")
      const isHumanAgent = organizationRole === "human_agent" || organizationRole === "agent" || profile?.is_human_agent === true
      const humanAgentId = profile?.human_agent_id || (isHumanAgent ? profile?.id : undefined)

      console.log("[Auth Context] Final user determination:", {
        profileRole: profile?.role,
        organizationRole,
        finalRole: organizationRole,
        hasOrganization,
        effectiveHasOrganization,
        organizationId,
        organizationMember,
        profile,
        isHumanAgent,
        humanAgentId,
        willRedirectToOrganizationSetup: !effectiveHasOrganization,
        timestamp: new Date().toISOString()
      })

      const finalUser: User = {
        id: session.user.id,
        email: session.user.email || "",
        name: profile?.name || session.user.user_metadata?.full_name || "User",
        role: organizationRole,
        organizationId: organizationId,
        hasOrganization: effectiveHasOrganization,
        isHumanAgent: isHumanAgent,
        humanAgentId: humanAgentId,
      }

      setUser(finalUser)
    } catch (error) {
      console.error("[Auth Context] Error fetching user profile:", error)
      // Fallback to basic user info if API fails
      setUser({
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.user_metadata?.full_name || "User",
        role: "agent",
        organizationId: "",
        hasOrganization: false,
        isHumanAgent: false,
        humanAgentId: undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth?verified=true`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) throw new Error("Supabase client not initialized");
    await supabase.auth.signOut()
    setUser(null)
    router.push("/auth")
  }

  const getAuthHeaders = async () => {
    if (!supabase) return {};
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  const getTokens = async () => {
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session ? { accessToken: session.access_token, refreshToken: session.refresh_token || "" } : null
  }

  const refreshUserOrganization = async () => {
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) await handleUserSession(session)
  }

  const updateUserName = (name: string) => {
    setUser((prev) => (prev ? { ...prev, name } : null))
  }

  // Computed values for human agent functionality
  const isHumanAgent = user?.isHumanAgent === true || user?.role === "human_agent" || user?.role === "agent"
  // Admins and agents can access the human dashboard
  const canAccessHumanDashboard = isHumanAgent || user?.role === "admin" || user?.role === "agent"

  // Debug logging for role detection (only when user exists to avoid spam)
  if (user) {
    console.log("[Auth Context] Role Detection Debug:", {
      userId: user?.id,
      userRole: user?.role,
      isHumanAgentField: user?.isHumanAgent,
      humanAgentId: user?.humanAgentId,
      computedIsHumanAgent: isHumanAgent,
      computedCanAccessHumanDashboard: canAccessHumanDashboard,
      shouldShowHumanFeatures: canAccessHumanDashboard,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        getAuthHeaders,
        getTokens,
        refreshUserOrganization,
        updateUserName,
        isHumanAgent,
        canAccessHumanDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
