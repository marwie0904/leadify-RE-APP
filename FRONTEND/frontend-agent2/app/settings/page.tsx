"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateProfileSchema, changeEmailSchema, changePasswordSchema, type UpdateProfileData, type ChangeEmailData, type ChangePasswordData } from "@/lib/validation/forms/settings"
import { CSRFInput } from "@/hooks/use-csrf"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function SettingsPage() {
  const { toast } = useToast()
  const { user, updateUserName } = useAuth()

  // Profile form
  const profileForm = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
    },
  })

  // Email change form
  const emailForm = useForm<ChangeEmailData>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: "",
      confirmEmail: "",
      currentPassword: "",
    },
  })

  // Password change form
  const passwordForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const [email, setEmail] = useState("")

  useEffect(() => {
    if (user) {
      profileForm.setValue("name", user.name || "")
      setEmail(user.email || "")
    }
  }, [user, profileForm])

  const handleProfileUpdate = async (data: UpdateProfileData) => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: data.name }),
      })

      if (response.ok) {
        await updateUserName(data.name)
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update profile")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    }
  }

  const handleEmailChange = async (data: ChangeEmailData) => {
    try {
      const response = await fetch("/api/user/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEmail: data.newEmail,
          currentPassword: data.currentPassword,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast({
          title: "Confirmation email sent",
          description: responseData.message || "Please check your new email address to confirm the change.",
          duration: 10000,
        })
        emailForm.reset()
      } else {
        throw new Error(responseData.message || "Failed to change email")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change email",
        variant: "destructive",
      })
    }
  }

  const handlePasswordChange = async (data: ChangePasswordData) => {
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast({
          title: "Password changed",
          description: "Your password has been changed successfully.",
        })
        passwordForm.reset()
      } else {
        throw new Error(responseData.message || "Failed to change password")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
              <CSRFInput />
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  {...profileForm.register("name")} 
                  placeholder="Enter your name" 
                  disabled={profileForm.formState.isSubmitting}
                  aria-invalid={!!profileForm.formState.errors.name}
                  aria-describedby={profileForm.formState.errors.name ? "name-error" : undefined}
                />
                {profileForm.formState.errors.name && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="name-error">
                      {profileForm.formState.errors.name.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current-email">Current Email</Label>
                <Input id="current-email" value={email} disabled className="bg-muted" />
              </div>
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Email Change */}
        <Card>
          <CardHeader>
            <CardTitle>Change Email Address</CardTitle>
            <CardDescription>Update your email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={emailForm.handleSubmit(handleEmailChange)} className="space-y-4">
              <CSRFInput />
              <div className="grid gap-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  {...emailForm.register("newEmail")}
                  placeholder="Enter new email address"
                  disabled={emailForm.formState.isSubmitting}
                  aria-invalid={!!emailForm.formState.errors.newEmail}
                  aria-describedby={emailForm.formState.errors.newEmail ? "new-email-error" : undefined}
                />
                {emailForm.formState.errors.newEmail && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="new-email-error">
                      {emailForm.formState.errors.newEmail.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-email">Confirm New Email</Label>
                <Input
                  id="confirm-email"
                  type="email"
                  {...emailForm.register("confirmEmail")}
                  placeholder="Confirm new email address"
                  disabled={emailForm.formState.isSubmitting}
                  aria-invalid={!!emailForm.formState.errors.confirmEmail}
                  aria-describedby={emailForm.formState.errors.confirmEmail ? "confirm-email-error" : undefined}
                />
                {emailForm.formState.errors.confirmEmail && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="confirm-email-error">
                      {emailForm.formState.errors.confirmEmail.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current-password-email">Current Password</Label>
                <Input
                  id="current-password-email"
                  type="password"
                  {...emailForm.register("currentPassword")}
                  placeholder="Enter current password"
                  disabled={emailForm.formState.isSubmitting}
                  aria-invalid={!!emailForm.formState.errors.currentPassword}
                  aria-describedby={emailForm.formState.errors.currentPassword ? "current-password-email-error" : undefined}
                />
                {emailForm.formState.errors.currentPassword && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="current-password-email-error">
                      {emailForm.formState.errors.currentPassword.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button type="submit" disabled={emailForm.formState.isSubmitting}>
                {emailForm.formState.isSubmitting ? "Changing..." : "Change Email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
              <CSRFInput />
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  {...passwordForm.register("currentPassword")}
                  placeholder="Enter current password"
                  disabled={passwordForm.formState.isSubmitting}
                  aria-invalid={!!passwordForm.formState.errors.currentPassword}
                  aria-describedby={passwordForm.formState.errors.currentPassword ? "current-password-error" : undefined}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="current-password-error">
                      {passwordForm.formState.errors.currentPassword.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  {...passwordForm.register("newPassword")}
                  placeholder="Enter new password"
                  disabled={passwordForm.formState.isSubmitting}
                  aria-invalid={!!passwordForm.formState.errors.newPassword}
                  aria-describedby={passwordForm.formState.errors.newPassword ? "new-password-error" : undefined}
                />
                {passwordForm.formState.errors.newPassword && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="new-password-error">
                      {passwordForm.formState.errors.newPassword.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  {...passwordForm.register("confirmPassword")}
                  placeholder="Confirm new password"
                  disabled={passwordForm.formState.isSubmitting}
                  aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                  aria-describedby={passwordForm.formState.errors.confirmPassword ? "confirm-password-error" : undefined}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription id="confirm-password-error">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
