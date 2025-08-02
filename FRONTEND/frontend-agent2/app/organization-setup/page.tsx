"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Users, ArrowRight, LogOut, AlertCircle } from 'lucide-react'
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createOrganizationSchema, type CreateOrganizationData } from "@/lib/validation/forms/organization"
import { CSRFInput } from "@/hooks/use-csrf"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function OrganizationSetupPage() {
  const [showJoinMessage, setShowJoinMessage] = useState(false)
  const { getAuthHeaders, refreshUserOrganization, signOut } = useAuth()
  const router = useRouter()

  // Form with validation
  const form = useForm<CreateOrganizationData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
    },
  })

  const handleCreateOrganization = async (data: CreateOrganizationData) => {
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const response = await fetch(`${API_BASE_URL}/api/organization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          name: data.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create organization: ${response.statusText}`)
      }

      const responseData = await response.json()
      console.log("Organization created:", responseData)

      // Refresh user organization data
      await refreshUserOrganization()

      toast.success("Organization created successfully!")

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to create organization:", error)
      toast.error((error as Error).message || "Failed to create organization")
    }
  }

  const handleJoinOrganization = () => {
    setShowJoinMessage(true)
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Failed to logout")
    }
  }

  if (showJoinMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Join Organization</CardTitle>
            <CardDescription>Please contact your organization Admin or Moderator to send you an invite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Once you receive an invitation, you'll be able to access your organization's dashboard.</p>
            </div>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowJoinMessage(false)}>
              Back to Options
            </Button>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <div className="mt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Leadify's Chatbot Application</h1>
            <p className="text-muted-foreground mt-2">To get started, you'll need to create or join an organization</p>
          </div>
        </div>

        {/* Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Organization */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Create Organization</CardTitle>
              </div>
              <CardDescription>Start your own organization and invite team members</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleCreateOrganization)} className="space-y-4">
                <CSRFInput />
                <div className="space-y-2">
                  <Label htmlFor="orgName">Your Organization Name</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Enter organization name"
                    {...form.register("name")}
                    disabled={form.formState.isSubmitting}
                    aria-invalid={!!form.formState.errors.name}
                    aria-describedby={form.formState.errors.name ? "org-name-error" : undefined}
                  />
                  {form.formState.errors.name && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription id="org-name-error">
                        {form.formState.errors.name.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Organization
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Join Organization */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Join Organization</CardTitle>
              </div>
              <CardDescription>Join an existing organization with an invitation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you've been invited to join an organization, you'll need an invitation from an admin or moderator.
                </p>
                <Button variant="outline" className="w-full bg-transparent" onClick={handleJoinOrganization}>
                  Join Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Need help? Contact support or check our documentation for more information.</p>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )
}
