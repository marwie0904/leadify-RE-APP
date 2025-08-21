"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  
  // Use environment variable for API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  
  // Debug mode for development
  const DEBUG_MODE = process.env.NODE_ENV === 'development'
  
  // Helper function for debug logging
  const debugLog = (message: string, data?: any) => {
    if (DEBUG_MODE) {
      console.log(`[Simple Auth ${new Date().toISOString()}] ${message}`, data || '')
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for existing token in localStorage
      const savedToken = localStorage.getItem('auth_token')
      const savedUser = localStorage.getItem('auth_user')
      
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          setToken(savedToken)
          setUser(parsedUser)
          debugLog('Restored user session from localStorage')
          
          // If user doesn't have organization data or has the placeholder, try to fetch it
          if (!parsedUser.organizationId || parsedUser.organizationId === 'user-organization' || !parsedUser.hasOrganization) {
            debugLog('User missing organization data, attempting refresh')
            const organizationData = await fetchOrganizationData(savedToken, parsedUser.id)
            const hasOrganization = organizationData !== null
            const organizationId = organizationData?.id || ''

            if (hasOrganization || organizationId) {
              const updatedUser = {
                ...parsedUser,
                organizationId: organizationId,
                hasOrganization: hasOrganization,
                role: organizationData?.role || parsedUser.role || 'agent',
              }
              setUser(updatedUser)
              localStorage.setItem('auth_user', JSON.stringify(updatedUser))
              debugLog('Updated user with organization data', { role: organizationData?.role, organizationId })
            }
          }
        } catch (error) {
          debugLog('Error parsing saved user', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
        }
      }
      
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const fetchOrganizationData = async (token: string, userId: string) => {
    try {
      debugLog('Fetching organization data via members API')
      const response = await fetch(`${API_URL}/api/organization/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const membersData = await response.json()
        debugLog('Organization members data received', { count: Array.isArray(membersData) ? membersData.length : membersData.members?.length })
        
        // Extract organizationId and members from the response
        const organizationId = membersData.organizationId
        const members = Array.isArray(membersData) ? membersData : membersData.members || []
        const currentUserMember = members.find((member: any) => 
          member.id === userId // Check by user ID
        )

        if (currentUserMember && organizationId) {
          debugLog('Found user in organization', { role: currentUserMember.role, organizationId })
          // Return organization data with actual organization ID
          return {
            id: organizationId, // Use the actual organization ID from backend
            name: 'Organization',
            role: currentUserMember.role,
            memberSince: currentUserMember.createdAt
          }
        } else {
          debugLog('User not found in any organization')
          return null
        }
      } else {
        debugLog(`Error fetching organization members: ${response.status}`)
        return null
      }
    } catch (error) {
      debugLog('Error fetching organization', error)
      return null
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      debugLog('Starting login process', { email, apiUrl: API_URL })
      
      // Retry logic with exponential backoff
      let lastError: any = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          debugLog(`Login attempt ${attempt}/${maxRetries}`);
          
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })
          
          debugLog(`Login response status: ${response.status}`);
          
          // If successful or client error (4xx), don't retry
          if (response.ok || response.status < 500) {
            // Process successful response or handle client error
            if (!response.ok) {
              let errorMessage = 'Login failed';
              try {
                const error = await response.json()
                debugLog('Login error response', error)
                
                if (response.status === 401) {
                  errorMessage = 'Invalid email or password'
                } else if (response.status === 500) {
                  errorMessage = 'Server error. Please try again later.'
                } else {
                  errorMessage = error.message || errorMessage
                }
              } catch (parseError) {
                debugLog('Error parsing error response', parseError)
              }
              throw new Error(errorMessage)
            }
            
            // Success - continue with login process
            const data = await response.json()
            debugLog('Login successful', { userId: data.user?.id })
            
            // Extract user info from the JWT token payload (basic decoding)
            const tokenPayload = JSON.parse(atob(data.token.split('.')[1]))
            debugLog('Token decoded', { sub: tokenPayload.sub })
            
            // Fetch organization data
            const userId = data.user.id || tokenPayload.sub
            const organizationData = await fetchOrganizationData(data.token, userId)
            const hasOrganization = organizationData !== null
            const organizationId = organizationData?.id || ''
            
            debugLog('Organization check', {
              hasOrganization,
              organizationId,
              role: organizationData?.role
            })
            
            const userData: User = {
              id: data.user.id || tokenPayload.sub,
              email: data.user.email || tokenPayload.email,
              name: tokenPayload.user_metadata?.full_name || data.user.name || 'User',
              role: organizationData?.role || 'agent',
              organizationId: organizationId,
              hasOrganization: hasOrganization,
              isHumanAgent: true,
              humanAgentId: data.user.id || tokenPayload.sub,
            }
            
            setUser(userData)
            setToken(data.token)
            
            // Save to localStorage
            localStorage.setItem('auth_token', data.token)
            localStorage.setItem('auth_user', JSON.stringify(userData))
            
            debugLog('User session saved to localStorage')
            return; // Success!
          }
          
        } catch (networkError: any) {
          lastError = networkError;
          debugLog(`Network error on attempt ${attempt}`, networkError.message)
          
          // If not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff with max 5s
            debugLog(`Retrying in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All retries failed
      debugLog('All login attempts failed', lastError)
      throw new Error('Unable to connect to server after multiple attempts. Please check your internet connection and try again.')

    } catch (error: any) {
      debugLog('Login error', error.message)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      debugLog('Starting signup process', { email, fullName })
      
      // Parse full name into first and last name
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          firstName,
          lastName 
        }),
      })

      debugLog(`Signup response status: ${response.status}`)
      
      if (!response.ok) {
        const error = await response.json()
        debugLog('Signup failed', error)
        throw new Error(error.message || 'Signup failed')
      }

      const data = await response.json()
      debugLog('Signup successful', { userId: data.user?.id })

      // After successful signup, automatically sign in the user
      if (data.session && data.session.access_token) {
        // Use the session token from signup response
        const tokenPayload = JSON.parse(atob(data.session.access_token.split('.')[1]))
        
        const userData: User = {
          id: data.user.id || tokenPayload.sub,
          email: data.user.email || tokenPayload.email,
          name: fullName,
          role: 'agent', // Default role for new users
          organizationId: '', // No organization yet for new users
          hasOrganization: false,
          isHumanAgent: true,
          humanAgentId: data.user.id || tokenPayload.sub,
        }

        setUser(userData)
        setToken(data.session.access_token)
        
        // Save to localStorage
        localStorage.setItem('auth_token', data.session.access_token)
        localStorage.setItem('auth_user', JSON.stringify(userData))
        
        debugLog('User session saved after signup')
      } else {
        // If no session returned, user needs to sign in manually
        debugLog('Signup successful but no session returned, user needs to sign in')
      }
      
      return data
    } catch (error: any) {
      debugLog('Signup error', error.message)
      throw error
    }
  }

  const signOut = async () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    router.push("/auth")
    debugLog('User signed out')
  }

  const getAuthHeaders = async () => {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const getTokens = async () => {
    return token ? { accessToken: token, refreshToken: '' } : null
  }

  const refreshUserOrganization = async () => {
    if (!token || !user) {
      debugLog('No token or user, cannot refresh organization')
      return
    }

    try {
      debugLog('Refreshing user organization')
      const organizationData = await fetchOrganizationData(token, user.id)
      const hasOrganization = organizationData !== null
      const organizationId = organizationData?.id || ''

      debugLog('Refreshed organization data', {
        hasOrganization,
        organizationId,
        role: organizationData?.role
      })

      // Update user data with new organization info
      const updatedUser = {
        ...user,
        organizationId: organizationId,
        hasOrganization: hasOrganization,
        role: organizationData?.role || user.role || 'agent',
      }

      setUser(updatedUser)
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
      debugLog('User organization data refreshed', { role: organizationData?.role })
    } catch (error) {
      debugLog('Error refreshing organization', error)
    }
  }

  const updateUserName = (name: string) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, name }
      localStorage.setItem('auth_user', JSON.stringify(updated))
      return updated
    })
  }

  // Simplified role detection
  const isHumanAgent = user?.isHumanAgent === true || user?.role === "human_agent" || user?.role === "agent"
  const canAccessHumanDashboard = isHumanAgent || user?.role === "admin" || user?.role === "agent"

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