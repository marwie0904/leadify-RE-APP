"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Bot,
  Edit,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Info,
  Settings,
  MessageSquare,
  Zap,
  Globe,
  DollarSign,
  Calendar,
  User,
  Briefcase,
  Target,
  Languages,
  Shield,
  CheckCircle,
  AlertTriangle,
  Code,
  Database,
  Activity,
  Facebook
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { mockAgentsData } from "@/lib/test-data"

interface BANTConfig {
  enabled: boolean
  questions: {
    budget: string[]
    authority: string[]
    need: string[]
    timeline: string[]
  }
  scoring_weights: {
    budget: number
    authority: number
    need: number
    timeline: number
  }
  thresholds: {
    qualified: number
    hot: number
    warm: number
    cold: number
  }
}

interface Agent {
  id: string
  organization_id: string
  name: string
  description?: string
  language: string
  tone: string
  status: string
  created_at: string
  updated_at: string
  // BANT Configuration
  bant_enabled: boolean
  bant_config?: BANTConfig
  // Agent Configuration
  system_prompt?: string
  fallback_prompt?: string
  criteria_prompt?: string
  max_tokens?: number
  temperature?: number
  // Integrations
  facebook_enabled?: boolean
  embed_enabled?: boolean
  api_enabled?: boolean
  // Statistics
  total_conversations?: number
  total_leads?: number
  total_tokens_used?: number
}

interface AgentStats {
  total_agents: number
  active_agents: number
  bant_enabled_agents: number
  total_conversations: number
  total_leads: number
  total_tokens: number
  average_lead_score: number
}

