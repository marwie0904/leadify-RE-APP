"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  getAuthHeaders: () => Promise<{ Authorization: string } | {}>
}

export function InviteMemberModal({ open, onOpenChange, onSuccess, getAuthHeaders }: InviteMemberModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    role: "member",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("[InviteMemberModal] Form submission started")
    e.preventDefault()
    
    console.log("[InviteMemberModal] Checking form data:", formData)
    console.log("[InviteMemberModal] onOpenChange type:", typeof onOpenChange)
    console.log("[InviteMemberModal] onSuccess type:", typeof onSuccess)
    console.log("[InviteMemberModal] getAuthHeaders type:", typeof getAuthHeaders)
    
    if (!formData.email.trim()) {
      console.log("[InviteMemberModal] Email validation failed")
      try {
        toast.error("Please enter an email address")
      } catch (toastError) {
        console.error("[InviteMemberModal] Toast error:", toastError)
        alert("Please enter an email address")
      }
      return
    }

    console.log("[InviteMemberModal] Setting loading to true")
    setLoading(true)

    try {
      console.log("[InviteMemberModal] Getting auth headers...")
      const authHeaders = await getAuthHeaders()
      console.log("[InviteMemberModal] Auth headers received:", Object.keys(authHeaders))
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      console.log("[InviteMemberModal] API Base URL:", API_BASE_URL)

      console.log("[InviteMemberModal] Sending invitation to:", formData.email, "with role:", formData.role)

      const response = await fetch(`${API_BASE_URL}/api/organization/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          role: formData.role,
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
      setFormData({ email: "", role: "member" })
      
      console.log("[InviteMemberModal] Showing success toast")
      try {
        toast.success("Invitation sent successfully!")
      } catch (toastError) {
        console.error("[InviteMemberModal] Success toast error:", toastError)
        alert("Invitation sent successfully!")
      }
      
      console.log("[InviteMemberModal] Calling onOpenChange(false)")
      if (typeof onOpenChange === 'function') {
        onOpenChange(false)
      } else {
        console.error("[InviteMemberModal] onOpenChange is not a function:", onOpenChange)
      }
      
      console.log("[InviteMemberModal] Calling onSuccess()")
      if (typeof onSuccess === 'function') {
        onSuccess()
      } else {
        console.error("[InviteMemberModal] onSuccess is not a function:", onSuccess)
      }
    } catch (error) {
      console.error("[InviteMemberModal] Failed to invite member:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send invitation"
      
      try {
        toast.error(`Failed to invite member: ${errorMessage}`)
      } catch (toastError) {
        console.error("[InviteMemberModal] Error toast failed:", toastError)
        alert(`Failed to invite member: ${errorMessage}`)
      }
    } finally {
      console.log("[InviteMemberModal] Setting loading to false")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Invite Organization Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
