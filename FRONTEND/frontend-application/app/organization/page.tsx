"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Shield, Settings, Building2 } from "lucide-react"
import { OrganizationMembersTable } from "@/components/organization/organization-members-table"
import { InviteMemberModal } from "@/components/organization/invite-member-modal"
import { OrganizationSettingsModal } from "@/components/organization/organization-settings-modal"
import { useAuth } from "@/contexts/simple-auth-context"
import { toast } from "sonner"
import { getOrganizationMembers, removeOrganizationMember } from "@/lib/api/organization"
import { useRouter } from "next/navigation"

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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const { user, getAuthHeaders, loading: authLoading } = useAuth()
  const router = useRouter()

  const fetchMembers = async () => {
    try {
      const authHeaders = await getAuthHeaders()
      const token = authHeaders.Authorization?.replace('Bearer ', '') || ''

      console.log("Fetching organization members")

      const members = await getOrganizationMembers(token)

      // Transform the data to match our interface
      const transformedMembers = members.map((member) => ({
        id: member.id,
        name: member.name || member.email?.split("@")[0] || "Unknown User",
        email: member.email,
        role: member.role,
        status: member.status || "active",
        joinedAt: member.created_at,
        lastActive: member.updated_at || member.created_at,
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
    // Wait for auth to complete
    if (authLoading) return
    
    // Check if user is authenticated
    if (!user) {
      router.push("/auth")
      return
    }
    
    // Check if user has an organization
    if (!user.hasOrganization || !user.organizationId) {
      console.log("User doesn't have an organization, redirecting to organization setup")
      router.push("/organization-setup")
      return
    }
    
    fetchMembers()
  }, [user, router, authLoading])

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
      const token = authHeaders.Authorization?.replace('Bearer ', '') || ''

      const result = await removeOrganizationMember(memberId, token)

      if (result.success) {
        // Remove from local state
        setMembers((prev) => prev.filter((member) => member.id !== memberId))
        toast.success(result.message || "Member removed successfully")
      } else {
        toast.error(result.message || "Failed to remove member")
      }
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

  // Show loading state while auth is loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            {authLoading ? "Checking authentication..." : "Loading organization members..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Organization</h1>
          </div>
          <p className="text-gray-600 ml-10">Manage your organization members and their roles</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setSettingsModalOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={() => {
            console.log("[OrganizationPage] Invite Member button clicked")
            setInviteModalOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">Active organization members</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.filter((m) => m.role === "admin").length}</div>
            <p className="text-xs text-muted-foreground">Organization administrators</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
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

      <Card className="bg-white border-gray-200">
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
        organizationId={user?.organizationId}
      />
      
      <OrganizationSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />
    </div>
  )
}
