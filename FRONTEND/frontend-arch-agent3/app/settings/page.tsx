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

export default function SettingsPage() {
  const { toast } = useToast()
  const { user, updateUserName } = useAuth()

  // Profile settings
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  // Email change
  const [newEmail, setNewEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("")

  // Password change
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        await updateUserName(name)
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
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newEmail !== confirmEmail) {
      toast({
        title: "Error",
        description: "Email addresses do not match",
        variant: "destructive",
      })
      return
    }

    setIsChangingEmail(true)

    try {
      const response = await fetch("/api/user/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEmail,
          currentPassword: currentPasswordForEmail,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Confirmation email sent",
          description: data.message || "Please check your new email address to confirm the change.",
          duration: 10000,
        })
        setNewEmail("")
        setConfirmEmail("")
        setCurrentPasswordForEmail("")
      } else {
        throw new Error(data.message || "Failed to change email")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change email",
        variant: "destructive",
      })
    } finally {
      setIsChangingEmail(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Password changed",
          description: "Your password has been changed successfully.",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        throw new Error(data.message || "Failed to change password")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
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
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current-email">Current Email</Label>
                <Input id="current-email" value={email} disabled className="bg-muted" />
              </div>
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? "Updating..." : "Update Profile"}
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
            <form onSubmit={handleEmailChange} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-email">Confirm New Email</Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Confirm new email address"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current-password-email">Current Password</Label>
                <Input
                  id="current-password-email"
                  type="password"
                  value={currentPasswordForEmail}
                  onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <Button type="submit" disabled={isChangingEmail}>
                {isChangingEmail ? "Changing..." : "Change Email"}
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
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
