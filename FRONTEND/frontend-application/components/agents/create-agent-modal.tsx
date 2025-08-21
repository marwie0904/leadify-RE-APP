"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Upload, Plus, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedAttachmentUpload, AttachmentFile } from "@/components/attachments/enhanced-attachment-upload"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CriteriaItem {
  id?: string
  min?: number
  max?: number
  type?: string
  points: number
  label: string
  section?: string
  amount?: number
  timeAmount?: number
  timeUnit?: string
}

interface BANTConfiguration {
  budget_weight: number
  authority_weight: number
  need_weight: number
  timeline_weight: number
  contact_weight: number
  budget_criteria: CriteriaItem[]
  authority_criteria: CriteriaItem[]
  need_criteria: CriteriaItem[]
  timeline_criteria: CriteriaItem[]
  contact_criteria: CriteriaItem[]
  priority_threshold: number
  hot_threshold: number
  warm_threshold: number
}

// Helper functions and constants
const formatBudgetLabel = (section: string, amount: number): string => {
  if (section === 'thousands') {
    return `$${amount}K`
  } else if (section === 'millions') {
    return `$${amount}M`
  } else if (section === 'billions') {
    return `$${amount}B`
  }
  return `$${amount}`
}

const AUTHORITY_OPTIONS = [
  { value: 'single', label: 'Single', tooltip: 'Sole/solo decision maker' },
  { value: 'dual', label: 'Dual', tooltip: 'Partnership/spouse/2 person decision maker' },
  { value: 'group', label: 'Group', tooltip: '3 or more people / family / relatives / etc.' },
  { value: 'corporation', label: 'Corporation', tooltip: 'Company/LLC/etc.' }
]

const TIMELINE_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' }
]

const BUDGET_SECTIONS = [
  { value: 'thousands', label: 'Thousands (K)' },
  { value: 'millions', label: 'Millions (M)' },
  { value: 'billions', label: 'Billions (B)' }
]

interface CreateAgentModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    tone: string
    language: string
    openingMessage: string
    customGreeting?: string
    documents: File[]
    attachments: AttachmentFile[]
    bantConfiguration?: BANTConfiguration
  }) => Promise<any>
}

