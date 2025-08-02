"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MoreHorizontal, Shield, Trash2, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
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

interface OrganizationMembersTableProps {
  members: OrganizationMember[]
  currentUser: User | null
  onUpdateRole: (memberId: string, newRole: string) => void
  onRemoveMember: (memberId: string) => void
  onRefresh: () => void
  getAuthHeaders: () => Promise<{ Authorization: string } | {}>
}

export function OrganizationMembersTable({
  members = [],
  currentUser,
  onUpdateRole,
  onRemoveMember,
  onRefresh,
  getAuthHeaders,
}: OrganizationMembersTableProps) {
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set())

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "moderator":
        return "bg-blue-100 text-blue-800"
      case "agent":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const canManageMember = (member: OrganizationMember) => {
    if (!currentUser) {
      return false
    }

    if (currentUser.id === member.id) {
      return false
    }

    if (currentUser.role === "admin") {
      return true
    }

    if (currentUser.role === "moderator" && member.role === "agent") {
      return true
    }

    return false
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    console.log("Role change requested:", { memberId, newRole, currentUser: currentUser?.role })

    // Don't allow changing if already updating
    if (updatingRoles.has(memberId)) {
      console.log("Already updating role for member:", memberId)
      return
    }

    // Add to updating set
    setUpdatingRoles((prev) => new Set(prev).add(memberId))

    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      console.log("Making role update request to:", `${API_BASE_URL}/api/organization/members/${memberId}/role`)

      // First verify if we can edit this role using the verification endpoint
      const verifyResponse = await fetch(`${API_BASE_URL}/api/organization/members/${memberId}/role`, {
        method: "GET", // Use GET to verify permissions
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      })

      console.log("Verification response status:", verifyResponse.status)

      if (!verifyResponse.ok) {
        if (verifyResponse.status === 403) {
          toast.error("You don't have permission to change this member's role")
        } else if (verifyResponse.status === 404) {
          // If verification endpoint doesn't exist, try direct update
          console.log("Verification endpoint not found, proceeding with direct update")
        } else {
          toast.error("Failed to verify permissions")
          return
        }
      }

      // If verification passes or doesn't exist, proceed with the role update
      const updateResponse = await fetch(`${API_BASE_URL}/api/organization/members/${memberId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ role: newRole }),
      })

      console.log("Update response status:", updateResponse.status)

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error("Role update failed:", errorText)

        if (updateResponse.status === 403) {
          toast.error("You don't have permission to change this member's role")
        } else if (updateResponse.status === 404) {
          toast.error("Member not found or endpoint not available")
        } else {
          toast.error(`Failed to update role: ${updateResponse.statusText}`)
        }
        return
      }

      // Success - call the parent's update handler
      onUpdateRole(memberId, newRole)
      toast.success("Member role updated successfully")
    } catch (error) {
      console.error("Failed to update member role:", error)
      toast.error("Failed to update member role. Please try again.")
    } finally {
      // Remove from updating set
      setUpdatingRoles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(memberId)
        return newSet
      })
    }
  }

  const safeMembers = Array.isArray(members) ? members : []

  if (safeMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <div className="text-center">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No organization members found</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {member.name || member.email?.split("@")[0] || "Unknown User"}
                {currentUser?.id === member.id && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    You
                  </Badge>
                )}
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                {(() => {
                  const canManage = canManageMember(member)
                  const isCurrentUser = currentUser?.id === member.id

                  if (canManage) {
                    return (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={member.role}
                          onValueChange={(value) => {
                            console.log("Select onValueChange triggered:", {
                              memberId: member.id,
                              value,
                              memberRole: member.role,
                            })
                            handleRoleChange(member.id, value)
                          }}
                          disabled={updatingRoles.has(member.id)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            {currentUser?.role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
                          </SelectContent>
                        </Select>
                        {updatingRoles.has(member.id) && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )
                  } else if (isCurrentUser) {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cannot edit your own role</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  } else {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>You do not have permission to change this member's role (your role: {currentUser?.role})</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }
                })()}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
              </TableCell>
              <TableCell>
                {canManageMember(member) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onRemoveMember(member.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
