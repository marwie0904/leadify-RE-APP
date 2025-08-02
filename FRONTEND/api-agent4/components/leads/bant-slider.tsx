"use client"

import React from 'react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface BANTSliderProps {
  label: 'Budget' | 'Authority' | 'Need' | 'Timeline'
  value: number
  onChange: (value: number) => void
  description: string
  examples: string[]
  disabled?: boolean
  showTooltip?: boolean
}

// BANT scoring criteria and examples
export const BANT_CRITERIA = {
  Budget: {
    name: 'Budget',
    description: 'Financial qualification and budget authority',
    levels: {
      0: 'No budget disclosed',
      3: 'Budget range mentioned',
      6: 'Specific budget confirmed', 
      10: 'Budget approved and allocated'
    },
    examples: [
      '0-2: "We\'re just looking" or no budget discussion',
      '3-5: "We have a budget in mind" or rough range given',
      '6-8: "Our budget is $X" with specific amount',
      '9-10: "Budget is approved and ready to spend"'
    ],
    color: 'bg-blue-500'
  },
  Authority: {
    name: 'Authority', 
    description: 'Decision-making power and influence',
    levels: {
      0: 'No decision authority',
      3: 'Influencer in process',
      6: 'Key stakeholder',
      10: 'Final decision maker'
    },
    examples: [
      '0-2: Individual contributor, no decision power',
      '3-5: Can influence but doesn\'t decide',
      '6-8: Key stakeholder in decision process',
      '9-10: Final decision maker or budget holder'
    ],
    color: 'bg-green-500'
  },
  Need: {
    name: 'Need',
    description: 'Pain point intensity and urgency',
    levels: {
      0: 'No clear need',
      3: 'General interest',
      6: 'Specific need identified',
      10: 'Critical/urgent need'
    },
    examples: [
      '0-2: Browsing, no clear pain point',
      '3-5: General interest, nice-to-have',
      '6-8: Specific problem identified',
      '9-10: Critical issue, urgent solution needed'
    ],
    color: 'bg-orange-500'
  },
  Timeline: {
    name: 'Timeline',
    description: 'Purchase timeline and urgency',
    levels: {
      0: 'No timeline mentioned',
      3: '6+ months',
      6: '1-6 months',
      10: 'Immediate (within 30 days)'
    },
    examples: [
      '0-2: No timeline or "someday"',
      '3-5: 6+ months out',
      '6-8: 1-6 months timeframe',
      '9-10: Immediate need, within 30 days'
    ],
    color: 'bg-purple-500'
  }
} as const

export function BANTSlider({ 
  label, 
  value, 
  onChange, 
  description, 
  examples,
  disabled = false,
  showTooltip = true 
}: BANTSliderProps) {
  const criteria = BANT_CRITERIA[label]
  
  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-yellow-500'
    if (score >= 4) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Get score label
  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    if (score >= 2) return 'Poor'
    return 'Very Poor'
  }

  return (
    <Card className={`transition-all duration-200 ${disabled ? 'opacity-50' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">{label}</Label>
              {showTooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-medium">{description}</p>
                        <div className="space-y-1">
                          {examples.map((example, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              {example}
                            </p>
                          ))}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {/* Score Badge */}
            <div className="flex items-center gap-2">
              <Badge 
                className={`${getScoreColor(value)} text-white`}
                variant="secondary"
              >
                {value}/10
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                {getScoreLabel(value)}
              </span>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <Slider
              value={[value]}
              onValueChange={(values) => onChange(values[0])}
              max={10}
              min={0}
              step={1}
              disabled={disabled}
              className="cursor-pointer"
            />
            
            {/* Scale indicators */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>2</span>
              <span>4</span>
              <span>6</span>
              <span>8</span>
              <span>10</span>
            </div>
          </div>

          {/* Level descriptions */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="font-medium">0-3: {criteria.levels[0]}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="font-medium">4-5: {criteria.levels[3]}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="font-medium">6-7: {criteria.levels[6]}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">8-10: {criteria.levels[10]}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Utility function to calculate BANT total score
export function calculateBANTTotal(scores: {
  budget: number
  authority: number
  need: number
  timeline: number
}): number {
  const weights = { budget: 0.3, authority: 0.25, need: 0.25, timeline: 0.2 }
  
  return Math.round(
    Object.entries(weights).reduce((total, [key, weight]) => {
      const score = scores[key as keyof typeof scores] || 0
      return total + (score * weight * 10) // Normalize to 0-100
    }, 0)
  )
}

// Component for displaying BANT score summary
export function BANTScoreSummary({ 
  scores 
}: { 
  scores: { budget: number; authority: number; need: number; timeline: number } 
}) {
  const totalScore = calculateBANTTotal(scores)
  
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50'
    if (score >= 30) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'High Quality Lead'
    if (score >= 50) return 'Qualified Lead'
    if (score >= 30) return 'Developing Lead'
    return 'Early Stage Lead'
  }

  return (
    <div className={`p-3 rounded-lg border ${getScoreColor(totalScore)}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Total BANT Score</div>
          <div className="text-sm opacity-75">{getScoreLabel(totalScore)}</div>
        </div>
        <div className="text-2xl font-bold">
          {totalScore}/100
        </div>
      </div>
    </div>
  )
}