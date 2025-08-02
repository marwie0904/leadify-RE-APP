"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Phone, Calendar, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"

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

interface LeadDetailsModalProps {
  leadId: string
  open: boolean
  onClose: () => void
}

export function LeadDetailsModal({ leadId, open, onClose }: LeadDetailsModalProps) {
  const { getAuthHeaders } = useAuth()
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && leadId) {
      fetchLeadDetails()
    }
  }, [open, leadId])

  const fetchLeadDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeaders()

      // Fetch all leads and find the specific one
      const response = await apiCall("/api/leads", {
        headers: authHeaders,
      })

      console.log("All leads response:", response)

      // Find the specific lead by ID
      let foundLead = null
      if (response && Array.isArray(response)) {
        foundLead = response.find((lead: any) => lead.id === leadId)
      } else if (response && response.leads && Array.isArray(response.leads)) {
        foundLead = response.leads.find((lead: any) => lead.id === leadId)
      }

      if (foundLead) {
        setLeadDetails(foundLead)
      } else {
        setError("Lead not found")
      }
    } catch (error) {
      console.error("Failed to fetch lead details:", error)
      setError("Failed to fetch lead details")
    } finally {
      setLoading(false)
    }
  }

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
        <Progress value={percentage} className="h-2 bg-slate-800" />
      </div>
    )
  }

  const handleStartChat = () => {
    // Navigate to conversations with the specific conversation ID
    if (leadDetails?.conversation_id) {
      window.location.href = `/conversations?id=${leadDetails.conversation_id}`
    } else {
      console.log("No conversation ID available for lead:", leadId)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading lead details...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Loading Lead Details</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchLeadDetails}>Retry</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!leadDetails) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Lead Details - {leadDetails.full_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 p-4">
          {/* Left Column (1/3) */}
          <div className="space-y-4">
            {/* Contact Information */}
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
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Score: {leadDetails.lead_score}/100</span>
                </div>
              </CardContent>
            </Card>

            {/* BANT Details - 2x2 Grid */}
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

            {/* Classification moved here */}
            <div>
              <h4 className="font-medium text-sm mb-2">Classification</h4>
              <Badge className={getClassificationColor(leadDetails.lead_classification)}>
                {leadDetails.lead_classification}
              </Badge>
            </div>
          </div>

          {/* Middle Column - Lead Scoring with Score Justification */}
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Lead Scoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <ScoreBar label="Contact" score={leadDetails.contact_score || 10} maxScore={10} />
                  <ScoreBar label="Timeline" score={leadDetails.timeline_score || 23} maxScore={35} />
                  <ScoreBar label="Authority" score={leadDetails.authority_score || 17} maxScore={20} />
                  <ScoreBar label="Budget" score={leadDetails.budget_score || 10} maxScore={25} />
                  <ScoreBar label="Need" score={leadDetails.need_score || 10} maxScore={10} />
                </div>

                {/* Total Score */}
                <div className="border-t border-slate-700 pt-3 mt-4">
                  <ScoreBar label="Total Score" score={leadDetails.lead_score || 70} maxScore={100} />
                </div>

                {/* Score Justification */}
                <div className="border-t border-slate-700 pt-3 mt-4">
                  <h4 className="font-medium text-sm mb-2 text-white">Score Justification</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {leadDetails.lead_score_justification ||
                      "Budget of 5 million pesos (~half million USD) scores 10 out of 20. Need clearly stated as wanting a quiet location to live, scoring full 10. Authority is shared decision with family, scoring 17 out of 25. Timeline is within 3 months, scoring 23 out of 35. Contact info includes full name and phone number, scoring 10 out of 10."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assessment */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">Assigned Agent</h4>
                  <p className="text-sm text-blue-600">{leadDetails.agent?.name || "Alex Cruz"}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Notification Status</h4>
                  <Badge variant={leadDetails.notified ? "default" : "secondary"} className="text-xs">
                    {leadDetails.notified ? "Notified" : "Not Notified"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* View Conversation Button */}
            <Button onClick={handleStartChat} className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              View Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
