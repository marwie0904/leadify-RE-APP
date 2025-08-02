"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Shield, Settings } from "lucide-react"
import { OrganizationMembersTable } from "@/components/organization/organization-members-table"
import { InviteMemberModal } from "@/components/organization/invite-member-modal"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface OrganizationMember {
  id: string
  name: string
  email: string
  role: "admin" | "moderator" | "agent"
  status: "active" | "inactive" | "pending"
  joinedAt: string
  lastActive: string
}

interface User {
  id: string
  role: "admin" | "moderator" | "agent"
}

export default function OrganizationPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const { user, getAuthHeaders } = useAuth()

  const fetchMembers = async () => {
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      console.log("Fetching organization members from:", `${API_BASE_URL}/api/organization/members`)

      const response = await fetch(`${API_BASE_URL}/api/organization/members`, {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      })

      console.log("Organization members response status:", response.status)

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to view organization members")
          return
        }
        throw new Error(`Failed to fetch members: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Raw organization members response:", JSON.stringify(data))

      // Transform the data to match our interface
      const transformedMembers = (data.members || []).map((member: any) => ({
        id: member.id,
        name:
          member.username ||
          member.name ||
          member.full_name ||
          (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null) ||
          member.email?.split("@")[0] ||
          "Unknown User",
        email: member.email,
        role: member.role,
        status: member.status || "active",
        joinedAt: member.createdAt || member.joinedAt || new Date().toISOString(),
        lastActive: member.lastActive || member.updatedAt || new Date().toISOString(),
      }))

      console.log("Transformed members:", transformedMembers)
      setMembers(transformedMembers)
    } catch (error) {
      console.error("Failed to fetch organization members:", error)
      toast.error("Failed to load organization members")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    // Update local state optimistically
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, role: newRole as "admin" | "moderator" | "agent" } : member,
      ),
    )
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const response = await fetch(`${API_BASE_URL}/api/organization/members/${memberId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to remove member: ${response.statusText}`)
      }

      // Remove from local state
      setMembers((prev) => prev.filter((member) => member.id !== memberId))
      toast.success("Member removed successfully")
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast.error("Failed to remove member")
    }
  }

  const handleInviteSuccess = () => {
    console.log("[OrganizationPage] handleInviteSuccess called")
    setInviteModalOpen(false)
    fetchMembers() // Refresh the members list
  }

  const currentUser: User | null = user
    ? {
        id: user.id,
        role: user.role as "admin" | "moderator" | "agent",
      }
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">Loading organization members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
          <p className="text-muted-foreground">Manage your organization members and their roles</p>
        </div>
        <Button onClick={() => {
          console.log("[OrganizationPage] Invite Member button clicked")
          setInviteModalOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">Active organization members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.filter((m) => m.role === "admin").length}</div>
            <p className="text-xs text-muted-foreground">Organization administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.filter((m) => m.role === "agent").length}</div>
            <p className="text-xs text-muted-foreground">Active agents</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>Manage roles and permissions for your organization members</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationMembersTable
            members={members}
            currentUser={currentUser}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
            onRefresh={fetchMembers}
            getAuthHeaders={getAuthHeaders}
          />
        </CardContent>
      </Card>

      <InviteMemberModal
        open={inviteModalOpen}
        onOpenChange={(open) => {
          console.log("[OrganizationPage] InviteMemberModal onOpenChange called with:", open)
          setInviteModalOpen(open)
        }}
        onSuccess={() => {
          console.log("[OrganizationPage] InviteMemberModal onSuccess called")
          handleInviteSuccess()
        }}
        getAuthHeaders={getAuthHeaders}
      />
    </div>
  )
}
