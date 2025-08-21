"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TestBANTPage() {
  const agentId = "eea1775d-f6fb-4d2c-bb4f-ece74619644e"
  const { config, saveConfig, deleteConfig, loading, error } = useBANTConfig(agentId)
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Test BANT Configuration</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {loading && <div className="mb-4">Loading...</div>}
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold">Debug Info:</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({ 
            agentId, 
            hasConfig: !!config,
            configWeights: config ? {
              budget: config.budget_weight,
              authority: config.authority_weight,
              need: config.need_weight,
              timeline: config.timeline_weight,
              contact: config.contact_weight
            } : null,
            needCriteriaType: config?.need_criteria ? Array.isArray(config.need_criteria) ? 'array' : 'object' : 'null',
            needCriteriaLength: config?.need_criteria ? (Array.isArray(config.need_criteria) ? config.need_criteria.length : 'N/A') : 0
          }, null, 2)}
        </pre>
      </div>
      
      <CustomBANTConfig 
        agentId={agentId}
        onSave={saveConfig}
        onDelete={deleteConfig}
        initialConfig={config}
      />
    </div>
  )
}