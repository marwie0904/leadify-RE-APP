"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Phone,
  Loader2,
  Bell,
  Globe,
  Facebook,
  MessageCircle,
  Mail,
} from "lucide-react"
import { useAuth } from "@/contexts/simple-auth-context"
import { apiCall } from "@/lib/api"
import React from "react"

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  classification: "cold" | "warm" | "hot" | "priority"
  assignedAgent: {
    id: string
    name: string
  } | null
  createdAt: string
  source: string
}

interface LeadDetails {
  id: string
  conversation_id: string
  full_name: string
  mobile_number: string
  email: string
  budget_range: string
  timeline: string
  authority: string
  need: string
  lead_score: number
  lead_classification: string
  lead_score_justification: string
  budget_score: number
  need_score: number
  authority_score: number
  timeline_score: number
  contact_score: number
  agent_id: string
  notified: boolean
  agent: {
    name: string
  }
}

interface Agent {
  id: string
  name: string
  email: string
}

interface LeadsTableProps {
  leads: Lead[]
  agents: Agent[]
  onAssignAgent: (leadId: string, agentId: string) => void
  canAssignAgents: boolean
}

export function LeadsTable({ leads, agents = [], onAssignAgent, canAssignAgents }: LeadsTableProps) {
  const { getAuthHeaders } = useAuth()
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const getClassificationColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case "priority":
        return "bg-red-500 text-white"
      case "hot":
        return "bg-orange-500 text-white"
      case "warm":
        return "bg-yellow-500 text-black"
      case "cold":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSourceIcon = (source: string) => {
    const lowerSource = source?.toLowerCase() || ""
    
    // Debug logging to see what source values we're getting
    console.log(`[LEADS TABLE] Source: "${source}" -> Lowercase: "${lowerSource}"`)

    if (lowerSource.includes("facebook") || lowerSource.includes("fb") || lowerSource.includes("messenger")) {
      return <Facebook className="h-4 w-4 text-blue-600" />
    }
    if (lowerSource.includes("email") || lowerSource.includes("mail")) {
      return <Mail className="h-4 w-4 text-gray-600" />
    }
    if (lowerSource.includes("web") || lowerSource.includes("website") || lowerSource.includes("site")) {
      return <Globe className="h-4 w-4 text-green-600" />
    }
    if (lowerSource.includes("phone") || lowerSource.includes("call") || lowerSource.includes("sms")) {
      return <Phone className="h-4 w-4 text-green-500" />
    }

    // Default icon for unknown sources
    console.log(`[LEADS TABLE] Using default icon for source: "${source}"`)
    return <MessageCircle className="h-4 w-4 text-muted-foreground" />
  }

  const fetchLeadDetails = async (leadId: string) => {
    setLoadingDetails(true)
    try {
      const authHeaders = await getAuthHeaders()
      const response = await apiCall("/api/leads", {
        headers: authHeaders,
      })

      // Find the specific lead by ID
      let foundLead = null
      if (response && Array.isArray(response)) {
        foundLead = response.find((lead: any) => lead.id === leadId)
      } else if (response && response.leads && Array.isArray(response.leads)) {
        foundLead = response.leads.find((lead: any) => lead.id === leadId)
      }

      if (foundLead) {
        setLeadDetails(foundLead)
      }
    } catch (error) {
      console.error("Failed to fetch lead details:", error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleToggleDetails = async (leadId: string) => {
    if (expandedLeadId === leadId) {
      // Collapse if already expanded
      setExpandedLeadId(null)
      setLeadDetails(null)
    } else {
      // Expand and fetch details
      setExpandedLeadId(leadId)
      await fetchLeadDetails(leadId)
    }
  }

  const handleStartChat = (conversationId: string) => {
    if (conversationId) {
      window.location.href = `/conversations?conversationId=${conversationId}`
    }
  }

  const ScoreBar = ({ label, score, maxScore }: { label: string; score: number; maxScore: number }) => {
    const percentage = (score / maxScore) * 100
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-sm text-slate-400">
            {score}/{maxScore}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No leads found.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead>Assigned Agent</TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="text-right w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <React.Fragment key={lead.id}>
              <TableRow className={expandedLeadId === lead.id ? "bg-muted/50" : ""}>
                <TableCell className="font-medium">{lead.name || "Unknown Lead"}</TableCell>
                <TableCell>
                  <span className="text-sm">{lead.phone || "No phone provided"}</span>
                </TableCell>
                <TableCell>
                  <Badge className={getClassificationColor(lead.classification || "warm")}>
                    {lead.classification || "warm"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {canAssignAgents ? (
                    <Select
                      value={lead.assignedAgent?.id || "unassigned"}
                      onValueChange={(value) => {
                        if (value !== "unassigned") {
                          onAssignAgent(lead.id, value)
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assign agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">{lead.assignedAgent?.name || "Unassigned"}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center" title={lead.source || "Unknown"}>
                    {getSourceIcon(lead.source)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleDetails(lead.id)}>
                    {expandedLeadId === lead.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>

              {/* Expanded Details Row */}
              {expandedLeadId === lead.id && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <div className="border-t bg-muted/20 p-6">
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Loading lead details...</span>
                        </div>
                      ) : leadDetails ? (
                        <div className="grid grid-cols-3 gap-6">
                          {/* Left Column - Contact & BANT */}
                          <div className="space-y-4">
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">Contact Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{leadDetails.mobile_number || "No phone"}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Bell className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{leadDetails.notified ? "Notified" : "Not Notified"}</span>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">BANT Details</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <h4 className="font-medium text-xs mb-1 text-muted-foreground">Budget Range</h4>
                                    <p className="text-sm">{leadDetails.budget_range || "high"}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-xs mb-1 text-muted-foreground">Timeline</h4>
                                    <p className="text-sm">{leadDetails.timeline || "1-3 months"}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-xs mb-1 text-muted-foreground">Authority</h4>
                                    <p className="text-sm">{leadDetails.authority || "shared"}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-xs mb-1 text-muted-foreground">Need</h4>
                                    <p className="text-sm">{leadDetails.need || "residence"}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Middle Column - Scoring */}
                          <div>
                            <Card className="bg-slate-900 border-slate-700">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base text-white">Lead Scoring</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="space-y-3">
                                  <ScoreBar label="Contact" score={leadDetails.contact_score || 10} maxScore={10} />
                                  <ScoreBar label="Timeline" score={leadDetails.timeline_score || 23} maxScore={35} />
                                  <ScoreBar label="Authority" score={leadDetails.authority_score || 17} maxScore={25} />
                                  <ScoreBar label="Budget" score={leadDetails.budget_score || 10} maxScore={20} />
                                  <ScoreBar label="Need" score={leadDetails.need_score || 10} maxScore={10} />
                                </div>

                                {/* Total Score */}
                                <div className="border-t border-slate-700 pt-3 mt-4">
                                  <ScoreBar label="Total Score" score={leadDetails.lead_score || 70} maxScore={100} />
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Right Column - Score Justification & Actions */}
                          <div className="space-y-4">
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">Score Justification</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {leadDetails.lead_score_justification ||
                                    "Budget of 5 million pesos (~half million USD) scores 10 out of 20. Need clearly stated as wanting a quiet location to live, scoring full 10. Authority is shared decision with family, scoring 17 out of 25. Timeline is within 3 months, scoring 23 out of 35. Contact info includes full name and phone number, scoring 10 out of 10."}
                                </p>
                              </CardContent>
                            </Card>

                            {/* View Conversation Button */}
                            <Button
                              onClick={() => handleStartChat(leadDetails.conversation_id)}
                              className="w-full"
                              size="sm"
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              View Conversation
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">Failed to load lead details</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
