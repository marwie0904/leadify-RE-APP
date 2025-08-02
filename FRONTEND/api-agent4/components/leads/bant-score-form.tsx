"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Save, RotateCcw, TrendingUp } from 'lucide-react'
import { BANTSlider, BANTScoreSummary, calculateBANTTotal, BANT_CRITERIA } from './bant-slider'
import { useUpdateBANTScore } from '@/src/hooks/mutations/use-create-lead'
import type { BANTScore } from '@/lib/validation/schemas'

interface BANTScoreFormProps {
  leadId: string
  currentScore?: BANTScore
  onSubmit?: (scores: BANTFormData) => void
  onCancel?: () => void
  disabled?: boolean
  showSummary?: boolean
}

interface BANTFormData {
  budget: number
  authority: number
  need: number
  timeline: number
  notes?: string
  confidence?: number
}

export function BANTScoreForm({ 
  leadId, 
  currentScore, 
  onSubmit,
  onCancel,
  disabled = false,
  showSummary = true
}: BANTScoreFormProps) {
  const [scores, setScores] = useState<BANTFormData>({
    budget: currentScore?.budget?.score || 0,
    authority: currentScore?.authority?.score || 0,
    need: currentScore?.need?.score || 0,
    timeline: currentScore?.timeline?.score || 0,
    notes: currentScore?.budget?.notes || '',
    confidence: currentScore?.budget?.confidence || 0.5,
  })

  const [hasChanges, setHasChanges] = useState(false)
  const updateBANTMutation = useUpdateBANTScore()

  // Track changes
  useEffect(() => {
    const initialScores = {
      budget: currentScore?.budget?.score || 0,
      authority: currentScore?.authority?.score || 0,
      need: currentScore?.need?.score || 0,
      timeline: currentScore?.timeline?.score || 0,
    }
    
    const currentScores = {
      budget: scores.budget,
      authority: scores.authority,
      need: scores.need,
      timeline: scores.timeline,
    }
    
    const changed = JSON.stringify(initialScores) !== JSON.stringify(currentScores) ||
                   scores.notes !== (currentScore?.budget?.notes || '')
    
    setHasChanges(changed)
  }, [scores, currentScore])

  const handleScoreChange = (metric: keyof BANTFormData, value: number) => {
    setScores(prev => ({
      ...prev,
      [metric]: value
    }))
  }

  const handleNotesChange = (notes: string) => {
    setScores(prev => ({
      ...prev,
      notes
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (onSubmit) {
        // External submit handler
        onSubmit(scores)
      } else {
        // Use mutation
        await updateBANTMutation.mutateAsync({
          leadId,
          ...scores
        })
      }
    } catch (error) {
      console.error('Failed to update BANT score:', error)
    }
  }

  const handleReset = () => {
    setScores({
      budget: currentScore?.budget?.score || 0,
      authority: currentScore?.authority?.score || 0,
      need: currentScore?.need?.score || 0,
      timeline: currentScore?.timeline?.score || 0,
      notes: currentScore?.budget?.notes || '',
      confidence: currentScore?.budget?.confidence || 0.5,
    })
  }

  const totalScore = calculateBANTTotal(scores)
  const isSubmitting = updateBANTMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">BANT Qualification</h3>
          <p className="text-sm text-muted-foreground">
            Score this lead across Budget, Authority, Need, and Timeline
          </p>
        </div>
        {currentScore && (
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Last updated: {new Date(currentScore.lastUpdated).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {/* BANT Score Summary */}
      {showSummary && (
        <BANTScoreSummary scores={scores} />
      )}

      {/* BANT Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BANTSlider
          label="Budget"
          value={scores.budget}
          onChange={(value) => handleScoreChange('budget', value)}
          description={BANT_CRITERIA.Budget.description}
          examples={BANT_CRITERIA.Budget.examples}
          disabled={disabled || isSubmitting}
        />
        
        <BANTSlider
          label="Authority"
          value={scores.authority}
          onChange={(value) => handleScoreChange('authority', value)}
          description={BANT_CRITERIA.Authority.description}
          examples={BANT_CRITERIA.Authority.examples}
          disabled={disabled || isSubmitting}
        />
        
        <BANTSlider
          label="Need"
          value={scores.need}
          onChange={(value) => handleScoreChange('need', value)}
          description={BANT_CRITERIA.Need.description}
          examples={BANT_CRITERIA.Need.examples}
          disabled={disabled || isSubmitting}
        />
        
        <BANTSlider
          label="Timeline"
          value={scores.timeline}
          onChange={(value) => handleScoreChange('timeline', value)}
          description={BANT_CRITERIA.Timeline.description}
          examples={BANT_CRITERIA.Timeline.examples}
          disabled={disabled || isSubmitting}
        />
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scoring Notes & Justification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="bant-notes">
              Provide context and reasoning for your BANT scores
            </Label>
            <Textarea
              id="bant-notes"
              placeholder="E.g., Budget confirmed at $50K, decision maker is VP Sales, urgent need due to Q4 deadline..."
              value={scores.notes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={disabled || isSubmitting}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These notes will help track the qualification process and provide context for follow-ups.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(scores).slice(0, 4).map(([key, value]) => {
              const label = key.charAt(0).toUpperCase() + key.slice(1)
              const weight = key === 'budget' ? 30 : key === 'authority' ? 25 : 25
              const contribution = Math.round((value / 10) * weight)
              
              return (
                <div key={key} className="text-center space-y-1">
                  <div className="text-2xl font-bold text-primary">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-xs">
                    <Badge variant="outline" className="text-xs">
                      {contribution}pts ({weight}%)
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between">
            <span className="font-medium">Total BANT Score:</span>
            <div className="flex items-center gap-2">
              <Badge 
                className={`text-white ${
                  totalScore >= 70 ? 'bg-green-500' :
                  totalScore >= 50 ? 'bg-yellow-500' :
                  totalScore >= 30 ? 'bg-orange-500' : 'bg-red-500'
                }`}
              >
                {totalScore}/100
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSubmitting}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={!hasChanges || isSubmitting || disabled}
            className="flex items-center gap-1"
          >
            <Save className="h-3 w-3" />
            {isSubmitting ? 'Saving...' : 'Save BANT Score'}
          </Button>
        </div>
      </div>

      {/* Scoring Tips */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">💡 Scoring Tips</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>Budget (30%):</strong> Focus on confirmed budget vs. interest</li>
            <li>• <strong>Authority (25%):</strong> Who makes the final decision?</li>
            <li>• <strong>Need (25%):</strong> How urgent is their pain point?</li>
            <li>• <strong>Timeline (20%):</strong> When do they need a solution?</li>
          </ul>
        </CardContent>
      </Card>
    </form>
  )
}