"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Users2, 
  Search, 
  Download, 
  MoreVertical,
  Mail,
  Building,
  Calendar,
  Activity,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { adminUsersAPI, type User, type UserStats, type UsersFilters } from "@/lib/api/admin-users"

// Placeholder data - will be replaced with API calls
const mockUsers = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@techcorp.com",
    organization: "TechCorp Inc.",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    joinDate: "2024-01-15",
    lastActive: "2 hours ago",
    leadsCount: 45,
    conversationsCount: 23
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@realestatepro.com",
    organization: "Real Estate Pro",
    organizationId: "org-2",
    role: "agent",
    status: "active",
    joinDate: "2024-01-20",
    lastActive: "30 minutes ago",
    leadsCount: 89,
    conversationsCount: 67
  },
  {
    id: "3",
    name: "Carol Williams",
    email: "carol@homefind.com",
    organization: "HomeFind Agency",
    organizationId: "org-3",
    role: "moderator",
    status: "active",
    joinDate: "2024-02-01",
    lastActive: "1 day ago",
    leadsCount: 34,
    conversationsCount: 28
  },
  {
    id: "4",
    name: "David Brown",
    email: "david@propertysolutions.com",
    organization: "Property Solutions",
    organizationId: "org-4",
    role: "agent",
    status: "suspended",
    joinDate: "2024-02-15",
    lastActive: "3 days ago",
    leadsCount: 12,
    conversationsCount: 8
  },
  {
    id: "5",
    name: "Emma Davis",
    email: "emma@luxuryhomes.com",
    organization: "Luxury Homes Ltd",
    organizationId: "org-5",
    role: "agent",
    status: "active",
    joinDate: "2024-02-20",
    lastActive: "5 hours ago",
    leadsCount: 56,
    conversationsCount: 41
  },
  {
    id: "6",
    name: "Frank Wilson",
    email: "frank@cityrealty.com",
    organization: "City Realty",
    organizationId: "org-6",
    role: "viewer",
    status: "inactive",
    joinDate: "2024-03-01",
    lastActive: "1 week ago",
    leadsCount: 0,
    conversationsCount: 0
  },
  {
    id: "7",
    name: "Grace Martinez",
    email: "grace@dreamhomes.com",
    organization: "Dream Homes",
    organizationId: "org-7",
    role: "admin",
    status: "active",
    joinDate: "2024-03-05",
    lastActive: "Just now",
    leadsCount: 78,
    conversationsCount: 62
  },
  {
    id: "8",
    name: "Henry Taylor",
    email: "henry@metroproperty.com",
    organization: "Metro Property",
    organizationId: "org-8",
    role: "agent",
    status: "active",
    joinDate: "2024-03-10",
    lastActive: "4 hours ago",
    leadsCount: 41,
    conversationsCount: 35
  }
]

const roleColors = {
  admin: "bg-purple-100 text-purple-700 border-purple-300",
  moderator: "bg-blue-100 text-blue-700 border-blue-300",
  agent: "bg-green-100 text-green-700 border-green-300",
  viewer: "bg-gray-100 text-gray-700 border-gray-300"
}

