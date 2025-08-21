"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Info, Plus, Trash2, Save, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
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
  // For budget criteria
  section?: string
  amount?: number
  // For timeline criteria
  timeAmount?: number
  timeUnit?: string
}

interface BANTConfig {
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
  bant_scoring_prompt?: string
}

interface CustomBANTConfigProps {
  agentId: string
  onSave?: (config: BANTConfig) => Promise<void>
  onDelete?: () => Promise<void>
  initialConfig?: BANTConfig | null
}

const DEFAULT_CONFIG: BANTConfig = {
  budget_weight: 25,
  authority_weight: 25,
  need_weight: 25,
  timeline_weight: 25,
  contact_weight: 0,
  budget_criteria: [
    { section: 'millions', amount: 20, points: 90, label: "$20M" },
    { section: 'millions', amount: 15, points: 80, label: "$15M" },
    { section: 'millions', amount: 10, points: 70, label: "$10M" },
    { section: 'millions', amount: 5, points: 60, label: "$5M" },
    { section: 'millions', amount: 1, points: 40, label: "$1M" },
    { section: 'thousands', amount: 500, points: 20, label: "$500K" }
  ],
  authority_criteria: [
    { type: "single", points: 100, label: "Single" },
    { type: "dual", points: 75, label: "Dual" },
    { type: "group", points: 50, label: "Group" },
    { type: "corporation", points: 25, label: "Corporation" }
  ],
  need_criteria: [
    { type: "residence", points: 80, label: "Primary Residence" },
    { type: "investment", points: 60, label: "Investment Property" },
    { type: "resale", points: 40, label: "Resale/Flip" },
    { type: "other", points: 20, label: "Other Purpose" }
  ],
  timeline_criteria: [
    { timeAmount: 1, timeUnit: "months", points: 100, label: "1 months" },
    { timeAmount: 3, timeUnit: "months", points: 75, label: "3 months" },
    { timeAmount: 6, timeUnit: "months", points: 50, label: "6 months" },
    { timeAmount: 12, timeUnit: "months", points: 25, label: "12 months" },
    { timeAmount: 1, timeUnit: "years", points: 10, label: "1 years" }
  ],
  contact_criteria: [
    { type: "full_contact", points: 100, label: "Name + Phone + Email" },
    { type: "partial_contact", points: 50, label: "Name + Phone or Email" },
    { type: "name_only", points: 25, label: "Name Only" },
    { type: "no_contact", points: 0, label: "No Contact Info" }
  ],
  priority_threshold: 90,
  hot_threshold: 70,
  warm_threshold: 50
}

// Helper functions for formatting
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

