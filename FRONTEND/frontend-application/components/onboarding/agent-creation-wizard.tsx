"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bot, 
  Building2,
  Globe, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Target,
  Upload,
  FileText,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  Zap,
  Loader2,
  Image as ImageIcon,
  Film,
  FileAudio,
  Plus,
  Trash2,
  Info,
  Phone,
  X,
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/simple-auth-context"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BANTCriteriaSection } from "./agent-creation-wizard-bant"
import { CustomBANTQuestions, type BANTQuestion } from "@/components/agents/custom-bant-questions"

type WizardStep = "agent-info" | "bant-questions" | "bant-weights" | "bant-criteria" | "bant-threshold" | "media-upload"

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

interface AgentCreationWizardProps {
  organizationId: string
  organizationName: string
  onComplete: () => void
  onBack: () => void
}

export function AgentCreationWizard({
  organizationId,
  organizationName,
  onComplete,
  onBack
}: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("agent-info")
  const [loading, setLoading] = useState(false)
  const { getAuthHeaders } = useAuth()
  
  // Agent Info
  const [agentName, setAgentName] = useState("")
  const [language, setLanguage] = useState("English")
  const [tone, setTone] = useState("Professional")
  const [openingMessage, setOpeningMessage] = useState("Hello! How can I help you today?")
  
  // Custom BANT Questions
  const [bantQuestions, setBantQuestions] = useState<BANTQuestion[]>([])
  
  // BANT Configuration - matching the original modal exactly
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
  
  // Media Upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const steps: WizardStep[] = ["agent-info", "bant-questions", "bant-weights", "bant-criteria", "bant-threshold", "media-upload"]
  const currentStepIndex = steps.indexOf(currentStep)
  const progress = (currentStepIndex / steps.length) * 100

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleNext = () => {
    const stepIndex = steps.indexOf(currentStep)
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1])
    }
  }

  const handlePrevious = () => {
    const stepIndex = steps.indexOf(currentStep)
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1])
    }
  }

  const handleCreateAgent = async () => {
    setLoading(true)
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      console.log("[Agent Creation] Starting agent creation with:", {
        agentName,
        language,
        tone,
        organizationId,
        hasOpeningMessage: !!openingMessage,
        bantQuestionsCount: bantQuestions.length,
        uploadedFilesCount: uploadedFiles.length
      })

      // Format BANT configuration to match backend expectations
      const bantConfig = {
        thresholds: {
          budget: bantConfiguration.budget_weight,
          authority: bantConfiguration.authority_weight,
          need: bantConfiguration.need_weight,
          timeline: bantConfiguration.timeline_weight,
          contact: bantConfiguration.contact_weight,
          priority: bantConfiguration.priority_threshold,
          hot: bantConfiguration.hot_threshold,
          warm: bantConfiguration.warm_threshold
        },
        budgetRanges: bantConfiguration.budget_criteria,
        authorityLevels: bantConfiguration.authority_criteria,
        needCategories: bantConfiguration.need_criteria,
        timelineRanges: bantConfiguration.timeline_criteria
      }

      const requestBody = {
        name: agentName,
        language,
        tone,
        openingMessage,
        organizationId,  // Add organizationId from props
        bantConfiguration: bantConfig
      }

      console.log("[Agent Creation] Request body:", JSON.stringify(requestBody, null, 2))
      console.log("[Agent Creation] Auth headers:", authHeaders)

      // Create the agent with proper BANT configuration
      const response = await fetch(`${API_BASE_URL}/api/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("[Agent Creation] Response status:", response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Agent Creation] Server error response:", errorText)
        
        let errorMessage = "Failed to create agent"
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          // If not JSON, use the text as-is
          if (errorText) {
            errorMessage = errorText
          }
        }
        
        throw new Error(errorMessage)
      }

      const agent = await response.json()
      console.log("Agent created:", agent)

      // Save custom BANT questions if any
      if (bantQuestions.length > 0 && agent.id) {
        const questionsResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-questions`, {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ questions: bantQuestions })
        })

        if (!questionsResponse.ok) {
          console.error("Failed to save BANT questions, but agent was created")
        }
      }

      // Upload media files if any
      if (uploadedFiles.length > 0 && agent.id) {
        const formData = new FormData()
        uploadedFiles.forEach(file => {
          formData.append('documents', file)
        })

        await fetch(`${API_BASE_URL}/api/agents/${agent.id}/documents`, {
          method: "POST",
          headers: authHeaders,
          body: formData,
        })
      }

      toast.success("AI Agent created successfully!")
      onComplete()
      
    } catch (error) {
      console.error("[Agent Creation] Failed to create agent:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create AI agent"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (step: WizardStep) => {
    switch (step) {
      case "agent-info": return Bot
      case "bant-questions": return HelpCircle
      case "bant-weights": return Target
      case "bant-criteria": return FileText
      case "bant-threshold": return Zap
      case "media-upload": return Upload
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon
    if (file.type.startsWith('video/')) return Film
    if (file.type.startsWith('audio/')) return FileAudio
    return FileText
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-4 relative overflow-hidden">
      {/* Animated background dots */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 bg-blue-400 rounded-full opacity-50"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              opacity: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: -100,
              opacity: [null, 1, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>
      <div className="w-full max-w-4xl relative z-10">
        {/* Progress Bar */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Create Your First AI Agent
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="h-4 w-4" />
              {organizationName}
            </div>
          </div>
          
          <div className="relative">
            {/* Step indicators */}
            <div className="relative flex justify-between">
              {steps.map((step, index) => {
                const Icon = getStepIcon(step)
                const isActive = index === currentStepIndex
                const isCompleted = index < currentStepIndex
                
                return (
                  <div key={step} className="relative">
                    {/* Progress line segment */}
                    {index < steps.length - 1 && (
                      <div className="absolute top-5 left-10 w-full">
                        <div 
                          className="h-1 bg-gray-200"
                          style={{
                            width: `calc((100vw - 2rem - 10rem) / ${steps.length - 1})`,
                            maxWidth: `calc((64rem - 10rem) / ${steps.length - 1})`
                          }}
                        >
                          {index < currentStepIndex && (
                            <motion.div 
                              className="h-full bg-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.1 }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Step icon */}
                    <motion.div
                      className={cn(
                        "relative z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white border-2",
                        isActive ? "border-blue-500 text-blue-500 shadow-lg bg-white" :
                        isCompleted ? "bg-blue-500 border-blue-500 text-white" :
                        "border-gray-300 text-gray-400 bg-gray-50"
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </motion.div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === "agent-info" && (
            <motion.div
              key="agent-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-gray-200 shadow-xl bg-white">
                <CardHeader className="text-center pb-8">
                  <motion.div 
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500 shadow-lg"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Bot className="h-10 w-10 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl text-gray-900">Name Your AI Agent</CardTitle>
                  <CardDescription className="text-lg mt-2 text-gray-600">
                    Give your agent a personality and choose its language
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                  <div className="space-y-3">
                    <Label htmlFor="agent-name" className="text-base font-medium text-gray-700">
                      Agent Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="agent-name"
                        placeholder="e.g., Emma, Max, Luna"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="text-lg py-6 pl-12 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <Bot className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      {agentName && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="language" className="text-base font-medium flex items-center gap-2 text-gray-700">
                      <Globe className="h-4 w-4" />
                      Language
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="text-lg py-6 bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Tagalog">Tagalog</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <Button
                      onClick={handleNext}
                      disabled={!agentName}
                      size="lg"
                      className="bg-blue-500 hover:bg-blue-600 transition-colors"
                    >
                      Continue to BANT Setup
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === "bant-questions" && (
            <motion.div
              key="bant-questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-gray-200 shadow-xl bg-white">
                <CardHeader className="text-center pb-8">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <HelpCircle className="h-8 w-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-2xl">Custom BANT Questions</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Define the questions your AI agent will ask to qualify leads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      These questions will be asked sequentially to qualify your leads based on Budget, Authority, Need, and Timeline.
                    </AlertDescription>
                  </Alert>

                  <CustomBANTQuestions
                    agentId={undefined}
                    initialQuestions={bantQuestions.length > 0 ? bantQuestions : undefined}
                    onSave={async (questions) => {
                      setBantQuestions(questions)
                      return Promise.resolve()
                    }}
                    onComplete={() => {
                      // Move to the next step (bant-weights)
                      handleNext()
                    }}
                    embedded={true}
                    isOnboarding={true}
                    className="space-y-4"
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === "bant-weights" && (
            <motion.div
              key="bant-weights"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-gray-200 shadow-xl bg-white">
                <CardHeader className="text-center pb-8">
                  <motion.div 
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-400 shadow-lg"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Target className="h-10 w-10 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl text-gray-900">BANT Score Weights</CardTitle>
                  <CardDescription className="text-lg mt-2 text-gray-600">
                    Adjust the importance of each qualification factor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pb-8">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-gray-700">
                      Adjust the importance of each BANT component. Weights must total exactly 100 pts.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6">
                    {(['budget', 'authority', 'need', 'timeline', 'contact'] as const).map(component => {
                      const currentValue = bantConfiguration[`${component}_weight` as keyof BANTConfiguration] as number
                      const otherWeights = ['budget', 'authority', 'need', 'timeline', 'contact']
                        .filter(c => c !== component)
                        .reduce((sum, c) => sum + (bantConfiguration[`${c}_weight` as keyof BANTConfiguration] as number), 0)
                      const maxValue = 100 - otherWeights
                      
                      const getIcon = () => {
                        switch(component) {
                          case 'budget': return <DollarSign className="h-4 w-4 text-blue-600" />
                          case 'authority': return <User className="h-4 w-4 text-blue-500" />
                          case 'need': return <Sparkles className="h-4 w-4 text-blue-400" />
                          case 'timeline': return <Clock className="h-4 w-4 text-blue-500" />
                          case 'contact': return <Phone className="h-4 w-4 text-blue-400" />
                          default: return null
                        }
                      }
                      
                      const getColor = () => {
                        switch(component) {
                          case 'budget': return 'text-blue-600'
                          case 'authority': return 'text-blue-500'
                          case 'need': return 'text-blue-400'
                          case 'timeline': return 'text-blue-500'
                          case 'contact': return 'text-blue-400'
                          default: return 'text-gray-600'
                        }
                      }
                      
                      return (
                        <div key={component} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-medium flex items-center gap-2 capitalize text-gray-800">
                              {getIcon()}
                              {component}
                            </Label>
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-bold ${getColor()}`}>{currentValue} pts</span>
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
                            className="w-full [&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.rc-slider-track]:bg-blue-500 [&_[data-orientation=horizontal]_.bg-primary]:bg-blue-500"
                            disabled={loading}
                          />
                        </div>
                      )
                    })}
                    
                    <div className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Total: {bantConfiguration.budget_weight + bantConfiguration.authority_weight + bantConfiguration.need_weight + bantConfiguration.timeline_weight + bantConfiguration.contact_weight} pts
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      onClick={handlePrevious}
                      variant="outline"
                      size="lg"
                      className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    >
                      <ChevronLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      size="lg"
                      className="bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      Continue
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === "bant-criteria" && (
            <motion.div
              key="bant-criteria"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-gray-200 shadow-xl bg-white">
                <CardHeader className="text-center pb-8">
                  <motion.div 
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-400 shadow-lg"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <FileText className="h-10 w-10 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl text-gray-900">Define Scoring Criteria</CardTitle>
                  <CardDescription className="text-lg mt-2 text-gray-600">
                    Customize how your agent evaluates leads (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                  <BANTCriteriaSection 
                    bantConfiguration={bantConfiguration}
                    setBantConfiguration={setBantConfiguration}
                    loading={loading}
                  />

                  <div className="flex justify-between">
                    <Button
                      onClick={handlePrevious}
                      variant="outline"
                      size="lg"
                      className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    >
                      <ChevronLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      size="lg"
                      className="bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      Continue
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === "bant-threshold" && (
            <motion.div
              key="bant-threshold"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-gray-200 shadow-xl bg-white">
                <CardHeader className="text-center pb-8">
                  <motion.div 
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-300 shadow-lg"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Zap className="h-10 w-10 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl text-gray-900">Lead Qualification Thresholds</CardTitle>
                  <CardDescription className="text-lg mt-2 text-gray-600">
                    Set score thresholds for lead classification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pb-8">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-gray-700">
                      Define the score ranges for different lead priorities
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6">
                    {/* Priority Threshold */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium text-gray-700">
                          Priority Lead Threshold
                        </Label>
                        <span className="text-2xl font-bold text-blue-700">{bantConfiguration.priority_threshold}%</span>
                      </div>
                      <Slider
                        value={[bantConfiguration.priority_threshold]}
                        onValueChange={([value]) => setBantConfiguration(prev => ({ ...prev, priority_threshold: value }))}
                        max={100}
                        min={0}
                        step={5}
                        className="[&_[role=slider]]:bg-blue-700"
                      />
                      <p className="text-sm text-gray-600">Leads scoring above this are highest priority</p>
                    </div>

                    {/* Hot Threshold */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium text-gray-700">
                          Hot Lead Threshold
                        </Label>
                        <span className="text-2xl font-bold text-blue-600">{bantConfiguration.hot_threshold}%</span>
                      </div>
                      <Slider
                        value={[bantConfiguration.hot_threshold]}
                        onValueChange={([value]) => setBantConfiguration(prev => ({ ...prev, hot_threshold: value }))}
                        max={100}
                        min={0}
                        step={5}
                        className="[&_[role=slider]]:bg-blue-600"
                      />
                      <p className="text-sm text-gray-600">Leads scoring above this are hot leads</p>
                    </div>

                    {/* Warm Threshold */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium text-gray-700">
                          Warm Lead Threshold
                        </Label>
                        <span className="text-2xl font-bold text-blue-500">{bantConfiguration.warm_threshold}%</span>
                      </div>
                      <Slider
                        value={[bantConfiguration.warm_threshold]}
                        onValueChange={([value]) => setBantConfiguration(prev => ({ ...prev, warm_threshold: value }))}
                        max={100}
                        min={0}
                        step={5}
                        className="[&_[role=slider]]:bg-blue-500"
                      />
                      <p className="text-sm text-gray-600">Leads scoring above this are warm leads</p>
                    </div>

                    {/* Visual Guide */}
                    <div className="grid grid-cols-4 gap-2 text-center mt-6">
                      <div className="p-3 rounded-lg border-2 border-blue-400 bg-blue-50">
                        <p className="font-semibold text-blue-700">Cold</p>
                        <p className="text-xs text-gray-600">&lt;{bantConfiguration.warm_threshold}%</p>
                      </div>
                      <div className="p-3 rounded-lg border-2 border-yellow-400 bg-yellow-50">
                        <p className="font-semibold text-yellow-700">Warm</p>
                        <p className="text-xs text-gray-600">{bantConfiguration.warm_threshold}-{bantConfiguration.hot_threshold}%</p>
                      </div>
                      <div className="p-3 rounded-lg border-2 border-orange-400 bg-orange-50">
                        <p className="font-semibold text-orange-700">Hot</p>
                        <p className="text-xs text-gray-600">{bantConfiguration.hot_threshold}-{bantConfiguration.priority_threshold}%</p>
                      </div>
                      <div className="p-3 rounded-lg border-2 border-red-400 bg-red-50">
                        <p className="font-semibold text-red-700">Priority</p>
                        <p className="text-xs text-gray-600">&gt;{bantConfiguration.priority_threshold}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      onClick={handlePrevious}
                      variant="outline"
                      size="lg"
                      className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    >
                      <ChevronLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      size="lg"
                      className="bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      Continue
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === "media-upload" && (
            <motion.div
              key="media-upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-gray-200 shadow-xl bg-white">
                <CardHeader className="text-center pb-8">
                  <motion.div 
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-400 shadow-lg"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Upload className="h-10 w-10 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl text-gray-900">Upload Knowledge Base</CardTitle>
                  <CardDescription className="text-lg mt-2 text-gray-600">
                    Add documents to train your agent (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                  <div 
                    className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Upload className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                    <p className="text-lg font-medium mb-2 text-gray-700">Click to upload files</p>
                    <p className="text-sm text-gray-600">
                      PDF, DOC, TXT, CSV (Max 10MB per file)
                    </p>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Uploaded Files ({uploadedFiles.length})</h4>
                      {uploadedFiles.map((file, index) => {
                        const Icon = getFileIcon(file)
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button
                      onClick={handlePrevious}
                      variant="outline"
                      size="lg"
                      className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    >
                      <ChevronLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button
                      onClick={handleCreateAgent}
                      disabled={loading}
                      size="lg"
                      className="bg-blue-500 hover:bg-blue-600 transition-colors"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Agent...
                        </>
                      ) : (
                        <>
                          Create Agent
                          <Sparkles className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}