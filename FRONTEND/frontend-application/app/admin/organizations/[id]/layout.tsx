"use client"

import { useParams, usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Building,
  BarChart3,
  MessageSquare,
  Users,
  Target,
  Bot,
  AlertCircle,
  ChevronLeft,
  Shield,
  Clock,
  Activity
} from "lucide-react"

interface Organization {
  id: string
  name: string
  status: string
  plan: string
  createdAt: string
}

const tabs = [
  {
    name: "Analytics",
    href: "analytics",
    icon: BarChart3,
    description: "Detailed metrics and insights"
  },
  {
    name: "Conversations",
    href: "conversations",
    icon: MessageSquare,
    description: "All conversations with token usage"
  },
  {
    name: "Leads",
    href: "leads",
    icon: Target,
    description: "Generated leads and contacts"
  },
  {
    name: "Members",
    href: "members",
    icon: Users,
    description: "Organization members and roles"
  },
  {
    name: "AI Details",
    href: "ai-details",
    icon: Bot,
    description: "AI agent configurations"
  },
  {
    name: "Issues & Features",
    href: "issues",
    icon: AlertCircle,
    description: "Reports and feature requests"
  }
]

export default function OrganizationDetailLayout({
  children
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const orgId = params.id as string
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch organization details
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        // Check for test mode
        const isTestMode = localStorage.getItem('test_mode') === 'true'
        
        if (isTestMode) {
          // Use mock data for testing
          console.log('Test mode enabled - using mock organization data')
          setOrganization({
            id: orgId,
            name: 'Test Organization',
            status: 'active',
            plan: 'Enterprise',
            createdAt: new Date().toISOString()
          })
          setLoading(false)
          return
        }
        
        const token = localStorage.getItem('admin_token')
        if (!token) {
          router.push('/admin/login')
          return
        }
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch organization')
        }
        
        const data = await response.json()
        console.log('Organization API response:', data) // Debug log
        
        // Handle both response formats
        const orgData = data.data?.organization || data.organization
        if (orgData) {
          // Map the backend response to our expected format
          setOrganization({
            id: orgData.id,
            name: orgData.name,
            status: orgData.status || 'active',
            plan: orgData.plan || 'Starter',
            createdAt: orgData.createdAt
          })
        } else {
          throw new Error('No organization data in response')
        }
      } catch (err) {
        console.error('Error fetching organization:', err)
        setError('Failed to load organization details')
      } finally {
        setLoading(false)
      }
    }
    
    fetchOrganization()
  }, [orgId, router])
  
  // Get current tab based on pathname
  const currentTab = tabs.find(tab => 
    pathname.includes(`/organizations/${orgId}/${tab.href}`)
  ) || tabs[0]
  
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading header */}
        <div className="bg-white border-b">
          <div className="px-6 py-4">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        
        {/* Loading tabs */}
        <div className="border-b bg-white">
          <div className="px-6">
            <nav className="flex space-x-8">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24" />
              ))}
            </nav>
          </div>
        </div>
        
        {/* Loading content */}
        <div className="px-6">
          <Card className="p-6">
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    )
  }
  
  if (error || !organization) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Organization</h2>
          <p className="text-gray-600 mb-4">{error || 'Organization not found'}</p>
          <Button onClick={() => router.push('/admin/organizations')}>
            Back to Organizations
          </Button>
        </Card>
      </div>
    )
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'suspended':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Enterprise':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'Professional':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'Starter':
        return 'bg-green-100 text-green-700 border-green-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/organizations')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              
              <div className="flex items-center space-x-3">
                <Building className="h-6 w-6 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold">{organization.name}</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className={getStatusColor(organization.status)}>
                      {organization.status}
                    </Badge>
                    <Badge variant="outline" className={getPlanColor(organization.plan)}>
                      {organization.plan}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Since {new Date(organization.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Activity Log
              </Button>
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Permissions
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8 -mb-px">
            {tabs.map((tab) => {
              const isActive = currentTab.name === tab.name
              return (
                <Link
                  key={tab.name}
                  href={`/admin/organizations/${orgId}/${tab.href}`}
                  className={cn(
                    "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    "hover:text-gray-700 hover:border-gray-300",
                    "flex items-center space-x-2",
                    isActive
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
      
      {/* Tab Description */}
      <div className="bg-gray-50 border-b px-6 py-3">
        <p className="text-sm text-gray-600">
          {currentTab.description}
        </p>
      </div>
      
      {/* Page Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}