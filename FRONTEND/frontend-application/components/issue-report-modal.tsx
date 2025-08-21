"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import { usePostHog } from "posthog-js/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Loader2, Bug, Lightbulb, Zap, Shield } from "lucide-react"
import { toast } from "sonner"

interface IssueReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AIClassification {
  priority: 'urgent' | 'high' | 'medium' | 'low'
  priorityScore: number
  category: 'bug' | 'feature_request' | 'performance' | 'security' | 'other'
  suggestedActions: string[]
  reasoning: string
}

export function IssueReportModal({ open, onOpenChange }: IssueReportModalProps) {
  const { user, getAuthHeaders } = useAuth()
  const posthog = usePostHog()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [classification, setClassification] = useState<AIClassification | null>(null)
  
  const [formData, setFormData] = useState({
    subject: "",
    description: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.description) {
      toast.error("Please fill in all fields")
      return
    }

    setIsSubmitting(true)

    try {
      // Get PostHog session information
      const sessionId = posthog?.get_session_id()
      const personId = posthog?.get_distinct_id()
      
      // Get organization ID from user
      const organizationId = user?.organizationId

      // Capture browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href
      }

      // Get auth headers from context
      const authHeaders = await getAuthHeaders()
      
      // Submit issue report
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          subject: formData.subject,
          description: formData.description,
          organizationId,
          posthogSessionId: sessionId,
          posthogPersonId: personId,
          browserInfo
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit issue')
      }

      const data = await response.json()
      
      // Track event in PostHog
      posthog?.capture('issue_reported', {
        issueId: data.data.id,
        priority: data.data.priority,
        category: data.data.aiClassification.category,
        hasSessionRecording: !!sessionId
      })

      // Show AI classification
      setClassification(data.data.aiClassification)
      setSubmitted(true)
      
      // Show success toast
      toast.success("Issue reported successfully!")
      
      // Dispatch custom event to trigger refresh on admin page
      window.dispatchEvent(new CustomEvent('newIssueReported', { 
        detail: { issueId: data.data.id } 
      }))
      
      // Reset form after delay
      setTimeout(() => {
        setFormData({ subject: "", description: "" })
        setSubmitted(false)
        setClassification(null)
        onOpenChange(false)
      }, 5000)
      
    } catch (error) {
      console.error('Error submitting issue:', error)
      toast.error("Failed to submit issue. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return <Bug className="h-4 w-4" />
      case 'feature_request': return <Lightbulb className="h-4 w-4" />
      case 'performance': return <Zap className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Report an Issue
              </DialogTitle>
              <DialogDescription>
                Describe the issue you're experiencing. Our AI will classify and prioritize it automatically.
                {posthog?.get_session_id() && (
                  <span className="block mt-2 text-xs text-green-600">
                    ✓ Session recording will be attached for better debugging
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of the issue"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about what happened, what you expected, and any error messages you saw..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSubmitting}
                  rows={6}
                  required
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
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
                    'Submit Issue'
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
                Issue Reported Successfully
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Thank you for reporting this issue. Our team has been notified and will investigate.
              </p>
              
              {classification && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(classification.priority)}`}>
                      Priority: {classification.priority.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      {getCategoryIcon(classification.category)}
                      {classification.category.replace('_', ' ')}
                    </div>
                  </div>
                  
                  {classification.suggestedActions.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Suggested Actions:</p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {classification.suggestedActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {classification.reasoning && (
                    <p className="text-xs text-gray-500 italic">
                      AI Analysis: {classification.reasoning}
                    </p>
                  )}
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                This dialog will close automatically in a few seconds...
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}