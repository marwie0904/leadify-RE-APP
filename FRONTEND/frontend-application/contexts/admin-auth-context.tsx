"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AdminUser {
  id: string
  email: string
  name: string
  role: "developer" | "admin" | "super_admin"
  permissions: string[]
}

interface AdminAuthContextType {
  adminUser: AdminUser | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  getAuthHeaders: () => { Authorization: string } | {}
  isAuthenticated: boolean
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Initialize auth from localStorage
  useEffect(() => {
    const initAuth = () => {
      const savedToken = localStorage.getItem('admin_token')
      const savedUser = localStorage.getItem('admin_user')
      
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          setToken(savedToken)
          setAdminUser(parsedUser)
          
          // Verify token is still valid
          fetch(`${API_URL}/api/admin/verify`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          }).then(response => {
            if (!response.ok) {
              // Token is invalid, clear it
              signOut()
            }
          }).catch(() => {
            // Network error, keep the session for now
          })
        } catch (error) {
          console.error('Error parsing saved admin user:', error)
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
        }
      }
      
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Admin login failed')
    }

    const data = await response.json()
    
    // Store admin credentials
    const userData: AdminUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.full_name || data.user.email.split('@')[0],
      role: data.user.role,
      permissions: data.user.permissions || []
    }

    setAdminUser(userData)
    setToken(data.token)
    
    // Save to localStorage
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_user', JSON.stringify(userData))
  }

  const signOut = () => {
    setAdminUser(null)
    setToken(null)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push("/admin/login")
  }

  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const isAuthenticated = !!adminUser && !!token

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isLoading,
        signIn,
        signOut,
        getAuthHeaders,
        isAuthenticated,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}