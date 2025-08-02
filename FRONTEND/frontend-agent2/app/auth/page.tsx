"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signInSchema, signUpSchema, type SignInFormData, type SignUpFormData } from "@/lib/validation/forms/auth"
import { CSRFInput } from "@/hooks/use-csrf"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("signin")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Sign in form with validation
  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Sign up form with validation
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const { user, loading: authLoading, signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

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

  const handleSignIn = async (data: SignInFormData) => {
    try {
      await signIn(data.email, data.password)
      // Redirection is handled by the useEffect
    } catch (error: any) {
      console.error("Sign in error:", error)
      toast.error(error.message || "Failed to sign in")
    }
  }

  const handleSignUp = async (data: SignUpFormData) => {
    try {
      await signUp(data.email, data.password, data.fullName)
      toast.success("Account created! Please check your email to verify.")
      setActiveTab("signin")
      signUpForm.reset()
    } catch (error: any) {
      console.error("Sign up error:", error)
      toast.error(error.message || "Failed to create account")
    }
  }

  if (authLoading || (!authLoading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Leadify</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4 pt-4">
                <CSRFInput />
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      {...signInForm.register("email")}
                      disabled={signInForm.formState.isSubmitting}
                      aria-invalid={!!signInForm.formState.errors.email}
                      aria-describedby={signInForm.formState.errors.email ? "signin-email-error" : undefined}
                    />
                  </div>
                  {signInForm.formState.errors.email && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="signin-email-error">
                        {signInForm.formState.errors.email.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      {...signInForm.register("password")}
                      disabled={signInForm.formState.isSubmitting}
                      aria-invalid={!!signInForm.formState.errors.password}
                      aria-describedby={signInForm.formState.errors.password ? "signin-password-error" : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={signInForm.formState.isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="signin-password-error">
                        {signInForm.formState.errors.password.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={signInForm.formState.isSubmitting}>
                  {signInForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 pt-4">
                <CSRFInput />
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10"
                      {...signUpForm.register("fullName")}
                      disabled={signUpForm.formState.isSubmitting}
                      aria-invalid={!!signUpForm.formState.errors.fullName}
                      aria-describedby={signUpForm.formState.errors.fullName ? "signup-name-error" : undefined}
                    />
                  </div>
                  {signUpForm.formState.errors.fullName && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="signup-name-error">
                        {signUpForm.formState.errors.fullName.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      {...signUpForm.register("email")}
                      disabled={signUpForm.formState.isSubmitting}
                      aria-invalid={!!signUpForm.formState.errors.email}
                      aria-describedby={signUpForm.formState.errors.email ? "signup-email-error" : undefined}
                    />
                  </div>
                  {signUpForm.formState.errors.email && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="signup-email-error">
                        {signUpForm.formState.errors.email.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      {...signUpForm.register("password")}
                      disabled={signUpForm.formState.isSubmitting}
                      aria-invalid={!!signUpForm.formState.errors.password}
                      aria-describedby={signUpForm.formState.errors.password ? "signup-password-error" : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={signUpForm.formState.isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {signUpForm.formState.errors.password && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="signup-password-error">
                        {signUpForm.formState.errors.password.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10"
                      {...signUpForm.register("confirmPassword")}
                      disabled={signUpForm.formState.isSubmitting}
                      aria-invalid={!!signUpForm.formState.errors.confirmPassword}
                      aria-describedby={signUpForm.formState.errors.confirmPassword ? "confirm-password-error" : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={signUpForm.formState.isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {signUpForm.formState.errors.confirmPassword && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="confirm-password-error">
                        {signUpForm.formState.errors.confirmPassword.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={signUpForm.formState.isSubmitting}>
                  {signUpForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
