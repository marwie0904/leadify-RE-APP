"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inviteMemberSchema, type InviteMemberData } from "@/lib/validation/forms/organization"
import { CSRFInput } from "@/hooks/use-csrf"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  getAuthHeaders: () => Promise<{ Authorization: string } | {}>
}

export function InviteMemberModal({ open, onOpenChange, onSuccess, getAuthHeaders }: InviteMemberModalProps) {
  // Form with validation
  const form = useForm<InviteMemberData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  })

  const handleSubmit = async (data: InviteMemberData) => {
    console.log("[InviteMemberModal] Form submission started")
    console.log("[InviteMemberModal] Sending invitation to:", data.email, "with role:", data.role)

    try {
      console.log("[InviteMemberModal] Getting auth headers...")
      const authHeaders = await getAuthHeaders()
      console.log("[InviteMemberModal] Auth headers received:", Object.keys(authHeaders))
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      console.log("[InviteMemberModal] API Base URL:", API_BASE_URL)

      const response = await fetch(`${API_BASE_URL}/api/organization/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          email: data.email,
          role: data.role,
        }),
      })

      console.log("[InviteMemberModal] Invitation response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.log("[InviteMemberModal] Error response data:", errorData)
        throw new Error(errorData.message || `Failed to send invitation: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("[InviteMemberModal] Invitation sent successfully:", result)

      // Reset form
      console.log("[InviteMemberModal] Resetting form")
      form.reset()
      
      console.log("[InviteMemberModal] Showing success toast")
      toast.success("Invitation sent successfully!")
      
      console.log("[InviteMemberModal] Calling onOpenChange(false)")
      if (typeof onOpenChange === 'function') {
        onOpenChange(false)
      }
      
      console.log("[InviteMemberModal] Calling onSuccess()")
      if (typeof onSuccess === 'function') {
        onSuccess()
      }
    } catch (error) {
      console.error("[InviteMemberModal] Failed to invite member:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send invitation"
      toast.error(`Failed to invite member: ${errorMessage}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Invite Organization Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <CSRFInput />
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="Enter email address"
              disabled={form.formState.isSubmitting}
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={form.formState.errors.email ? "email-error" : undefined}
            />
            {form.formState.errors.email && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription id="email-error">
                  {form.formState.errors.email.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={form.formState.isSubmitting}
                >
                  <SelectTrigger
                    aria-invalid={!!form.formState.errors.role}
                    aria-describedby={form.formState.errors.role ? "role-error" : undefined}
                  >
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.role && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription id="role-error">
                  {form.formState.errors.role.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
