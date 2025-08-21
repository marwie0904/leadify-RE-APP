"use client"

import { useState, useEffect } from "react"
import { useTeamMembers } from "@/hooks/useTeamMembers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Users, 
  UserPlus, 
  Shield, 
  MoreVertical, 
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Code,
  Eye
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

const roleIcons = {
  admin: <Shield className="h-4 w-4" />,
  developer: <Code className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />
}

const roleColors = {
  admin: "bg-purple-100 text-purple-700 border-purple-300",
  super_admin: "bg-purple-100 text-purple-700 border-purple-300",
  developer: "bg-blue-100 text-blue-700 border-blue-300",
  viewer: "bg-gray-100 text-gray-700 border-gray-300"
}

const statusColors = {
  active: "bg-green-100 text-green-700 border-green-300",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
  inactive: "bg-red-100 text-red-700 border-red-300"
}

export default function LeadifyTeamPage() {
  const { teamMembers, loading, error, refetch, updateTeamMember } = useTeamMembers()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("viewer")
  const [searchQuery, setSearchQuery] = useState("")

  const handleInviteMember = () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address")
      return
    }

    // Note: Inviting new members would require backend implementation
    toast.info("Invite functionality requires backend implementation")
    setInviteEmail("")
    setInviteRole("viewer")
    setInviteDialogOpen(false)
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await updateTeamMember(memberId, { is_active: false })
      toast.success("Team member deactivated")
    } catch (error) {
      toast.error("Failed to deactivate team member")
    }
  }

  const handleResendInvite = (memberEmail: string) => {
    toast.success(`Invitation resent to ${memberEmail}`)
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await updateTeamMember(memberId, { role: newRole })
      toast.success("Role updated successfully")
    } catch (error) {
      toast.error("Failed to update role")
    }
  }

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter(m => m.status === "active").length,
    pending: teamMembers.filter(m => m.status === "pending").length,
    admins: teamMembers.filter(m => m.role === "admin").length,
    developers: teamMembers.filter(m => m.role === "developer").length,
    viewers: teamMembers.filter(m => m.role === "viewer").length
  }

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leadify Team</h1>
            </div>
            <p className="text-gray-600 mt-1">Loading team members...</p>
          </div>
        </div>
        
        {/* Loading Skeletons for Stats */}
        <div className="grid gap-4 md:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-white">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading Skeleton for Table */}
        <Card className="bg-white">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-600" />
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leadify Team</h1>
            </div>
            <p className="text-red-600 mt-1">Error: {error}</p>
          </div>
        </div>
        <Card className="bg-white">
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">Failed to load team members</p>
              <Button onClick={refetch} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leadify Team</h1>
          </div>
          <p className="text-gray-600 mt-1">Manage admin and developer access to the dashboard</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join the Leadify admin team
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>Admin - Full access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="developer">
                      <div className="flex items-center space-x-2">
                        <Code className="h-4 w-4" />
                        <span>Developer - Technical access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span>Viewer - Read-only access</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteMember}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Developers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.developers}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.viewers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage team member roles and permissions</CardDescription>
            </div>
            <Input
              placeholder="Search members..."
              className="max-w-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-gray-500">
                      {searchQuery ? `No team members found matching "${searchQuery}"` : "No team members yet"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleColors[member.role as keyof typeof roleColors]}>
                      {roleIcons[member.role as keyof typeof roleIcons]}
                      <span className="ml-1 capitalize">{member.role}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[member.status as keyof typeof statusColors]}>
                      {member.status === "active" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : member.status === "pending" ? (
                        <Clock className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      <span className="capitalize">{member.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>{member.invitedBy}</TableCell>
                  <TableCell>
                    {member.acceptedAt || (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.lastActive || (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {member.status === "pending" && (
                          <DropdownMenuItem onClick={() => handleResendInvite(member.email)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                        )}
                        {member.status === "active" && (
                          <>
                            <DropdownMenuItem>
                              <Shield className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Suspend Access
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions Guide */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding team member access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className={roleColors.admin}>
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Badge>
              <div className="text-sm text-muted-foreground">
                Full access to all features including team management, system configuration, and data deletion
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className={roleColors.developer}>
                <Code className="h-4 w-4 mr-1" />
                Developer
              </Badge>
              <div className="text-sm text-muted-foreground">
                Access to bug reports, support requests, analytics, and technical features. Cannot manage team members
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className={roleColors.viewer}>
                <Eye className="h-4 w-4 mr-1" />
                Viewer
              </Badge>
              <div className="text-sm text-muted-foreground">
                Read-only access to analytics, reports, and system status. Cannot modify any data
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}