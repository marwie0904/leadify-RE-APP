"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  User,
  Mail,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  UserX,
  UserCog,
  CheckCircle,
  XCircle,
  Info,
  Crown,
  UserCheck,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { mockMembersData } from "@/lib/test-data"

interface Member {
  id: string
  user_id: string
  organization_id: string
  role: string
  joined_at: string
  name: string
  email: string
  last_active?: string
  permissions?: string[]
}

interface MemberStats {
  total_members: number
  admins: number
  agents: number
  viewers: number
  active_today: number
  inactive_30_days: number
}

export default function OrganizationMembersPage() {
  const params = useParams()
  const orgId = params.id as string
  
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const [editMode, setEditMode] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, { role: string }>>({})
  const [removingMember, setRemovingMember] = useState<Member | null>(null)
  const [savingChanges, setSavingChanges] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  
  const fetchMembers = async () => {
    try {
      // Check for test mode
      const isTestMode = typeof window !== 'undefined' && localStorage.getItem('test_mode') === 'true'
      
      if (isTestMode) {
        // Use mock data in test mode
        const processedMembers = mockMembersData.members.map((member: any) => ({
          ...member,
          status: member.status || 'active'
        }))
        
        // Calculate statistics
        const adminCount = processedMembers.filter(m => m.role === 'admin').length
        const memberCount = processedMembers.filter(m => m.role === 'member').length
        const viewerCount = processedMembers.filter(m => m.role === 'viewer').length
        const activeToday = processedMembers.filter(m => {
          const lastActive = new Date(m.last_active)
          const today = new Date()
          return lastActive.toDateString() === today.toDateString()
        }).length
        
        const calculatedStats: MemberStats = {
          total_members: processedMembers.length,
          admins: adminCount,
          agents: memberCount,
          viewers: viewerCount,
          active_today: activeToday,
          inactive_30_days: 0
        }
        
        setMembers(processedMembers)
        setStats(calculatedStats)
        setError(null)
        setLoading(false)
        setRefreshing(false)
        return
      }
      
      const token = localStorage.getItem('admin_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/members`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      
      const data = await response.json()
      
      // Process members data
      const processedMembers: Member[] = data.members?.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        organization_id: member.organization_id,
        role: member.role,
        joined_at: member.joined_at,
        name: member.user?.name || member.name || 'Unknown User',
        email: member.user?.email || member.email || 'no-email@example.com',
        last_active: member.last_active || member.user?.last_sign_in_at,
        permissions: getPermissionsByRole(member.role)
      })) || []
      
      // Calculate statistics
      const adminCount = processedMembers.filter(m => m.role === 'admin').length
      const agentCount = processedMembers.filter(m => m.role === 'agent').length
      const viewerCount = processedMembers.filter(m => m.role === 'viewer').length
      
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const activeToday = processedMembers.filter(m => {
        if (!m.last_active) return false
        const lastActive = new Date(m.last_active)
        return lastActive.toDateString() === today.toDateString()
      }).length
      
      const inactive30Days = processedMembers.filter(m => {
        if (!m.last_active) return true
        const lastActive = new Date(m.last_active)
        return lastActive < thirtyDaysAgo
      }).length
      
      const calculatedStats: MemberStats = {
        total_members: processedMembers.length,
        admins: adminCount,
        agents: agentCount,
        viewers: viewerCount,
        active_today: activeToday,
        inactive_30_days: inactive30Days
      }
      
      setMembers(processedMembers)
      setStats(calculatedStats)
      setError(null)
    } catch (err) {
      console.error('Error fetching members:', err)
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    fetchMembers()
  }, [orgId])
  
  const handleRefresh = () => {
    setRefreshing(true)
    setPendingChanges({})
    setEditingMember(null)
    fetchMembers()
  }
  
  const getPermissionsByRole = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return ['Full Access', 'Manage Members', 'Manage Settings', 'View Reports', 'Export Data']
      case 'agent':
        return ['Manage Conversations', 'View Leads', 'Use AI Agents', 'View Reports']
      case 'viewer':
        return ['View Conversations', 'View Reports']
      default:
        return []
    }
  }
  
  const handleRoleChange = (memberId: string, newRole: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [memberId]: { role: newRole }
    }))
  }
  
  const handleSaveChanges = async () => {
    setSavingChanges(true)
    const token = localStorage.getItem('admin_token')
    
    try {
      // Save all pending changes
      const promises = Object.entries(pendingChanges).map(async ([memberId, changes]) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/members/${memberId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(changes)
          }
        )
        
        if (!response.ok) {
          throw new Error(`Failed to update member ${memberId}`)
        }
        
        return response.json()
      })
      
      await Promise.all(promises)
      
      toast.success('Member roles updated successfully')
      setPendingChanges({})
      setEditMode(false)
      fetchMembers()
    } catch (err) {
      console.error('Error saving changes:', err)
      toast.error('Failed to save changes')
    } finally {
      setSavingChanges(false)
    }
  }
  
  const handleRemoveMember = async (member: Member) => {
    const token = localStorage.getItem('admin_token')
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/members/${member.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to remove member')
      }
      
      toast.success(`${member.name} has been removed from the organization`)
      setRemovingMember(null)
      fetchMembers()
    } catch (err) {
      console.error('Error removing member:', err)
      toast.error('Failed to remove member')
    }
  }
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'agent':
        return <UserCheck className="h-4 w-4 text-blue-500" />
      case 'viewer':
        return <User className="h-4 w-4 text-gray-500" />
      default:
        return <User className="h-4 w-4" />
    }
  }
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'agent':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'viewer':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  // Filter members
  const filteredMembers = members.filter(member => {
    if (searchTerm && 
        !member.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !member.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (roleFilter !== "all" && member.role !== roleFilter) {
      return false
    }
    return true
  })
  
  // Check if member has pending changes
  const getMemberRole = (member: Member) => {
    return pendingChanges[member.id]?.role || member.role
  }
  
  const hasPendingChange = (member: Member) => {
    return pendingChanges[member.id] && pendingChanges[member.id].role !== member.role
  }
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <Skeleton className="h-96" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchMembers()
            }}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Edit Mode Banner */}
      {editMode && (
        <Alert className="border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-orange-800">
              You are in edit mode. Make changes to member roles and click Save to apply.
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditMode(false)
                  setPendingChanges({})
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={Object.keys(pendingChanges).length === 0 || savingChanges}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes
                {Object.keys(pendingChanges).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.keys(pendingChanges).length}
                  </Badge>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_members}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                {stats.admins}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-blue-500" />
                {stats.agents}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>Manage team members and their roles</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
              {!editMode && (
                <Button
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="agent">Agents</SelectItem>
                <SelectItem value="viewer">Viewers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Table */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No members found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    {editMode && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow 
                      key={member.id}
                      className={cn(
                        hasPendingChange(member) && "bg-orange-50"
                      )}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center">
                            {member.name}
                            {hasPendingChange(member) && (
                              <Badge variant="outline" className="ml-2 text-xs bg-orange-100">
                                Modified
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {member.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {editMode ? (
                          <Select
                            value={getMemberRole(member)}
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={getRoleColor(member.role)}>
                            <span className="flex items-center">
                              {getRoleIcon(member.role)}
                              <span className="ml-1 capitalize">{member.role}</span>
                            </span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getPermissionsByRole(getMemberRole(member)).slice(0, 2).map((perm, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                          {getPermissionsByRole(getMemberRole(member)).length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{getPermissionsByRole(getMemberRole(member)).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(member.joined_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(member.joined_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.last_active ? (
                          <div className="text-sm">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-gray-400" />
                              {new Date(member.last_active).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(member.last_active).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Never</span>
                        )}
                      </TableCell>
                      {editMode && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemovingMember(member)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removingMember?.name}</strong> from this organization?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removingMember && handleRemoveMember(removingMember)}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}