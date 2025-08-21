"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Users, 
  UserCheck,
  UserX,
  Mail,
  Shield,
  User
} from "lucide-react"
import { toast } from "sonner"

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  status: 'active' | 'inactive'
  lastActive?: string
  joinedAt: string
}

interface TeamStats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
}

const roleColors = {
  admin: "bg-purple-100 text-purple-700 border-purple-300",
  member: "bg-blue-100 text-blue-700 border-blue-300"
}

const roleIcons = {
  admin: Shield,
  member: User
}

export default function LeadifyTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats>({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    setLoading(true)
    try {
      // Get auth token
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Fetch team members from the API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/team/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch team members: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Backend now returns members directly at data.members
        const membersList = data.members || []
        
        // Transform the members data if needed
        const transformedMembers = membersList.map((m: any) => {
          // Format last active time
          let lastActive = 'Never';
          if (m.last_login) {
            const lastLogin = new Date(m.last_login);
            const now = new Date();
            const diffMs = now.getTime() - lastLogin.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) {
              lastActive = 'Just now';
            } else if (diffMins < 60) {
              lastActive = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
              lastActive = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffDays < 7) {
              lastActive = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else {
              lastActive = lastLogin.toLocaleDateString();
            }
          }
          
          // Map roles: marwryyy@gmail.com is admin, everyone else is member
          // Also handle various role names from the backend
          let role: 'admin' | 'member' = 'member';
          if (m.email === 'marwryyy@gmail.com') {
            role = 'admin';
          } else if (m.role === 'admin' || m.role === 'super_admin') {
            // Keep other admins as members since only marwryyy should be admin
            role = 'member';
          }
          
          // Extract name from full_name or construct from email
          let displayName = m.full_name || m.name || m.email?.split('@')[0] || 'Unknown';
          // Remove role suffixes like "(Super Admin)", "(Admin)", "(Developer)" from names
          displayName = displayName.replace(/\s*\(.*?\)\s*$/, '').trim();
          
          return {
            id: m.id || m.user_id,
            name: displayName,
            email: m.email,
            role: role,
            status: m.status || (m.is_active ? 'active' : 'inactive'),
            lastActive: lastActive,
            joinedAt: m.joinedAt || m.created_at
          };
        })
        
        setMembers(transformedMembers)
        
        // Calculate stats
        const total = transformedMembers.length
        const active = transformedMembers.filter((m: TeamMember) => m.status === 'active').length
        const inactive = total - active
        
        setStats({
          totalMembers: total,
          activeMembers: active,
          inactiveMembers: inactive
        })
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
      toast.error('Failed to load team members')
      
      // Don't use mock data - show empty state instead
      setMembers([])
      setStats({
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leadify Team</h1>
          </div>
          <p className="text-gray-600 mt-1">Manage your organization's team members</p>
        </div>
      </div>


      {/* Members Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All members of the Leadify organization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading team members...
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No team members found
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => {
                  const RoleIcon = roleIcons[member.role] || User
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium">{member.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[member.role]}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={member.status === 'active' 
                            ? 'bg-green-50 text-green-700 border-green-300' 
                            : 'bg-gray-50 text-gray-700 border-gray-300'
                          }
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.lastActive || 'Never'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}