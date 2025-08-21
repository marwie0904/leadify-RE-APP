"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Building2, 
  Save, 
  Loader2, 
  Info,
  Factory,
  Package,
  FileText
} from "lucide-react"
import { useAuth } from "@/contexts/simple-auth-context"
import { toast } from "sonner"

interface OrganizationData {
  id: string
  name: string
  company_overview: string | null
  industry: string | null
  product_service: string | null
}

interface OrganizationSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrganizationSettingsModal({ 
  open, 
  onOpenChange 
}: OrganizationSettingsModalProps) {
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    company_overview: "",
    industry: "",
    product_service: ""
  })
  const { user, getAuthHeaders } = useAuth()

  // Fetch organization data
  const fetchOrganization = async () => {
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      
      // Get organization ID from user context
      const organizationId = user?.organizationId || user?.organization?.id
      
      console.log("[OrganizationSettings] Organization ID from user context:", organizationId)
      
      if (!organizationId) {
        toast.error("No organization found")
        onOpenChange(false)
        return
      }
      
      // Fetch organization details
      console.log("[OrganizationSettings] Fetching organization:", `${API_BASE_URL}/api/organizations/${organizationId}`)
      const orgResponse = await fetch(`${API_BASE_URL}/api/organizations/${organizationId}`, {
        headers: authHeaders
      })
      
      if (!orgResponse.ok) {
        const errorText = await orgResponse.text()
        console.error("[OrganizationSettings] Failed to fetch organization:", orgResponse.status, errorText)
        throw new Error("Failed to fetch organization data")
      }
      
      const orgData = await orgResponse.json()
      console.log("[OrganizationSettings] Organization data received:", orgData)
      setOrganization(orgData)
      setFormData({
        name: orgData.name || "",
        company_overview: orgData.company_overview || "",
        industry: orgData.industry || "",
        product_service: orgData.product_service || ""
      })
      
    } catch (error) {
      console.error("Error fetching organization:", error)
      toast.error("Failed to load organization data")
    } finally {
      setLoading(false)
    }
  }

  // Save organization changes
  const handleSave = async () => {
    if (!organization) return
    
    setSaving(true)
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${organization.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          name: formData.name,
          company_overview: formData.company_overview || null,
          industry: formData.industry || null,
          product_service: formData.product_service || null
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update organization")
      }
      
      const updatedOrg = await response.json()
      setOrganization(updatedOrg)
      
      toast.success("Organization information updated successfully!")
      onOpenChange(false)
      
    } catch (error) {
      console.error("Error updating organization:", error)
      toast.error((error as Error).message || "Failed to update organization")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (open && user) {
      fetchOrganization()
    }
  }, [open, user])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Organization Settings
          </DialogTitle>
          <DialogDescription>
            Update your organization details. This information will be used to provide context to your AI assistant.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : organization ? (
          <div className="space-y-6 py-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-blue-500" />
                Organization Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your organization name"
                disabled={saving}
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry" className="flex items-center">
                <Factory className="h-4 w-4 mr-2 text-blue-500" />
                Industry
              </Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Real Estate, Technology, Healthcare..."
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Specify your industry to help the AI understand your business context
              </p>
            </div>

            {/* Company Overview */}
            <div className="space-y-2">
              <Label htmlFor="company_overview" className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                Company Overview
              </Label>
              <Textarea
                id="company_overview"
                value={formData.company_overview}
                onChange={(e) => setFormData({ ...formData, company_overview: e.target.value })}
                placeholder="Describe your company's mission, values, and what makes you unique..."
                rows={4}
                disabled={saving}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                A brief description of your company and its mission
              </p>
            </div>

            {/* Product/Service */}
            <div className="space-y-2">
              <Label htmlFor="product_service" className="flex items-center">
                <Package className="h-4 w-4 mr-2 text-blue-500" />
                Products & Services
              </Label>
              <Textarea
                id="product_service"
                value={formData.product_service}
                onChange={(e) => setFormData({ ...formData, product_service: e.target.value })}
                placeholder="Describe your main products or services, target customers, and value proposition..."
                rows={4}
                disabled={saving}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                What products or services does your organization offer?
              </p>
            </div>

            {/* Important Note */}
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    AI Context Generation
                  </p>
                  <p className="text-sm text-blue-700">
                    This information will be automatically processed into a concise context 
                    that your AI assistant will use in every conversation to provide more 
                    relevant and personalized responses for your business.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Organization not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}