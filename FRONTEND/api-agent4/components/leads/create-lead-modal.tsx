"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Globe, 
  MessageSquare,
  Users,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle
} from 'lucide-react'
import { BANTSlider, BANTScoreSummary, calculateBANTTotal } from './bant-slider'
import { useCreateLead } from '@/src/hooks/mutations/use-create-lead'
import type { CreateLeadData, ContactInfo, LeadSource } from '@/lib/validation/schemas'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (lead: any) => void
}

type FormStep = 'contact' | 'source' | 'bant' | 'review'

interface FormData {
  contactInfo: Partial<ContactInfo>
  source: Partial<LeadSource>
  initialBANT?: {
    budget: number
    authority: number
    need: number
    timeline: number
  }
  notes?: string
}

const FORM_STEPS: { key: FormStep; title: string; description: string }[] = [
  { key: 'contact', title: 'Contact Info', description: 'Basic contact information' },
  { key: 'source', title: 'Lead Source', description: 'How did they find us?' },
  { key: 'bant', title: 'BANT Scoring', description: 'Initial qualification (optional)' },
  { key: 'review', title: 'Review', description: 'Confirm and create' },
]

export function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('contact')
  const [formData, setFormData] = useState<FormData>({
    contactInfo: {
      preferredContact: 'email'
    },
    source: {
      channel: 'web'
    },
    initialBANT: {
      budget: 0,
      authority: 0,
      need: 0,
      timeline: 0
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createLeadMutation = useCreateLead()

  const updateFormData = (section: keyof FormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }))
    
    // Clear errors for updated fields
    if (errors) {
      const newErrors = { ...errors }
      Object.keys(data).forEach(key => {
        delete newErrors[`${section}.${key}`]
      })
      setErrors(newErrors)
    }
  }

  const validateStep = (step: FormStep): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 'contact':
        if (!formData.contactInfo.name?.trim()) {
          newErrors['contactInfo.name'] = 'Name is required'
        }
        if (!formData.contactInfo.email?.trim()) {
          newErrors['contactInfo.email'] = 'Email is required'
        } else if (!/\S+@\S+\.\S+/.test(formData.contactInfo.email)) {
          newErrors['contactInfo.email'] = 'Valid email is required'
        }
        break
      case 'source':
        if (!formData.source.channel) {
          newErrors['source.channel'] = 'Lead source is required'
        }
        break
      case 'bant':
        // BANT is optional, no validation needed
        break
      case 'review':
        // Final validation happens in submit
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const stepIndex = FORM_STEPS.findIndex(s => s.key === currentStep)
      if (stepIndex < FORM_STEPS.length - 1) {
        setCurrentStep(FORM_STEPS[stepIndex + 1].key)
      }
    }
  }

  const prevStep = () => {
    const stepIndex = FORM_STEPS.findIndex(s => s.key === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(FORM_STEPS[stepIndex - 1].key)
    }
  }

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.contactInfo.name || !formData.contactInfo.email) {
        setErrors({ submit: 'Please complete all required fields' })
        return
      }

      const leadData: CreateLeadData = {
        contactInfo: formData.contactInfo as ContactInfo,
        source: formData.source as LeadSource,
        ...(formData.initialBANT && 
          (formData.initialBANT.budget > 0 || 
           formData.initialBANT.authority > 0 || 
           formData.initialBANT.need > 0 || 
           formData.initialBANT.timeline > 0) && 
          { initialBANT: formData.initialBANT }),
        notes: formData.notes
      }

      const result = await createLeadMutation.mutateAsync(leadData)
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      // Reset form and close
      setFormData({
        contactInfo: { preferredContact: 'email' },
        source: { channel: 'web' },
        initialBANT: { budget: 0, authority: 0, need: 0, timeline: 0 }
      })
      setCurrentStep('contact')
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Failed to create lead:', error)
      setErrors({ submit: 'Failed to create lead. Please try again.' })
    }
  }

  const handleClose = () => {
    setFormData({
      contactInfo: { preferredContact: 'email' },
      source: { channel: 'web' },
      initialBANT: { budget: 0, authority: 0, need: 0, timeline: 0 }
    })
    setCurrentStep('contact')
    setErrors({})
    onClose()
  }

  const currentStepIndex = FORM_STEPS.findIndex(s => s.key === currentStep)
  const isLastStep = currentStep === 'review'
  const isFirstStep = currentStep === 'contact'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create New Lead
          </DialogTitle>
          <DialogDescription>
            Add a new lead to your pipeline with optional BANT qualification
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {FORM_STEPS.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${currentStepIndex >= index 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {currentStepIndex > index ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-2 hidden sm:block">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div className={`
                  w-12 h-0.5 mx-4
                  ${currentStepIndex > index ? 'bg-primary' : 'bg-muted'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <div className="space-y-6">
          {/* Contact Information */}
          {currentStep === 'contact' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.contactInfo.name || ''}
                      onChange={(e) => updateFormData('contactInfo', { name: e.target.value })}
                      placeholder="John Doe"
                      className={errors['contactInfo.name'] ? 'border-red-500' : ''}
                    />
                    {errors['contactInfo.name'] && (
                      <p className="text-sm text-red-500">{errors['contactInfo.name']}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.contactInfo.email || ''}
                      onChange={(e) => updateFormData('contactInfo', { email: e.target.value })}
                      placeholder="john@example.com"
                      className={errors['contactInfo.email'] ? 'border-red-500' : ''}
                    />
                    {errors['contactInfo.email'] && (
                      <p className="text-sm text-red-500">{errors['contactInfo.email']}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.contactInfo.phone || ''}
                      onChange={(e) => updateFormData('contactInfo', { phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                    <Select
                      value={formData.contactInfo.preferredContact}
                      onValueChange={(value) => updateFormData('contactInfo', { preferredContact: value as 'email' | 'phone' | 'sms' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="phone">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            SMS
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lead Source */}
          {currentStep === 'source' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Lead Source
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channel">How did they find us? *</Label>
                  <Select
                    value={formData.source.channel}
                    onValueChange={(value) => updateFormData('source', { channel: value })}
                  >
                    <SelectTrigger className={errors['source.channel'] ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Website</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="phone">Phone Inquiry</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors['source.channel'] && (
                    <p className="text-sm text-red-500">{errors['source.channel']}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referrer">Referrer URL or Source</Label>
                  <Input
                    id="referrer"
                    value={formData.source.referrer || ''}
                    onChange={(e) => updateFormData('source', { referrer: e.target.value })}
                    placeholder="https://example.com or 'John Smith referral'"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign Name</Label>
                  <Input
                    id="campaign"
                    value={formData.source.campaign || ''}
                    onChange={(e) => updateFormData('source', { campaign: e.target.value })}
                    placeholder="Q4 2024 Real Estate Campaign"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* BANT Scoring */}
          {currentStep === 'bant' && (
            <Card>
              <CardHeader>
                <CardTitle>Initial BANT Qualification (Optional)</CardTitle>
                <CardDescription>
                  Score this lead if you have initial qualification information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.initialBANT && (
                  <BANTScoreSummary scores={formData.initialBANT} />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BANTSlider
                    label="Budget"
                    value={formData.initialBANT?.budget || 0}
                    onChange={(value) => updateFormData('initialBANT', { 
                      ...formData.initialBANT, 
                      budget: value 
                    })}
                    description="Financial qualification and budget authority"
                    examples={[
                      "0-2: No budget discussion",
                      "3-5: Budget range mentioned",
                      "6-8: Specific budget confirmed",
                      "9-10: Budget approved"
                    ]}
                  />

                  <BANTSlider
                    label="Authority"
                    value={formData.initialBANT?.authority || 0}
                    onChange={(value) => updateFormData('initialBANT', { 
                      ...formData.initialBANT, 
                      authority: value 
                    })}
                    description="Decision-making power and influence"
                    examples={[
                      "0-2: No decision authority",
                      "3-5: Influencer in process",
                      "6-8: Key stakeholder",
                      "9-10: Final decision maker"
                    ]}
                  />

                  <BANTSlider
                    label="Need"
                    value={formData.initialBANT?.need || 0}
                    onChange={(value) => updateFormData('initialBANT', { 
                      ...formData.initialBANT, 
                      need: value 
                    })}
                    description="Pain point intensity and urgency"
                    examples={[
                      "0-2: No clear need",
                      "3-5: General interest",
                      "6-8: Specific need identified",
                      "9-10: Critical/urgent need"
                    ]}
                  />

                  <BANTSlider
                    label="Timeline"
                    value={formData.initialBANT?.timeline || 0}
                    onChange={(value) => updateFormData('initialBANT', { 
                      ...formData.initialBANT, 
                      timeline: value 
                    })}
                    description="Purchase timeline and urgency"
                    examples={[
                      "0-2: No timeline",
                      "3-5: 6+ months",
                      "6-8: 1-6 months",
                      "9-10: Immediate (30 days)"
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Review Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info Summary */}
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="bg-muted p-3 rounded-lg space-y-1">
                      <p><strong>Name:</strong> {formData.contactInfo.name}</p>
                      <p><strong>Email:</strong> {formData.contactInfo.email}</p>
                      {formData.contactInfo.phone && (
                        <p><strong>Phone:</strong> {formData.contactInfo.phone}</p>
                      )}
                      <p><strong>Preferred Contact:</strong> {formData.contactInfo.preferredContact}</p>
                    </div>
                  </div>

                  {/* Source Summary */}
                  <div>
                    <h4 className="font-medium mb-2">Lead Source</h4>
                    <div className="bg-muted p-3 rounded-lg space-y-1">
                      <p><strong>Channel:</strong> {formData.source.channel}</p>
                      {formData.source.referrer && (
                        <p><strong>Referrer:</strong> {formData.source.referrer}</p>
                      )}
                      {formData.source.campaign && (
                        <p><strong>Campaign:</strong> {formData.source.campaign}</p>
                      )}
                    </div>
                  </div>

                  {/* BANT Summary */}
                  {formData.initialBANT && (
                    <div>
                      <h4 className="font-medium mb-2">BANT Scores</h4>
                      <BANTScoreSummary scores={formData.initialBANT} />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => updateFormData('notes', e.target.value)}
                      placeholder="Any additional context or notes about this lead..."
                      rows={3}
                    />
                  </div>

                  {errors.submit && (
                    <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                      {errors.submit}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={isFirstStep ? handleClose : prevStep}
            disabled={createLeadMutation.isPending}
          >
            {isFirstStep ? 'Cancel' : (
              <>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={createLeadMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
            </Button>
          ) : (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}