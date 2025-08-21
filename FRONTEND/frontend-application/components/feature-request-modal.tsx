"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Lightbulb, CheckCircle, Loader2, TrendingUp, Star } from "lucide-react"
import { toast } from "sonner"

interface FeatureRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeatureRequestModal({ open, onOpenChange }: FeatureRequestModalProps) {
  const { user, getAuthHeaders } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedFeature, setSubmittedFeature] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    requestedFeature: "",
    reason: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.requestedFeature || !formData.reason) {
      toast.error("Please fill in all fields")
      return
    }

    if (!user) {
      toast.error("You must be logged in to submit a feature request")
      return
    }

    setIsSubmitting(true)

    try {
      // Get auth headers from context
      const authHeaders = await getAuthHeaders()
      
      // Submit feature request - backend will auto-fetch user info
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feature-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          requested_feature: formData.requestedFeature,
          reason: formData.reason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit feature request')
      }

      const data = await response.json()
      
      // Store submitted feature for display
      setSubmittedFeature({
        feature: formData.requestedFeature,
        reason: formData.reason,
        id: data.data?.id
      })
      
      setSubmitted(true)
      
      // Show success toast
      toast.success("Feature request submitted successfully!")
      
      // Dispatch custom event to trigger refresh on admin page
      window.dispatchEvent(new CustomEvent('newFeatureRequest', { 
        detail: { featureRequestId: data.data?.id } 
      }))
      
      // Reset form after delay
      setTimeout(() => {
        setFormData({ requestedFeature: "", reason: "" })
        setSubmitted(false)
        setSubmittedFeature(null)
        onOpenChange(false)
      }, 5000)
      
    } catch (error) {
      console.error('Error submitting feature request:', error)
      toast.error(error instanceof Error ? error.message : "Failed to submit feature request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ requestedFeature: "", reason: "" })
      setSubmitted(false)
      setSubmittedFeature(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                Request a Feature
              </DialogTitle>
              <DialogDescription>
                Have an idea for a new feature? Let us know what you'd like to see and why it would be valuable.
                <span className="block mt-2 text-xs text-muted-foreground">
                  Your request will be submitted with your account information for follow-up.
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestedFeature">
                  <span className="flex items-center gap-2">
                    Requested Feature
                    <span className="text-red-500">*</span>
                  </span>
                </Label>
                <Textarea
                  id="requestedFeature"
                  placeholder="Describe the feature you'd like to see..."
                  value={formData.requestedFeature}
                  onChange={(e) => setFormData({ ...formData, requestedFeature: e.target.value })}
                  disabled={isSubmitting}
                  rows={4}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about what functionality you need
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">
                  <span className="flex items-center gap-2">
                    Reason
                    <span className="text-red-500">*</span>
                  </span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why this feature would be valuable and how it would help you..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  disabled={isSubmitting}
                  rows={4}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Help us understand the problem this feature would solve
                </p>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Feature Request Submitted
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Thank you for your feature request! Our team will review it and consider it for future updates.
              </p>
              
              {submittedFeature && (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Your Request:
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {submittedFeature.feature}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Reason:
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {submittedFeature.reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <span>You'll receive updates on this feature request via email</span>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                This dialog will close automatically in a few seconds...
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}