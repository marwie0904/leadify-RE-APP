"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient, Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

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

  const handleUserSession = async (session: Session) => {
    setLoading(true)
    try {
      const authHeaders = { Authorization: `Bearer ${session.access_token}` }
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      console.log("[Auth Context] Environment Debug:", {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        API_BASE_URL: API_BASE_URL,
        allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC'))
      })

      // Try to get user data from profile endpoint first
      const profileResponse = await fetch(`${API_BASE_URL}/api/settings/profile`, {
        headers: authHeaders,
      })

      let userDataFromApi = null
      if (profileResponse.ok) {
        userDataFromApi = await profileResponse.json()
        console.log("[Auth Context] Profile API response:", userDataFromApi);
      }

      // Get accurate role information from organization members endpoint
      let organizationRole = userDataFromApi?.role || "agent"
      let organizationId = userDataFromApi?.organization_id || userDataFromApi?.organizationId || ""
      let hasOrganization = !!organizationId // If user has organization_id from profile, they have an organization
      
      try {
        console.log("[Auth Context] Checking organization membership for user:", session.user.id)
        
        // First, try the direct user endpoint (for admin/moderator users)
        let orgResponse = await fetch(`${API_BASE_URL}/api/organization/members/${session.user.id}`, {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
        })

        // If direct endpoint fails with 401/403, fall back to bulk endpoint
        if (orgResponse.status === 401 || orgResponse.status === 403) {
          console.log("[Auth Context] Direct endpoint access denied, trying bulk endpoint")
          orgResponse = await fetch(`${API_BASE_URL}/api/organization/members`, {
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
          })

          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            console.log("[Auth Context] Organization members (bulk) response:", orgData)
            
            // Find current user in organization members
            const currentUserInOrg = orgData?.members?.find((member: { user_id: string; id: string }) => 
              member.user_id === session.user.id || member.id === session.user.id
            ) || orgData?.find((member: { user_id: string; id: string }) => 
              member.user_id === session.user.id || member.id === session.user.id
            )

            if (currentUserInOrg) {
              hasOrganization = true
              organizationRole = currentUserInOrg.role || organizationRole
              organizationId = currentUserInOrg.organization_id || organizationId
              console.log("[Auth Context] User found in organization (bulk):", {
                userId: session.user.id,
                foundRole: currentUserInOrg.role,
                foundOrgId: currentUserInOrg.organization_id,
                finalRole: organizationRole,
                hasOrganization: true
              })
            } else {
              // Only set hasOrganization to false if we don't have an organizationId from profile
              if (!organizationId) {
                hasOrganization = false
              }
              console.log("[Auth Context] User NOT found in organization members (bulk):", {
                userId: session.user.id,
                hasOrganization: hasOrganization,
                reasonKeptTrue: organizationId ? "Has organizationId from profile" : "No organizationId"
              })
            }
          } else {
            // Only set hasOrganization to false if we don't have an organizationId from profile
            if (!organizationId) {
              hasOrganization = false
            }
            console.log("[Auth Context] Bulk organization API also failed:", {
              status: orgResponse.status,
              hasOrganization: hasOrganization,
              reasonKeptTrue: organizationId ? "Has organizationId from profile" : "No organizationId"
            })
          }
        } else if (orgResponse.ok) {
          // Direct endpoint succeeded
          const orgData = await orgResponse.json()
          console.log("[Auth Context] Organization member (direct) response:", orgData)
          
          if (orgData?.member) {
            const memberData = orgData.member
            hasOrganization = true
            organizationRole = memberData.role || organizationRole
            organizationId = memberData.organizationId || organizationId
            console.log("[Auth Context] User found in organization (direct):", {
              userId: session.user.id,
              foundRole: memberData.role,
              foundOrgId: memberData.organizationId,
              finalRole: organizationRole,
              hasOrganization: true
            })
          } else {
            // Only set hasOrganization to false if we don't have an organizationId from profile
            if (!organizationId) {
              hasOrganization = false
            }
            console.log("[Auth Context] Direct response OK but no member data:", {
              userId: session.user.id,
              hasOrganization: hasOrganization,
              reasonKeptTrue: organizationId ? "Has organizationId from profile" : "No organizationId"
            })
          }
        } else if (orgResponse.status === 404) {
          // User not found in any organization - but only set false if no organizationId from profile
          if (!organizationId) {
            hasOrganization = false
          }
          console.log("[Auth Context] User not found in organization (404):", {
            userId: session.user.id,
            hasOrganization: hasOrganization,
            reasonKeptTrue: organizationId ? "Has organizationId from profile" : "No organizationId"
          })
        } else {
          // Other error - only set false if no organizationId from profile
          if (!organizationId) {
            hasOrganization = false
          }
          console.log("[Auth Context] Organization API failed:", {
            status: orgResponse.status,
            statusText: orgResponse.statusText,
            hasOrganization: hasOrganization,
            reasonKeptTrue: organizationId ? "Has organizationId from profile" : "No organizationId"
          })
        }
      } catch (orgError) {
        console.warn("[Auth Context] Failed to fetch organization data:", orgError)
        // Only set false if no organizationId from profile
        if (!organizationId) {
          hasOrganization = false
        }
      }
      
      // Check if user is a human agent
      const isHumanAgent = organizationRole === "human_agent" || userDataFromApi?.is_human_agent === true
      const humanAgentId = userDataFromApi?.human_agent_id || (isHumanAgent ? userDataFromApi?.id : undefined)

      console.log("[Auth Context] Final user determination:", {
        profileRole: userDataFromApi?.role,
        organizationRole,
        finalRole: organizationRole,
        hasOrganization,
        organizationId,
        isHumanAgent,
        humanAgentId,
        willRedirectToOrganizationSetup: !hasOrganization,
        timestamp: new Date().toISOString()
      })

      const finalUser: User = {
        id: session.user.id,
        email: session.user.email || "",
        name: userDataFromApi?.name || session.user.user_metadata?.full_name || "User",
        role: organizationRole,
        organizationId: organizationId,
        hasOrganization: hasOrganization,
        isHumanAgent: isHumanAgent,
        humanAgentId: humanAgentId,
      }

      setUser(finalUser)
    } catch (error) {
      console.error("Error fetching user profile:", error)
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
  const isHumanAgent = user?.isHumanAgent === true || user?.role === "human_agent"
  // Admins and human agents can access the human dashboard
  const canAccessHumanDashboard = isHumanAgent || user?.role === "admin"

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