const statusColors = {
  active: "bg-green-100 text-green-700 border-green-300",
  inactive: "bg-gray-100 text-gray-700 border-gray-300",
  suspended: "bg-red-100 text-red-700 border-red-300"
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [organizationFilter, setOrganizationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    suspendedUsers: 0,
    totalOrganizations: 0
  })
  const [organizations, setOrganizations] = useState<string[]>([])
  const itemsPerPage = 10

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers()
  }, [searchQuery, organizationFilter, statusFilter, currentPage])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const filters: UsersFilters = {
        search: searchQuery,
        organization: organizationFilter === "all" ? undefined : organizationFilter,
        status: statusFilter,
        page: currentPage,
        limit: itemsPerPage
      }

      const response = await adminUsersAPI.getUsers(filters)
      setUsers(response.users)
      setTotalPages(response.pagination.pages)
      
      // Extract unique organizations
      const uniqueOrgs = Array.from(new Set(response.users.map(u => u.organization).filter(Boolean)))
      setOrganizations(uniqueOrgs)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error("Failed to fetch users")
      // Fallback to mock data
      setUsers(mockUsers as any)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      console.log('[UsersPage] Fetching stats...')
      const statsData = await adminUsersAPI.getStats()
      console.log('[UsersPage] Stats received:', statsData)
      setStats(statsData)
    } catch (error) {
      console.error('[UsersPage] Failed to fetch stats:', error)
      // Log the error details
      if (error instanceof Error) {
        console.error('[UsersPage] Error details:', {
          message: error.message,
          stack: error.stack
        })
      }
      // Calculate from current users as fallback
      setStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === "active").length,
        inactiveUsers: users.filter(u => u.status === "inactive").length,
        suspendedUsers: users.filter(u => u.status === "suspended").length,
        totalOrganizations: new Set(users.map(u => u.organizationId)).size
      })
    }
  }

  const handleExportCSV = async () => {
    try {
      await adminUsersAPI.exportUsers('csv')
      toast.success("Users exported successfully")
    } catch (error) {
      console.error('Failed to export users:', error)
      toast.error("Failed to export users")
    }
  }

  const handleViewDetails = (user: User) => {
    setSelectedUser(user)
    setDetailsDialogOpen(true)
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      const reason = prompt("Enter suspension reason (optional):")
      await adminUsersAPI.suspendUser(userId, reason || undefined)
      toast.success("User suspended")
      // Refresh users list
      await fetchUsers()
      await fetchStats()
    } catch (error) {
      console.error('Failed to suspend user:', error)
      toast.error("Failed to suspend user")
    }
  }

  const handleReactivateUser = async (userId: string) => {
    try {
      await adminUsersAPI.reactivateUser(userId)
      toast.success("User reactivated")
      // Refresh users list
      await fetchUsers()
      await fetchStats()
    } catch (error) {
      console.error('Failed to reactivate user:', error)
      toast.error("Failed to reactivate user")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }
    
    try {
      await adminUsersAPI.deleteUser(userId)
      toast.success("User deleted")
      // Refresh users list
      await fetchUsers()
      await fetchStats()
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast.error("Failed to delete user")
    }
  }

  const handleSendEmail = async (user: User) => {
    const subject = prompt("Email subject:")
    if (!subject) return
    
    const message = prompt("Email message:")
    if (!message) return
    
    try {
      await adminUsersAPI.sendEmail(user.id, subject, message)
      toast.success(`Email sent to ${user.email}`)
    } catch (error) {
      console.error('Failed to send email:', error)
      toast.error("Failed to send email")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Users2 className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Users</h1>
          </div>
          <p className="text-gray-600 mt-1">Manage all users across the platform</p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-gray-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactiveUsers}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalOrganizations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, or organization..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org} value={org}>{org}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{user.organization}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleColors[user.role as keyof typeof roleColors]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[user.status as keyof typeof statusColors]}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{user.joinDate}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      <span>{user.lastActive}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user.leadsCount} leads</div>
                      <div className="text-muted-foreground">{user.conversationsCount} chats</div>
                    </div>
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
                        <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendEmail(user)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        {user.status === "active" ? (
                          <DropdownMenuItem 
                            className="text-orange-600"
                            onClick={() => handleSuspendUser(user.id)}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend User
                          </DropdownMenuItem>
                        ) : user.status === "suspended" ? (
                          <DropdownMenuItem 
                            className="text-green-600"
                            onClick={() => handleReactivateUser(user.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reactivate User
                          </DropdownMenuItem>
                        ) : null}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, stats.totalUsers)} of {stats.totalUsers} users
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Organization</Label>
                  <p className="font-medium">{selectedUser.organization}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  <Badge variant="outline" className={roleColors[selectedUser.role as keyof typeof roleColors]}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant="outline" className={statusColors[selectedUser.status as keyof typeof statusColors]}>
                    {selectedUser.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Join Date</Label>
                  <p className="font-medium">{selectedUser.joinDate}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Active</Label>
                  <p className="font-medium">{selectedUser.lastActive}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                  <p className="font-mono text-sm">{selectedUser.id}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Activity Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{selectedUser.leadsCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Conversations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{selectedUser.conversationsCount}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Add missing Label import
import { Label } from "@/components/ui/label"