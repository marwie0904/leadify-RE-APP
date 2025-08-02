"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { apiCall } from "@/lib/api"
import { LeadsTable } from "@/components/leads/leads-table"
import { LeadsFilters } from "@/components/leads/leads-filters"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { Lead as ApiLead } from "@/types/api"

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

interface Agent {
  id: string
  name: string
  email: string
}

export default function LeadsPage() {
  const { user, loading: authLoading, getAuthHeaders } = useAuth()
  const [allLeads, setAllLeads] = useState<Lead[]>([]) // Store all leads for local filtering
  const [searchResults, setSearchResults] = useState<Lead[]>([]) // Store search results
  const [displayedLeads, setDisplayedLeads] = useState<Lead[]>([]) // Leads to display after filtering
  const [agents, setAgents] = useState<Agent[]>([])
  const [rawLeads, setRawLeads] = useState<ApiLead[]>([]); // Store raw leads for transformation after agents are loaded
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    classification: "all",
    agent: "all",
    search: "",
  })

  useEffect(() => {
    if (!authLoading && user) {
      fetchLeads()
      fetchAgents()
    }
  }, [user, authLoading])

  // Apply filters whenever filters change or data changes
  useEffect(() => {
    applyFilters()
  }, [filters.classification, filters.agent, allLeads, searchResults, filters.search])

  // Transform leads after both agents and rawLeads are loaded
  useEffect(() => {
    console.log("[LEADS DEBUG] Transform check:", { 
      agentsLength: agents.length, 
      rawLeadsLength: rawLeads.length,
      agents,
      rawLeads: rawLeads.slice(0, 2) // First 2 for debugging
    })
    
    // Transform leads even if no agents are loaded (some leads might not have agents)
    if (rawLeads.length > 0) {
      const agentMap = Object.fromEntries(agents.map(a => [a.id, a.name]));
      console.log('[LEADS] agentMap:', agentMap);
      // Log all agent IDs and their types
      agents.forEach(a => console.log('[LEADS] Agent array id:', a.id, 'type:', typeof a.id));
      rawLeads.forEach((lead: ApiLead, idx: number) => {
        if (lead.agent_id) {
          console.log('[LEADS] Lead', idx, 'agent_id:', lead.agent_id, 'type:', typeof lead.agent_id);
        }
      });
      const transformedLeads = rawLeads.map((lead: ApiLead, index: number) => {
        let agentName = lead.agent_name || agentMap[lead.agent_id] || "Unknown Agent";
        if (lead.agent_id) {
          console.log(`[LEADS] Looking up agentId:`, lead.agent_id, '=>', agentMap[lead.agent_id]);
        }
        if (lead.agent_id && agentMap[lead.agent_id]) {
          console.log(`[LEADS] Found agent for lead:`, { agentId: lead.agent_id, agentName });
        }
        
        // Debug source values
        console.log(`[LEADS] Lead ${index} source values:`, {
          lead_source: lead.lead_source,
          source: lead.source,
          conversations_source: lead.conversations?.source,
          final_source: lead.source || lead.lead_source || lead.conversations?.source || "Unknown"
        });
        
        return {
          id: lead.id || `lead-${index}`,
          name: lead.name || lead.full_name || lead.firstName + " " + lead.lastName || "Unknown Lead",
          email: lead.email || lead.email_address || "No email provided",
          phone: lead.phone || lead.phone_number || lead.mobile_number || lead.mobile || "No phone provided",
          classification: lead.classification || lead.lead_classification || lead.priority || lead.status || "warm",
          assignedAgent:
            lead.assignedAgent ||
            lead.assigned_agent ||
            (lead.agent_id
              ? {
                  id: lead.agent_id,
                  name: agentName,
                }
              : null),
          createdAt: lead.createdAt || lead.created_at || new Date().toISOString(),
          source: lead.source || lead.lead_source || lead.conversations?.source || "Unknown",
        }
      });
      console.log("Transformed leads:", transformedLeads);
      setAllLeads(transformedLeads);
    }
  }, [agents, rawLeads]);

  const fetchLeads = async (searchTerm?: string) => {
    try {
      setError(null)

      // Only set searching state for actual search operations, not initial load
      if (searchTerm !== undefined) {
        setSearching(true)
      } else if (!loading) {
        setSearching(true)
      }

      const authHeaders = await getAuthHeaders()

      console.log("Fetching leads from /api/leads...")

      // Build the API URL with search parameter if provided
      let apiUrl = "/api/leads"
      if (searchTerm && searchTerm.trim()) {
        apiUrl += `?search=${encodeURIComponent(searchTerm.trim())}`
        console.log("Searching leads with term:", searchTerm)
      }

      let response
      try {
        response = await apiCall(apiUrl, {
          headers: authHeaders,
        })
      } catch (leadsError) {
        console.log("Leads endpoint failed, this might be expected if no leads exist yet")
        setAllLeads([])
        setSearchResults([])
        setDisplayedLeads([])
        return
      }

      console.log("Raw leads response:", response)

      // Handle the nested response structure
      let leadsData = []
      if (response && response.leads && Array.isArray(response.leads)) {
        leadsData = response.leads
      } else if (Array.isArray(response)) {
        leadsData = response
      } else if (response && response.data && Array.isArray(response.data)) {
        leadsData = response.data
      }

      // Store raw leads for transformation after agents are loaded
      setRawLeads(leadsData);

      if (searchTerm !== undefined) {
        // If this was a search operation
        if (searchTerm.trim()) {
          // Store search results (will be transformed in useEffect)
          // For now, just set rawLeads
          setRawLeads(leadsData);
        } else {
          // Clear search - reset to all leads
          setSearchResults([])
          setRawLeads(leadsData);
        }
      } else {
        // Initial load - store all leads
        setRawLeads(leadsData);
        setSearchResults([])
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch leads")
      setAllLeads([])
      setSearchResults([])
      setDisplayedLeads([])
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const authHeaders = await getAuthHeaders()

      console.log("Fetching agents from /api/organization/agents...")

      const response = await apiCall("/api/organization/agents", {
        headers: authHeaders,
      })

      console.log("Raw agents response for leads:", response)

      // Handle the nested response structure
      let agentsData = []
      if (response && response.agents && Array.isArray(response.agents)) {
        agentsData = response.agents
      } else if (Array.isArray(response)) {
        agentsData = response
      }

      // Transform to match our interface with better error handling
      const transformedAgents = agentsData.map((agent: Agent) => ({
        id: agent.id || "",
        name: agent.name || agent.full_name || "Unknown Agent",
        email: agent.email || "No email",
      }))

      console.log("Transformed agents for leads:", transformedAgents)
      setAgents(transformedAgents)
    } catch (error) {
      console.error("Failed to fetch agents (this is OK, leads will still display):", error)
      // Set empty array so leads can still be displayed without agent info
      setAgents([])
    }
  }

  const applyFilters = () => {
    // Determine which dataset to filter from
    const sourceData = filters.search ? searchResults : allLeads
    let filtered = [...sourceData]

    console.log("Applying filters:", filters)
    console.log("Source data length:", sourceData.length)

    // Apply classification filter (case-insensitive)
    if (filters.classification && filters.classification !== "all") {
      filtered = filtered.filter((lead) => {
        const leadClassification = (lead.classification || "").toLowerCase()
        const filterClassification = filters.classification.toLowerCase()
        const matches = leadClassification === filterClassification
        console.log(
          `Lead ${lead.name} classification: "${lead.classification}" (${leadClassification}), filter: "${filters.classification}" (${filterClassification}), matches: ${matches}`,
        )
        return matches
      })
    }

    // Apply agent filter
    if (filters.agent && filters.agent !== "all") {
      filtered = filtered.filter((lead) => {
        const matches = lead.assignedAgent?.id === filters.agent
        console.log(`Lead ${lead.name} agent: ${lead.assignedAgent?.id}, filter: ${filters.agent}, matches: ${matches}`)
        return matches
      })
    }

    console.log("Filtered results length:", filtered.length)
    console.log("[LEADS DEBUG] About to set displayedLeads:", filtered.slice(0, 2))
    setDisplayedLeads(filtered)
  }

  const handleSearch = async (searchTerm: string) => {
    console.log("Searching for:", searchTerm)
    await fetchLeads(searchTerm)
  }

  const handleFiltersChange = (newFilters: { classification: string; agent: string; search: string }) => {
    console.log("Filters changed:", newFilters)
    setFilters(newFilters)
  }

  const handleAssignAgent = async (leadId: string, agentId: string) => {
    try {
      const authHeaders = await getAuthHeaders()
      await apiCall(`/api/leads/${leadId}/assign-agent`, {
        method: "PATCH",
        headers: authHeaders,
        body: { agentId },
      })

      // Refresh leads after assignment
      if (filters.search) {
        await handleSearch(filters.search)
      } else {
        await fetchLeads()
      }
    } catch (error) {
      console.error("Failed to assign agent:", error)
    }
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Please sign in to access leads.</p>
            <Button onClick={() => (window.location.href = "/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => fetchLeads()}>Retry</Button>
        </div>
      </div>
    )
  }

  // Create filter summary for display
  const getFilterSummary = () => {
    const parts = []
    if (filters.search) parts.push(`search: "${filters.search}"`)
    if (filters.classification !== "all") parts.push(`classification: ${filters.classification}`)
    if (filters.agent !== "all") {
      const agentName = agents.find((a) => a.id === filters.agent)?.name || "Unknown"
      parts.push(`agent: ${agentName}`)
    }
    return parts.length > 0 ? ` (filtered by ${parts.join(", ")})` : ""
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
      </div>

      <LeadsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        agents={agents}
        searching={searching}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {filters.search ? `Search Results (${displayedLeads.length})` : `All Leads (${displayedLeads.length})`}
            {getFilterSummary() && (
              <span className="text-sm font-normal text-muted-foreground ml-2">{getFilterSummary()}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadsTable
            leads={displayedLeads}
            agents={agents}
            onAssignAgent={handleAssignAgent}
            canAssignAgents={user?.role === "admin" || user?.role === "moderator"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
