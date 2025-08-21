/**
 * User Feedback Collector Component
 * 
 * Modal component for collecting user feedback about errors with:
 * - Multiple feedback types (bug report, feature request, etc.)
 * - Form validation and accessibility
 * - Automatic context collection
 * - Privacy-conscious data handling
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Bug, 
  Lightbulb, 
  MessageCircle, 
  Star,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FeedbackData {
  type: 'bug' | 'feature' | 'general' | 'rating'
  title: string
  description: string
  email?: string
  rating?: number
  reproductionSteps?: string
  expectedBehavior?: string
  actualBehavior?: string
  browserInfo?: string
  consentToContact: boolean
  includeContext: boolean
  context?: {
    errorId: string
    errorMessage?: string
    retryCount?: number
    userAgent?: string
    url?: string
    timestamp?: string
  }
}

interface UserFeedbackCollectorProps {
  isOpen?: boolean
  onSubmit: (feedback: FeedbackData) => void
  onClose: () => void
  errorContext?: {
    errorId: string
    errorMessage?: string
    retryCount?: number
  }
  className?: string
}

interface FormErrors {
  type?: string
  title?: string
  description?: string
  email?: string
  rating?: string
}

const FEEDBACK_TYPES = [
  {
    id: 'bug' as const,
    label: 'Bug Report',
    description: 'Report a problem or error',
    icon: Bug,
    color: 'text-red-500'
  },
  {
    id: 'feature' as const,
    label: 'Feature Request',
    description: 'Suggest a new feature or improvement',
    icon: Lightbulb,
    color: 'text-yellow-500'
  },
  {
    id: 'general' as const,
    label: 'General Feedback',
    description: 'Share your thoughts or questions',
    icon: MessageCircle,
    color: 'text-blue-500'
  },
  {
    id: 'rating' as const,
    label: 'Rate Experience',
    description: 'Rate your overall experience',
    icon: Star,
    color: 'text-purple-500'
  }
]

export const UserFeedbackCollector: React.FC<UserFeedbackCollectorProps> = ({
  isOpen = true,
  onSubmit,
  onClose,
  errorContext,
  className
}) => {
  const [formData, setFormData] = useState<Partial<FeedbackData>>({
    type: 'bug',
    title: '',
    description: '',
    email: '',
    rating: 5,
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: '',
    consentToContact: false,
    includeContext: true,
    context: errorContext
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Auto-populate error context
  useEffect(() => {
    if (errorContext) {
      setFormData(prev => ({
        ...prev,
        context: {
          ...errorContext,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        },
        title: `Error: ${errorContext.errorMessage?.substring(0, 50)}...` || 'Error Report',
        actualBehavior: errorContext.errorMessage || ''
      }))
    }
  }, [errorContext])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.type) {
      newErrors.type = 'Please select a feedback type'
    }

    if (!formData.title?.trim()) {
      newErrors.title = 'Please provide a title'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Please describe what happened'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.type === 'rating' && (!formData.rating || formData.rating < 1 || formData.rating > 5)) {
      newErrors.rating = 'Please provide a rating between 1 and 5'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Collect browser info if consent given
      const browserInfo = formData.includeContext ? {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine
      } : undefined

      const feedbackData: FeedbackData = {
        type: formData.type!,
        title: formData.title!,
        description: formData.description!,
        email: formData.email || undefined,
        rating: formData.rating,
        reproductionSteps: formData.reproductionSteps || undefined,
        expectedBehavior: formData.expectedBehavior || undefined,
        actualBehavior: formData.actualBehavior || undefined,
        browserInfo: browserInfo ? JSON.stringify(browserInfo) : undefined,
        consentToContact: formData.consentToContact || false,
        includeContext: formData.includeContext || false,
        context: formData.includeContext ? formData.context : undefined
      }

      await onSubmit(feedbackData)
      setSubmitStatus('success')
      
      // Auto-close after success
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FeedbackData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const renderRatingInput = () => {
    if (formData.type !== 'rating') return null

    return (
      <div className="space-y-2">
        <Label htmlFor="rating">Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleInputChange('rating', star)}
              className={cn(
                "p-1 rounded transition-colors",
                star <= (formData.rating || 0) 
                  ? "text-yellow-500" 
                  : "text-gray-300 hover:text-yellow-400"
              )}
              aria-label={`Rate ${star} stars`}
            >
              <Star className="h-6 w-6 fill-current" />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p className="text-sm text-red-500" role="alert">{errors.rating}</p>
        )}
      </div>
    )
  }

  const renderBugReportFields = () => {
    if (formData.type !== 'bug') return null

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reproduction-steps">How to reproduce this issue?</Label>
          <Textarea
            id="reproduction-steps"
            placeholder="1. Go to...\n2. Click on...\n3. See error..."
            value={formData.reproductionSteps || ''}
            onChange={(e) => handleInputChange('reproductionSteps', e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected-behavior">What did you expect to happen?</Label>
          <Textarea
            id="expected-behavior"
            placeholder="Describe what you expected..."
            value={formData.expectedBehavior || ''}
            onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="actual-behavior">What actually happened?</Label>
          <Textarea
            id="actual-behavior"
            placeholder="Describe what actually occurred..."
            value={formData.actualBehavior || ''}
            onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
            rows={2}
          />
        </div>
      </div>
    )
  }

  const selectedType = FEEDBACK_TYPES.find(type => type.id === formData.type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedType && <selectedType.icon className={cn("h-5 w-5", selectedType.color)} />}
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing your experience. Your feedback is valuable to us.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type Selection */}
          <div className="space-y-3">
            <Label>Type of feedback</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              {FEEDBACK_TYPES.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.id} id={type.id} />
                  <Label 
                    htmlFor={type.id} 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <type.icon className={cn("h-4 w-4", type.color)} />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.type && (
              <p className="text-sm text-red-500" role="alert">{errors.type}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of your feedback"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? "border-red-500" : ""}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-red-500" role="alert">{errors.title}</p>
            )}
          </div>

          {/* Rating (for rating type) */}
          {renderRatingInput()}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {formData.type === 'rating' ? 'Additional comments' : 'Description'} *
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what happened"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={errors.description ? "border-red-500" : ""}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <p id="description-error" className="text-sm text-red-500" role="alert">{errors.description}</p>
            )}
          </div>

          {/* Bug Report Specific Fields */}
          {renderBugReportFields()}

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? "border-red-500" : ""}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            <p className="text-sm text-muted-foreground">
              Provide your email if you'd like us to follow up with you
            </p>
            {errors.email && (
              <p id="email-error" className="text-sm text-red-500" role="alert">{errors.email}</p>
            )}
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-contact"
                checked={formData.consentToContact}
                onCheckedChange={(checked) => handleInputChange('consentToContact', checked)}
              />
              <Label htmlFor="consent-contact" className="text-sm">
                I consent to be contacted about this feedback
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-context"
                checked={formData.includeContext}
                onCheckedChange={(checked) => handleInputChange('includeContext', checked)}
              />
              <Label htmlFor="include-context" className="text-sm">
                Include technical information to help diagnose the issue
              </Label>
            </div>
          </div>

          {/* Context Information Preview */}
          {formData.includeContext && errorContext && (
            <Alert>
              <Shield className="h-4 w-4" />
              <div>
                <h4 className="font-medium">Technical Information</h4>
                <AlertDescription className="mt-2">
                  <div className="space-y-1 text-sm">
                    <div>Error ID: <Badge variant="outline">{errorContext.errorId}</Badge></div>
                    {errorContext.retryCount && (
                      <div>Retry Count: {errorContext.retryCount}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Browser info and page URL will also be included
                    </div>
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Submit Status */}
          {submitStatus === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Thank you! Your feedback has been submitted successfully.
              </AlertDescription>
            </Alert>
          )}

          {submitStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to submit feedback. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Feedback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}