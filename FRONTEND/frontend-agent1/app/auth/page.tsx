"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { ValidatedInput } from "@/components/ui/validated-input"
import { Loader2, Shield } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useCSRF } from "@/hooks/use-csrf"
import { loginSchema, registerSchema } from "@/lib/validation/domains/auth-schemas"
import { sanitizeInput } from "@/lib/validation/sanitizers"
import type { LoginFormData, RegisterFormData } from "@/lib/validation/domains/auth-schemas"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("signin")
  const [isLoading, setIsLoading] = useState(false)

  const { user, loading: authLoading, signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token: csrfToken, isLoading: csrfLoading, addTokenToRequest } = useCSRF()

  // Sign in form
  const signInForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
      csrfToken: ""
    }
  })

  // Sign up form
  const signUpForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      acceptTerms: false,
      csrfToken: ""
    }
  })

  // Update CSRF tokens when available
  useEffect(() => {
    if (csrfToken) {
      signInForm.setValue('csrfToken', csrfToken)
      signUpForm.setValue('csrfToken', csrfToken)
    }
  }, [csrfToken, signInForm, signUpForm])

  useEffect(() => {
    if (!authLoading && user) {
      if (user.hasOrganization) {
        console.log("User has organization, redirecting to dashboard")
        router.push("/dashboard")
      } else {
        console.log("User does not have organization, redirecting to organization setup")
        router.push("/organization-setup")
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const verified = searchParams.get('verified')
    const message = searchParams.get('message')
    
    if (verified === 'true') {
      toast.success("Email verified successfully! You can now sign in.")
      // Clean up URL
      router.replace('/auth')
    } else if (message === 'confirm-email') {
      toast.info("Please check your email to confirm your account before logging in.")
    } else if (message === 'account-created') {
      toast.success("Account created successfully! You can now sign in.")
    }
  }, [searchParams, router])

  const handleSignIn = async (data: LoginFormData) => {
    setIsLoading(true)
    
    try {
      // Sanitize inputs before processing
      const sanitizedEmail = sanitizeInput(data.email, 'email')
      const sanitizedPassword = sanitizeInput(data.password, 'text')
      
      // Verify CSRF token is present
      if (!data.csrfToken) {
        toast.error("Security token missing. Please refresh and try again.")
        return
      }
      
      // Sign in with sanitized data
      await signIn(sanitizedEmail, sanitizedPassword)
      
      // Clear form on success
      signInForm.reset()
      
    } catch (error: any) {
      console.error("Sign in error:", error)
      toast.error(error.message || "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (data: RegisterFormData) => {
    setIsLoading(true)
    
    try {
      // Sanitize inputs before processing
      const sanitizedEmail = sanitizeInput(data.email, 'email')
      const sanitizedPassword = sanitizeInput(data.password, 'text')
      const sanitizedFullName = sanitizeInput(data.fullName, 'text')
      
      // Verify CSRF token is present
      if (!data.csrfToken) {
        toast.error("Security token missing. Please refresh and try again.")
        return
      }
      
      // Sign up with sanitized data
      await signUp(sanitizedEmail, sanitizedPassword, sanitizedFullName)
      
      toast.success("Account created! Please check your email to verify.")
      setActiveTab("signin")
      
      // Clear form on success
      signUpForm.reset()
      
    } catch (error: any) {
      console.error("Sign up error:", error)
      toast.error(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading screen while auth is loading or user is authenticated
  if (authLoading || (!authLoading && user) || csrfLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            {csrfLoading ? "Initializing security..." : "Loading..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Leadify</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
          {csrfToken && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
              <Shield className="h-3 w-3" />
              <span>Security protection enabled</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4 pt-4">
                  <ValidatedInput
                    control={signInForm.control}
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="Enter your email"
                    disabled={isLoading}
                    showRequiredIndicator={true}
                  />
                  
                  <ValidatedInput
                    control={signInForm.control}
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    showPasswordToggle={true}
                    showRequiredIndicator={true}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !csrfToken}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 pt-4">
                  <ValidatedInput
                    control={signUpForm.control}
                    name="fullName"
                    type="text"
                    label="Full Name"
                    placeholder="Enter your full name"
                    disabled={isLoading}
                    showRequiredIndicator={true}
                  />
                  
                  <ValidatedInput
                    control={signUpForm.control}
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="Enter your email"
                    disabled={isLoading}
                    showRequiredIndicator={true}
                  />
                  
                  <ValidatedInput
                    control={signUpForm.control}
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    showPasswordToggle={true}
                    showRequiredIndicator={true}
                    description="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                  />
                  
                  <ValidatedInput
                    control={signUpForm.control}
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    disabled={isLoading}
                    showPasswordToggle={true}
                    showRequiredIndicator={true}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !csrfToken}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
