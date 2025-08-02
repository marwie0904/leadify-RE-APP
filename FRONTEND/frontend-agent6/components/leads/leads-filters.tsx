"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X, Loader2 } from "lucide-react"

interface Agent {
  id: string
  name: string
  email: string
}

interface LeadsFiltersProps {
  filters: {
    classification: string
    agent: string
    search: string
  }
  onFiltersChange: (filters: { classification: string; agent: string; search: string }) => void
  onSearch: (searchTerm: string) => void
  agents: Agent[]
  searching?: boolean
}

export function LeadsFilters({ filters, onFiltersChange, onSearch, agents, searching }: LeadsFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search)

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.search) {
        onSearch(searchInput)
        onFiltersChange({ ...filters, search: searchInput })
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchInput]) // Only depend on searchInput

  const handleSearchClear = () => {
    setSearchInput("")
    // The useEffect will handle the actual search call
  }

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)
    // The useEffect will handle the debounced search
  }

  const handleClassificationChange = (value: string) => {
    console.log("Classification filter changed to:", value)
    onFiltersChange({ ...filters, classification: value })
  }

  const handleAgentChange = (value: string) => {
    console.log("Agent filter changed to:", value)
    onFiltersChange({ ...filters, agent: value })
  }

  const clearAllFilters = () => {
    setSearchInput("")
    onFiltersChange({ classification: "all", agent: "all", search: "" })
    onSearch("")
  }

  const hasActiveFilters = filters.search || filters.classification !== "all" || filters.agent !== "all"

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search leads by name, email, or phone..."
          className="pl-10 pr-10"
          value={searchInput}
          onChange={(e) => handleSearchInputChange(e.target.value)}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : searchInput ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={handleSearchClear}
            >
              <X className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select value={filters.classification} onValueChange={handleClassificationChange}>
          <SelectTrigger>
            <SelectValue placeholder="Classification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classifications</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.agent} onValueChange={handleAgentChange}>
          <SelectTrigger>
            <SelectValue placeholder="Assigned Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">Search: "{filters.search}"</span>
            )}
            {filters.classification !== "all" && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                Classification: {filters.classification}
              </span>
            )}
            {filters.agent !== "all" && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                Agent: {agents.find((a) => a.id === filters.agent)?.name || "Unknown"}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}