export default function OrganizationAIDetailsPage() {
  const params = useParams()
  const orgId = params.id as string
  
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const [editMode, setEditMode] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<Agent>>>({})
  const [savingChanges, setSavingChanges] = useState(false)
  
  const fetchAgents = async () => {
    try {
      // Check for test mode
      const isTestMode = typeof window !== 'undefined' && localStorage.getItem('test_mode') === 'true'
      
      if (isTestMode) {
        // Use mock data in test mode
        const processedAgents = mockAgentsData.agents.map((agent: any) => ({
          ...agent,
          bant_config: agent.bant_config || generateDefaultBANTConfig(),
          total_conversations: agent.conversation_count || 0,
          total_leads: agent.lead_count || 0,
          total_tokens_used: agent.token_usage || 0
        }))
        
        setAgents(processedAgents)
        setStats(mockAgentsData.stats as AgentStats)
        setSelectedAgent(processedAgents[0]?.id || null)
        setError(null)
        setLoading(false)
        setRefreshing(false)
        return
      }
      
      const token = localStorage.getItem('admin_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/agents`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents')
      }
      
      const data = await response.json()
      
      // Process agents data
      const processedAgents: Agent[] = data.agents?.map((agent: any) => ({
        ...agent,
        bant_enabled: agent.bant_config?.enabled || false,
        bant_config: agent.bant_config || generateDefaultBANTConfig(),
        total_conversations: agent.conversations?.length || 0,
        total_leads: agent.leads?.length || 0,
        total_tokens_used: agent.token_usage || 0
      })) || []
      
      // Calculate statistics
      const activeCount = processedAgents.filter(a => a.status === 'active' || a.status === 'ready').length
      const bantEnabledCount = processedAgents.filter(a => a.bant_enabled).length
      const totalConversations = processedAgents.reduce((sum, a) => sum + (a.total_conversations || 0), 0)
      const totalLeads = processedAgents.reduce((sum, a) => sum + (a.total_leads || 0), 0)
      const totalTokens = processedAgents.reduce((sum, a) => sum + (a.total_tokens_used || 0), 0)
      
      const calculatedStats: AgentStats = {
        total_agents: processedAgents.length,
        active_agents: activeCount,
        bant_enabled_agents: bantEnabledCount,
        total_conversations: totalConversations,
        total_leads: totalLeads,
        total_tokens: totalTokens,
        average_lead_score: 75 // Mock for now
      }
      
      setAgents(processedAgents)
      setStats(calculatedStats)
      setSelectedAgent(processedAgents[0]?.id || null)
      setError(null)
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load AI agents')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    fetchAgents()
  }, [orgId])
  
  const handleRefresh = () => {
    setRefreshing(true)
    setPendingChanges({})
    fetchAgents()
  }
  
  const generateDefaultBANTConfig = (): BANTConfig => ({
    enabled: false,
    questions: {
      budget: [
        "What's your budget range for this property?",
        "How much are you planning to invest?"
      ],
      authority: [
        "Are you the decision maker for this purchase?",
        "Who else is involved in making this decision?"
      ],
      need: [
        "What specific features are you looking for?",
        "What's most important to you in a property?"
      ],
      timeline: [
        "When are you looking to make a purchase?",
        "What's your ideal timeline?"
      ]
    },
    scoring_weights: {
      budget: 25,
      authority: 25,
      need: 25,
      timeline: 25
    },
    thresholds: {
      qualified: 70,
      hot: 80,
      warm: 50,
      cold: 30
    }
  })
  
  const handleAgentChange = (agentId: string, field: string, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [field]: value
      }
    }))
  }
  
  const handleBANTChange = (agentId: string, bantField: string, value: any) => {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return
    
    const currentConfig = pendingChanges[agentId]?.bant_config || agent.bant_config || generateDefaultBANTConfig()
    
    let updatedConfig = { ...currentConfig }
    
    // Handle nested BANT config updates
    if (bantField.includes('.')) {
      const [section, subsection] = bantField.split('.')
      updatedConfig = {
        ...updatedConfig,
        [section]: {
          ...updatedConfig[section as keyof BANTConfig],
          [subsection]: value
        }
      }
    } else {
      updatedConfig = {
        ...updatedConfig,
        [bantField]: value
      }
    }
    
    handleAgentChange(agentId, 'bant_config', updatedConfig)
  }
  
  const handleSaveChanges = async () => {
    setSavingChanges(true)
    const token = localStorage.getItem('admin_token')
    
    try {
      // Save all pending changes
      const promises = Object.entries(pendingChanges).map(async ([agentId, changes]) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/organizations/${orgId}/agents/${agentId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(changes)
          }
        )
        
        if (!response.ok) {
          throw new Error(`Failed to update agent ${agentId}`)
        }
        
        return response.json()
      })
      
      await Promise.all(promises)
      
      toast.success('AI agents updated successfully')
      setPendingChanges({})
      setEditMode(false)
      fetchAgents()
    } catch (err) {
      console.error('Error saving changes:', err)
      toast.error('Failed to save changes')
    } finally {
      setSavingChanges(false)
    }
  }
  
  const getAgentValue = (agent: Agent, field: string) => {
    const changes = pendingChanges[agent.id]
    if (changes && field in changes) {
      return changes[field as keyof Agent]
    }
    return agent[field as keyof Agent]
  }
  
  const hasPendingChanges = () => {
    return Object.keys(pendingChanges).length > 0
  }
  
  const hasAgentChanges = (agentId: string) => {
    return !!pendingChanges[agentId]
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'ready':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'training':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }
  
  const formatTokenCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }
  
  const selectedAgentData = agents.find(a => a.id === selectedAgent)
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <Skeleton className="h-96" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchAgents()
            }}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  
  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No AI Agents Found</h3>
          <p className="text-gray-600">This organization hasn't created any AI agents yet.</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Edit Mode Banner */}
      {editMode && (
        <Alert className="border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-orange-800">
              You are in edit mode. Make changes to AI agent configurations and click Save to apply.
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditMode(false)
                  setPendingChanges({})
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={!hasPendingChanges() || savingChanges}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes
                {hasPendingChanges() && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.keys(pendingChanges).length}
                  </Badge>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                {formatTokenCount(stats.total_tokens)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Across all agents
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-500" />
                {stats.average_response_time || "245ms"}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Avg AI response latency
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content */}
      <div className="space-y-6">
        {/* Agent Details */}
        {selectedAgentData && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{selectedAgentData.name}</CardTitle>
                  <CardDescription>
                    Configure AI agent settings and BANT qualification
                  </CardDescription>
                </div>
                {!editMode && (
                  <Button
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="bant">BANT Config</TabsTrigger>
                </TabsList>
                
                {/* General Settings */}
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Agent Name</Label>
                      <Input
                        value={getAgentValue(selectedAgentData, 'name') as string}
                        onChange={(e) => handleAgentChange(selectedAgentData.id, 'name', e.target.value)}
                        disabled={!editMode}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Language</Label>
                      <Select
                        value={getAgentValue(selectedAgentData, 'language') as string}
                        onValueChange={(value) => handleAgentChange(selectedAgentData.id, 'language', value)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="Portuguese">Portuguese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tone</Label>
                      <Select
                        value={getAgentValue(selectedAgentData, 'tone') as string}
                        onValueChange={(value) => handleAgentChange(selectedAgentData.id, 'tone', value)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Friendly">Friendly</SelectItem>
                          <SelectItem value="Casual">Casual</SelectItem>
                          <SelectItem value="Formal">Formal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={getAgentValue(selectedAgentData, 'status') as string}
                        onValueChange={(value) => handleAgentChange(selectedAgentData.id, 'status', value)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={getAgentValue(selectedAgentData, 'description') as string || ''}
                      onChange={(e) => handleAgentChange(selectedAgentData.id, 'description', e.target.value)}
                      disabled={!editMode}
                      className="mt-1"
                      rows={3}
                      placeholder="Describe the agent's purpose and capabilities..."
                    />
                  </div>
                </TabsContent>
                
                {/* BANT Configuration */}
                <TabsContent value="bant" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">BANT Lead Qualification</h4>
                      <p className="text-sm text-gray-600">Configure lead scoring and qualification criteria</p>
                    </div>
                    <Switch
                      checked={
                        pendingChanges[selectedAgentData.id]?.bant_config?.enabled ?? 
                        selectedAgentData.bant_config?.enabled ?? 
                        false
                      }
                      onCheckedChange={(checked) => handleBANTChange(selectedAgentData.id, 'enabled', checked)}
                      disabled={!editMode}
                    />
                  </div>
                  
                  {(pendingChanges[selectedAgentData.id]?.bant_config?.enabled ?? selectedAgentData.bant_config?.enabled) && (
                    <Accordion type="single" collapsible className="w-full">
                      {/* Budget Questions */}
                      <AccordionItem value="budget">
                        <AccordionTrigger>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Budget Questions
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {(pendingChanges[selectedAgentData.id]?.bant_config?.questions?.budget ?? 
                              selectedAgentData.bant_config?.questions?.budget ?? []).map((question, idx) => (
                              <Textarea
                                key={idx}
                                value={question}
                                onChange={(e) => {
                                  const currentQuestions = pendingChanges[selectedAgentData.id]?.bant_config?.questions?.budget ?? 
                                    selectedAgentData.bant_config?.questions?.budget ?? []
                                  const updatedQuestions = [...currentQuestions]
                                  updatedQuestions[idx] = e.target.value
                                  handleBANTChange(selectedAgentData.id, 'questions.budget', updatedQuestions)
                                }}
                                disabled={!editMode}
                                rows={2}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      {/* Authority Questions */}
                      <AccordionItem value="authority">
                        <AccordionTrigger>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Authority Questions
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {(pendingChanges[selectedAgentData.id]?.bant_config?.questions?.authority ?? 
                              selectedAgentData.bant_config?.questions?.authority ?? []).map((question, idx) => (
                              <Textarea
                                key={idx}
                                value={question}
                                onChange={(e) => {
                                  const currentQuestions = pendingChanges[selectedAgentData.id]?.bant_config?.questions?.authority ?? 
                                    selectedAgentData.bant_config?.questions?.authority ?? []
                                  const updatedQuestions = [...currentQuestions]
                                  updatedQuestions[idx] = e.target.value
                                  handleBANTChange(selectedAgentData.id, 'questions.authority', updatedQuestions)
                                }}
                                disabled={!editMode}
                                rows={2}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      {/* Need Questions */}
                      <AccordionItem value="need">
                        <AccordionTrigger>
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-2" />
                            Need Questions
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {(pendingChanges[selectedAgentData.id]?.bant_config?.questions?.need ?? 
                              selectedAgentData.bant_config?.questions?.need ?? []).map((question, idx) => (
                              <Textarea
                                key={idx}
                                value={question}
                                onChange={(e) => {
                                  const currentQuestions = pendingChanges[selectedAgentData.id]?.bant_config?.questions?.need ?? 
                                    selectedAgentData.bant_config?.questions?.need ?? []
                                  const updatedQuestions = [...currentQuestions]
                                  updatedQuestions[idx] = e.target.value
                                  handleBANTChange(selectedAgentData.id, 'questions.need', updatedQuestions)
                                }}
                                disabled={!editMode}
                                rows={2}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      {/* Timeline Questions */}
                      <AccordionItem value="timeline">
                        <AccordionTrigger>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Timeline Questions
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {(pendingChanges[selectedAgentData.id]?.bant_config?.questions?.timeline ?? 
                              selectedAgentData.bant_config?.questions?.timeline ?? []).map((question, idx) => (
                              <Textarea
                                key={idx}
                                value={question}
                                onChange={(e) => {
                                  const currentQuestions = pendingChanges[selectedAgentData.id]?.bant_config?.questions?.timeline ?? 
                                    selectedAgentData.bant_config?.questions?.timeline ?? []
                                  const updatedQuestions = [...currentQuestions]
                                  updatedQuestions[idx] = e.target.value
                                  handleBANTChange(selectedAgentData.id, 'questions.timeline', updatedQuestions)
                                }}
                                disabled={!editMode}
                                rows={2}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                  
                  {/* Scoring Weights */}
                  {(pendingChanges[selectedAgentData.id]?.bant_config?.enabled ?? selectedAgentData.bant_config?.enabled) && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        BANT Scoring Weights
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: 'budget', icon: DollarSign, color: 'text-green-600' },
                            { key: 'authority', icon: User, color: 'text-blue-600' },
                            { key: 'need', icon: Target, color: 'text-purple-600' },
                            { key: 'timeline', icon: Calendar, color: 'text-orange-600' }
                          ].map(({ key, icon: Icon, color }) => {
                            const weight = pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.[key as keyof BANTConfig['scoring_weights']] ?? 
                                          selectedAgentData.bant_config?.scoring_weights?.[key as keyof BANTConfig['scoring_weights']] ?? 
                                          25;
                            return (
                              <div key={key} className="bg-white rounded-lg p-3 border">
                                <div className="flex items-center mb-2">
                                  <Icon className={cn("h-4 w-4 mr-2", color)} />
                                  <Label className="capitalize font-medium">{key}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[weight]}
                                    onValueChange={(value) => {
                                      const currentWeights = pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights ?? 
                                        selectedAgentData.bant_config?.scoring_weights ?? {}
                                      handleBANTChange(selectedAgentData.id, `scoring_weights.${key}`, value[0])
                                    }}
                                    max={100}
                                    step={5}
                                    disabled={!editMode}
                                    className="flex-1"
                                  />
                                  <div className="text-xl font-bold w-16 text-right">
                                    {weight}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-sm font-medium text-orange-800 mb-1">Total Weight</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {(pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.budget ?? 
                              selectedAgentData.bant_config?.scoring_weights?.budget ?? 25) +
                             (pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.authority ?? 
                              selectedAgentData.bant_config?.scoring_weights?.authority ?? 25) +
                             (pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.need ?? 
                              selectedAgentData.bant_config?.scoring_weights?.need ?? 25) +
                             (pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.timeline ?? 
                              selectedAgentData.bant_config?.scoring_weights?.timeline ?? 25)}%
                          </div>
                          <div className="text-xs text-orange-600 mt-1">
                            {((pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.budget ?? 
                              selectedAgentData.bant_config?.scoring_weights?.budget ?? 25) +
                             (pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.authority ?? 
                              selectedAgentData.bant_config?.scoring_weights?.authority ?? 25) +
                             (pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.need ?? 
                              selectedAgentData.bant_config?.scoring_weights?.need ?? 25) +
                             (pendingChanges[selectedAgentData.id]?.bant_config?.scoring_weights?.timeline ?? 
                              selectedAgentData.bant_config?.scoring_weights?.timeline ?? 25)) === 100 
                              ? '✓ Weights properly balanced' 
                              : '⚠️ Weights should sum to 100%'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Qualification Thresholds */}
                  {(pendingChanges[selectedAgentData.id]?.bant_config?.enabled ?? selectedAgentData.bant_config?.enabled) && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Lead Qualification Thresholds
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: 'qualified', label: 'Qualified Lead', color: 'bg-green-100 border-green-300 text-green-700', icon: CheckCircle },
                            { key: 'hot', label: 'Hot Lead', color: 'bg-red-100 border-red-300 text-red-700', icon: AlertTriangle },
                            { key: 'warm', label: 'Warm Lead', color: 'bg-yellow-100 border-yellow-300 text-yellow-700', icon: Info },
                            { key: 'cold', label: 'Cold Lead', color: 'bg-blue-100 border-blue-300 text-blue-700', icon: Shield }
                          ].map(({ key, label, color, icon: Icon }) => {
                            const threshold = pendingChanges[selectedAgentData.id]?.bant_config?.thresholds?.[key as keyof BANTConfig['thresholds']] ?? 
                                            selectedAgentData.bant_config?.thresholds?.[key as keyof BANTConfig['thresholds']] ?? 
                                            (key === 'qualified' ? 70 : key === 'hot' ? 80 : key === 'warm' ? 50 : 30);
                            return (
                              <div key={key} className={cn("rounded-lg p-3 border", color)}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <Icon className="h-4 w-4 mr-2" />
                                    <Label className="font-medium">{label}</Label>
                                  </div>
                                  <Badge variant="outline" className={color}>
                                    ≥ {threshold}%
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[threshold]}
                                    onValueChange={(value) => {
                                      const currentThresholds = pendingChanges[selectedAgentData.id]?.bant_config?.thresholds ?? 
                                        selectedAgentData.bant_config?.thresholds ?? {}
                                      handleBANTChange(selectedAgentData.id, `thresholds.${key}`, value[0])
                                    }}
                                    max={100}
                                    step={5}
                                    disabled={!editMode}
                                    className="flex-1"
                                  />
                                  <Input
                                    type="number"
                                    value={threshold}
                                    onChange={(e) => {
                                      const currentThresholds = pendingChanges[selectedAgentData.id]?.bant_config?.thresholds ?? 
                                        selectedAgentData.bant_config?.thresholds ?? {}
                                      handleBANTChange(selectedAgentData.id, `thresholds.${key}`, parseInt(e.target.value))
                                    }}
                                    disabled={!editMode}
                                    className="w-16 text-center"
                                    min={0}
                                    max={100}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xs text-blue-700">
                            <strong>Note:</strong> Leads are classified based on their total BANT score. 
                            Higher thresholds mean stricter qualification criteria.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}