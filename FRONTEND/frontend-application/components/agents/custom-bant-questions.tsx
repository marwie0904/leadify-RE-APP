"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Save, 
  AlertCircle, 
  DollarSign,
  User,
  Target,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface BANTQuestion {
  id?: string
  category: 'budget' | 'authority' | 'need' | 'timeline'
  question_text: string
  question_order: number
  is_active?: boolean
}

interface CustomBANTQuestionsProps {
  agentId?: string
  onSave?: (questions: BANTQuestion[]) => Promise<void>
  onComplete?: () => void  // Called when user clicks Next on Timeline
  initialQuestions?: BANTQuestion[]
  isLoading?: boolean
  embedded?: boolean
  isOnboarding?: boolean  // New prop to distinguish onboarding flow
  className?: string
}

const DEFAULT_QUESTIONS: BANTQuestion[] = [
  { category: 'budget', question_text: "What is your budget range for this property?", question_order: 1 },
  { category: 'authority', question_text: "Are you the sole decision maker for this purchase?", question_order: 1 },
  { category: 'need', question_text: "What is the primary purpose for this property?", question_order: 1 },
  { category: 'timeline', question_text: "When are you planning to make a purchase?", question_order: 1 }
]

const CATEGORY_INFO = {
  budget: {
    icon: DollarSign,
    title: "Budget",
    description: "Ask about the customer's financial capacity",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  authority: {
    icon: User,
    title: "Authority",
    description: "Ask about decision-making authority",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  need: {
    icon: Target,
    title: "Need",
    description: "Ask about property requirements",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  timeline: {
    icon: Clock,
    title: "Timeline",
    description: "Ask about purchase timeline",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  }
}

const CATEGORY_ORDER: ('budget' | 'authority' | 'need' | 'timeline')[] = ['budget', 'authority', 'need', 'timeline']

export function CustomBANTQuestions({
  agentId,
  onSave,
  onComplete,
  initialQuestions,
  isLoading = false,
  embedded = false,
  isOnboarding = false,
  className
}: CustomBANTQuestionsProps) {
  // Initialize questions with one per category
  const [questions, setQuestions] = useState<BANTQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      // Ensure we only have one question per category
      const uniqueQuestions = CATEGORY_ORDER.map(cat => {
        const existing = initialQuestions.find(q => q.category === cat)
        return existing || DEFAULT_QUESTIONS.find(q => q.category === cat)!
      })
      return uniqueQuestions
    }
    return DEFAULT_QUESTIONS
  })
  
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<string>('budget')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCategories, setSavedCategories] = useState<Set<string>>(new Set())

  const currentCategory = CATEGORY_ORDER[currentCategoryIndex]
  const categoryInfo = CATEGORY_INFO[currentCategory]
  const Icon = categoryInfo.icon
  const isLastCategory = currentCategoryIndex === CATEGORY_ORDER.length - 1
  const isFirstCategory = currentCategoryIndex === 0

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      const uniqueQuestions = CATEGORY_ORDER.map(cat => {
        const existing = initialQuestions.find(q => q.category === cat)
        return existing || DEFAULT_QUESTIONS.find(q => q.category === cat)!
      })
      setQuestions(uniqueQuestions)
    }
  }, [initialQuestions])

  const getCurrentQuestion = () => {
    return questions.find(q => q.category === currentCategory) || 
           { category: currentCategory, question_text: "", question_order: 1, is_active: true }
  }

  const updateCurrentQuestion = (text: string) => {
    setQuestions(prev => {
      const updated = [...prev]
      const index = updated.findIndex(q => q.category === currentCategory)
      if (index >= 0) {
        updated[index] = { ...updated[index], question_text: text }
      } else {
        updated.push({
          category: currentCategory,
          question_text: text,
          question_order: 1,
          is_active: true
        })
      }
      return updated
    })
    setError(null)
  }

  const handleNext = async () => {
    const currentQuestion = getCurrentQuestion()
    
    // Validate current question
    if (!currentQuestion.question_text.trim()) {
      setError(`Please enter a question for ${categoryInfo.title}`)
      return
    }

    // Mark current category as saved
    setSavedCategories(prev => new Set([...prev, currentCategory]))

    if (isLastCategory) {
      // Save all questions and complete
      if (onSave) {
        setSaving(true)
        setError(null)
        try {
          await onSave(questions)
          if (onComplete) {
            onComplete()
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save questions")
          setSaving(false)
          return
        }
        setSaving(false)
      } else if (onComplete) {
        onComplete()
      }
    } else {
      // Move to next category
      setCurrentCategoryIndex(prev => prev + 1)
      setError(null)
    }
  }

  const handlePrevious = () => {
    if (!isFirstCategory) {
      setCurrentCategoryIndex(prev => prev - 1)
      setError(null)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    
    // Validate all questions
    const invalidQuestions = questions.filter(q => !q.question_text.trim())
    if (invalidQuestions.length > 0) {
      setError("All questions must have text")
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await onSave(questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save questions")
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setQuestions(DEFAULT_QUESTIONS)
    setSavedCategories(new Set())
    setCurrentCategoryIndex(0)
    setError(null)
  }

  // Progress indicator
  const renderProgress = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {CATEGORY_ORDER.map((cat, index) => {
        const isActive = index === currentCategoryIndex
        const isCompleted = savedCategories.has(cat) || index < currentCategoryIndex
        const catInfo = CATEGORY_INFO[cat]
        const CatIcon = catInfo.icon
        
        return (
          <div key={cat} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                isActive ? `${catInfo.bgColor} ${catInfo.borderColor} border-2` : 
                isCompleted ? "bg-primary text-primary-foreground" : 
                "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted && !isActive ? (
                <Check className="h-5 w-5" />
              ) : (
                <CatIcon className="h-5 w-5" />
              )}
            </div>
            {index < CATEGORY_ORDER.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-1",
                index < currentCategoryIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )

  // Update question for specific category (for tab-based editing)
  const updateQuestionByCategory = (category: string, text: string) => {
    setQuestions(prev => {
      const updated = [...prev]
      const index = updated.findIndex(q => q.category === category)
      if (index >= 0) {
        updated[index] = { ...updated[index], question_text: text }
      } else {
        updated.push({
          category: category as 'budget' | 'authority' | 'need' | 'timeline',
          question_text: text,
          question_order: 1,
          is_active: true
        })
      }
      return updated
    })
    setError(null)
  }

  // Get question for specific category
  const getQuestionByCategory = (category: string) => {
    return questions.find(q => q.category === category) || 
           { category: category as 'budget' | 'authority' | 'need' | 'timeline', question_text: "", question_order: 1, is_active: true }
  }

  // Render tab-based UI for existing agents (non-onboarding)
  const renderTabBasedUI = () => (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {CATEGORY_ORDER.map(cat => {
            const catInfo = CATEGORY_INFO[cat]
            const CatIcon = catInfo.icon
            return (
              <TabsTrigger key={cat} value={cat} className="flex items-center gap-2">
                <CatIcon className="h-4 w-4" />
                {catInfo.title}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {CATEGORY_ORDER.map(cat => {
          const catInfo = CATEGORY_INFO[cat]
          const CatIcon = catInfo.icon
          const question = getQuestionByCategory(cat)

          return (
            <TabsContent key={cat} value={cat} className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CatIcon className={cn("h-6 w-6", catInfo.color)} />
                    <div>
                      <CardTitle className="text-lg">{catInfo.title} Question</CardTitle>
                      <CardDescription className="text-sm">
                        {catInfo.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`question-${cat}`} className="text-sm font-medium mb-2 block">
                        What question should your AI agent ask about {catInfo.title.toLowerCase()}?
                      </Label>
                      <Textarea
                        id={`question-${cat}`}
                        value={question.question_text}
                        onChange={(e) => updateQuestionByCategory(cat, e.target.value)}
                        placeholder={`Enter your ${catInfo.title.toLowerCase()} question...`}
                        className="min-h-[80px]"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        This question will help qualify leads based on their {catInfo.title.toLowerCase()}.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <div className="flex justify-between items-center mt-6">
        <Button
          onClick={resetToDefaults}
          variant="ghost"
          disabled={saving}
        >
          Reset to Defaults
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={saving || !onSave}
        >
          {saving ? (
            <>
              <Save className="h-4 w-4 mr-2 animate-pulse" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Questions
            </>
          )}
        </Button>
      </div>
    </>
  )

  // Render step-by-step UI for onboarding
  const renderStepBasedUI = () => (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Indicator */}
      {renderProgress()}

      {/* Current Category Card */}
      <Card className={cn("border-2", categoryInfo.borderColor)}>
        <CardHeader className={cn(categoryInfo.bgColor)}>
          <div className="flex items-center gap-3">
            <Icon className={cn("h-8 w-8", categoryInfo.color)} />
            <div className="flex-1">
              <CardTitle className="text-xl">{categoryInfo.title} Question</CardTitle>
              <CardDescription className="mt-1">
                {categoryInfo.description}
              </CardDescription>
            </div>
            <Badge variant="outline" className="ml-auto">
              {currentCategoryIndex + 1} of {CATEGORY_ORDER.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="question" className="text-base font-medium mb-2 block">
                What question should your AI agent ask about {categoryInfo.title.toLowerCase()}?
              </Label>
              <Textarea
                id="question"
                value={getCurrentQuestion().question_text}
                onChange={(e) => updateCurrentQuestion(e.target.value)}
                placeholder={`Enter your ${categoryInfo.title.toLowerCase()} question...`}
                className="min-h-[100px] text-base"
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-2">
                This question will help qualify leads based on their {categoryInfo.title.toLowerCase()}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          {!embedded && (
            <Button
              onClick={resetToDefaults}
              variant="ghost"
              disabled={saving}
            >
              Reset to Defaults
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={isFirstCategory || saving}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          {embedded ? (
            <Button
              onClick={handleNext}
              disabled={saving}
              className={isLastCategory ? "bg-primary" : ""}
            >
              {saving ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-pulse" />
                  Saving...
                </>
              ) : isLastCategory ? (
                <>
                  Continue to BANT Configuration
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleNext}
                variant="outline"
                disabled={saving || isLastCategory}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !onSave}
              >
                {saving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Questions
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )

  // Choose which UI to render based on context
  const content = (embedded || isOnboarding) ? renderStepBasedUI() : renderTabBasedUI()

  if (embedded) {
    return <div className={className}>{content}</div>
  }

  return (
    <Card className={cn("bg-white border-gray-200", className)}>
      <CardHeader>
        <CardTitle>Custom BANT Questions</CardTitle>
        <CardDescription>
          Define one question for each BANT category to qualify your leads effectively.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}