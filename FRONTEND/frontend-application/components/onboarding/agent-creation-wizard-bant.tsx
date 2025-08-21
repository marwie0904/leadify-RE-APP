// BANT Criteria Component - extracted for clarity
import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, DollarSign, User, Sparkles, Clock, Phone } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const formatBudgetLabel = (section: string, amount: number): string => {
  if (section === 'thousands') return `$${amount}K`
  if (section === 'millions') return `$${amount}M`
  if (section === 'billions') return `$${amount}B`
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

interface BANTCriteriaProps {
  bantConfiguration: BANTConfiguration
  setBantConfiguration: React.Dispatch<React.SetStateAction<BANTConfiguration>>
  loading?: boolean
}

export function BANTCriteriaSection({ bantConfiguration, setBantConfiguration, loading }: BANTCriteriaProps) {
  return (
    <div className="space-y-6">
      {(['budget', 'authority', 'need', 'timeline', 'contact'] as const).map(component => (
        <div key={component} className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium capitalize flex items-center gap-2 text-gray-700">
              {component === 'budget' && <DollarSign className="h-4 w-4 text-blue-600" />}
              {component === 'authority' && <User className="h-4 w-4 text-blue-600" />}
              {component === 'need' && <Sparkles className="h-4 w-4 text-blue-400" />}
              {component === 'timeline' && <Clock className="h-4 w-4 text-blue-500" />}
              {component === 'contact' && <Phone className="h-4 w-4 text-blue-400" />}
              {component} Criteria
            </h4>
            <Button
              size="sm"
              variant="outline"
              className="bg-white hover:bg-blue-50 text-gray-700 border-gray-300"
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
                <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded bg-white">
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
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-[180px]">
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
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-[120px]">
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
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-[200px]">
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
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-[100px]">
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
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-[120px]">
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
                      className="flex-1 bg-white border-gray-300 text-gray-900"
                      disabled={loading}
                    />
                  ) : null}

                  {/* Points */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(criteria.points)}
                      onValueChange={(value) => {
                        const field = `${component}_criteria` as keyof BANTConfiguration
                        setBantConfiguration(prev => ({
                          ...prev,
                          [field]: (prev[field] as CriteriaItem[]).map((item, i) => 
                            i === index ? { ...item, points: parseInt(value) } : item
                          )
                        }))
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-[100px] bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ 
                          length: (bantConfiguration[`${component}_weight` as keyof BANTConfiguration] as number) || 1 
                        }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={String(num)}>
                            {num} pts
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delete button */}
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
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      ))}
    </div>
  )
}