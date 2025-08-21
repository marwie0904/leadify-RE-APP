"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Lock, Loader2, CheckCircle, XCircle, User } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/simple-auth-context"

export const dynamic = 'force-dynamic'

interface InviteInfo {
  email: string
  organizationName: string
  organizationId: string
  expiresAt: string
  token: string
  userExists: boolean
}

function InviteAcceptanceContent() {
  console.log("[Invite Page] Component initialized")
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user: _user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    console.log("[Invite Page] useEffect triggered")
    const token = searchParams.get('token')
    console.log("[Invite Page] Token from URL:", token ? token.substring(0, 10) + "..." : "NO TOKEN")
    
    if (!token) {
      console.log("[Invite Page] ERROR: No token provided")
      setError("No invitation token provided")
      setLoading(false)
      return
    }

    console.log("[Invite Page] Starting token verification...")
    verifyInviteToken(token)
  }, [searchParams])


  const verifyInviteToken = async (token: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      console.log("[Invite Verify] Environment Debug:", {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        API_BASE_URL: API_BASE_URL,
        requestUrl: `${API_BASE_URL}/api/auth/invite/verify?token=${token}`
      })

      const response = await fetch(`${API_BASE_URL}/api/auth/invite/verify?token=${token}`)
      console.log("[Invite Verify] Response status:", response.status)
      
      const data = await response.json()
      console.log("[Invite Verify] Backend response:", data)

      if (data.valid) {
        console.log("[Invite Verify] SUCCESS - Valid invitation:", {
          email: data.email,
          organizationName: data.organizationName,
          userExists: data.userExists,
          token: token.substring(0, 10) + "..."
        })
        
        // Store invite info
        setInviteInfo({
          email: data.email,
          organizationName: data.organizationName,
          organizationId: data.organizationId || 'default-org-id',
          expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          userExists: data.userExists || false,
          token: token
        })
        
        // Check if user already has an account
        if (data.userExists) {
          // For existing users, we need them to enter their password
          console.log("[Invite Verify] User already exists, will need password verification")
          // Don't redirect - show password form for existing user
        } else {
          // User doesn't exist - will show full registration form
          console.log("[Invite Verify] New user, will show full registration form")
        }
      } else {
        console.log("[Invite Verify] ERROR - Invalid invitation:", {
          valid: data.valid,
          error: data.error || "Invalid or expired invitation link"
        })
        setError("Invalid or expired invitation link")
      }
    } catch (err) {
      console.error("[Invite Verify] EXCEPTION - Request failed:", {
        error: err,
        message: err instanceof Error ? err.message : "Unknown error"
      })
      setError("Failed to verify invitation. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Client-side validation
    if (!inviteInfo?.userExists && password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (!inviteInfo?.userExists && !firstName.trim()) {
      setError("Please enter your first name")
      return
    }

    if (!inviteInfo?.userExists && !lastName.trim()) {
      setError("Please enter your last name")
      return
    }

    setSubmitting(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      console.log("[Invite Accept] Environment Debug:", {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        API_BASE_URL: API_BASE_URL,
        requestUrl: `${API_BASE_URL}/api/auth/invite/accept`
      })
      
      const requestPayload = inviteInfo?.userExists 
        ? {
            token: inviteInfo?.token,
            password: password,
            existingUser: true
          }
        : {
            token: inviteInfo?.token,
            password: password,
            confirmPassword: confirmPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            existingUser: false
          }

      console.log("[Invite Accept] Sending request with payload:", {
        ...requestPayload,
        password: "[HIDDEN]",
        confirmPassword: requestPayload.confirmPassword ? "[HIDDEN]" : undefined,
        firstName: requestPayload.firstName || undefined,
        lastName: requestPayload.lastName || undefined,
        url: `${API_BASE_URL}/api/auth/invite/accept`
      })

      const response = await fetch(`${API_BASE_URL}/api/auth/invite/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      })

      console.log("[Invite Accept] Response status:", response.status)
      console.log("[Invite Accept] Response headers:", Object.fromEntries(response.headers.entries()))

      const result = await response.json()
      console.log("[Invite Accept] Backend response:", result)

      if (response.ok) {
        console.log("[Invite Accept] SUCCESS - User joined organization:", {
          organizationName: result.organization?.name,
          userId: result.user?.id,
          userEmail: result.user?.email,
          requiresEmailConfirmation: result.requiresEmailConfirmation,
          isNewUser: result.isNewUser,
          hasSession: !!result.session,
          hasToken: !!result.token
        })
        setSuccess(true)
        
        // Show welcome message with organization name
        const orgName = result.organization?.name || inviteInfo?.organizationName || 'the organization';
        
        if (result.isNewUser) {
          // For invited users, email is auto-confirmed, so no need to mention email confirmation
          toast.success(`🎉 Welcome to ${orgName}! Your account has been created successfully.`)
        } else {
          toast.success(`✅ Successfully joined ${orgName}!`)
        }

        // If we have a session/token, set it in auth context and redirect
        if (result.token && result.session) {
          console.log("[Invite Accept] Setting session and redirecting to dashboard...");
          
          // Store the session data for auth context
          if (typeof window !== 'undefined') {
            // Store auth data in localStorage for the auth context to pick up
            localStorage.setItem('sb-auth-token', JSON.stringify({
              access_token: result.token,
              refresh_token: result.session.refresh_token,
              expires_at: result.session.expires_at,
              user: result.user
            }));
          }
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push("/dashboard")
          }, 1500)
        } else if (!result.isNewUser) {
          // Existing users without session should still redirect (they can log in)
          setTimeout(() => {
            router.push("/auth")
          }, 2000)
        } else {
          // New users without session - rare case, show login prompt
          setTimeout(() => {
            toast.info("Please log in with your new account credentials.")
            router.push("/auth")
          }, 3000)
        }
      } else {
        console.log("[Invite Accept] ERROR - Backend returned error:", {
          status: response.status,
          statusText: response.statusText,
          errorData: result,
          message: result.message || "Failed to accept invitation"
        })
        setError(result.message || "Failed to accept invitation")
      }
    } catch (err) {
      console.error("[Invite Accept] EXCEPTION - Request failed:", {
        error: err,
        message: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined
      })
      setError("Failed to accept invitation. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle className="text-xl font-bold text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push("/auth")} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <CardTitle className="text-xl font-bold text-green-600">
              Welcome to {inviteInfo?.organizationName}!
            </CardTitle>
            <CardDescription>
              You have successfully joined the organization. Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to {inviteInfo?.organizationName}!
          </CardTitle>
          <CardDescription>
            {inviteInfo?.userExists ? (
              <>Please enter your password to join as: <strong>{inviteInfo?.email}</strong></>
            ) : (
              <>You're invited to join as: <strong>{inviteInfo?.email}</strong></>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            {!inviteInfo?.userExists && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      className="pl-10"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      className="pl-10"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">
                {inviteInfo?.userExists ? "Enter Your Password" : "Create Password"}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={inviteInfo?.userExists ? "Enter your password" : "Create password (min 8 chars)"}
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {!inviteInfo?.userExists && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    className="pl-10 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={submitting}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {inviteInfo?.userExists ? "Join Organization" : "Create Account & Join Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InviteAcceptancePage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <InviteAcceptanceContent />
    </Suspense>
  )
}