export function CustomBANTConfig({ agentId, onSave, onDelete, initialConfig }: CustomBANTConfigProps) {
  // Ensure all arrays are initialized
  const initializeConfig = (config: BANTConfig | null): BANTConfig => {
    const base = config || DEFAULT_CONFIG
    return {
      ...base,
      budget_criteria: base.budget_criteria || [],
      authority_criteria: base.authority_criteria || [],
      need_criteria: base.need_criteria || [],
      timeline_criteria: base.timeline_criteria || [],
      contact_criteria: base.contact_criteria || []
    }
  }

  const [config, setConfig] = useState<BANTConfig>(initializeConfig(initialConfig))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("weights")
  const [previewPrompt, setPreviewPrompt] = useState("")

  // Update config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(initializeConfig(initialConfig))
    }
  }, [initialConfig])

  // Calculate total weight
  const totalWeight = config.budget_weight + config.authority_weight + 
                     config.need_weight + config.timeline_weight + config.contact_weight

  // Generate preview prompt
  const generatePreviewPrompt = useCallback(() => {
    const prompt = `You are an AI assistant that scores leads based on BANT criteria with the following custom configuration:

**Maximum Points Per Category:**
- Budget: ${config.budget_weight} points (out of 100 total)
- Authority: ${config.authority_weight} points (out of 100 total)
- Need: ${config.need_weight} points (out of 100 total)
- Timeline: ${config.timeline_weight} points (out of 100 total)
- Contact: ${config.contact_weight} points (out of 100 total)

**Scoring Criteria:**

BUDGET (max ${config.budget_weight} points):
${(config.budget_criteria || []).map(c => `- ${c.label}: ${c.points} points`).join('\n') || '- No criteria defined'}

AUTHORITY (max ${config.authority_weight} points):
${(config.authority_criteria || []).map(c => `- ${c.label}: ${c.points} points`).join('\n') || '- No criteria defined'}

NEED (max ${config.need_weight} points):
${(config.need_criteria || []).map(c => `- ${c.label}: ${c.points} points`).join('\n') || '- If need is properly stated: ${config.need_weight} points'}

TIMELINE (max ${config.timeline_weight} points):
${(config.timeline_criteria || []).map(c => `- ${c.label}: ${c.points} points`).join('\n') || '- No criteria defined'}

CONTACT (max ${config.contact_weight} points):
${(config.contact_criteria || []).map(c => `- ${c.label}: ${c.points} points`).join('\n') || '- If contact info provided: ${config.contact_weight} points'}

**Lead Classification:**
- Priority Lead: ≥${config.priority_threshold} points
- Hot Lead: ≥${config.hot_threshold} points
- Warm Lead: ≥${config.warm_threshold} points
- Cold Lead: <${config.warm_threshold} points

Return the actual points for each category (not percentages). The total of all scores should equal 100 when all criteria are fully met.`
    
    setPreviewPrompt(prompt)
  }, [config])

  useEffect(() => {
    generatePreviewPrompt()
  }, [config, generatePreviewPrompt])

  const updateWeight = (field: keyof BANTConfig, value: number) => {
    const weightFields = ['budget_weight', 'authority_weight', 'need_weight', 'timeline_weight', 'contact_weight'] as const
    
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value }
      
      // Calculate total of all weights
      const total = weightFields.reduce((sum, f) => sum + (f === field ? value : prev[f] as number), 0)
      
      // If total exceeds 100, we need to adjust other weights
      if (total > 100) {
        const excess = total - 100
        const otherFields = weightFields.filter(f => f !== field)
        const otherTotal = otherFields.reduce((sum, f) => sum + (prev[f] as number), 0)
        
        // Distribute the excess proportionally among other fields
        if (otherTotal > 0) {
          otherFields.forEach(f => {
            const currentValue = prev[f] as number
            const proportion = currentValue / otherTotal
            const reduction = Math.round(excess * proportion)
            newConfig[f] = Math.max(0, currentValue - reduction)
          })
          
          // Ensure we still total exactly 100 after rounding
          const newTotal = weightFields.reduce((sum, f) => sum + (newConfig[f] as number), 0)
          if (newTotal !== 100) {
            // Find the largest weight that isn't the current field and adjust it
            const adjustField = otherFields.reduce((max, f) => 
              (newConfig[f] as number) > (newConfig[max] as number) ? f : max
            )
            newConfig[adjustField] = (newConfig[adjustField] as number) + (100 - newTotal)
          }
        } else {
          // If all other fields are 0, cap the current field at 100
          newConfig[field] = 100
        }
      }
      
      return newConfig
    })
  }

  const updateThreshold = (field: keyof BANTConfig, value: number) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const addCriteria = (field: keyof BANTConfig) => {
    let newCriteria: CriteriaItem
    
    if (field === 'budget_criteria') {
      const weight = config.budget_weight || 25
      newCriteria = { 
        section: 'millions',  // Changed default to millions
        amount: 1, 
        points: Math.min(10, weight), 
        label: "$1M" 
      }
    } else if (field === 'authority_criteria') {
      const weight = config.authority_weight || 25
      newCriteria = { 
        type: "single", 
        points: Math.min(10, weight), 
        label: "Single Decision Maker" 
      }
    } else if (field === 'timeline_criteria') {
      const weight = config.timeline_weight || 25
      newCriteria = { 
        timeAmount: 1, 
        timeUnit: "months", 
        points: Math.min(10, weight), 
        label: "1 month" 
      }
    } else if (field === 'need_criteria') {
      const weight = config.need_weight || 25
      newCriteria = { 
        type: "stated", 
        points: weight,  // Max points for pre-filled
        label: "If need was properly stated" 
      }
    } else if (field === 'contact_criteria') {
      const weight = config.contact_weight || 0
      newCriteria = { 
        type: "complete", 
        points: weight,  // Max points for pre-filled
        label: "If both name and phone number was given" 
      }
    } else {
      newCriteria = { 
        type: "new_type", 
        points: 10, 
        label: "New Criteria" 
      }
    }
    
    setConfig(prev => ({
      ...prev,
      [field]: [...(Array.isArray(prev[field]) ? prev[field] as CriteriaItem[] : []), newCriteria]
    }))
  }

  const updateCriteria = (field: keyof BANTConfig, index: number, updates: Partial<CriteriaItem>) => {
    // Get the weight for this component to use as max points
    const componentName = field.replace('_criteria', '')
    const maxPoints = config[`${componentName}_weight` as keyof BANTConfig] as number || 25
    
    // Validate points don't exceed the weight
    if (updates.points !== undefined && updates.points > maxPoints) {
      setError(`Points cannot exceed ${maxPoints} (the weight for ${componentName})`)
      return
    }
    
    // Auto-generate label for budget criteria
    if (field === 'budget_criteria' && (updates.section !== undefined || updates.amount !== undefined)) {
      const currentItem = (config[field] as CriteriaItem[])[index]
      const section = updates.section || currentItem.section
      const amount = updates.amount || currentItem.amount
      updates.label = formatBudgetLabel(section!, amount!)
    }
    
    // Auto-generate label for timeline criteria
    if (field === 'timeline_criteria' && (updates.timeAmount !== undefined || updates.timeUnit !== undefined)) {
      const currentItem = (config[field] as CriteriaItem[])[index]
      const timeAmount = updates.timeAmount || currentItem.timeAmount
      const timeUnit = updates.timeUnit || currentItem.timeUnit
      updates.label = `${timeAmount} ${timeUnit}`
    }
    
    setConfig(prev => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] as CriteriaItem[] : []).map((item, i) => 
        i === index ? { ...item, ...updates } : item
      )
    }))
    setError(null) // Clear error after successful update
  }

  const removeCriteria = (field: keyof BANTConfig, index: number) => {
    setConfig(prev => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] as CriteriaItem[] : []).filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (totalWeight !== 100) {
      setError("Weights must total exactly 100%")
      return
    }

    if (config.priority_threshold <= config.hot_threshold || 
        config.hot_threshold <= config.warm_threshold) {
      setError("Thresholds must be in descending order: Priority > Hot > Warm")
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (onSave) {
        // Include the criteria_prompt in the save payload
        const configWithPrompt = {
          ...config,
          criteria_prompt: previewPrompt
        }
        await onSave(configWithPrompt)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this BANT configuration? The agent will use default BANT scoring.")) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (onDelete) {
        await onDelete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete configuration")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle>Custom BANT Configuration</CardTitle>
        <CardDescription>
          Customize how leads are scored based on Budget, Authority, Need, Timeline, and Contact information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weights">Weights</TabsTrigger>
            <TabsTrigger value="criteria">Criteria</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          </TabsList>

          <TabsContent value="weights" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Component Weights</h3>
                <Badge variant={totalWeight === 100 ? "success" : "destructive"}>
                  Total: {totalWeight} pts
                </Badge>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Adjust the importance of each BANT component. Weights must total exactly 100 pts.
                </AlertDescription>
              </Alert>

              {(['budget', 'authority', 'need', 'timeline', 'contact'] as const).map(component => {
                const currentValue = config[`${component}_weight` as keyof BANTConfig] as number
                const otherWeights = ['budget', 'authority', 'need', 'timeline', 'contact']
                  .filter(c => c !== component)
                  .reduce((sum, c) => sum + (config[`${c}_weight` as keyof BANTConfig] as number), 0)
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
                    <div className="relative">
                      <Slider
                        value={[currentValue]}
                        onValueChange={([value]) => {
                          // Ensure value doesn't exceed maxValue
                          const clampedValue = Math.min(value, maxValue)
                          updateWeight(`${component}_weight` as keyof BANTConfig, clampedValue)
                        }}
                        max={100}
                        step={5}
                        className="w-full"
                        disabled={loading}
                      />
                      {/* Max value indicator line */}
                      {maxValue < 100 && (
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 pointer-events-none"
                          style={{ left: `${maxValue}%` }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="criteria" className="space-y-6 mt-6">
            <div className="space-y-6">
              {(['budget', 'authority', 'need', 'timeline', 'contact'] as const).map(component => (
                <div key={component} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">{component} Criteria</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCriteria(`${component}_criteria` as keyof BANTConfig)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <TooltipProvider>
                      {(config[`${component}_criteria` as keyof BANTConfig] as CriteriaItem[] || []).map((criteria, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          {/* Budget Criteria - Two dropdowns */}
                          {component === 'budget' ? (
                            <>
                              <Select
                                value={criteria.section || 'millions'}
                                onValueChange={(value) => updateCriteria(
                                  'budget_criteria', 
                                  index, 
                                  { section: value }
                                )}
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
                                onValueChange={(value) => updateCriteria(
                                  'budget_criteria', 
                                  index, 
                                  { amount: parseInt(value) }
                                )}
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
                          
                          {/* Authority Criteria - Dropdown with tooltips */}
                          {component === 'authority' ? (
                            <Select
                              value={criteria.type || 'single'}
                              onValueChange={(value) => {
                                const option = AUTHORITY_OPTIONS.find(o => o.value === value)
                                updateCriteria(
                                  'authority_criteria', 
                                  index, 
                                  { type: value, label: option?.label || value }
                                )
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
                          
                          {/* Timeline Criteria - Amount dropdown and unit dropdown */}
                          {component === 'timeline' ? (
                            <>
                              <Select
                                value={String(criteria.timeAmount || 1)}
                                onValueChange={(value) => updateCriteria(
                                  'timeline_criteria', 
                                  index, 
                                  { timeAmount: parseInt(value) }
                                )}
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
                                onValueChange={(value) => updateCriteria(
                                  'timeline_criteria', 
                                  index, 
                                  { timeUnit: value }
                                )}
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
                          
                          {/* Need and Contact Criteria - Keep as is */}
                          {(component === 'need' || component === 'contact') ? (
                            <Input
                              placeholder="Label"
                              value={criteria.label}
                              onChange={(e) => updateCriteria(
                                `${component}_criteria` as keyof BANTConfig, 
                                index, 
                                { label: e.target.value }
                              )}
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
                          
                          {/* Points dropdown (1 to weight max) */}
                          <Select
                            value={String(criteria.points || 10)}
                            onValueChange={(value) => {
                              updateCriteria(
                                `${component}_criteria` as keyof BANTConfig, 
                                index, 
                                { points: parseInt(value) }
                              )
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Points" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {Array.from(
                                { length: config[`${component}_weight` as keyof BANTConfig] as number || 25 }, 
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
                            onClick={() => removeCriteria(`${component}_criteria` as keyof BANTConfig, index)}
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

          <TabsContent value="thresholds" className="space-y-6 mt-6">
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
                    <span className="text-sm font-medium">{config[`${level}_threshold` as keyof BANTConfig]} points</span>
                  </div>
                  <Slider
                    value={[config[`${level}_threshold` as keyof BANTConfig] as number]}
                    onValueChange={([value]) => updateThreshold(`${level}_threshold` as keyof BANTConfig, value)}
                    max={100}
                    step={5}
                    className="w-full"
                    disabled={loading}
                  />
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-muted rounded">
                <p className="text-sm text-muted-foreground">
                  Cold Lead: &lt;{config.warm_threshold} points
                </p>
              </div>
            </div>
          </TabsContent>

        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !initialConfig}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Configuration
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={loading || totalWeight !== 100}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}