export function CreateAgentModal({ open, onClose, onSubmit }: CreateAgentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([]) // Keep for backwards compatibility
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [formData, setFormData] = useState({
    name: "",
    tone: "Professional",
    language: "English",
    openingMessage: "Hello! How can I help you today?",
    customGreeting: "",
  })
  
  // Default BANT Configuration
  const [bantConfiguration, setBantConfiguration] = useState<BANTConfiguration>({
    budget_weight: 25,
    authority_weight: 25,
    need_weight: 25,
    timeline_weight: 25,
    contact_weight: 0,
    budget_criteria: [
      { section: 'millions', amount: 5, points: 25, label: "$5M" },
      { section: 'millions', amount: 1, points: 15, label: "$1M" },
      { section: 'thousands', amount: 500, points: 10, label: "$500K" }
    ],
    authority_criteria: [
      { type: "single", points: 25, label: "Single" },
      { type: "dual", points: 20, label: "Dual" },
      { type: "group", points: 15, label: "Group" }
    ],
    need_criteria: [
      { type: "stated", points: 25, label: "If need was properly stated" }
    ],
    timeline_criteria: [
      { timeAmount: 1, timeUnit: "months", points: 25, label: "1 months" },
      { timeAmount: 3, timeUnit: "months", points: 15, label: "3 months" }
    ],
    contact_criteria: [
      { type: "complete", points: 0, label: "If both name and phone number was given" }
    ],
    priority_threshold: 90,
    hot_threshold: 70,
    warm_threshold: 50
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Create Agent form submitted with data:", formData)
    console.log("Files to upload:", files)
    console.log("Attachments to upload:", attachments)

    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error("Agent name is required")
      }

      // Validate legacy files (max 5 PDFs) - keep for backwards compatibility
      if (files.length > 5) {
        throw new Error("Maximum 5 PDF files allowed")
      }

      for (const file of files) {
        if (file.type !== "application/pdf") {
          throw new Error(`File ${file.name} is not a PDF. Only PDF files are allowed.`)
        }
      }

      // Validate new attachments
      const totalAttachments = files.length + attachments.length
      if (totalAttachments > 10) {
        throw new Error("Maximum 10 files allowed in total")
      }

      // Check that all attachments are uploaded
      const incompleteAttachments = attachments.filter(att => !att.uploaded)
      if (incompleteAttachments.length > 0) {
        throw new Error("Please wait for all attachments to finish uploading")
      }

      console.log("Validation passed, calling onSubmit...")

      await onSubmit({
        name: formData.name,
        tone: formData.tone,
        language: formData.language,
        openingMessage: formData.openingMessage,
        customGreeting: formData.customGreeting,
        documents: files, // Legacy documents (PDFs only)
        attachments, // New enhanced attachments (including PDFs, images, etc.)
        bantConfiguration, // BANT scoring configuration
      })

      console.log("Agent creation successful!")

      // Reset form
      setFormData({
        name: "",
        tone: "Professional",
        language: "English",
        openingMessage: "Hello! How can I help you today?",
        customGreeting: "",
      })
      setFiles([])
      setAttachments([])
      // Reset BANT configuration to defaults
      setBantConfiguration({
        budget_weight: 25,
        authority_weight: 25,
        need_weight: 25,
        timeline_weight: 25,
        contact_weight: 0,
        budget_criteria: [
          { section: 'millions', amount: 5, points: 25, label: "$5M" },
          { section: 'millions', amount: 1, points: 15, label: "$1M" },
          { section: 'thousands', amount: 500, points: 10, label: "$500K" }
        ],
        authority_criteria: [
          { type: "single", points: 25, label: "Single" },
          { type: "dual", points: 20, label: "Dual" },
          { type: "group", points: 15, label: "Group" }
        ],
        need_criteria: [
          { type: "stated", points: 25, label: "If need was properly stated" }
        ],
        timeline_criteria: [
          { timeAmount: 1, timeUnit: "months", points: 25, label: "1 months" },
          { timeAmount: 3, timeUnit: "months", points: 15, label: "3 months" }
        ],
        contact_criteria: [
          { type: "complete", points: 0, label: "If both name and phone number was given" }
        ],
        priority_threshold: 90,
        hot_threshold: 70,
        warm_threshold: 50
      })
      onClose()
    } catch (error) {
      console.error("Failed to create AI agent:", error)
      setError(error instanceof Error ? error.message : "Failed to create AI agent")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        tone: "Professional",
        language: "English",
        openingMessage: "Hello! How can I help you today?",
        customGreeting: "",
      })
      setFiles([])
      setAttachments([])
      setError(null)
      // Reset BANT configuration to defaults
      setBantConfiguration({
        budget_weight: 25,
        authority_weight: 25,
        need_weight: 25,
        timeline_weight: 25,
        contact_weight: 0,
        budget_criteria: [
          { section: 'millions', amount: 5, points: 25, label: "$5M" },
          { section: 'millions', amount: 1, points: 15, label: "$1M" },
          { section: 'thousands', amount: 500, points: 10, label: "$500K" }
        ],
        authority_criteria: [
          { type: "single", points: 25, label: "Single" },
          { type: "dual", points: 20, label: "Dual" },
          { type: "group", points: 15, label: "Group" }
        ],
        need_criteria: [
          { type: "stated", points: 25, label: "If need was properly stated" }
        ],
        timeline_criteria: [
          { timeAmount: 1, timeUnit: "months", points: 25, label: "1 months" },
          { timeAmount: 3, timeUnit: "months", points: 15, label: "3 months" }
        ],
        contact_criteria: [
          { type: "complete", points: 0, label: "If both name and phone number was given" }
        ],
        priority_threshold: 90,
        hot_threshold: 70,
        warm_threshold: 50
      })
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New AI Agent</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="bant">BANT Config</TabsTrigger>
                <TabsTrigger value="attachments">Documents & Media</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter agent name (e.g., Francis)"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone *</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(value) => setFormData({ ...formData, tone: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Friendly">Friendly</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Tagalog">Tagalog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingMessage">Opening Message</Label>
                  <Textarea
                    id="openingMessage"
                    value={formData.openingMessage}
                    onChange={(e) => setFormData({ ...formData, openingMessage: e.target.value })}
                    placeholder="e.g., Hello! How can I help you today?"
                    rows={2}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be sent automatically when a new conversation starts.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customGreeting">Custom Greeting (Optional)</Label>
                  <Textarea
                    id="customGreeting"
                    value={formData.customGreeting}
                    onChange={(e) => setFormData({ ...formData, customGreeting: e.target.value })}
                    placeholder="e.g., Hello! I'm Francis, your dedicated real estate assistant. How can I help you find your dream property today?"
                    rows={3}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This custom greeting will be used when users say hello to your agent. Leave empty to use default greetings.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="bant" className="space-y-4">
                <Tabs defaultValue="weights" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="weights">Weights</TabsTrigger>
                    <TabsTrigger value="criteria">Criteria</TabsTrigger>
                    <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                  </TabsList>

                  <TabsContent value="weights" className="space-y-4 mt-4">
                    {/* Weights Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Component Weights</h3>
                        <Badge variant={
                          (bantConfiguration.budget_weight + bantConfiguration.authority_weight + 
                           bantConfiguration.need_weight + bantConfiguration.timeline_weight + 
                           bantConfiguration.contact_weight) === 100 ? "success" : "destructive"
                        }>
                          Total: {bantConfiguration.budget_weight + bantConfiguration.authority_weight + 
                                  bantConfiguration.need_weight + bantConfiguration.timeline_weight + 
                                  bantConfiguration.contact_weight} pts
                        </Badge>
                      </div>
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Adjust the importance of each BANT component. Weights must total exactly 100 pts.
                        </AlertDescription>
                      </Alert>

                      {(['budget', 'authority', 'need', 'timeline', 'contact'] as const).map(component => {
                        const currentValue = bantConfiguration[`${component}_weight` as keyof BANTConfiguration] as number
                        const otherWeights = ['budget', 'authority', 'need', 'timeline', 'contact']
                          .filter(c => c !== component)
                          .reduce((sum, c) => sum + (bantConfiguration[`${c}_weight` as keyof BANTConfiguration] as number), 0)
                        const maxValue = 100 - otherWeights
                        
                        return (
                          <div key={component} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="capitalize">{component}</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{currentValue} pts</span>
                                <span className="text-xs text-muted-foreground">(max: {maxValue} pts)</span>
                              </div>
                            </div>
                            <Slider
                              value={[currentValue]}
                              onValueChange={([value]) => {
                                const clampedValue = Math.min(value, maxValue)
                                setBantConfiguration(prev => ({
                                  ...prev,
                                  [`${component}_weight`]: clampedValue
                                }))
                              }}
                              max={100}
                              step={5}
                              className="w-full"
                              disabled={loading}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="criteria" className="space-y-4 mt-4">
                    {/* Criteria Section */}
                    <div className="space-y-6">
                      {(['budget', 'authority', 'need', 'timeline', 'contact'] as const).map(component => (
                        <div key={component} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium capitalize">{component} Criteria</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const field = `${component}_criteria` as keyof BANTConfiguration
                                let newCriteria: CriteriaItem
                                
                                if (component === 'budget') {
                                  const weight = bantConfiguration.budget_weight || 25
                                  newCriteria = { 
                                    section: 'millions',
                                    amount: 1, 
                                    points: Math.min(10, weight), 
                                    label: "$1M" 
                                  }
                                } else if (component === 'authority') {
                                  const weight = bantConfiguration.authority_weight || 25
                                  newCriteria = { 
                                    type: "single", 
                                    points: Math.min(10, weight), 
                                    label: "Single" 
                                  }
                                } else if (component === 'timeline') {
                                  const weight = bantConfiguration.timeline_weight || 25
                                  newCriteria = { 
                                    timeAmount: 1, 
                                    timeUnit: "months", 
                                    points: Math.min(10, weight), 
                                    label: "1 months" 
                                  }
                                } else if (component === 'need') {
                                  const weight = bantConfiguration.need_weight || 25
                                  newCriteria = { 
                                    type: "stated", 
                                    points: weight,
                                    label: "If need was properly stated" 
                                  }
                                } else if (component === 'contact') {
                                  const weight = bantConfiguration.contact_weight || 0
                                  newCriteria = { 
                                    type: "complete", 
                                    points: weight,
                                    label: "If both name and phone number was given" 
                                  }
                                } else {
                                  newCriteria = { 
                                    type: "new_type", 
                                    points: 10, 
                                    label: "New Criteria" 
                                  }
                                }
                                
                                setBantConfiguration(prev => ({
                                  ...prev,
                                  [field]: [...(prev[field] || []), newCriteria]
                                }))
                              }}
                              disabled={loading}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <TooltipProvider>
                              {(bantConfiguration[`${component}_criteria` as keyof BANTConfiguration] as CriteriaItem[] || []).map((criteria, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                                  {/* Budget Criteria */}
                                  {component === 'budget' ? (
                                    <>
                                      <Select
                                        value={criteria.section || 'millions'}
                                        onValueChange={(value) => {
                                          const field = 'budget_criteria'
                                          const currentItem = bantConfiguration[field][index]
                                          const amount = currentItem.amount || 1
                                          const label = formatBudgetLabel(value, amount)
                                          
                                          setBantConfiguration(prev => ({
                                            ...prev,
                                            [field]: prev[field].map((item, i) => 
                                              i === index ? { ...item, section: value, label } : item
                                            )
                                          }))
                                        }}
                                        disabled={loading}
                                      >
                                        <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder="Select section" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BUDGET_SECTIONS.map(section => (
                                            <SelectItem key={section.value} value={section.value}>
                                              {section.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      
                                      <Select
                                        value={String(criteria.amount || 1)}
                                        onValueChange={(value) => {
                                          const field = 'budget_criteria'
                                          const currentItem = bantConfiguration[field][index]
                                          const section = currentItem.section || 'millions'
                                          const label = formatBudgetLabel(section, parseInt(value))
                                          
                                          setBantConfiguration(prev => ({
                                            ...prev,
                                            [field]: prev[field].map((item, i) => 
                                              i === index ? { ...item, amount: parseInt(value), label } : item
                                            )
                                          }))
                                        }}
                                        disabled={loading}
                                      >
                                        <SelectTrigger className="w-[120px]">
                                          <SelectValue placeholder="Amount" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                          {Array.from({ length: 100 }, (_, i) => i + 1).map(num => (
                                            <SelectItem key={num} value={String(num)}>
                                              {num}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </>
                                  ) : null}
                                  
                                  {/* Authority Criteria */}
                                  {component === 'authority' ? (
                                    <Select
                                      value={criteria.type || 'single'}
                                      onValueChange={(value) => {
                                        const option = AUTHORITY_OPTIONS.find(o => o.value === value)
                                        const field = 'authority_criteria'
                                        
                                        setBantConfiguration(prev => ({
                                          ...prev,
                                          [field]: prev[field].map((item, i) => 
                                            i === index ? { ...item, type: value, label: option?.label || value } : item
                                          )
                                        }))
                                      }}
                                      disabled={loading}
                                    >
                                      <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Select authority type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AUTHORITY_OPTIONS.map(option => (
                                          <SelectItem key={option.value} value={option.value}>
                                            <Tooltip>
                                              <TooltipTrigger className="w-full text-left">
                                                {option.label}
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{option.tooltip}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : null}
                                  
                                  {/* Timeline Criteria */}
                                  {component === 'timeline' ? (
                                    <>
                                      <Select
                                        value={String(criteria.timeAmount || 1)}
                                        onValueChange={(value) => {
                                          const field = 'timeline_criteria'
                                          const currentItem = bantConfiguration[field][index]
                                          const timeUnit = currentItem.timeUnit || 'months'
                                          const label = `${value} ${timeUnit}`
                                          
                                          setBantConfiguration(prev => ({
                                            ...prev,
                                            [field]: prev[field].map((item, i) => 
                                              i === index ? { ...item, timeAmount: parseInt(value), label } : item
                                            )
                                          }))
                                        }}
                                        disabled={loading}
                                      >
                                        <SelectTrigger className="w-[100px]">
                                          <SelectValue placeholder="Amount" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                          {Array.from({ length: 100 }, (_, i) => i + 1).map(num => (
                                            <SelectItem key={num} value={String(num)}>
                                              {num}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      
                                      <Select
                                        value={criteria.timeUnit || 'months'}
                                        onValueChange={(value) => {
                                          const field = 'timeline_criteria'
                                          const currentItem = bantConfiguration[field][index]
                                          const timeAmount = currentItem.timeAmount || 1
                                          const label = `${timeAmount} ${value}`
                                          
                                          setBantConfiguration(prev => ({
                                            ...prev,
                                            [field]: prev[field].map((item, i) => 
                                              i === index ? { ...item, timeUnit: value, label } : item
                                            )
                                          }))
                                        }}
                                        disabled={loading}
                                      >
                                        <SelectTrigger className="w-[120px]">
                                          <SelectValue placeholder="Unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {TIMELINE_UNITS.map(unit => (
                                            <SelectItem key={unit.value} value={unit.value}>
                                              {unit.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </>
                                  ) : null}
                                  
                                  {/* Need and Contact Criteria */}
                                  {(component === 'need' || component === 'contact') ? (
                                    <Input
                                      placeholder="Label"
                                      value={criteria.label}
                                      onChange={(e) => {
                                        const field = `${component}_criteria` as keyof BANTConfiguration
                                        setBantConfiguration(prev => ({
                                          ...prev,
                                          [field]: (prev[field] as CriteriaItem[]).map((item, i) => 
                                            i === index ? { ...item, label: e.target.value } : item
                                          )
                                        }))
                                      }}
                                      className="flex-1"
                                      disabled={loading}
                                    />
                                  ) : null}
                                  
                                  {/* Auto-generated label display for Budget only */}
                                  {component === 'budget' ? (
                                    <div className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                                      {criteria.label}
                                    </div>
                                  ) : null}
                                  
                                  {/* Points dropdown */}
                                  <Select
                                    value={String(criteria.points || 10)}
                                    onValueChange={(value) => {
                                      const field = `${component}_criteria` as keyof BANTConfiguration
                                      const maxPoints = bantConfiguration[`${component}_weight` as keyof BANTConfiguration] as number || 25
                                      const points = Math.min(parseInt(value), maxPoints)
                                      
                                      setBantConfiguration(prev => ({
                                        ...prev,
                                        [field]: (prev[field] as CriteriaItem[]).map((item, i) => 
                                          i === index ? { ...item, points } : item
                                        )
                                      }))
                                    }}
                                    disabled={loading}
                                  >
                                    <SelectTrigger className="w-[100px]">
                                      <SelectValue placeholder="Points" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      {Array.from(
                                        { length: bantConfiguration[`${component}_weight` as keyof BANTConfiguration] as number || 25 }, 
                                        (_, i) => i + 1
                                      ).map(num => (
                                        <SelectItem key={num} value={String(num)}>
                                          {num} pts
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const field = `${component}_criteria` as keyof BANTConfiguration
                                      setBantConfiguration(prev => ({
                                        ...prev,
                                        [field]: (prev[field] as CriteriaItem[]).filter((_, i) => i !== index)
                                      }))
                                    }}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="thresholds" className="space-y-4 mt-4">
                    {/* Thresholds Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Lead Classification Thresholds</h3>
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Set the minimum scores required for each lead classification level.
                        </AlertDescription>
                      </Alert>

                      {(['priority', 'hot', 'warm'] as const).map(level => (
                        <div key={level} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="capitalize">{level} Lead (≥)</Label>
                            <span className="text-sm font-medium">
                              {bantConfiguration[`${level}_threshold` as keyof BANTConfiguration]} points
                            </span>
                          </div>
                          <Slider
                            value={[bantConfiguration[`${level}_threshold` as keyof BANTConfiguration] as number]}
                            onValueChange={([value]) => {
                              setBantConfiguration(prev => ({
                                ...prev,
                                [`${level}_threshold`]: value
                              }))
                            }}
                            max={100}
                            step={5}
                            className="w-full"
                            disabled={loading}
                          />
                        </div>
                      ))}
                      
                      <div className="mt-4 p-3 bg-muted rounded">
                        <p className="text-sm text-muted-foreground">
                          Cold Lead: &lt;{bantConfiguration.warm_threshold} points
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Documents & Media</Label>
                  <EnhancedAttachmentUpload
                    files={attachments}
                    onFilesChange={setAttachments}
                    maxFiles={10}
                    maxSizePerFile={25}
                    maxTotalSize={100}
                    showPreview={true}
                    allowMultiple={true}
                    disabled={loading}
                  />
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Upload documents, images, and other files to enhance your AI agent's knowledge base. 
                      Supports images, PDFs, Word documents, spreadsheets, and more. Files will be processed to provide 
                      context-aware responses to user queries.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.name.trim()} onClick={handleSubmit}>
            {loading ? "Creating Agent..." : "Create AI Agent"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              console.log("Test button clicked!")
              console.log("Current form data:", formData)
              alert("Modal is responding to clicks!")
            }}
          >
            Test Click
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
